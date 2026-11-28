import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { endGroupRoomFocus, getGroupRoomFocusActivity, publishGroupRoomFocus } from '../lib/groupRoomFocusBridge';

jest.mock('../lib/ssds', () => require('./ssdsScreenMocks'));
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (init: number | boolean) => ({ value: init }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withSpring: (val: number) => val,
    withTiming: (val: number) => val,
    interpolate: (_val: number, _input: number[], output: number[]) => output[0],
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const chain = {
    minDistance: () => chain,
    onStart: () => chain,
    onUpdate: () => chain,
    onEnd: () => chain,
    onFinalize: () => chain,
  };
  return {
    Gesture: { Pan: () => chain },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

const mockStorage = new Map<string, string>();
const mockNavigate = jest.fn();
const mockPopTo = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockSetParams = jest.fn();
const mockReplace = jest.fn();
const mockOnBackToFocus = jest.fn();

const mockStore = {
  state: {
    storageReady: true,
    user: { id: 'focus-user-1', name: 'Test User' },
    settings: {
      focusDurationMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      focusThemeId: 'obsidian',
      focusAnimationIntensity: 'balanced',
      reduceFocusMotion: false,
      focusMusicId: 'pure_cosmic_waves',
      focusMusicVolume: 0.65,
      focusAutoStartNextSession: true,
    },
    plannerTaskStudySeconds: {},
    plannerScheduleCompletions: {},
  },
  dispatch: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
  },
}));

jest.mock('@react-navigation/native', () => {
  const ReactActual = require('react');
  return {
    useNavigation: () => ({
      navigate: mockNavigate,
      popTo: mockPopTo,
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
      setParams: mockSetParams,
      replace: mockReplace,
    }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, [cb]),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const ReactActual = require('react');
  const { Text: RNText } = require('react-native');
  return { __esModule: true, default: ({ name }: { name: string }) => ReactActual.createElement(RNText, null, name) };
});

jest.mock('../lib/store', () => ({
  useStore: () => mockStore,
  dayKey: () => '2026-11-26',
  getUserScopedStorageKey: (key: string, userId?: string | null) => `${key}:user:${userId ?? 'local'}`,
}));

jest.mock('../lib/theme', () => ({
  shadow: () => ({}),
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { card: 16, dialog: 20, pill: 999 },
  fonts: { display: 'System', body: 'System' },
  useTheme: () => ({
    scheme: 'light',
    f: (n: number) => n,
    colors: {
      surface: '#FFFFFF',
      surfaceAlt: '#F2F2F7',
      border: '#E5E5EA',
      text: '#111827',
      textMuted: '#6B7280',
      blue: '#2563EB',
      teal: '#14B8A6',
      warning: '#F59E0B',
      danger: '#EF4444',
    },
  }),
}));

jest.mock('../lib/groupRooms', () => ({
  getActiveStudyGroups: jest.fn(async () => []),
}));

jest.mock('../lib/groupActivitySync', () => ({
  retryPendingStudyMemberActivities: jest.fn(async () => []),
  syncStudyMemberActivityWithRetry: jest.fn(async () => ({ failures: [] })),
}));

jest.mock('../lib/groupRoomRealtime', () => ({
  useGroupFocusPresence: jest.fn(),
}));

jest.mock('../lib/focusHistory', () => ({
  appendFocusHistory: jest.fn(async (_k: string, record: unknown) => [record]),
}));

jest.mock('../components/GeminiFocusTimer', () => {
  const ReactActual = require('react');
  const { Pressable: RNPressable, Text: RNText, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ timer, subject, onStop, onNavigateApp }: {
      timer: { remainingSeconds: number; running: boolean };
      subject: string;
      onStop: () => void;
      onNavigateApp?: (route?: string) => void;
    }) => ReactActual.createElement(
      View,
      null,
      ReactActual.createElement(RNText, { testID: 'timer-remaining' }, String(timer.remainingSeconds)),
      ReactActual.createElement(RNText, { testID: 'timer-subject' }, subject),
      ReactActual.createElement(RNPressable, { onPress: () => onNavigateApp?.('StudyPlanner') }, ReactActual.createElement(RNText, null, 'Go to Study Planner')),
      ReactActual.createElement(RNPressable, { onPress: () => onNavigateApp?.('Library') }, ReactActual.createElement(RNText, null, 'Go to Library')),
      ReactActual.createElement(RNPressable, { onPress: () => onNavigateApp?.('SakhaAI') }, ReactActual.createElement(RNText, null, 'Go to Sakha AI')),
      ReactActual.createElement(RNPressable, { onPress: onStop }, ReactActual.createElement(RNText, null, 'Stop Focus')),
    ),
  };
});

jest.mock('../components/FocusMusicSelection', () => ({ FocusMusicSelection: () => null }));
jest.mock('../components/Shell', () => ({ isAppDrawerOpen: () => false }));

const { FocusSessionProvider, useFocusSession } = require('../lib/focusSession') as typeof import('../lib/focusSession');
const { FloatingFocusBar } = require('../components/FloatingFocusBar') as typeof import('../components/FloatingFocusBar');
const FocusCenterScreen = require('../screens/FocusCenterScreen').default as typeof import('../screens/FocusCenterScreen').default;

function GlobalFocusHarness({ currentScreen }: { currentScreen: 'FocusCenter' | 'DashboardRoot' | 'Library' | 'StudyPlanner' | 'Groups' | 'SakhaAI' }) {
  const focus = useFocusSession();
  const [screen, setScreen] = React.useState(currentScreen);

  return (
    <>
      <Text testID="active-screen">{screen}</Text>
      <Text testID="session-id">{focus.session?.id ?? 'none'}</Text>
      <Text testID="session-task-id">{focus.session?.taskId ?? 'none'}</Text>
      <Pressable
        testID="start-task-session"
        onPress={() => {
          focus.startSession({
            mode: 'timer',
            durationMinutes: 25,
            selection: 'schedule',
            tag: 'General Studies',
            task: {
              id: 'task-ca',
              category: 'Tasks',
              title: 'Current Affairs',
              subject: 'General Studies',
              date: '2026-11-26',
              durationMinutes: 25,
            },
            scheduleOccurrenceId: 'task-ca::2026-11-26',
          });
        }}
      />
      <Pressable testID="nav-dashboard" onPress={() => setScreen('DashboardRoot')} />
      <Pressable testID="nav-library" onPress={() => setScreen('Library')} />
      <Pressable testID="nav-planner" onPress={() => setScreen('StudyPlanner')} />
      <Pressable testID="nav-groups" onPress={() => setScreen('Groups')} />
      <Pressable testID="nav-ai" onPress={() => setScreen('SakhaAI')} />
      <Pressable testID="nav-focus" onPress={() => setScreen('FocusCenter')} />
      <Pressable
        testID="end-session"
        onPress={() => {
          if (focus.session) void focus.discardSession(focus.session);
        }}
      />

      {screen === 'FocusCenter' ? <FocusCenterScreen /> : null}
      <FloatingFocusBar
        visible={screen !== 'FocusCenter'}
        onPressBackToFocus={() => {
          mockOnBackToFocus();
          setScreen('FocusCenter');
        }}
      />
    </>
  );
}

describe('Global Focus Session & persistent Back-to-Focus bar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    endGroupRoomFocus('room-1');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    endGroupRoomFocus('room-1');
  });

  it('navigates freely from Focus Centre, keeps timer accurate, shows Back-to-Focus bar externally, and hides on FocusCentre or end', async () => {
    jest.useFakeTimers();
    const view = render(
      <FocusSessionProvider>
        <GlobalFocusHarness currentScreen="FocusCenter" />
      </FocusSessionProvider>,
    );

    await act(async () => { await Promise.resolve(); });
    fireEvent.press(view.getByTestId('start-task-session'));
    const initialSessionId = view.getByTestId('session-id').props.children;
    expect(initialSessionId).not.toBe('none');
    expect(view.getByTestId('session-task-id').props.children).toBe('task-ca');

    // Inside FocusCenter: bar is hidden; user can navigate straight to StudyPlanner/Library/SakhaAI
    expect(view.queryByLabelText('Back to Focus')).toBeNull();
    fireEvent.press(view.getByText('Go to Study Planner'));
    expect(mockNavigate).toHaveBeenCalledWith('StudyPlanner');

    // Move out to Dashboard, Library, StudyPlanner, Groups, SakhaAI — bubble appears collapsed and expands on tap
    fireEvent.press(view.getByTestId('nav-dashboard'));
    expect(view.getByTestId('focus-bubble-collapsed')).toBeTruthy();
    fireEvent.press(view.getByTestId('focus-bubble-collapsed'));
    expect(view.getByLabelText('Back to Focus')).toBeTruthy();
    expect(view.getByText('25:00')).toBeTruthy();

    act(() => jest.advanceTimersByTime(25_000));
    fireEvent.press(view.getByTestId('focus-bubble-collapsed'));
    expect(view.getByText('24:35')).toBeTruthy();

    fireEvent.press(view.getByTestId('nav-library'));
    expect(view.getByTestId('active-session-bar')).toBeTruthy();
    fireEvent.press(view.getByTestId('nav-planner'));
    expect(view.getByTestId('active-session-bar')).toBeTruthy();
    fireEvent.press(view.getByTestId('nav-groups'));
    expect(view.getByTestId('active-session-bar')).toBeTruthy();
    fireEvent.press(view.getByTestId('nav-ai'));
    expect(view.getByTestId('active-session-bar')).toBeTruthy();

    // Group Hall activity stays independent
    publishGroupRoomFocus({
      groupId: 'grp-1',
      roomId: 'silent-focus',
      roomSessionId: 'room-1',
      subject: 'Polity',
      status: 'focusing',
      startedAt: new Date().toISOString(),
      elapsedSeconds: 10,
      updatedAt: new Date().toISOString(),
    }, 'start');
    expect(getGroupRoomFocusActivity('room-1')?.subject).toBe('Polity');

    // Tap Back to Focus: restores FocusCenter with exact original session & remaining seconds (1475)
    fireEvent.press(view.getByLabelText('Back to Focus'));
    expect(mockOnBackToFocus).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('active-screen').props.children).toBe('FocusCenter');
    expect(view.getByTestId('session-id').props.children).toBe(initialSessionId);
    expect(view.getByTestId('session-task-id').props.children).toBe('task-ca');
    expect(view.getByTestId('timer-remaining').props.children).toBe('1475');
    expect(view.queryByLabelText('Back to Focus')).toBeNull();

    // Ending session clears active session and removes bubble externally
    fireEvent.press(view.getByTestId('nav-dashboard'));
    expect(view.getByTestId('active-session-bar')).toBeTruthy();
    await act(async () => {
      fireEvent.press(view.getByTestId('end-session'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(view.getByTestId('session-id').props.children).toBe('none');
      expect(view.queryByTestId('active-session-bar')).toBeNull();
    });
    expect(getGroupRoomFocusActivity('room-1')).toBeTruthy();
    view.unmount();
  });

  it('restores an active session and Back-to-Focus bar after app restart', async () => {
    const now = Date.now();
    mockStorage.set('study-sakha-focus-active-session-v1:user:focus-user-1', JSON.stringify({
      id: 'persisted-focus-1',
      userId: 'focus-user-1',
      startedAt: new Date(now - 60_000).toISOString(),
      mode: 'timer',
      sessionType: 'study',
      plannedSeconds: 1500,
      focusedMilliseconds: 0,
      focusSegmentStartedAt: now - 60_000,
      phase: 'focus',
      resumePhase: null,
      breakElapsedMilliseconds: 0,
      breakStartedAt: null,
      subject: 'General Studies',
      topic: 'Current Affairs',
      taskId: 'task-ca',
      scheduleId: 'task-ca',
      scheduleOccurrenceId: 'task-ca::2026-11-26',
      schedulePlannedSeconds: 1500,
      task: { id: 'task-ca', category: 'Tasks', title: 'Current Affairs', date: '2026-11-26' },
      groupId: null,
      sessionLabel: '25-minute Focus',
      endRequested: false,
    }));

    const restarted = render(
      <FocusSessionProvider>
        <GlobalFocusHarness currentScreen="DashboardRoot" />
      </FocusSessionProvider>,
    );

    await waitFor(() => {
      expect(restarted.getByTestId('session-id').props.children).toBe('persisted-focus-1');
      expect(restarted.getByTestId('session-task-id').props.children).toBe('task-ca');
      expect(restarted.getByTestId('focus-bubble-collapsed')).toBeTruthy();
    });
    fireEvent.press(restarted.getByTestId('focus-bubble-collapsed'));
    expect(restarted.getByLabelText('Back to Focus')).toBeTruthy();
    expect(restarted.getByText('Current Affairs · General Studies')).toBeTruthy();
    restarted.unmount();
  });
});
