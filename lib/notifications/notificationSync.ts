import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, supabaseConfigured } from '../supabase';
import {
  mapDbNotificationToApp,
  persistNotificationsArchiveState,
  persistNotificationsReadState,
} from './notificationRepository';
import type { AppNotification, PendingNotificationOperation } from './types';

const SYNC_QUEUE_PREFIX = 'sakha-notif-sync-queue-v1';
const DISMISSED_ANNOUNCEMENTS_PREFIX = 'sakha-dismissed-announcements-v1';
const MAX_RETRY_ATTEMPTS = 8;

const writeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function getNotificationQueueKey(userId?: string | null): string {
  if (!userId) return `${SYNC_QUEUE_PREFIX}:guest`;
  return `${SYNC_QUEUE_PREFIX}:user:${encodeURIComponent(userId)}`;
}

export function getDismissedAnnouncementsKey(userId?: string | null): string {
  if (!userId) return `${DISMISSED_ANNOUNCEMENTS_PREFIX}:guest`;
  return `${DISMISSED_ANNOUNCEMENTS_PREFIX}:user:${encodeURIComponent(userId)}`;
}

export async function loadNotificationSyncQueue(
  userId?: string | null,
): Promise<PendingNotificationOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(getNotificationQueueKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingNotificationOperation[]) : [];
  } catch {
    return [];
  }
}

export function scheduleNotificationQueueSave(
  userId: string | null | undefined,
  queue: PendingNotificationOperation[],
): void {
  const key = getNotificationQueueKey(userId);
  const existingTimer = writeTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);
  const timer = setTimeout(() => {
    writeTimers.delete(key);
    void AsyncStorage.setItem(key, JSON.stringify(queue)).catch(() => undefined);
  }, 120);
  writeTimers.set(key, timer);
}

export async function enqueueNotificationOperation(
  userId: string | null | undefined,
  op: Omit<PendingNotificationOperation, 'opId' | 'createdAt' | 'attempts'>,
): Promise<PendingNotificationOperation[]> {
  const current = await loadNotificationSyncQueue(userId);
  const nextOp: PendingNotificationOperation = {
    ...op,
    opId: `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    attempts: 0,
  };
  const next = [...current, nextOp];
  await AsyncStorage.setItem(getNotificationQueueKey(userId), JSON.stringify(next));
  return next;
}

export async function flushNotificationSyncQueue(
  userId?: string | null,
): Promise<{ flushed: number; remaining: number }> {
  if (!supabaseConfigured || !userId) {
    const existing = await loadNotificationSyncQueue(userId);
    return { flushed: 0, remaining: existing.length };
  }

  const queue = await loadNotificationSyncQueue(userId);
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const remaining: PendingNotificationOperation[] = [];
  let flushed = 0;

  for (let i = 0; i < queue.length; i += 1) {
    const op = queue[i];
    let ok = false;

    if (op.type === 'mark_all_read') {
      const res = await persistNotificationsReadState(null, true);
      ok = res.ok;
    } else if (op.type === 'mark_read' && op.ids?.length) {
      const res = await persistNotificationsReadState(op.ids, true);
      ok = res.ok;
    } else if (op.type === 'mark_unread' && op.ids?.length) {
      const res = await persistNotificationsReadState(op.ids, false);
      ok = res.ok;
    } else if (op.type === 'archive' && op.ids?.length) {
      const res = await persistNotificationsArchiveState(op.ids, false);
      ok = res.ok;
    } else if (op.type === 'restore' && op.ids?.length) {
      const res = await persistNotificationsArchiveState(op.ids, true);
      ok = res.ok;
    } else {
      ok = true;
    }

    if (ok) {
      flushed += 1;
    } else if (op.attempts + 1 < MAX_RETRY_ATTEMPTS) {
      remaining.push({ ...op, attempts: op.attempts + 1 });
    }
  }

  await AsyncStorage.setItem(getNotificationQueueKey(userId), JSON.stringify(remaining));
  return { flushed, remaining: remaining.length };
}

export async function loadDismissedAnnouncementIds(
  userId?: string | null,
): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(getDismissedAnnouncementsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveDismissedAnnouncementIds(
  userId: string | null | undefined,
  ids: readonly string[],
): Promise<void> {
  await AsyncStorage.setItem(
    getDismissedAnnouncementsKey(userId),
    JSON.stringify(Array.from(new Set(ids))),
  );
}

export function subscribeToUserNotificationsRealtime(
  userId: string,
  callbacks: {
    onUpsert: (notif: AppNotification) => void;
    onDelete?: (id: string) => void;
    onStatusChange?: (status: string) => void;
  },
): () => void {
  if (!supabaseConfigured || !userId || typeof supabase.channel !== 'function') {
    return () => undefined;
  }

  const seenEventTimestamps = new Map<string, number>();
  const channelName = `user-notifications:${userId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: { eventType?: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
        if (payload.eventType === 'DELETE') {
          const oldId = typeof payload.old?.id === 'string' ? payload.old.id : null;
          if (oldId) callbacks.onDelete?.(oldId);
          return;
        }
        const row = payload.new;
        if (!row || typeof row.id !== 'string') return;
        const stamp = String(row.updated_at ?? row.created_at ?? '');
        const dedupKey = `${payload.eventType}:${row.id}:${stamp}`;
        const now = Date.now();
        const prev = seenEventTimestamps.get(dedupKey);
        if (prev && now - prev < 2000) return;
        seenEventTimestamps.set(dedupKey, now);
        const mapped = mapDbNotificationToApp(row as Parameters<typeof mapDbNotificationToApp>[0]);
        if (mapped.archivedAt) {
          callbacks.onDelete?.(mapped.id);
        } else {
          callbacks.onUpsert(mapped);
        }
      },
    )
    .subscribe((status: string) => {
      callbacks.onStatusChange?.(status);
    });

  return () => {
    if (typeof supabase.removeChannel === 'function') {
      void supabase.removeChannel(channel);
    } else if (typeof (channel as { unsubscribe?: () => unknown }).unsubscribe === 'function') {
      void (channel as { unsubscribe: () => unknown }).unsubscribe();
    }
  };
}
