import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { PlannerScheduleItem } from './store';

export const STUDY_REMINDER_CHANNEL_ID = 'study-reminders';
const PLANNER_REMINDER_PREFIX = 'study-sakha-planner-';
const LEGACY_UPCOMING_REMINDER_ID = 'study-sakha-upcoming-planner-reminder';

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
