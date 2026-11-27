import type {
  AppNotificationKind,
  NotificationCategory,
  NotificationFilter,
  NotificationTypeDefinition,
} from './types';

export const NOTIFICATION_FILTERS: ReadonlyArray<{
  key: NotificationFilter;
  label: string;
  labelHi: string;
}> = [
  { key: 'all', label: 'All', labelHi: 'सभी' },
  { key: 'unread', label: 'Unread', labelHi: 'अपठित' },
  { key: 'study', label: 'Study', labelHi: 'अध्ययन' },
  { key: 'social', label: 'Social', labelHi: 'सामाजिक' },
  { key: 'updates', label: 'Updates', labelHi: 'अपडेट' },
];

export const NOTIFICATION_REGISTRY: Record<AppNotificationKind, NotificationTypeDefinition> = {
  planner: {
    kind: 'planner',
    category: 'study',
    label: 'Planner',
    labelHi: 'प्लानर',
    icon: 'calendar-outline',
    toneKey: 'blue',
    defaultRoute: 'StudyPlanner',
    defaultPriority: 'high',
    canPush: true,
    groupable: false,
    defaultTtlDays: 30,
  },
  focus: {
    kind: 'focus',
    category: 'study',
    label: 'Focus',
    labelHi: 'फ़ोकस',
    icon: 'hourglass-outline',
    toneKey: 'teal',
    defaultRoute: 'FocusCenter',
    defaultPriority: 'normal',
    canPush: true,
    groupable: true,
    defaultTtlDays: 30,
  },
  test: {
    kind: 'test',
    category: 'study',
    label: 'Tests',
    labelHi: 'टेस्ट',
    icon: 'timer-outline',
    toneKey: 'violet',
    defaultRoute: 'Tests',
    defaultPriority: 'high',
    canPush: true,
    groupable: false,
    defaultTtlDays: 60,
  },
  streak: {
    kind: 'streak',
    category: 'study',
    label: 'Streak',
    labelHi: 'स्ट्रीक',
    icon: 'flame-outline',
    toneKey: 'warning',
    defaultRoute: 'Statistics',
    defaultPriority: 'low',
    canPush: true,
    groupable: false,
    defaultTtlDays: 30,
  },
  friend: {
    kind: 'friend',
    category: 'social',
    label: 'Friends',
    labelHi: 'मित्र',
    icon: 'person-add-outline',
    toneKey: 'green',
    defaultRoute: 'Groups',
    defaultPriority: 'high',
    canPush: true,
    groupable: true,
    defaultTtlDays: 30,
  },
  group: {
    kind: 'group',
    category: 'social',
    label: 'Groups',
    labelHi: 'ग्रुप्स',
    icon: 'people-outline',
    toneKey: 'teal',
    defaultRoute: 'Groups',
    defaultPriority: 'normal',
    canPush: true,
    groupable: true,
    defaultTtlDays: 30,
  },
  chat: {
    kind: 'chat',
    category: 'social',
    label: 'Chat',
    labelHi: 'चैट',
    icon: 'chatbubble-ellipses-outline',
    toneKey: 'blue',
    defaultRoute: 'Groups',
    defaultPriority: 'high',
    canPush: true,
    groupable: true,
    defaultTtlDays: 14,
  },
  announcement: {
    kind: 'announcement',
    category: 'updates',
    label: 'Announcement',
    labelHi: 'घोषणा',
    icon: 'megaphone-outline',
    toneKey: 'teal',
    defaultRoute: 'Notifications',
    defaultPriority: 'low',
    canPush: true,
    groupable: false,
    defaultTtlDays: 90,
  },
  content: {
    kind: 'content',
    category: 'updates',
    label: 'Library',
    labelHi: 'लाइब्रेरी',
    icon: 'library-outline',
    toneKey: 'blue',
    defaultRoute: 'Library',
    defaultPriority: 'normal',
    canPush: true,
    groupable: true,
    defaultTtlDays: 60,
  },
  system: {
    kind: 'system',
    category: 'updates',
    label: 'System',
    labelHi: 'सिस्टम',
    icon: 'shield-checkmark-outline',
    toneKey: 'blue',
    defaultRoute: 'Settings',
    defaultPriority: 'normal',
    canPush: false,
    groupable: false,
    defaultTtlDays: 60,
  },
};

const VALID_KINDS = new Set<AppNotificationKind>(Object.keys(NOTIFICATION_REGISTRY) as AppNotificationKind[]);

export function normalizeNotificationKind(kind: unknown): AppNotificationKind {
  if (typeof kind === 'string') {
    const normalized = kind.trim().toLowerCase();
    if (VALID_KINDS.has(normalized as AppNotificationKind)) return normalized as AppNotificationKind;
    if (normalized === 'reminder' || normalized === 'schedule' || normalized === 'task') return 'planner';
    if (normalized === 'exam' || normalized === 'result' || normalized === 'mock') return 'test';
    if (normalized === 'message' || normalized === 'mention' || normalized === 'reply') return 'chat';
    if (normalized === 'invite' || normalized === 'group_invite') return 'group';
    if (normalized === 'friend_request') return 'friend';
    if (normalized === 'app_update' || normalized === 'update') return 'system';
  }
  return 'system';
}

export function getNotificationTypeConfig(kind: unknown): NotificationTypeDefinition {
  return NOTIFICATION_REGISTRY[normalizeNotificationKind(kind)];
}

export function getCategoryForKind(kind: unknown): NotificationCategory {
  return getNotificationTypeConfig(kind).category;
}
