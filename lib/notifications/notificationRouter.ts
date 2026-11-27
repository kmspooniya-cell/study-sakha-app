import type { NavigationContainerRef } from '@react-navigation/native';
import type { AppNavigation, AppStackNavigationTarget, RootStackParamList } from '../navigation';
import { getNotificationTypeConfig, normalizeNotificationKind } from './registry';
import type { AppNotification, NotificationDestinationResult } from './types';

const RECENT_TAP_WINDOW_MS = 1200;
const recentNotificationTaps = new Map<string, number>();

let pendingIntent: {
  notif: AppNotification;
  receivedAt: number;
} | null = null;

function isValidEntityId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 128;
}

function getStringMeta(notif: AppNotification, key: string): string | undefined {
  const fromData = notif.data && typeof notif.data === 'object' ? notif.data[key] : undefined;
  return isValidEntityId(fromData) ? fromData.trim() : undefined;
}

export function resolveNotificationDestination(
  notif: AppNotification,
  options?: {
    knownResultIds?: ReadonlySet<string>;
    knownTestIds?: ReadonlySet<string>;
    knownPlanIds?: ReadonlySet<string>;
  },
): NotificationDestinationResult {
  const kind = normalizeNotificationKind(notif.kind);
  const planId = notif.plannerItemId ?? notif.taskId ?? getStringMeta(notif, 'plannerItemId') ?? getStringMeta(notif, 'taskId');
  const groupId = notif.groupId ?? getStringMeta(notif, 'groupId');
  const chatId = notif.chatId ?? getStringMeta(notif, 'chatId');
  const friendId = notif.friendId ?? getStringMeta(notif, 'friendId');
  const resultId = notif.resultId ?? getStringMeta(notif, 'resultId');
  const testId = notif.testId ?? getStringMeta(notif, 'testId');

  // Expired notifications cannot open stale destinations
  if (typeof notif.expiresAt === 'number' && Number.isFinite(notif.expiresAt) && notif.expiresAt <= Date.now()) {
    return { target: { screen: 'Notifications' }, fallbackUsed: true, reason: 'expired' };
  }

  switch (kind) {
    case 'planner': {
      if (planId) {
        if (options?.knownPlanIds && !options.knownPlanIds.has(planId)) {
          return { target: { screen: 'StudyPlanner' }, fallbackUsed: true, reason: 'planner_item_missing' };
        }
        return { target: { screen: 'StudyPlanner', params: { openPlanId: planId } }, fallbackUsed: false };
      }
      return { target: { screen: 'StudyPlanner' }, fallbackUsed: false };
    }
    case 'focus':
      return { target: { screen: 'FocusCenter' }, fallbackUsed: false };
    case 'test': {
      if (resultId) {
        if (options?.knownResultIds && !options.knownResultIds.has(resultId)) {
          return { target: { screen: 'Tests' }, fallbackUsed: true, reason: 'test_result_missing' };
        }
        return { target: { screen: 'TestResult', params: { resultId } }, fallbackUsed: false };
      }
      if (testId) {
        if (options?.knownTestIds && !options.knownTestIds.has(testId)) {
          return { target: { screen: 'Tests' }, fallbackUsed: true, reason: 'test_missing' };
        }
        return { target: { screen: 'TestPlayer', params: { testId } }, fallbackUsed: false };
      }
      return { target: { screen: 'Tests' }, fallbackUsed: false };
    }
    case 'streak':
      return { target: { screen: 'Statistics' }, fallbackUsed: false };
    case 'group':
    case 'chat': {
      const targetGroupId = groupId ?? chatId;
      if (targetGroupId) {
        return { target: { screen: 'Groups', params: { inviteGroupId: targetGroupId } }, fallbackUsed: false };
      }
      return { target: { screen: 'Groups' }, fallbackUsed: Boolean(chatId && !groupId) };
    }
    case 'friend':
      return {
        target: {
          screen: 'Groups',
          ...(friendId && groupId ? { params: { inviteGroupId: groupId } } : {}),
        },
        fallbackUsed: false,
      };
    case 'content':
      return { target: { screen: 'Library' }, fallbackUsed: false };
    case 'announcement':
      return { target: { screen: 'Notifications' }, fallbackUsed: false };
    case 'system': {
      if (notif.targetRoute === 'NotificationSettings') {
        return { target: { screen: 'NotificationSettings' }, fallbackUsed: false };
      }
      if (notif.targetRoute === 'Settings') {
        return { target: { screen: 'Settings' }, fallbackUsed: false };
      }
      if (notif.targetRoute === 'Profile') {
        return { target: { screen: 'Profile' }, fallbackUsed: false };
      }
      return { target: { screen: 'Settings' }, fallbackUsed: false };
    }
    default: {
      const cfg = getNotificationTypeConfig(kind);
      return {
        target: { screen: cfg.defaultRoute } as AppStackNavigationTarget,
        fallbackUsed: true,
        reason: 'unknown_kind',
      };
    }
  }
}

export function getLegacyNotificationDestination(
  notif: AppNotification,
): AppStackNavigationTarget | null {
  const knownKinds = new Set([
    'planner',
    'focus',
    'test',
    'content',
    'group',
    'streak',
    'announcement',
    'friend',
    'chat',
    'system',
  ]);
  if (!knownKinds.has(notif.kind)) return null;
  if (notif.kind === 'announcement') return null;
  const resolved = resolveNotificationDestination(notif);
  return resolved.target;
}

export function navigateWithAppNav(
  nav: Pick<AppNavigation, 'navigate'>,
  target: AppStackNavigationTarget | null,
): boolean {
  if (!target || !target.screen) return false;
  const navigateFn = nav.navigate as (screen: string, params?: unknown) => void;
  if ('params' in target && target.params !== undefined) {
    navigateFn(target.screen, target.params);
  } else {
    navigateFn(target.screen);
  }
  return true;
}

export function isDuplicateNotificationTap(notifId: string, nowMs = Date.now()): boolean {
  if (!notifId) return false;
  const last = recentNotificationTaps.get(notifId);
  if (last !== undefined && nowMs - last < RECENT_TAP_WINDOW_MS) {
    return true;
  }
  recentNotificationTaps.set(notifId, nowMs);
  // Prune old entries
  if (recentNotificationTaps.size > 50) {
    for (const [key, ts] of recentNotificationTaps.entries()) {
      if (nowMs - ts >= RECENT_TAP_WINDOW_MS * 5) {
        recentNotificationTaps.delete(key);
      }
    }
  }
  return false;
}

export function clearNotificationTapGuard(): void {
  recentNotificationTaps.clear();
}

export function setPendingNotificationIntent(notif: AppNotification): void {
  pendingIntent = { notif, receivedAt: Date.now() };
}

export function getPendingNotificationIntent(): { notif: AppNotification; receivedAt: number } | null {
  return pendingIntent;
}

export function clearPendingNotificationIntent(): void {
  pendingIntent = null;
}

export function flushPendingNotificationIntent(
  navigationRef: Pick<NavigationContainerRef<RootStackParamList>, 'isReady' | 'navigate'>,
  context: {
    authenticated: boolean;
    hydrated: boolean;
    authReady: boolean;
    blockingIntro: boolean;
    knownResultIds?: ReadonlySet<string>;
    knownTestIds?: ReadonlySet<string>;
    knownPlanIds?: ReadonlySet<string>;
  },
): boolean {
  if (!pendingIntent) return false;
  if (
    !navigationRef.isReady() ||
    !context.authenticated ||
    !context.hydrated ||
    !context.authReady ||
    context.blockingIntro
  ) {
    return false;
  }

  const { notif } = pendingIntent;
  pendingIntent = null;

  if (isDuplicateNotificationTap(notif.id)) return false;

  const { target } = resolveNotificationDestination(notif, {
    knownResultIds: context.knownResultIds,
    knownTestIds: context.knownTestIds,
    knownPlanIds: context.knownPlanIds,
  });

  if (!target || target.screen === 'Notifications') {
    navigationRef.navigate('Dashboard', { screen: 'Notifications' });
    return true;
  }

  navigationRef.navigate('Dashboard', {
    screen: target.screen,
    ...('params' in target && target.params ? { params: target.params } : {}),
  } as never);
  return true;
}
