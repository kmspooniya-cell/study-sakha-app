import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { AppStackNavigationTarget } from './navigation';
import type { PlannerScheduleItem } from './store';
import type { AppNotification, AppNotificationKind, AppNotificationTargetRoute } from './types';

export const STUDY_REMINDER_CHANNEL_ID = 'study-reminders';
const PLANNER_REMINDER_PREFIX = 'study-sakha-planner-';
const LEGACY_UPCOMING_REMINDER_ID = 'study-sakha-upcoming-planner-reminder';

const VALID_KINDS: ReadonlySet<AppNotificationKind> = new Set([
  'planner',
  'focus',
  'test',
  'content',
  'group',
  'streak',
  'announcement',
]);

const VALID_ROUTES: ReadonlySet<AppNotificationTargetRoute> = new Set([
  'StudyPlanner',
  'FocusCenter',
  'Groups',
  'Tests',
  'TestPlayer',
  'TestResult',
  'Library',
  'Profile',
  'Notifications',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeTimestampMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value < 1_000_000_000_000 ? Math.round(value * 1000) : Math.round(value);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return Date.now();
}

function normalizeStringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function inferNotificationKind(data: Record<string, unknown>): AppNotificationKind {
  if (typeof data.kind === 'string' && VALID_KINDS.has(data.kind as AppNotificationKind)) {
    return data.kind as AppNotificationKind;
  }
  if (normalizeStringField(data.plannerItemId) || normalizeStringField(data.taskId)) return 'planner';
  if (normalizeStringField(data.groupId)) return 'group';
  if (normalizeStringField(data.testId) || normalizeStringField(data.resultId)) return 'test';
  return 'announcement';
}

export function notificationFromExpoNotification(
  notification: unknown,
  options?: { read?: boolean },
): AppNotification | null {
  if (!isRecord(notification)) return null;
  const request = isRecord(notification.request) ? notification.request : null;
  if (!request) return null;
  const content = isRecord(request.content) ? request.content : {};
  const data = isRecord(content.data) ? content.data : {};

  const rawId =
    normalizeStringField(data.notificationId) ??
    normalizeStringField(request.identifier) ??
    normalizeStringField(data.id);
  const title = normalizeStringField(content.title) ?? 'Study Sakha';
  const body = typeof content.body === 'string' ? content.body.trim() : '';
  if (!rawId && !body && title === 'Study Sakha') return null;

  const plannerItemId = normalizeStringField(data.plannerItemId);
  const taskId = normalizeStringField(data.taskId);
  const groupId = normalizeStringField(data.groupId);
  const testId = normalizeStringField(data.testId);
  const resultId = normalizeStringField(data.resultId);
  const kind = inferNotificationKind(data);
  const routeCandidate = normalizeStringField(data.route);
  const targetRoute = routeCandidate && VALID_ROUTES.has(routeCandidate as AppNotificationTargetRoute)
    ? routeCandidate as AppNotificationTargetRoute
    : undefined;
  const at = normalizeTimestampMs(data.at ?? notification.date);

  return {
    id: rawId ?? `expo-${kind}-${at}`,
    title,
    body: body || 'You have a new update in Study Sakha.',
    at,
    kind,
    read: options?.read === true,
    ...(targetRoute ? { targetRoute } : {}),
    ...(plannerItemId ? { plannerItemId } : {}),
    ...(taskId ? { taskId } : {}),
    ...(groupId ? { groupId } : {}),
    ...(testId ? { testId } : {}),
    ...(resultId ? { resultId } : {}),
    ...(Object.keys(data).length > 0 ? { data } : {}),
  };
}

export function notificationFromExpoResponse(response: unknown): AppNotification | null {
  if (!isRecord(response) || !isRecord(response.notification)) return null;
  return notificationFromExpoNotification(response.notification, { read: false });
}

export function getNotificationDestination(
  notif: AppNotification,
): AppStackNavigationTarget | null {
  const planId = notif.plannerItemId ?? notif.taskId;
  if (planId || notif.kind === 'planner') {
    return {
      screen: 'StudyPlanner',
      ...(planId ? { params: { openPlanId: planId } } : {}),
    };
  }
  if (notif.groupId || notif.kind === 'group') {
    return {
      screen: 'Groups',
      ...(notif.groupId ? { params: { inviteGroupId: notif.groupId } } : {}),
    };
  }
  if (notif.resultId) {
    return { screen: 'TestResult', params: { resultId: notif.resultId } };
  }
  if (notif.testId) {
    return { screen: 'TestPlayer', params: { testId: notif.testId } };
  }
  if (notif.kind === 'test') {
    return { screen: 'Tests' };
  }
  if (notif.kind === 'content') {
    return { screen: 'Library' };
  }
  if (notif.kind === 'streak') {
    return { screen: 'Profile' };
  }
  if (notif.kind === 'focus') {
    return { screen: 'FocusCenter' };
  }
  if (notif.targetRoute && notif.targetRoute !== 'Notifications') {
    if (notif.targetRoute === 'StudyPlanner') return { screen: 'StudyPlanner' };
    if (notif.targetRoute === 'FocusCenter') return { screen: 'FocusCenter' };
    if (notif.targetRoute === 'Groups') return { screen: 'Groups' };
    if (notif.targetRoute === 'Tests') return { screen: 'Tests' };
    if (notif.targetRoute === 'Library') return { screen: 'Library' };
    if (notif.targetRoute === 'Profile') return { screen: 'Profile' };
  }
  return null;
}

export async function capturePresentedNotifications(
  onCapture: (notif: AppNotification) => void,
): Promise<void> {
  if (Platform.OS === 'web') return;
  const getPresented = Notifications.getPresentedNotificationsAsync;
  if (typeof getPresented !== 'function') return;
  try {
    const presented = await getPresented();
    if (!Array.isArray(presented)) return;
    for (const entry of presented) {
      const notif = notificationFromExpoNotification(entry);
      if (notif) onCapture(notif);
    }
  } catch (error) {
    console.warn('Presented notifications could not be read:', error);
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(STUDY_REMINDER_CHANNEL_ID, {
      name: 'Study reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#243B80',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function parseScheduleDate(item: PlannerScheduleItem): Date | null {
  const dateValue = item.date;
  const timeValue = item.startTime ?? item.time;
  if (!dateValue || !timeValue) return null;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(timeValue.trim());
  if (!match) return null;
  const hourValue = Number(match[1]);
  const minuteValue = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  const hour = meridiem
    ? (hourValue % 12) + (meridiem === 'PM' ? 12 : 0)
    : hourValue;
  const date = new Date(`${dateValue}T00:00:00`);
  if (!Number.isFinite(date.getTime()) || hour > 23 || minuteValue > 59) return null;
  date.setHours(hour, minuteValue, 0, 0);
  return date;
}

async function syncLegacyPlannerReminder(enabled: boolean, items: PlannerScheduleItem[]) {
  await Notifications.cancelScheduledNotificationAsync(LEGACY_UPCOMING_REMINDER_ID);
  if (!enabled || !(await requestNotificationPermission())) return;
  const now = Date.now();
  const upcoming = items
    .map((item) => ({ item, date: parseScheduleDate(item) }))
    .filter((entry): entry is { item: PlannerScheduleItem; date: Date } => entry.date !== null && entry.date.getTime() > now + 5_000 && entry.item.completed !== true)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  if (!upcoming) return;
  await Notifications.scheduleNotificationAsync({
    identifier: LEGACY_UPCOMING_REMINDER_ID,
    content: { title: 'Study Sakha reminder', body: upcoming.item.title, data: { route: 'Notifications', plannerItemId: upcoming.item.id }, ...(Platform.OS === 'android' ? { channelId: STUDY_REMINDER_CHANNEL_ID } : {}) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: upcoming.date },
  });
}

export async function syncUpcomingPlannerReminder(
  enabled: boolean,
  items: PlannerScheduleItem[],
): Promise<void> {
  if (Platform.OS === 'web') return;
  const getScheduled = Notifications.getAllScheduledNotificationsAsync;
  // Keep compatibility with older Expo test clients/builds that do not expose
  // the scheduled-list API. Production SDK 57 uses the per-task identifiers.
  if (typeof getScheduled !== 'function') {
    await syncLegacyPlannerReminder(enabled, items);
    return;
  }
  let scheduled: Notifications.NotificationRequest[];
  try {
    scheduled = await getScheduled();
  } catch {
    await syncLegacyPlannerReminder(enabled, items);
    return;
  }
  await Promise.all(
    scheduled
      .filter(({ identifier }) => identifier.startsWith(PLANNER_REMINDER_PREFIX))
      .map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)),
  );
  if (!enabled) return;
  if (!(await requestNotificationPermission())) return;

  const now = Date.now();
  const upcoming = items
    .map((item) => ({ item, date: parseScheduleDate(item) }))
    .filter((entry): entry is { item: PlannerScheduleItem; date: Date } =>
      entry.date !== null && entry.date.getTime() > now + 5_000 && entry.item.completed !== true
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  await Promise.all(upcoming.map(({ item, date }) => Notifications.scheduleNotificationAsync({
    identifier: `${PLANNER_REMINDER_PREFIX}${item.id}`,
    content: {
      title: 'Study Sakha reminder',
      body: item.title,
      data: { route: 'Notifications', plannerItemId: item.id, kind: 'planner' },
      ...(Platform.OS === 'android' ? { channelId: STUDY_REMINDER_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  })));
}
