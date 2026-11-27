import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStorage = new Map<string, string>();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRpc = jest.fn(async () => ({ data: 1, error: null }));
const mockUpsert = jest.fn(async () => ({ error: null }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
    getAllKeys: jest.fn(async () => [...mockStorage.keys()]),
  },
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
  getAllKeys: jest.fn(async () => [...mockStorage.keys()]),
}));

const mockUser = {
  id: 'nc-user-1',
  email: 'aspirant@studysakha.test',
  created_at: '2026-01-01T00:00:00.000Z',
  user_metadata: { display_name: 'Aspirant', exam_id: 'ras' },
};

jest.mock('../lib/supabase', () => ({
  STUDENT_CONTENT_BUCKET: 'Student-content',
  supabaseConfigured: true,
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: { access_token: 'tok' } }, error: null })),
      getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signOut: jest.fn(async () => ({ error: null })),
    },
    from: jest.fn(() => {
      const chain = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        is: jest.fn(() => chain),
        order: jest.fn(() => chain),
        limit: jest.fn(async () => ({ data: [], error: null })),
        range: jest.fn(async () => ({ data: [], error: null })),
        maybeSingle: jest.fn(async () => ({ data: null, error: null })),
        upsert: mockUpsert,
      };
      return chain;
    }),
    rpc: mockRpc,
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })),
    removeChannel: jest.fn(async () => undefined),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: () => true,
    isFocused: () => true,
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');
  const Icon = ({ name }: { name: string }) => ReactActual.createElement(RNText, null, name);
  Icon.glyphMap = {};
  return { __esModule: true, default: Icon };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (init: number) => ({ value: init }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withSpring: (val: number) => val,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const chain = {
    enabled: () => chain,
    activeOffsetX: () => chain,
    failOffsetY: () => chain,
    onBegin: () => chain,
    onUpdate: () => chain,
    onEnd: () => chain,
  };
  return {
    Gesture: { Pan: () => chain },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('expo-notifications', () => ({
  __esModule: true,
  AndroidImportance: { DEFAULT: 3, HIGH: 4, LOW: 2 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => ({ identifier: 'id' })),
  getPresentedNotificationsAsync: jest.fn(async () => []),
}));

const { supabase: mockSupabaseClient } = require('../lib/supabase') as {
  supabase: { rpc: jest.Mock };
};
const { shouldHideAppShell } = require('../lib/navigation') as typeof import('../lib/navigation');
const {
  deduplicateNotifications,
  isDeliverableNotification,
} = require('../lib/notifications/notificationDeduplication') as typeof import('../lib/notifications/notificationDeduplication');
const {
  createDefaultNotificationPreferences,
  isWithinQuietHours,
  shouldDeliverPush,
  shouldShowInInbox,
} = require('../lib/notifications/notificationPreferences') as typeof import('../lib/notifications/notificationPreferences');
const {
  clearNotificationTapGuard,
  flushPendingNotificationIntent,
  isDuplicateNotificationTap,
  resolveNotificationDestination,
  setPendingNotificationIntent,
} = require('../lib/notifications/notificationRouter') as typeof import('../lib/notifications/notificationRouter');
const {
  getActiveAnnouncements,
  getNotificationDateGroup,
  getNotificationFilterCounts,
  getUnreadNotificationCount,
  getVisibleNotifications,
  groupNotificationsByDate,
} = require('../lib/notifications/notificationSelectors') as typeof import('../lib/notifications/notificationSelectors');
const {
  enqueueNotificationOperation,
  flushNotificationSyncQueue,
  loadNotificationSyncQueue,
} = require('../lib/notifications/notificationSync') as typeof import('../lib/notifications/notificationSync');
const { getCategoryForKind, normalizeNotificationKind } = require('../lib/notifications/registry') as typeof import('../lib/notifications/registry');
import type { AppNotification } from '../lib/notifications/types';
const { StoreProvider, getUserScopedStorageKey, reducer } = require('../lib/store') as typeof import('../lib/store');
const NotificationsScreen = require('../screens/NotificationsScreen').default as typeof import('../screens/NotificationsScreen').default;
const NotificationSettingsScreen = require('../screens/NotificationSettingsScreen').default as typeof import('../screens/NotificationSettingsScreen').default;

describe('Notification Centre unit & integration tests', () => {
  beforeEach(() => {
    mockStorage.clear();
    clearNotificationTapGuard();
    jest.clearAllMocks();
  });

  it('normalizes known and unknown notification types safely', () => {
    expect(normalizeNotificationKind('planner')).toBe('planner');
    expect(normalizeNotificationKind('reminder')).toBe('planner');
    expect(normalizeNotificationKind('friend_request')).toBe('friend');
    expect(normalizeNotificationKind('totally_unknown_type')).toBe('system');
    expect(getCategoryForKind('planner')).toBe('study');
    expect(getCategoryForKind('group')).toBe('social');
    expect(getCategoryForKind('announcement')).toBe('updates');
  });

  it('groups timestamps into Today, Yesterday, This Week, and Earlier and ignores future/invalid items', () => {
    const now = new Date('2026-11-27T14:00:00').getTime();
    const today = new Date('2026-11-27T09:00:00').getTime();
    const yesterday = new Date('2026-11-26T18:00:00').getTime();
    const thisWeek = new Date('2026-11-23T12:00:00').getTime();
    const earlier = new Date('2026-11-10T12:00:00').getTime();
    const future = now + 60 * 60 * 1000;

    expect(getNotificationDateGroup(today, now)).toBe('Today');
    expect(getNotificationDateGroup(yesterday, now)).toBe('Yesterday');
    expect(getNotificationDateGroup(thisWeek, now)).toBe('This Week');
    expect(getNotificationDateGroup(earlier, now)).toBe('Earlier');
    expect(getNotificationDateGroup(NaN, now)).toBe('Earlier');

    const items: AppNotification[] = [
      { id: '1', title: 'T', body: 'B', at: today, kind: 'planner', read: false },
      { id: '2', title: 'Y', body: 'B', at: yesterday, kind: 'group', read: false },
      { id: '3', title: 'W', body: 'B', at: thisWeek, kind: 'test', read: true },
      { id: '4', title: 'E', body: 'B', at: earlier, kind: 'announcement', read: true },
      { id: '5', title: 'Future', body: 'B', at: future, kind: 'planner', read: false },
    ];

    expect(isDeliverableNotification(items[4], now)).toBe(false);
    const visible = getVisibleNotifications(items, 'all', now);
    expect(visible.map((i) => i.id)).toEqual(['1', '2', '3', '4']);

    const grouped = groupNotificationsByDate(visible, now);
    expect(grouped.filter((r) => r.type === 'header').map((r) => (r as { title: string }).title)).toEqual([
      'Today',
      'Yesterday',
      'This Week',
      'Earlier',
    ]);
  });

  it('computes unread and 5 smart filter counts accurately and deduplicates by id/eventKey', () => {
    const now = Date.now();
    const raw: AppNotification[] = [
      { id: 'a', eventKey: 'planner:1', title: 'P1', body: 'B', at: now, kind: 'planner', read: false },
      { id: 'b', eventKey: 'planner:1', title: 'P1 dup', body: 'B', at: now + 100, kind: 'planner', read: false },
      { id: 'c', title: 'G1', body: 'B', at: now - 100, kind: 'group', read: false },
      { id: 'd', title: 'A1', body: 'B', at: now - 200, kind: 'announcement', read: true },
    ];

    const deduped = deduplicateNotifications(raw);
    expect(deduped).toHaveLength(3);
    expect(getUnreadNotificationCount(deduped, now + 500)).toBe(2);

    const counts = getNotificationFilterCounts(deduped, now + 500);
    expect(counts).toEqual({
      all: 3,
      unread: 2,
      study: 1,
      social: 1,
      updates: 1,
    });
  });

  it('evaluates Quiet Hours across midnight and separates push vs inbox delivery', () => {
    const prefs = createDefaultNotificationPreferences();
    prefs.quietHours = {
      enabled: true,
      startTime: '22:30',
      endTime: '05:30',
      timezone: 'UTC',
    };

    const lateNight = new Date('2026-11-27T23:15:00Z');
    const earlyMorning = new Date('2026-11-28T04:45:00Z');
    const midday = new Date('2026-11-27T13:00:00Z');

    expect(isWithinQuietHours(prefs.quietHours, lateNight)).toBe(true);
    expect(isWithinQuietHours(prefs.quietHours, earlyMorning)).toBe(true);
    expect(isWithinQuietHours(prefs.quietHours, midday)).toBe(false);

    // Push suppressed during quiet hours, but inbox still shows item
    expect(shouldDeliverPush('planner', prefs, { now: lateNight })).toBe(false);
    expect(shouldShowInInbox('planner', prefs)).toBe(true);
    // Critical alarms bypass quiet hours
    expect(shouldDeliverPush('planner', prefs, { isCriticalAlarm: true, now: lateNight })).toBe(true);
  });

  it('routes destinations safely, prevents duplicate taps, and flushes pending cold-start intents', () => {
    expect(resolveNotificationDestination({
      id: 's1', title: 'Streak', body: '7 days', at: 1000, kind: 'streak', read: false,
    }).target).toEqual({ screen: 'Statistics' });

    expect(resolveNotificationDestination({
      id: 't1', title: 'Test', body: 'Result', at: 1000, kind: 'test', resultId: 'missing-res', read: false,
    }, { knownResultIds: new Set(['real-res']) })).toEqual({
      target: { screen: 'Tests' },
      fallbackUsed: true,
      reason: 'test_result_missing',
    });

    expect(isDuplicateNotificationTap('tap-1', 1000)).toBe(false);
    expect(isDuplicateNotificationTap('tap-1', 1500)).toBe(true);

    const mockNavRef = {
      isReady: () => true,
      navigate: jest.fn(),
    };
    setPendingNotificationIntent({
      id: 'cold-1', title: 'Plan', body: 'Revise Polity', at: 1000, kind: 'planner', plannerItemId: 'p-9', read: false,
    });
    // Blocked while unauthenticated
    expect(flushPendingNotificationIntent(mockNavRef, {
      authenticated: false, hydrated: true, authReady: true, blockingIntro: false,
    })).toBe(false);
    // Flushed once authenticated & ready
    expect(flushPendingNotificationIntent(mockNavRef, {
      authenticated: true, hydrated: true, authReady: true, blockingIntro: false,
    })).toBe(true);
    expect(mockNavRef.navigate).toHaveBeenCalledWith('Dashboard', {
      screen: 'StudyPlanner',
      params: { openPlanId: 'p-9' },
    });
  });

  it('hides AppShell chrome only for immersive notification routes', () => {
    expect(shouldHideAppShell('Notifications')).toBe(true);
    expect(shouldHideAppShell('NotificationSettings')).toBe(true);
    expect(shouldHideAppShell('DashboardRoot')).toBe(false);
    expect(shouldHideAppShell('Settings')).toBe(false);
  });

  it('supports reducer bulk mark read, unread, delete, and restore', () => {
    const base = {
      settings: { notifications: true },
      notifications: [
        { id: 'n1', title: '1', body: 'B', at: 1000, kind: 'planner' as const, read: false },
        { id: 'n2', title: '2', body: 'B', at: 2000, kind: 'group' as const, read: true },
      ],
    } as never;

    const marked = reducer(base, { type: 'markNotifsRead', ids: ['n1'] });
    expect(marked.notifications[0].read).toBe(true);

    const unreaded = reducer(marked, { type: 'unreadNotif', ids: ['n2'] });
    expect(unreaded.notifications[1].read).toBe(false);

    const deleted = reducer(unreaded, { type: 'deleteNotifs', ids: ['n1'] });
    expect(deleted.notifications).toHaveLength(1);

    const restored = reducer(deleted, {
      type: 'restoreNotifs',
      items: [{ id: 'n1', title: '1', body: 'B', at: 1000, kind: 'planner', read: true }],
    });
    expect(restored.notifications).toHaveLength(2);
  });

  it('filters expired & dismissed announcements without mutating source announcements', () => {
    const now = Date.now();
    const list = [
      { id: 'a-exp', title: 'Expired', body: 'Old', audience: 'All', at: now - 10000, expiresAt: now - 100 },
      { id: 'a-ok', title: 'Active', body: 'Live', audience: 'All', at: now - 500 },
    ];
    expect(getActiveAnnouncements(list, new Set())).toHaveLength(1);
    expect(getActiveAnnouncements(list, new Set(['a-ok']))).toHaveLength(0);
    expect(list).toHaveLength(2);
  });

  it('flushes offline notification queue to Supabase RPCs', async () => {
    await enqueueNotificationOperation('nc-user-1', { type: 'mark_read', ids: ['n1'] });
    await enqueueNotificationOperation('nc-user-1', { type: 'archive', ids: ['n2'] });
    const res = await flushNotificationSyncQueue('nc-user-1');
    expect(res).toEqual({ flushed: 2, remaining: 0 });
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('mark_notifications_read', {
      notification_ids: ['n1'],
      mark_read: true,
    });
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('archive_notifications', {
      notification_ids: ['n2'],
      restore: false,
    });
    const remaining = await loadNotificationSyncQueue('nc-user-1');
    expect(remaining).toEqual([]);
  });

  it('renders NotificationsScreen with 5 filters, selection mode, delete and undo', async () => {
    const now = Date.now();
    const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
    mockStorage.set(storageKey, JSON.stringify({
      notifications: [
        { id: 'n-study', title: 'Polity Revision', body: 'Scheduled at 5 PM', at: now, kind: 'planner', read: false },
        { id: 'n-social', title: 'Group Invite', body: 'RAS Mains Hall', at: now - 1000, kind: 'group', read: false },
      ],
    }));

    const view = render(
      <StoreProvider>
        <NotificationsScreen />
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId('notifications-immersive-screen')).toBeTruthy();
      expect(view.getByTestId('notification-filter-all')).toBeTruthy();
      expect(view.getByTestId('notification-filter-unread')).toBeTruthy();
      expect(view.getByTestId('notification-filter-study')).toBeTruthy();
      expect(view.getByTestId('notification-filter-social')).toBeTruthy();
      expect(view.getByTestId('notification-filter-updates')).toBeTruthy();
      expect(view.getByText('Polity Revision')).toBeTruthy();
      expect(view.getByText('Group Invite')).toBeTruthy();
    });

    // Normal closed state must NOT render swipe action panels
    expect(view.queryByTestId('notification-swipe-left-n-study')).toBeNull();
    expect(view.queryByTestId('notification-swipe-right-n-study')).toBeNull();

    // Filter by Study
    fireEvent.press(view.getByTestId('notification-filter-study'));
    await waitFor(() => {
      expect(view.getByText('Polity Revision')).toBeTruthy();
      expect(view.queryByText('Group Invite')).toBeNull();
    });

    // Long press to enter selection mode & delete with Undo
    fireEvent(view.getByTestId('notification-row-n-study'), 'longPress');
    await waitFor(() => expect(view.getByTestId('notification-selection-header')).toBeTruthy());
    fireEvent.press(view.getByTestId('selection-delete-button'));

    await waitFor(() => {
      expect(view.queryByText('Polity Revision')).toBeNull();
      expect(view.getByTestId('notification-undo-snackbar')).toBeTruthy();
    });

    fireEvent.press(view.getByTestId('notification-undo-button'));
    await waitFor(() => {
      expect(view.getByText('Polity Revision')).toBeTruthy();
    });
    view.unmount();
  });

  it('renders NotificationSettingsScreen with OS permission banner and persistent toggles', async () => {
    const view = render(
      <StoreProvider>
        <NotificationSettingsScreen />
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId('notification-settings-screen')).toBeTruthy();
      expect(view.getByTestId('os-permission-banner')).toBeTruthy();
    });

    fireEvent(view.getByTestId('toggle-push-enabled'), 'valueChange', false);
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled();
    });
    view.unmount();
  });

  it('keeps swipe action panels hidden in normal state and renders dark mode cleanly', async () => {
    const now = Date.now();
    const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
    mockStorage.set(storageKey, JSON.stringify({
      settings: { themeMode: 'dark' },
      notifications: [
        { id: 'n-dark-1', title: 'Dark Mode Alert', body: 'Check contrast and alignment', at: now, kind: 'planner', read: false },
        { id: 'n-dark-2', title: 'Read Alert', body: 'Neutral surface', at: now - 500, kind: 'focus', read: true },
      ],
    }));

    const view = render(
      <StoreProvider>
        <NotificationsScreen />
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(view.getByText('Dark Mode Alert')).toBeTruthy();
      expect(view.getByText('Read Alert')).toBeTruthy();
    });

    expect(view.queryByTestId('notification-swipe-left-n-dark-1')).toBeNull();
    expect(view.queryByTestId('notification-swipe-right-n-dark-1')).toBeNull();
    expect(view.queryByTestId('notification-swipe-left-n-dark-2')).toBeNull();
    expect(view.queryByTestId('notification-swipe-right-n-dark-2')).toBeNull();
    // Unread row has right-side unread indicator dot; read row does not
    expect(view.getByTestId('notification-unread-dot-n-dark-1')).toBeTruthy();
    expect(view.queryByTestId('notification-unread-dot-n-dark-2')).toBeNull();
    view.unmount();
  });
});
