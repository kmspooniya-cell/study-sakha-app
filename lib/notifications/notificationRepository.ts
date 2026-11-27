import { supabase, supabaseConfigured } from '../supabase';
import { getCategoryForKind, normalizeNotificationKind } from './registry';
import type {
  AnnouncementRecord,
  AppNotification,
  NotificationPreferences,
  PushTokenRecord,
} from './types';

type DbNotificationRow = {
  id: string;
  user_id: string;
  event_key?: string | null;
  kind: string;
  category?: string | null;
  priority?: string | null;
  title: string;
  body: string;
  related_entity_id?: string | null;
  target_route?: string | null;
  metadata?: Record<string, unknown> | null;
  is_read: boolean;
  read_at?: string | null;
  archived_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at?: string | null;
};

type DbAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  audience_type?: string | null;
  audience_exam_id?: string | null;
  audience_plan?: string | null;
  category?: string | null;
  expires_at?: string | null;
  action_route?: string | null;
  action_params?: Record<string, unknown> | null;
  published_at?: string | null;
  created_at: string;
};

function parseTimestamp(iso: string | null | undefined, fallback = Date.now()): number {
  if (!iso) return fallback;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapDbNotificationToApp(row: DbNotificationRow): AppNotification {
  const kind = normalizeNotificationKind(row.kind);
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    at: parseTimestamp(row.created_at),
    kind,
    category: getCategoryForKind(kind),
    priority: (row.priority as AppNotification['priority']) ?? 'normal',
    read: Boolean(row.is_read),
    updatedAt: parseTimestamp(row.updated_at ?? row.read_at ?? row.created_at),
    archivedAt: row.archived_at ? parseTimestamp(row.archived_at) : null,
    expiresAt: row.expires_at ? parseTimestamp(row.expires_at) : null,
    ...(row.event_key ? { eventKey: row.event_key } : {}),
    ...(row.related_entity_id ? { relatedEntityId: row.related_entity_id } : {}),
    ...(row.target_route ? { targetRoute: row.target_route as AppNotification['targetRoute'] } : {}),
    ...(typeof meta.plannerItemId === 'string' ? { plannerItemId: meta.plannerItemId } : {}),
    ...(typeof meta.taskId === 'string' ? { taskId: meta.taskId } : {}),
    ...(typeof meta.groupId === 'string' ? { groupId: meta.groupId } : {}),
    ...(typeof meta.chatId === 'string' ? { chatId: meta.chatId } : {}),
    ...(typeof meta.friendId === 'string' ? { friendId: meta.friendId } : {}),
    ...(typeof meta.testId === 'string' ? { testId: meta.testId } : {}),
    ...(typeof meta.resultId === 'string' ? { resultId: meta.resultId } : {}),
    ...(typeof meta.announcementId === 'string' ? { announcementId: meta.announcementId } : {}),
    ...(Object.keys(meta).length > 0 ? { data: meta } : {}),
  };
}

function formatAudience(row: DbAnnouncementRow): string {
  if (row.audience_type === 'exam' && row.audience_exam_id) {
    return `${row.audience_exam_id.toUpperCase()} aspirants`;
  }
  if (row.audience_type === 'plan' && row.audience_plan) {
    return `${row.audience_plan} plan`;
  }
  return 'All learners';
}

export function mapDbAnnouncementToRecord(row: DbAnnouncementRow): AnnouncementRecord {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: formatAudience(row),
    at: parseTimestamp(row.published_at ?? row.created_at),
    ...(row.category ? { category: row.category } : {}),
    expiresAt: row.expires_at ? parseTimestamp(row.expires_at) : null,
    ...(row.action_route ? { actionRoute: row.action_route as AnnouncementRecord['actionRoute'] } : {}),
    ...(row.action_params ? { actionParams: row.action_params } : {}),
  };
}

export async function fetchNotificationsPage(options: {
  userId: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AppNotification[]; hasMore: boolean; error: string | null }> {
  if (!supabaseConfigured || !options.userId) {
    return { items: [], hasMore: false, error: null };
  }
  const limit = options.limit ?? 30;
  const offset = options.offset ?? 0;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', options.userId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { items: [], hasMore: false, error: error.message };
    }
    const rows = Array.isArray(data) ? (data as DbNotificationRow[]) : [];
    return {
      items: rows.map(mapDbNotificationToApp),
      hasMore: rows.length === limit,
      error: null,
    };
  } catch (error) {
    return {
      items: [],
      hasMore: false,
      error: error instanceof Error ? error.message : 'Unable to load notifications.',
    };
  }
}

export async function fetchPublishedAnnouncements(): Promise<{
  items: AnnouncementRecord[];
  error: string | null;
}> {
  if (!supabaseConfigured) {
    return { items: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, audience_type, audience_exam_id, audience_plan, category, expires_at, action_route, action_params, published_at, created_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return { items: [], error: error.message };
    }
    const rows = Array.isArray(data) ? (data as DbAnnouncementRow[]) : [];
    return {
      items: rows.map(mapDbAnnouncementToRecord),
      error: null,
    };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Unable to load announcements.',
    };
  }
}

export async function persistNotificationInsert(
  userId: string,
  notif: AppNotification,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigured || !userId) return { ok: false, error: 'Supabase not configured.' };
  try {
    const { error } = await supabase.from('notifications').upsert(
      {
        id: notif.id,
        user_id: userId,
        event_key: notif.eventKey ?? null,
        kind: normalizeNotificationKind(notif.kind),
        category: notif.category ?? getCategoryForKind(notif.kind),
        priority: notif.priority ?? 'normal',
        title: notif.title,
        body: notif.body,
        related_entity_id:
          notif.relatedEntityId ??
          notif.plannerItemId ??
          notif.taskId ??
          notif.groupId ??
          notif.resultId ??
          notif.testId ??
          null,
        target_route: notif.targetRoute ?? null,
        metadata: notif.data ?? {},
        is_read: notif.read,
        read_at: notif.read ? new Date(notif.updatedAt ?? notif.at).toISOString() : null,
        archived_at: notif.archivedAt ? new Date(notif.archivedAt).toISOString() : null,
        expires_at: notif.expiresAt ? new Date(notif.expiresAt).toISOString() : null,
        created_at: new Date(notif.at).toISOString(),
        updated_at: new Date(notif.updatedAt ?? notif.at).toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Persist failed.' };
  }
}

export async function persistNotificationsReadState(
  ids: string[] | null,
  markRead: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigured) return { ok: false, error: 'Supabase not configured.' };
  try {
    const { error } = await supabase.rpc('mark_notifications_read', {
      notification_ids: ids,
      mark_read: markRead,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Read update failed.' };
  }
}

export async function persistNotificationsArchiveState(
  ids: string[],
  restore: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigured || ids.length === 0) return { ok: false, error: 'Invalid archive request.' };
  try {
    const { error } = await supabase.rpc('archive_notifications', {
      notification_ids: ids,
      restore,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Archive update failed.' };
  }
}

export async function fetchRemoteNotificationPreferences(
  userId: string,
): Promise<{ preferences: NotificationPreferences | null; error: string | null }> {
  if (!supabaseConfigured || !userId) return { preferences: null, error: null };
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('preferences, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return { preferences: null, error: error.message };
    if (!data || !data.preferences) return { preferences: null, error: null };
    return {
      preferences: {
        ...(data.preferences as NotificationPreferences),
        updatedAt: parseTimestamp(data.updated_at, 0),
      },
      error: null,
    };
  } catch (error) {
    return {
      preferences: null,
      error: error instanceof Error ? error.message : 'Preferences load failed.',
    };
  }
}

export async function persistRemoteNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigured || !userId) return { ok: false, error: 'Supabase not configured.' };
  try {
    const { error } = await supabase.from('notification_preferences').upsert(
      {
        user_id: userId,
        preferences,
        updated_at: new Date(preferences.updatedAt || Date.now()).toISOString(),
      },
      { onConflict: 'user_id' },
    );
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Preferences save failed.' };
  }
}

export async function upsertRemotePushToken(
  record: PushTokenRecord,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigured) return { ok: false, error: 'Supabase not configured.' };
  try {
    const { error } = await supabase.rpc('upsert_push_token', {
      token_value: record.token,
      platform_value: record.platform,
      device_id_value: record.deviceId,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Token registration failed.' };
  }
}

export async function deactivateRemotePushToken(
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigured || !token) return { ok: false };
  try {
    const { error } = await supabase.rpc('deactivate_push_token', {
      token_value: token,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Token deactivation failed.' };
  }
}
