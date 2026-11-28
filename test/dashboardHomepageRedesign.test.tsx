import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('../lib/ssds', () => require('./ssdsScreenMocks'));
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockNavigate = jest.fn();
const mockPopTo = jest.fn();
const mockDispatch = jest.fn();
const mockGetBlockingStatus = jest.fn(async () => ({
  available: true,
  accessibilityEnabled: true,
  usageAccessEnabled: true,
  serviceRunning: true,
  activeSession: null as { id: string; status: string } | null,
}));
const mockReadAlarmSummary = jest.fn(async () => ({
  activeCount: 1,
  nextAlarm: { hour: 6, minute: 30 },
  use24h: false,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockPopTo,
    getState: () => ({ index: 0, routes: [{ key: 'dash-1', name: 'DashboardRoot' }] }),
    getParent: () => undefined,
    addListener: () => () => undefined,
  }),
  useRoute: () => ({ name: 'DashboardRoot', params: undefined }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const ReactModule = require('react');
    ReactModule.useEffect(() => cb(), [cb]);
  },
  StackActions: {
    popTo: (name: string) => ({ type: 'POP_TO', payload: { name } }),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));

let mockThemeMode: 'light' | 'dark' = 'light';
jest.mock('../lib/store', () => ({
  dayKey: () => '2026-11-28',
  getDisplayName: (user: { name?: string } | null) => user?.name || 'Aarav',
  useStore: () => ({
    state: {
      user: { id: 'u1', name: 'Aarav Sharma', email: 'aarav@example.com' },
      studyLog: { '2026-11-28': 95 },
      plannerTasks: [
        { id: 't1', label: 'Revise Laxmikanth Ch 4', minutes: 45, category: 'Polity', taskType: 'Revision', priority: 'High', targetDate: '2026-11-28', scope: 'daily', periodKey: '2026-11-28', completed: false, completedOn: null },
        { id: 't2', label: 'CSAT Practice', minutes: 30, category: 'CSAT', taskType: 'PYQ', priority: 'Medium', targetDate: '2026-11-29', scope: 'daily', periodKey: '2026-11-29', completed: false, completedOn: null },
      ],
      settings: {
        themeMode: mockThemeMode,
        dailyGoalMin: 120,
        focusDurationMinutes: 25,
        language: 'en',
        dashboardWidgets: { streakCard: true, dailyGoalRing: true },
      },
    },
    streak: 5,
    todayMinutes: 95,
    unread: 2,
    syncStatus: 'synced',
    dispatch: mockDispatch,
  }),
}));

jest.mock('../lib/focusLockNative', () => ({
  focusLockNative: {
    getBlockingStatus: () => mockGetBlockingStatus(),
  },
  isFocusLockNativeAvailable: () => true,
  subscribeFocusLockEvent: () => () => undefined,
}));

jest.mock('../src/modules/alarm/alarmStorage', () => ({
  readAlarmSummary: () => mockReadAlarmSummary(),
}));

jest.mock('../components/FocusSessionSetupModal', () => {
  const ReactModule = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    FocusSessionSetupModal: ({
      visible,
      onContinue,
      onClose,
    }: {
      visible: boolean;
      onContinue: (setup: unknown) => void;
      onClose: () => void;
    }) =>
      visible ? (
        <View testID="focus-setup-modal">
          <Pressable
            testID="focus-setup-continue"
            onPress={() => onContinue({ mode: 'timer', durationMinutes: 25, selection: null, tag: '', task: null })}
          >
            <Text>Start Focus</Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Text>Cancel</Text>
          </Pressable>
        </View>
      ) : null,
  };
});

import { ThemeProvider } from '../lib/theme';
import DashboardScreen from '../screens/DashboardScreen';

function renderDashboard(mode: 'light' | 'dark' = 'light') {
  mockThemeMode = mode;
  return render(
    <ThemeProvider mode={mode}>
      <DashboardScreen />
    </ThemeProvider>
  );
}

describe('DashboardScreen Redesigned Homepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBlockingStatus.mockResolvedValue({
      available: true,
      accessibilityEnabled: true,
      usageAccessEnabled: true,
      serviceRunning: true,
      activeSession: null,
    });
    mockReadAlarmSummary.mockResolvedValue({
      activeCount: 1,
      nextAlarm: { hour: 6, minute: 30 },
      use24h: false,
    });
  });

  it('renders greeting, goal dial, real stats, action-only 2x2 Study Planner grid, and Shell nav', async () => {
    const view = renderDashboard('light');

    expect(view.getByText('Aarav')).toBeTruthy();
    expect(view.getByText('79%')).toBeTruthy();
    expect(view.getByText('GOAL')).toBeTruthy();
    expect(view.getByText('1h 35m')).toBeTruthy();
    expect(view.getByText('5 days')).toBeTruthy();

    expect(view.getByText('Study Planner')).toBeTruthy();
    expect(view.getByText('Quick controls')).toBeTruthy();
    expect(view.getByText('Add Task')).toBeTruthy();
    expect(view.getByLabelText('Add Task')).toBeTruthy();
    expect(view.getByText('Focus Lock')).toBeTruthy();
    expect(view.getByText('Focus Timer')).toBeTruthy();
    expect(view.getByLabelText('Focus Timer')).toBeTruthy();
    expect(view.getByText('Alarm')).toBeTruthy();

    // Live activity information and status indicators are removed from Quick Control cards
    expect(view.queryByText('Revise Laxmikanth Ch 4')).toBeNull();
    expect(view.queryByText('Plan your next topic')).toBeNull();
    expect(view.queryByText('25:00')).toBeNull();
    expect(view.queryByText('Running now')).toBeNull();
    expect(view.queryByText('Tap to open timer')).toBeNull();
    expect(view.queryByText('ON')).toBeNull();
    expect(view.queryByText('OFF')).toBeNull();
    expect(view.queryByText(/Apps shielded|Tap to shield|06:30 AM|Scheduled|Not set/)).toBeNull();

    // Shell bottom nav & header controls present without duplicates
    expect(view.getByTestId('app-bottom-nav')).toBeTruthy();
    expect(view.getByTestId('header-more-button')).toBeTruthy();
    expect(view.getByText('Home')).toBeTruthy();
    expect(view.getByText('Library')).toBeTruthy();
    expect(view.getByText('Groups')).toBeTruthy();
    expect(view.getByText('Sakha AI')).toBeTruthy();
    expect(view.getByText('Profile')).toBeTruthy();
  });

  it('preserves all existing button handlers and navigation routes', async () => {
    const view = renderDashboard('light');

    fireEvent.press(view.getByText('Add Task'));
    expect(mockNavigate).toHaveBeenCalledWith('StudyPlanner');

    fireEvent.press(view.getByText('Focus Lock'));
    expect(mockNavigate).toHaveBeenCalledWith('FocusLock');

    fireEvent.press(view.getByText('Alarm'));
    expect(mockNavigate).toHaveBeenCalledWith('Alarm');

    fireEvent.press(view.getByText('Focus Timer'));
    expect(view.getByTestId('focus-setup-modal')).toBeTruthy();
    fireEvent.press(view.getByTestId('focus-setup-continue'));
    expect(mockNavigate).toHaveBeenCalledWith('FocusCenter', {
      focusSession: { mode: 'timer', durationMinutes: 25, selection: null, tag: '', task: null },
    });
  });

  it('renders clean action-only cards in dark mode even when Focus Lock or Alarm is active', async () => {
    mockGetBlockingStatus.mockResolvedValue({
      available: true,
      accessibilityEnabled: true,
      usageAccessEnabled: true,
      serviceRunning: true,
      activeSession: { id: 'fl-1', status: 'active' },
    });

    const view = renderDashboard('dark');

    expect(view.getByText('Add Task')).toBeTruthy();
    expect(view.getByText('Focus Lock')).toBeTruthy();
    expect(view.getByText('Focus Timer')).toBeTruthy();
    expect(view.getByText('Alarm')).toBeTruthy();
    expect(view.queryByText('ON')).toBeNull();
    expect(view.queryByText('OFF')).toBeNull();
    expect(view.queryByText(/Apps shielded|06:30 AM/)).toBeNull();
  });
});
