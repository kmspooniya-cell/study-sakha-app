import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Keyboard, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('../lib/ssds', () => require('./ssdsScreenMocks'));

const mockNavigate = jest.fn();
const mockPopTo = jest.fn();
const mockDispatch = jest.fn();
const beforeRemoveListeners: ((event: { preventDefault: () => void }) => void)[] = [];

let mockRouteName = 'DashboardRoot';

const mockStoreValue = {
  state: {
    user: { id: 'u1', name: 'Asha', email: 'asha@example.test', role: 'learner', exam: 'upsc', joined: '2026-01-01' },
    settings: {
      themeMode: 'light' as const,
      language: 'en' as const,
      textScale: 1,
      accentColor: 'indigo',
      customAccentHex: null,
      highContrast: false,
      reduceMotion: true,
      animationIntensity: 'balanced' as const,
      displayScaling: 100,
      layoutDensity: 'comfortable' as const,
      backgroundId: 'none',
      backgroundOpacity: 1,
      overlayIntensity: 0,
      notifications: true,
      dailyGoalMin: 120,
      focusDurationMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      meditationDurationMinutes: 5,
      focusAutoStartNextSession: false,
      focusThemeId: 'obsidian',
      reduceFocusMotion: false,
      focusMusicVolume: 0.5,
      focusMusicId: 'deep_positive_energy',
      aiResponseLanguage: 'English',
      aiResponseLength: 'balanced' as const,
      aiDetailLevel: 'Standard',
      aiLearningMode: 'Teacher',
      aiSaveChatHistory: true,
      dashboardWidgets: { streakCard: true, dailyGoalRing: true },
    },
    plannerSettings: {
      dailyTargetHours: 3,
      weeklyTargetHours: 10,
      defaultTaskDurationMinutes: 45,
      autoCarryForward: true,
      recurringTasksEnabled: true,
      breakIntervalMinutes: 15,
      aiSuggestions: true,
    },
    notes: [],
    studyLog: {},
    results: [],
    recordedFocusSessionIds: [],
    planDone: {},
    plannerTasks: [],
    plannerTasksLoaded: true,
    plannerTaskLoadError: null,
    plannerPersistenceError: null,
    plannerDefaultOverrides: {},
    plannerDeletedDefaults: [],
    plannerScheduleItems: [],
    plannerSelectedDate: '2026-11-26',
    plannerTaskStudySeconds: {},
    plannerScheduleCompletions: {},
    announcements: [],
    notifications: [],
  },
  streak: 3,
  todayMinutes: 45,
  unread: 0,
  syncStatus: 'synced' as const,
  dispatch: mockDispatch,
  signOut: jest.fn(async () => ({ ok: true })),
  saveProfile: jest.fn(async () => ({ ok: true })),
};

jest.mock('@react-navigation/native', () => ({
  DrawerActions: { openDrawer: () => ({ type: 'OPEN_DRAWER' }) },
  StackActions: { popTo: (name: string) => ({ type: 'POP_TO', payload: { name } }) },
  useNavigation: () => ({
    navigate: mockNavigate,
    popTo: mockPopTo,
    dispatch: mockDispatch,
    getState: () => ({ index: 0, routes: [{ name: mockRouteName }] }),
    getParent: () => ({ getState: () => ({ history: [], routes: [] }) }),
    addListener: (event: string, listener: (e: { preventDefault: () => void }) => void) => {
      if (event === 'beforeRemove') {
        beforeRemoveListeners.push(listener);
      }
      return () => {
        const idx = beforeRemoveListeners.indexOf(listener);
        if (idx >= 0) beforeRemoveListeners.splice(idx, 1);
      };
    },
  }),
  useRoute: () => ({ name: mockRouteName, params: undefined }),
  useFocusEffect: () => undefined,
}));

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { LinearGradient: ({ children, style }: { children?: React.ReactNode; style?: unknown }) => React.createElement(View, { style }, children) };
});
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children),
    Svg: ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children),
    Circle: () => null,
    Path: () => null,
    Rect: () => null,
    Polygon: () => null,
    Defs: ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children),
    LinearGradient: ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children),
    Stop: () => null,
  };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    clear: jest.fn(async () => undefined),
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}));
jest.mock('../lib/store', () => ({
  ...(jest.requireActual('../lib/store') as object),
  useStore: () => mockStoreValue,
}));
jest.mock('../lib/notifications', () => ({ requestNotificationPermission: jest.fn(async () => true) }));
jest.mock('../lib/supabase', () => ({
  supabaseConfigured: false,
  supabase: { auth: { signInWithPassword: jest.fn(), updateUser: jest.fn() } },
}));
jest.mock('../components/FocusSessionSetupModal', () => ({
  FocusSessionSetupModal: () => null,
}));

const { ThemeProvider } = require('../lib/theme') as typeof import('../lib/theme');
const { Shell, AppBottomNav } = require('../components/Shell') as typeof import('../components/Shell');
const DashboardScreen = require('../screens/DashboardScreen').default as typeof import('../screens/DashboardScreen').default;
const SettingsScreen = require('../screens/SettingsScreen').default as typeof import('../screens/SettingsScreen').default;

function withProviders(node: React.ReactElement) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 24, right: 0, bottom: 20, left: 0 },
      }}
    >
      <ThemeProvider mode="light" reduceMotion>
        {node}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('Bottom navigation layout, Dashboard Focus Lock cleanup, and Settings back behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    beforeRemoveListeners.length = 0;
    mockRouteName = 'DashboardRoot';
  });

  it('renders AppBottomNav in normal flex flow with safe-area bottom inset (not absolute overlay)', () => {
    const view = render(
      withProviders(
        <Shell active="Profile" title="" scroll={false} contentPadding={0}>
          <View testID="screen-body" style={{ flex: 1 }}>
            <Text>Open Full Statistics</Text>
          </View>
        </Shell>
      )
    );

    expect(view.getByText('Open Full Statistics')).toBeTruthy();
    expect(view.getByText('Home')).toBeTruthy();
    expect(view.getByText('Profile')).toBeTruthy();

    const navView = render(withProviders(<AppBottomNav active="Profile" />)).getByTestId('app-bottom-nav');
    expect(navView.props.style.position).toBeUndefined();
    expect(navView.props.style.paddingBottom).toBe(20);
  });

  it('hides AppBottomNav while the native keyboard is open and restores it on close', () => {
    const keyboardListeners: Record<string, () => void> = {};
    const listenerSpy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: () => void) => {
      keyboardListeners[event] = cb;
      return { remove: jest.fn() };
    }) as unknown as typeof Keyboard.addListener);

    const view = render(
      withProviders(
        <Shell active="SakhaAI" title="" scroll={false}>
          <Text>Chat input</Text>
        </Shell>
      )
    );

    expect(view.getByTestId('app-bottom-nav')).toBeTruthy();

    act(() => {
      (keyboardListeners.keyboardWillShow ?? keyboardListeners.keyboardDidShow)?.();
    });
    expect(view.queryByTestId('app-bottom-nav')).toBeNull();

    act(() => {
      (keyboardListeners.keyboardWillHide ?? keyboardListeners.keyboardDidHide)?.();
    });
    expect(view.getByTestId('app-bottom-nav')).toBeTruthy();
    listenerSpy.mockRestore();
  });

  it('removes the duplicate standalone Focus Lock card from DashboardScreen while keeping Study Planner Focus Lock', () => {
    const view = render(withProviders(<DashboardScreen />));

    expect(view.queryByLabelText('Open Focus Lock')).toBeNull();
    expect(view.getByText('Study Planner')).toBeTruthy();
    expect(view.getByText('Add Task')).toBeTruthy();
    expect(view.getAllByText('Focus Lock')).toHaveLength(1);
    expect(view.getByText('Focus Timer')).toBeTruthy();

    fireEvent.press(view.getByText('Focus Lock'));
    expect(mockNavigate).toHaveBeenCalledWith('FocusLock');
  });

  it('allows leaving Settings via goHome even from nested Level 2 without beforeRemove blocking', async () => {
    mockRouteName = 'Settings';
    const view = render(withProviders(<SettingsScreen />));

    await waitFor(() => {
      expect(view.getByText(/Study Planner & Goals/)).toBeTruthy();
    });

    fireEvent.press(view.getByText('Study Planner & Goals'));
    expect(view.getByText('Daily Study Goal')).toBeTruthy();

    // Tap the top-left gear button (goHome) while at navLevel 2
    fireEvent.press(view.getByText('⚙'));

    const preventDefault = jest.fn();
    for (const listener of beforeRemoveListeners) {
      listener({ preventDefault });
    }
    expect(preventDefault).not.toHaveBeenCalled();
    expect(mockPopTo).toHaveBeenCalledWith('DashboardRoot');
  });
});
