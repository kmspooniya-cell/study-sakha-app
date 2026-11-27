import { getCategoryForKind } from './registry';
import { isDeliverableNotification } from './notificationDeduplication';
import type {
  AnnouncementRecord,
  AppNotification,
  NotificationDateGroup,
  NotificationFilter,
} from './types';

export type GroupedNotificationRow =
  | { type: 'header'; id: string; title: NotificationDateGroup }
  | { type: 'notif'; id: string; notif: AppNotification };

const DATE_GROUP_ORDER: readonly NotificationDateGroup[] = [
  'Today',
  'Yesterday',
  'This Week',
  'Earlier',
];

export function getNotificationDateGroup(
  timestampMs: number,
  nowMs = Date.now(),
): NotificationDateGroup {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return 'Earlier';
  const target = new Date(timestampMs);
  if (Number.isNaN(target.getTime())) return 'Earlier';

  const now = new Date(nowMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startOfYesterday = startOfToday - oneDayMs;
  // Rolling 7-day window (excluding Today and Yesterday) for "This Week"
  const startOfThisWeek = startOfToday - 6 * oneDayMs;

  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();

  if (startOfTarget >= startOfToday) return 'Today';
  if (startOfTarget >= startOfYesterday) return 'Yesterday';
  if (startOfTarget >= startOfThisWeek) return 'This Week';
  return 'Earlier';
}

export function sortNotificationsNewestFirst(
  items: readonly AppNotification[],
): AppNotification[] {
  return [...items].sort((a, b) => {
    const aTime = Number.isFinite(a.at) ? a.at : 0;
    const bTime = Number.isFinite(b.at) ? b.at : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.id.localeCompare(b.id);
  });
}

export function matchesNotificationFilter(
  notif: AppNotification,
  filter: NotificationFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'unread') return !notif.read;
  const category = notif.category ?? getCategoryForKind(notif.kind);
  return category === filter;
}

export function getVisibleNotifications(
  items: readonly AppNotification[],
  filter: NotificationFilter,
  nowMs = Date.now(),
): AppNotification[] {
  const deliverable = items.filter((item) => isDeliverableNotification(item, nowMs));
  const filtered = deliverable.filter((item) => matchesNotificationFilter(item, filter));
  return sortNotificationsNewestFirst(filtered);
}

export function getUnreadNotificationCount(
  items: readonly AppNotification[],
  nowMs = Date.now(),
): number {
  let count = 0;
  for (const item of items) {
    if (!item.read && isDeliverableNotification(item, nowMs)) count += 1;
  }
  return count;
}

export function getNotificationFilterCounts(
  items: readonly AppNotification[],
  nowMs = Date.now(),
): Record<NotificationFilter, number> {
  const counts: Record<NotificationFilter, number> = {
    all: 0,
    unread: 0,
    study: 0,
    social: 0,
    updates: 0,
  };
  for (const item of items) {
    if (!isDeliverableNotification(item, nowMs)) continue;
    counts.all += 1;
    if (!item.read) counts.unread += 1;
    const category = item.category ?? getCategoryForKind(item.kind);
    counts[category] += 1;
  }
  return counts;
}

export function groupNotificationsByDate(
  items: readonly AppNotification[],
  nowMs = Date.now(),
): GroupedNotificationRow[] {
  const buckets: Record<NotificationDateGroup, AppNotification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  };

  for (const notif of items) {
    const group = getNotificationDateGroup(notif.at, nowMs);
    buckets[group].push(notif);
  }

  const rows: GroupedNotificationRow[] = [];
  for (const section of DATE_GROUP_ORDER) {
    const groupItems = buckets[section];
    if (groupItems.length === 0) continue;
    rows.push({ type: 'header', id: `section-${section}`, title: section });
    for (const notif of groupItems) {
      rows.push({ type: 'notif', id: notif.id, notif });
    }
  }
  return rows;
}

export function getActiveAnnouncements(
  announcements: readonly AnnouncementRecord[],
  dismissedIds: ReadonlySet<string>,
  nowMs = Date.now(),
): AnnouncementRecord[] {
  return [...announcements]
    .filter((item) => {
      if (!item || !item.id) return false;
      if (dismissedIds.has(item.id)) return false;
      if (typeof item.expiresAt === 'number' && Number.isFinite(item.expiresAt) && item.expiresAt <= nowMs) {
        return false;
      }
      if (Number.isFinite(item.at) && item.at > nowMs + 30_000) return false;
      return true;
    })
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}
