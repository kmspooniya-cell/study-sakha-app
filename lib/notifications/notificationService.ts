import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PlannerScheduleItem } from '../store';
import { buildNotificationEventKey } from './notificationDeduplication';
import { getCategoryForKind, getNotificationTypeConfig, normalizeNotificationKind } from './registry';
import type {
  AppNotification,
  AppNotificationKind,
  AppNotificationTargetRoute,
  PushTokenRecord,
} from './types';

export const STUDY_REMINDER_CHANNEL_ID = 'study-reminders';
export const SOCIAL_MESSAGES_CHANNEL_ID = 'social-messages';
export const GROUP_ACTIVITY_CHANNEL_ID = 'group-activity';
export const ANNOUNCEMENTS_CHANNEL_ID = 'announcements';
export const ACHIEVEMENTS_CHANNEL_ID = 'achievements';

const PLANNER_REMINDER_PREFIX = 'study-sakha-planner-';
const LEGACY_UPCOMING_REMINDER_ID = 'study-sakha-upcoming-planner-reminder';
const PUSH_TOKEN_STORAGE_KEY = 'sakha-push-token-v1';

const VALID_ROUTES: ReadonlySet<AppNotificationTargetRoute> = new Set([
  'StudyPlanner',
  'FocusCenter',
  'Groups',
  'Tests',
  'TestPlayer',
  'TestResult',
  'Library',
  'Statistics',
  'Profile',
  'Settings',
  'NotificationSettings',
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
  if (typeof data.kind === 'string') {
    return normalizeNotificationKind(data.kind);
  }
  if (normalizeStringField(data.plannerItemId) || normalizeStringField(data.taskId)) return 'planner';
  if (normalizeStringField(data.chatId)) return 'chat';
  if (normalizeStringField(data.friendId)) return 'friend';
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
  const chatId = normalizeStringField(data.chatId);
  const friendId = normalizeStringField(data.friendId);
  const testId = normalizeStringField(data.testId);
  const resultId = normalizeStringField(data.resultId);
  const announcementId = normalizeStringField(data.announcementId);
  const kind = inferNotificationKind(data);
  const routeCandidate = normalizeStringField(data.route);
  const targetRoute = routeCandidate && VALID_ROUTES.has(routeCandidate as AppNotificationTargetRoute)
    ? (routeCandidate as AppNotificationTargetRoute)
    : undefined;
  const at = normalizeTimestampMs(data.at ?? notification.date);

  const notif: AppNotification = {
    id: rawId ?? `expo-${kind}-${at}`,
    title,
    body: body || 'You have a new update in Study Sakha.',
    at,
    kind,
    category: getCategoryForKind(kind),
    priority: getNotificationTypeConfig(kind).defaultPriority,
    read: options?.read === true,
    ...(targetRoute ? { targetRoute } : {}),
    ...(plannerItemId ? { plannerItemId } : {}),
    ...(taskId ? { taskId } : {}),
    ...(groupId ? { groupId } : {}),
    ...(chatId ? { chatId } : {}),
    ...(friendId ? { friendId } : {}),
    ...(testId ? { testId } : {}),
    ...(resultId ? { resultId } : {}),
    ...(announcementId ? { announcementId } : {}),
    ...(Object.keys(data).length > 0 ? { data } : {}),
  };
  notif.eventKey = buildNotificationEventKey(notif);
  return notif;
}

export function notificationFromExpoResponse(response: unknown): AppNotification | null {
  if (!isRecord(response) || !isRecord(response.notification)) return null;
  return notificationFromExpoNotification(response.notification, { read: false });
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

let androidChannelInitialized = false;
let androidChannelUnsupported = false;
let loggedChannelUnsupportedWarning = false;
let androidChannelInitialization: Promise<void> | null = null;
let lastPlannerReminderSyncKey: string | null = null;

export function isExpoGoNotificationRuntime(): boolean {
  return Platform.OS === 'android' && (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === 'expo'
  );
}

function isNotificationsChannelUnsupportedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('NotificationsChannelsProvider') ||
    message.includes('NotificationChannelsProvider') ||
    message.includes('ExpoNotificationChannelManager')
  );
}

export async function ensureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || isExpoGoNotificationRuntime() || androidChannelInitialized || androidChannelUnsupported) {
    return;
  }
  if (androidChannelInitialization) return androidChannelInitialization;
  androidChannelInitialization = (async () => {
    try {
      // Note: The Alarm Engine channel ('study-sakha-alarm-engine') is owned by AlarmPlaybackService.kt
      // and must NEVER be modified or recreated here.
      await Notifications.setNotificationChannelAsync(STUDY_REMINDER_CHANNEL_ID, {
        name: 'Study reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#243B80',
      });
      await Notifications.setNotificationChannelAsync(SOCIAL_MESSAGES_CHANNEL_ID, {
        name: 'Social messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 150, 200],
        lightColor: '#18B6A4',
      });
      await Notifications.setNotificationChannelAsync(GROUP_ACTIVITY_CHANNEL_ID, {
        name: 'Group activity',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#18B6A4',
      });
      await Notifications.setNotificationChannelAsync(ANNOUNCEMENTS_CHANNEL_ID, {
        name: 'Announcements',
        importance: Notifications.AndroidImportance.LOW,
        lightColor: '#4778F5',
      });
      await Notifications.setNotificationChannelAsync(ACHIEVEMENTS_CHANNEL_ID, {
        name: 'Achievements & streaks',
        importance: Notifications.AndroidImportance.LOW,
        lightColor: '#F5A524',
      });
      androidChannelInitialized = true;
    } catch (error) {
      if (isNotificationsChannelUnsupportedError(error)) {
        androidChannelUnsupported = true;
        if (!loggedChannelUnsupportedWarning) {
          loggedChannelUnsupportedWarning = true;
          console.warn('Android notification channel management is unavailable in this runtime (e.g. Expo Go):', error);
        }
        return;
      }
      throw error;
    }
  })().finally(() => {
    androidChannelInitialization = null;
  });
  return androidChannelInitialization;
}

export function getChannelIdForKind(kind: AppNotificationKind): string {
  switch (kind) {
    case 'chat':
    case 'friend':
      return SOCIAL_MESSAGES_CHANNEL_ID;
    case 'group':
      return GROUP_ACTIVITY_CHANNEL_ID;
    case 'announcement':
    case 'content':
    case 'system':
      return ANNOUNCEMENTS_CHANNEL_ID;
    case 'streak':
      return ACHIEVEMENTS_CHANNEL_ID;
    default:
      return STUDY_REMINDER_CHANNEL_ID;
  }
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unavailable'> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    if (current.canAskAgain === false) return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await ensureAndroidNotificationChannels();
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function registerDevicePushToken(userId: string): Promise<{
  ok: boolean;
  token?: string;
  reason?: string;
}> {
  if (Platform.OS === 'web' || isExpoGoNotificationRuntime()) {
    return { ok: false, reason: 'Push token registration requires a standalone or development build.' };
  }
  const granted = await requestNotificationPermission();
  if (!granted) {
    return { ok: false, reason: 'Notification permission not granted.' };
  }
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    return { ok: false, reason: 'EAS projectId is missing.' };
  }

  try {
    const getTokenFn = Notifications.getExpoPushTokenAsync;
    if (typeof getTokenFn !== 'function') {
      return { ok: false, reason: 'Expo push token API unavailable.' };
    }
    const tokenRes = await getTokenFn({ projectId });
    const token = tokenRes?.data;
    if (!token) return { ok: false, reason: 'Empty push token.' };

    const deviceId = `${Platform.OS}-${Constants.deviceName ?? 'device'}`.slice(0, 64);
    const record: PushTokenRecord = {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      deviceId,
      updatedAt: Date.now(),
    };
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { deactivateRemotePushToken, upsertRemotePushToken } = await import('./notificationRepository');
    const previous = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (previous && previous !== token) {
      await deactivateRemotePushToken(previous);
    }
    const remoteRes = await upsertRemotePushToken(record);
    if (remoteRes.ok) {
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
      return { ok: true, token };
    }
    return { ok: false, reason: remoteRes.error ?? 'Failed to register push token.' };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Push token registration failed.',
    };
  }
}

export async function unregisterDevicePushToken(): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { deactivateRemotePushToken } = await import('./notificationRepository');
    const token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (token) {
      await deactivateRemotePushToken(token);
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Non-fatal cleanup
  }
}

export function createNormalizedNotification(input: {
  id?: string;
  title: string;
  body: string;
  kind: AppNotificationKind;
  at?: number;
  targetRoute?: AppNotificationTargetRoute;
  plannerItemId?: string;
  taskId?: string;
  groupId?: string;
  chatId?: string;
  friendId?: string;
  testId?: string;
  resultId?: string;
  announcementId?: string;
  eventKey?: string;
  expiresAt?: number | null;
  data?: Record<string, unknown>;
}): AppNotification {
  const kind = normalizeNotificationKind(input.kind);
  const cfg = getNotificationTypeConfig(kind);
  const at = input.at && Number.isFinite(input.at) ? input.at : Date.now();
  const notif: AppNotification = {
    id: input.id?.trim() || `${kind}-${at}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim() || 'Study Sakha',
    body: input.body.trim(),
    at,
    kind,
    category: cfg.category,
    priority: cfg.defaultPriority,
    read: false,
    updatedAt: at,
    ...(input.targetRoute ? { targetRoute: input.targetRoute } : { targetRoute: cfg.defaultRoute }),
    ...(input.plannerItemId ? { plannerItemId: input.plannerItemId } : {}),
    ...(input.taskId ? { taskId: input.taskId } : {}),
    ...(input.groupId ? { groupId: input.groupId } : {}),
    ...(input.chatId ? { chatId: input.chatId } : {}),
    ...(input.friendId ? { friendId: input.friendId } : {}),
    ...(input.testId ? { testId: input.testId } : {}),
    ...(input.resultId ? { resultId: input.resultId } : {}),
    ...(input.announcementId ? { announcementId: input.announcementId } : {}),
    ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
    ...(input.data ? { data: input.data } : {}),
  };
  notif.eventKey = input.eventKey?.trim() || buildNotificationEventKey(notif);
  return notif;
}

export async function dispatchPersistentNotification(
  userId: string | null | undefined,
  notif: AppNotification,
  dispatchLocal: (notif: AppNotification) => void,
): Promise<void> {
  dispatchLocal(notif);
  if (userId) {
    const { persistNotificationInsert } = await import('./notificationRepository');
    void persistNotificationInsert(userId, notif);
  }
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
    content: {
      title: 'Study Sakha reminder',
      body: upcoming.item.title,
      data: { route: 'StudyPlanner', plannerItemId: upcoming.item.id, kind: 'planner' },
      ...(Platform.OS === 'android' && !isExpoGoNotificationRuntime() ? { channelId: STUDY_REMINDER_CHANNEL_ID } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: upcoming.date },
  });
}

export async function syncUpcomingPlannerReminder(
  enabled: boolean,
  items: PlannerScheduleItem[],
): Promise<void> {
  if (Platform.OS === 'web') return;
  const syncKey = `${enabled ? 'enabled' : 'disabled'}:${JSON.stringify(items)}`;
  if (lastPlannerReminderSyncKey === syncKey) return;
  const getScheduled = Notifications.getAllScheduledNotificationsAsync;
  if (typeof getScheduled !== 'function') {
    await syncLegacyPlannerReminder(enabled, items);
    lastPlannerReminderSyncKey = syncKey;
    return;
  }
  let scheduled: Notifications.NotificationRequest[];
  try {
    scheduled = await getScheduled();
  } catch {
    await syncLegacyPlannerReminder(enabled, items);
    lastPlannerReminderSyncKey = syncKey;
    return;
  }
  await Promise.all(
    scheduled
      .filter(({ identifier }) => identifier.startsWith(PLANNER_REMINDER_PREFIX))
      .map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)),
  );
  if (!enabled) {
    lastPlannerReminderSyncKey = syncKey;
    return;
  }
  if (!(await requestNotificationPermission())) {
    lastPlannerReminderSyncKey = syncKey;
    return;
  }

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
      data: { route: 'StudyPlanner', plannerItemId: item.id, kind: 'planner' },
      ...(Platform.OS === 'android' && !isExpoGoNotificationRuntime() ? { channelId: STUDY_REMINDER_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  })));
  lastPlannerReminderSyncKey = syncKey;
}
