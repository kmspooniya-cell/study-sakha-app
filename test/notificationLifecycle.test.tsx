import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStorage = new Map<string, string>();
const mockNavigate = jest.fn();
const mockAuthListeners = new Set<(event: string, session: { access_token: string } | null) => void>();
let mockCurrentSession: { access_token: string } | null = { access_token: 'user-token' };

const mockUser = {
  id: 'notif-user-1',
  email: 'aspirant@example.test',
  created_at: '2026-01-01T00:00:00.000Z',
  user_metadata: { display_name: 'Aspirant', exam_id: 'upsc' },
};

const mockSupabase = {
  auth: {
    getSession: jest.fn(async () => ({ data: { session: mockCurrentSession }, error: null })),
    getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })),
    onAuthStateChange: jest.fn((listener: (event: string, session: { access_token: string } | null) => void) => {
      mockAuthListeners.add(listener);
      return { data: { subscription: { unsubscribe: () => mockAuthListeners.delete(listener) } } };
    }),
    signOut: jest.fn(async () => ({ error: null })),
  },
  from: jest.fn(() => {
    const query = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      is: jest.fn(() => query),
      order: jest.fn(() => query),
      range: jest.fn(async () => ({ data: [], error: null })),
      limit: jest.fn(async () => ({ data: [], error: null })),
      maybeSingle: jest.fn(async () => ({ data: null, error: null })),
    };
    return query;
  }),
  rpc: jest.fn(async () => ({ data: false, error: null })),
};

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

jest.mock('../lib/supabase', () => ({
  STUDENT_CONTENT_BUCKET: 'Student-content',
  supabase: mockSupabase,
  supabaseConfigured: true,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');
  const Icon = ({ name }: { name: string }) => ReactActual.createElement(RNText, null, name);
  Icon.glyphMap = {};
  return { __esModule: true, default: Icon };
});

jest.mock('lucide-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return new Proxy({}, {
    get: (_target, icon) => (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, accessibilityLabel: String(icon) }),
  });
});

jest.mock('../components/Shell', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View, Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Shell: ({ children, subtitle, headerRight }: { children: React.ReactNode; subtitle?: string; headerRight?: React.ReactNode }) =>
      ReactActual.createElement(
        View,
        null,
        subtitle ? ReactActual.createElement(RNText, { testID: 'shell-subtitle' }, subtitle) : null,
        headerRight,
        children,
      ),
    useLayout: () => ({ isMobile: false, isDesktop: false, width: 800 }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaInsetsContext: jest.requireActual<typeof import('react')>('react').createContext({ top: 0, right: 0, bottom: 0, left: 0 }),
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
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => ({ identifier: 'id' })),
  getPresentedNotificationsAsync: jest.fn(async () => []),
}));

const { StoreProvider, getUserScopedStorageKey, reducer, useStore } = require('../lib/store') as typeof import('../lib/store');
const { ThemeProvider: SSDSThemeProvider } = require('../study-sakha-design-system-native/src/theme/ThemeProvider') as {
  ThemeProvider: typeof import('../study-sakha-design-system-native/src/theme/ThemeProvider').ThemeProvider;
};
const { notificationFromExpoNotification, notificationFromExpoResponse, getNotificationDestination } = require('../lib/notifications') as typeof import('../lib/notifications');
const NotificationsScreen = require('../screens/NotificationsScreen').default as typeof import('../screens/NotificationsScreen').default;

function NotificationReceiverHarness({ expoEvent }: { expoEvent: unknown }) {
  const { dispatch, unread } = useStore();
  return (
    <>
      <Text testID="unread-count">{unread}</Text>
      <Pressable
        testID="receive-expo"
        onPress={() => {
          const notif = notificationFromExpoNotification(expoEvent);
          if (notif) dispatch({ type: 'notify', notif, fromSystem: true });
        }}
      />
      <SSDSThemeProvider><NotificationsScreen /></SSDSThemeProvider>
    </>
  );
}

describe('Real notification system lifecycle', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockAuthListeners.clear();
    mockCurrentSession = { access_token: 'user-token' };
    jest.clearAllMocks();
  });

  it('shows no fake notifications on initial empty state', async () => {
    const view = render(
      <StoreProvider>
        <SSDSThemeProvider><NotificationsScreen /></SSDSThemeProvider>
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(view.getByText("You're all caught up!")).toBeTruthy();
      expect(view.getByText('All caught up')).toBeTruthy();
    });
    view.unmount();
  });

  it('captures received Expo notification payloads, deduplicates, persists across restart, and navigates on tap', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const expoPayload = {
      date: nowSec,
      request: {
        identifier: 'study-sakha-planner-plan-123',
        content: {
          title: 'Study Sakha reminder',
          body: 'Current Affairs',
          data: {
            route: 'Notifications',
            plannerItemId: 'plan-123',
            kind: 'planner',
          },
        },
      },
    };

    const view = render(
      <StoreProvider>
        <SSDSThemeProvider><NotificationReceiverHarness expoEvent={expoPayload} /></SSDSThemeProvider>
      </StoreProvider>,
    );

    await waitFor(() => expect(view.getByText("You're all caught up!")).toBeTruthy());

    // Simulate foreground arrival + system tray tap delivering the same notification ID twice
    fireEvent.press(view.getByTestId('receive-expo'));
    fireEvent.press(view.getByTestId('receive-expo'));

    await waitFor(() => {
      expect(view.getByText('Study Sakha reminder')).toBeTruthy();
      expect(view.getByText('Current Affairs')).toBeTruthy();
      expect(view.getByText('TODAY')).toBeTruthy();
      expect(view.getByTestId('unread-count').props.children).toBe(1);
      expect(view.getAllByText('Study Sakha reminder')).toHaveLength(1);
    });

    // Ensure response extraction matches
    const fromTap = notificationFromExpoResponse({ notification: expoPayload });
    expect(fromTap).toMatchObject({
      id: 'study-sakha-planner-plan-123',
      title: 'Study Sakha reminder',
      body: 'Current Affairs',
      kind: 'planner',
      plannerItemId: 'plan-123',
      read: false,
    });

    // Restart app and confirm persistence + unread badge
    view.unmount();
    const restarted = render(
      <StoreProvider>
        <SSDSThemeProvider><NotificationReceiverHarness expoEvent={expoPayload} /></SSDSThemeProvider>
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(restarted.getByText('Study Sakha reminder')).toBeTruthy();
      expect(restarted.getByTestId('unread-count').props.children).toBe(1);
    });

    // Tapping notification marks as read and opens the referenced task in StudyPlanner
    fireEvent.press(restarted.getByTestId('notification-row-study-sakha-planner-plan-123'));

    await waitFor(() => {
      expect(restarted.getByTestId('unread-count').props.children).toBe(0);
      expect(mockNavigate).toHaveBeenCalledWith('StudyPlanner', { openPlanId: 'plan-123' });
    });

    // Delete notification via contextual menu and confirm removal persists
    fireEvent.press(restarted.getByTestId('notification-more-study-sakha-planner-plan-123'));
    await waitFor(() => expect(restarted.getByTestId('action-menu-delete')).toBeTruthy());
    fireEvent.press(restarted.getByTestId('action-menu-delete'));
    await waitFor(() => {
      expect(restarted.queryByText('Study Sakha reminder')).toBeNull();
      const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
      const saved = JSON.parse(mockStorage.get(storageKey) ?? '{}');
      expect(saved.notifications).toEqual([]);
    });
    restarted.unmount();
  });

  it('groups notifications into Today, Yesterday, and Earlier and routes safely by type', async () => {
    const now = Date.now();
    const yesterday = now - 24 * 60 * 60 * 1000;
    const thisWeek = now - 4 * 24 * 60 * 60 * 1000;
    const earlier = now - 10 * 24 * 60 * 60 * 1000;
    const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
    mockStorage.set(storageKey, JSON.stringify({
      notifications: [
        { id: 'n-today', title: 'Group Invite', body: 'Join UPSC Mains Hall', at: now, kind: 'group', groupId: 'grp-1', read: false },
        { id: 'n-yest', title: 'Test Ready', body: 'Mock #12 evaluated', at: yesterday, kind: 'test', resultId: 'res-1', read: false },
        { id: 'n-week', title: 'Weekly Focus', body: '2h logged', at: thisWeek, kind: 'focus', read: true },
        { id: 'n-early', title: 'Unknown Alert', body: 'General message', at: earlier, kind: 'announcement', read: true },
      ],
    }));

    const view = render(
      <StoreProvider>
        <SSDSThemeProvider><NotificationsScreen /></SSDSThemeProvider>
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(view.getByText('TODAY')).toBeTruthy();
      expect(view.getByText('YESTERDAY')).toBeTruthy();
      expect(view.getByText('THIS WEEK')).toBeTruthy();
      expect(view.getByText('EARLIER')).toBeTruthy();
    });

    expect(getNotificationDestination({
      id: 'x', title: 'Unknown', body: 'Body', at: now, kind: 'unexpected_kind' as never, read: false,
    })).toBeNull();

    fireEvent.press(view.getByTestId('notification-row-n-today'));
    expect(mockNavigate).toHaveBeenCalledWith('Groups', { inviteGroupId: 'grp-1' });

    fireEvent.press(view.getByTestId('notification-row-n-yest'));
    expect(mockNavigate).toHaveBeenCalledWith('TestResult', { resultId: 'res-1' });
    view.unmount();
  });

  it('deduplicates notifications at the reducer level', () => {
    const initial = { settings: { notifications: true }, notifications: [] } as never;
    const notif = { id: 'dup-1', title: 'Reminder', body: 'Study', at: 1000, kind: 'planner' as const, read: false };
    const once = reducer(initial, { type: 'notify', notif });
    const twice = reducer(once, { type: 'notify', notif });
    expect(twice.notifications).toHaveLength(1);
  });
});
