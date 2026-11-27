import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppNotificationKind, NotificationPreferences, QuietHoursConfig } from './types';
import { normalizeNotificationKind } from './registry';

const PREFS_STORAGE_PREFIX = 'sakha-notification-prefs-v1';

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function createDefaultNotificationPreferences(): NotificationPreferences {
  return {
    general: {
      pushEnabled: true,
      inAppEnabled: true,
      sound: true,
      vibration: true,
    },
    study: {
      plannerReminders: true,
      focusNotifications: true,
      testResults: true,
      streakUpdates: true,
    },
    social: {
      friendRequests: true,
      groupInvitations: true,
      groupMessages: false,
      mentionsAndReplies: true,
    },
    updates: {
      announcements: true,
      appUpdates: true,
      systemUpdates: true,
    },
    quietHours: {
      enabled: false,
      startTime: '22:30',
      endTime: '05:30',
      timezone: getDeviceTimezone(),
    },
    updatedAt: 0,
  };
}

export function getNotificationPrefsStorageKey(userId?: string | null): string {
  if (!userId) return `${PREFS_STORAGE_PREFIX}:guest`;
  return `${PREFS_STORAGE_PREFIX}:user:${encodeURIComponent(userId)}`;
}

export function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getLocalMinutesInTimezone(date: Date, timezone?: string): number {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(date);
      const hourPart = parts.find((p) => p.type === 'hour')?.value;
      const minutePart = parts.find((p) => p.type === 'minute')?.value;
      const hour = hourPart ? Number(hourPart) % 24 : NaN;
      const minute = minutePart ? Number(minutePart) : NaN;
      if (Number.isFinite(hour) && Number.isFinite(minute)) {
        return hour * 60 + minute;
      }
    } catch {
      // Fall back to local system clock if timezone string is unsupported
    }
  }
  return date.getHours() * 60 + date.getMinutes();
}

export function isWithinQuietHours(
  quietHours: QuietHoursConfig,
  nowDate: Date = new Date(),
): boolean {
  if (!quietHours.enabled) return false;
  const start = parseTimeToMinutes(quietHours.startTime);
  const end = parseTimeToMinutes(quietHours.endTime);
  if (start === null || end === null) return false;
  if (start === end) return false;

  const current = getLocalMinutesInTimezone(nowDate, quietHours.timezone);
  if (start < end) {
    return current >= start && current < end;
  }
  // Crosses midnight (e.g., 22:30 -> 05:30)
  return current >= start || current < end;
}

export function normalizeNotificationPreferences(raw: unknown): NotificationPreferences {
  const defaults = createDefaultNotificationPreferences();
  if (!raw || typeof raw !== 'object') return defaults;
  const src = raw as Partial<NotificationPreferences>;
  return {
    general: {
      pushEnabled: src.general?.pushEnabled ?? defaults.general.pushEnabled,
      inAppEnabled: src.general?.inAppEnabled ?? defaults.general.inAppEnabled,
      sound: src.general?.sound ?? defaults.general.sound,
      vibration: src.general?.vibration ?? defaults.general.vibration,
    },
    study: {
      plannerReminders: src.study?.plannerReminders ?? defaults.study.plannerReminders,
      focusNotifications: src.study?.focusNotifications ?? defaults.study.focusNotifications,
      testResults: src.study?.testResults ?? defaults.study.testResults,
      streakUpdates: src.study?.streakUpdates ?? defaults.study.streakUpdates,
    },
    social: {
      friendRequests: src.social?.friendRequests ?? defaults.social.friendRequests,
      groupInvitations: src.social?.groupInvitations ?? defaults.social.groupInvitations,
      groupMessages: src.social?.groupMessages ?? defaults.social.groupMessages,
      mentionsAndReplies: src.social?.mentionsAndReplies ?? defaults.social.mentionsAndReplies,
    },
    updates: {
      announcements: src.updates?.announcements ?? defaults.updates.announcements,
      appUpdates: src.updates?.appUpdates ?? defaults.updates.appUpdates,
      systemUpdates: src.updates?.systemUpdates ?? defaults.updates.systemUpdates,
    },
    quietHours: {
      enabled: src.quietHours?.enabled ?? defaults.quietHours.enabled,
      startTime:
        typeof src.quietHours?.startTime === 'string' && parseTimeToMinutes(src.quietHours.startTime) !== null
          ? src.quietHours.startTime
          : defaults.quietHours.startTime,
      endTime:
        typeof src.quietHours?.endTime === 'string' && parseTimeToMinutes(src.quietHours.endTime) !== null
          ? src.quietHours.endTime
          : defaults.quietHours.endTime,
      timezone:
        typeof src.quietHours?.timezone === 'string' && src.quietHours.timezone.trim()
          ? src.quietHours.timezone.trim()
          : defaults.quietHours.timezone,
    },
    updatedAt: typeof src.updatedAt === 'number' && Number.isFinite(src.updatedAt) ? src.updatedAt : 0,
  };
}

export function isKindEnabledInPreferences(
  kind: AppNotificationKind | string,
  prefs: NotificationPreferences,
): boolean {
  const normalized = normalizeNotificationKind(kind);
  switch (normalized) {
    case 'planner':
      return prefs.study.plannerReminders;
    case 'focus':
      return prefs.study.focusNotifications;
    case 'test':
      return prefs.study.testResults;
    case 'streak':
      return prefs.study.streakUpdates;
    case 'friend':
      return prefs.social.friendRequests;
    case 'group':
      return prefs.social.groupInvitations;
    case 'chat':
      return prefs.social.groupMessages || prefs.social.mentionsAndReplies;
    case 'announcement':
      return prefs.updates.announcements;
    case 'content':
      return prefs.updates.appUpdates;
    case 'system':
      return prefs.updates.systemUpdates;
    default:
      return true;
  }
}

export function shouldShowInInbox(
  kind: AppNotificationKind | string,
  prefs: NotificationPreferences,
): boolean {
  // Inbox remains accessible even when push or quiet hours are active,
  // unless user explicitly disabled in-app notifications.
  if (!prefs.general.inAppEnabled) return false;
  return isKindEnabledInPreferences(kind, prefs);
}

export function shouldDeliverPush(
  kind: AppNotificationKind | string,
  prefs: NotificationPreferences,
  options?: { isCriticalAlarm?: boolean; now?: Date },
): boolean {
  if (options?.isCriticalAlarm) return true;
  if (!prefs.general.pushEnabled) return false;
  if (!isKindEnabledInPreferences(kind, prefs)) return false;
  if (isWithinQuietHours(prefs.quietHours, options?.now ?? new Date())) return false;
  return true;
}

export async function loadLocalNotificationPreferences(
  userId?: string | null,
): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(getNotificationPrefsStorageKey(userId));
    if (!raw) return createDefaultNotificationPreferences();
    return normalizeNotificationPreferences(JSON.parse(raw));
  } catch {
    return createDefaultNotificationPreferences();
  }
}

export async function saveLocalNotificationPreferences(
  userId: string | null | undefined,
  prefs: NotificationPreferences,
): Promise<void> {
  await AsyncStorage.setItem(
    getNotificationPrefsStorageKey(userId),
    JSON.stringify(prefs),
  );
}
