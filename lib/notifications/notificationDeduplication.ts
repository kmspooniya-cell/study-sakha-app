import type { AppNotification } from './types';

export function buildNotificationEventKey(notif: Pick<AppNotification, 'id' | 'kind' | 'eventKey' | 'plannerItemId' | 'taskId' | 'groupId' | 'chatId' | 'friendId' | 'testId' | 'resultId' | 'announcementId'>): string {
  if (notif.eventKey && notif.eventKey.trim()) return notif.eventKey.trim();
  if (notif.kind === 'planner' && (notif.plannerItemId || notif.taskId)) {
    return `planner:${notif.plannerItemId ?? notif.taskId}`;
  }
  if (notif.kind === 'test' && notif.resultId) {
    return `test-result:${notif.resultId}`;
  }
  if (notif.kind === 'announcement' && notif.announcementId) {
    return `announcement:${notif.announcementId}`;
  }
  return `id:${notif.id}`;
}

export function isDeliverableNotification(notif: AppNotification, now = Date.now()): boolean {
  if (notif.archivedAt) return false;
  if (!Number.isFinite(notif.at) || notif.at <= 0) return false;
  // Do not display future scheduled notifications as already received (allow 30s clock skew)
  if (notif.at > now + 30_000) return false;
  if (typeof notif.expiresAt === 'number' && Number.isFinite(notif.expiresAt) && notif.expiresAt <= now) {
    return false;
  }
  return true;
}

export function deduplicateNotifications(items: readonly AppNotification[]): AppNotification[] {
  const byId = new Map<string, AppNotification>();
  const seenEventKeys = new Map<string, string>();

  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) continue;
    const eventKey = item.eventKey?.trim();
    const existingIdForKey = eventKey ? seenEventKeys.get(eventKey) : undefined;
    const targetId = existingIdForKey ?? item.id;

    const current = byId.get(targetId);
    if (!current) {
      byId.set(targetId, item);
      if (eventKey) seenEventKeys.set(eventKey, targetId);
      continue;
    }

    const currentUpdated = current.updatedAt ?? current.at ?? 0;
    const nextUpdated = item.updatedAt ?? item.at ?? 0;
    if (nextUpdated >= currentUpdated) {
      byId.set(targetId, {
        ...current,
        ...item,
        id: targetId,
        read: item.read ?? current.read,
      });
    }
  }

  return Array.from(byId.values());
}

export function mergeNotificationCollections(
  local: readonly AppNotification[],
  remote: readonly AppNotification[],
): AppNotification[] {
  return deduplicateNotifications([...local, ...remote]);
}
