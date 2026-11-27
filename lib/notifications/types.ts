import type { AppStackNavigationTarget, AppStackRouteName } from '../navigation';

export type NotificationCategory = 'study' | 'social' | 'updates';

export type NotificationFilter = 'all' | 'unread' | 'study' | 'social' | 'updates';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export type NotificationDateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Earlier';

export type AppNotificationKind =
  | 'planner'
  | 'focus'
  | 'test'
  | 'content'
  | 'group'
  | 'streak'
  | 'announcement'
  | 'friend'
  | 'chat'
  | 'system';

export type AppNotificationTargetRoute =
  | 'StudyPlanner'
  | 'FocusCenter'
  | 'Groups'
  | 'Tests'
  | 'TestPlayer'
  | 'TestResult'
  | 'Library'
  | 'Statistics'
  | 'Profile'
  | 'Settings'
  | 'NotificationSettings'
  | 'Notifications';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  at: number;
  kind: AppNotificationKind;
  read: boolean;
  updatedAt?: number;
  archivedAt?: number | null;
  expiresAt?: number | null;
  eventKey?: string;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  targetRoute?: AppNotificationTargetRoute;
  plannerItemId?: string;
  taskId?: string;
  groupId?: string;
  chatId?: string;
  friendId?: string;
  testId?: string;
  resultId?: string;
  announcementId?: string;
  relatedEntityId?: string;
  data?: Record<string, unknown>;
};

export type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  audience: string;
  at: number;
  category?: string;
  expiresAt?: number | null;
  actionRoute?: AppStackRouteName;
  actionParams?: Record<string, unknown>;
};

export type NotificationTypeDefinition = {
  kind: AppNotificationKind;
  category: NotificationCategory;
  label: string;
  labelHi: string;
  icon: string;
  toneKey: 'blue' | 'teal' | 'violet' | 'warning' | 'green' | 'danger';
  defaultRoute: AppNotificationTargetRoute;
  defaultPriority: NotificationPriority;
  canPush: boolean;
  groupable: boolean;
  defaultTtlDays?: number;
};

export type QuietHoursConfig = {
  enabled: boolean;
  startTime: string; // HH:mm 24h
  endTime: string;   // HH:mm 24h
  timezone: string;
};

export type NotificationPreferences = {
  general: {
    pushEnabled: boolean;
    inAppEnabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
  study: {
    plannerReminders: boolean;
    focusNotifications: boolean;
    testResults: boolean;
    streakUpdates: boolean;
  };
  social: {
    friendRequests: boolean;
    groupInvitations: boolean;
    groupMessages: boolean;
    mentionsAndReplies: boolean;
  };
  updates: {
    announcements: boolean;
    appUpdates: boolean;
    systemUpdates: boolean;
  };
  quietHours: QuietHoursConfig;
  updatedAt: number;
};

export type PendingNotificationOpType =
  | 'mark_read'
  | 'mark_unread'
  | 'mark_all_read'
  | 'archive'
  | 'restore';

export type PendingNotificationOperation = {
  opId: string;
  type: PendingNotificationOpType;
  ids?: string[];
  createdAt: number;
  attempts: number;
};

export type PushTokenRecord = {
  token: string;
  platform: 'android' | 'ios' | 'web';
  deviceId: string;
  updatedAt: number;
};

export type NotificationDestinationResult = {
  target: AppStackNavigationTarget | null;
  fallbackUsed: boolean;
  reason?: string;
};
