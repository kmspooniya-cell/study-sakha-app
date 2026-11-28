import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  calculateScheduleFocusDuration,
  FOCUS_DURATION_PRESETS,
  validateCustomFocusDuration,
} from '../lib/focusSetup';
import { getPlannerScheduleOccurrence } from '../lib/planner';
import type { State } from '../lib/store';

const mockStorage = new Map<string, string>();
const mockBlurListeners: (() => void)[] = [];
const mockBackListeners: (() => boolean)[] = [];
const mockNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
  setParams: jest.fn(),
  replace: jest.fn(),
  dispatch: jest.fn(),
  popTo: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  getState: jest.fn(() => ({ index: 0, routes: [{ name: 'Groups' }] })),
  getParent: jest.fn(() => null),
  addListener: jest.fn((event: string, listener: () => void) => {
    if (event === 'blur') mockBlurListeners.push(listener);
    return jest.fn();
  }),
};
const mockRoute: { params: Record<string, unknown> } = { params: {} };
const mockCreateRoomSession = jest.fn(async () => 'room-session-direct-1');
const mockFinishRoomSession = jest.fn(async () => undefined);
const mockAppendFocusHistory = jest.fn(async (_key: string, record: unknown) => [record]);

let mockStoreState: Partial<State> = {};
const mockDispatch = jest.fn();

jest.mock('../lib/ssds', () => require('./ssdsScreenMocks'));
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
    NavigationContext: ReactActual.createContext(mockNavigation),
    useNavigation: () => mockNavigation,
    useRoute: () => mockRoute,
    useFocusEffect: (callback: React.EffectCallback) => ReactActual.useEffect(callback, [callback]),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const ReactActual = require('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { __esModule: true, default: ({ name }: { name: string }) => ReactActual.createElement(Text, null, name) };
});

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('expo-audio', () => {
  const player = { pause: jest.fn(), play: jest.fn(), replace: jest.fn(), seekTo: jest.fn(async () => undefined), loop: false };
  return {
    setAudioModeAsync: jest.fn(async () => undefined),
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0 }),
  };
});

jest.mock('../lib/theme', () => ({
  useTheme: () => ({
    scheme: 'light',
    colors: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceAlt: '#F1F5F9',
      border: '#E2E8F0',
      borderSubtle: '#E2E8F0',
      text: '#0F172A',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#64748B',
      blue: '#2563EB',
      tint: '#EFF6FF',
      teal: '#0D9488',
      tealTint: '#F0FDFA',
      green: '#16A34A',
      warning: '#F59E0B',
      amber: '#F59E0B',
      danger: '#EF4444',
      purple: '#7C3AED',
      overlay: 'rgba(0,0,0,0.6)',
    },
  }),
}));

jest.mock('../lib/store', () => ({
  useStore: () => ({ state: mockStoreState, dispatch: mockDispatch, streak: 1 }),
  dayKey: () => '2026-11-26',
  getUserScopedStorageKey: (key: string, userId?: string | null) => `${key}:user:${userId ?? 'local'}`,
}));

jest.mock('../components/Shell', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    Shell: ({ children }: { children: React.ReactNode }) => ReactActual.createElement(View, null, children),
    isAppDrawerOpen: () => false,
    useLayout: () => ({ isMobile: true }),
  };
});

jest.mock('../components/ui', () => {
  const ReactActual = require('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Button: ({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) =>
      ReactActual.createElement(
        Pressable,
        { accessibilityRole: 'button', accessibilityState: { disabled: Boolean(disabled) }, disabled, onPress },
        ReactActual.createElement(Text, null, label),
      ),
    Txt: ({ children }: { children: React.ReactNode }) => ReactActual.createElement(Text, null, children),
  };
});

jest.mock('../components/FocusMusicSelection', () => ({ FocusMusicSelection: () => null }));

jest.mock('../components/GeminiFocusTimer', () => {
  const ReactActual = require('react');
  const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({ timer, subject, onPause, onStop, onGroupPress }: {
      timer: { remainingSeconds: number; running: boolean };
      subject: string;
      onPause: () => void;
      onStop: () => void;
      onGroupPress: () => void;
    }) => ReactActual.createElement(
      View,
      null,
      ReactActual.createElement(Text, { testID: 'timer-remaining' }, String(timer.remainingSeconds)),
      ReactActual.createElement(Text, { testID: 'timer-state' }, timer.running ? 'running' : 'paused'),
      ReactActual.createElement(Text, { testID: 'timer-subject' }, subject),
      ReactActual.createElement(Pressable, { onPress: onGroupPress }, ReactActual.createElement(Text, null, 'Group')),
      ReactActual.createElement(Pressable, { onPress: onPause }, ReactActual.createElement(Text, null, timer.running ? 'Pause' : 'Resume')),
      ReactActual.createElement(Pressable, { onPress: onStop }, ReactActual.createElement(Text, null, 'Stop Focus')),
    ),
  };
});

jest.mock('../lib/groupRooms', () => {
  const actual = jest.requireActual<typeof import('../lib/groupRooms')>('../lib/groupRooms');
  return {
    ...actual,
    createRoomSession: (...args: unknown[]) => mockCreateRoomSession(...(args as [])),
    finishRoomSession: (...args: unknown[]) => mockFinishRoomSession(...(args as [])),
    getActiveStudyGroups: jest.fn(async () => [
      { id: 'grp-ras-mains', name: 'RAS Mains 2026 — Rajasthan Special' },
      { id: 'grp-upsc-cam', name: 'UPSC CSE 2027 — Dawn Cam Batch' },
    ]),
    getStudyRoomLogs: jest.fn(async () => []),
    getStudyRoomProfiles: jest.fn(async () => []),
    updateRoomSession: jest.fn(async () => undefined),
  };
});

jest.mock('../lib/groupRoomRealtime', () => ({
  useGroupFocusPresence: jest.fn(),
  useGroupRoomRealtime: () => ({
    participants: [],
    messages: [],
    phase: 'focus',
    setPhase: jest.fn(),
    connected: true,
    error: null,
    lastReaction: null,
    sendSilentReaction: jest.fn(),
  }),
}));

jest.mock('../lib/focusHistory', () => ({
  appendFocusHistory: (...args: [string, unknown]) => mockAppendFocusHistory(...args),
}));

const GroupsScreen = require('../screens/GroupsScreen').default as typeof import('../screens/GroupsScreen').default;
const FocusCenterScreen = require('../screens/FocusCenterScreen').default as typeof import('../screens/FocusCenterScreen').default;
const { FocusSessionSetupModal } = require('../components/FocusSessionSetupModal') as typeof import('../components/FocusSessionSetupModal');
type FocusSessionSetup = import('../components/FocusSessionSetupModal').FocusSessionSetup;

function localDateOffset(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ControlledSetupModal({
  initial,
  onContinue = jest.fn(),
  onClose = jest.fn(),
}: {
  initial?: Partial<FocusSessionSetup>;
  onContinue?: (value: FocusSessionSetup) => void;
  onClose?: () => void;
}) {
  const [setup, setSetup] = React.useState<FocusSessionSetup>({
    mode: 'timer',
    durationMinutes: 25,
    selection: null,
    tag: '',
    task: null,
    ...initial,
  });
  return (
    <SafeAreaProvider>
      <FocusSessionSetupModal
        visible
        value={setup}
        onChange={setSetup}
        onClose={onClose}
        onContinue={onContinue}
      />
    </SafeAreaProvider>
  );
}

describe('Focus Centre UX, Navigation & Smart Duration Improvements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockBlurListeners.length = 0;
    mockBackListeners.length = 0;
    mockRoute.params = {};
    mockStoreState = {
      storageReady: true,
      user: {
        id: 'user-1',
        name: 'Test Aspirant',
        email: 'aspirant@test.dev',
        exam: 'ras',
        role: 'learner',
        joined: '2026-01-01',
      },
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
      } as State['settings'],
      plannerScheduleItems: [],
      plannerScheduleCompletions: {},
      plannerTaskStudySeconds: {},
      focusHistory: [],
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Part 1 — Direct Group Hall Navigation', () => {
    it('navigates from Focus Centre to Groups via navigate (not push) with openGroupRoom', async () => {
      mockRoute.params = {
        focusSession: {
          mode: 'timer',
          durationMinutes: 25,
          selection: 'manual',
          tag: 'Polity',
          task: null,
        },
      };
      const view = render(<FocusCenterScreen />);
      await act(async () => { await Promise.resolve(); });
      await waitFor(() => expect(view.getByText('Group')).toBeTruthy(), { timeout: 5000 });

      fireEvent.press(view.getByText('Group'));
      await waitFor(() => expect(view.getByText('RAS Mains 2026 — Rajasthan Special')).toBeTruthy(), { timeout: 5000 });
      fireEvent.press(view.getByText('RAS Mains 2026 — Rajasthan Special'));

      expect(mockNavigation.push).not.toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Groups', {
        openGroupRoom: expect.objectContaining({
          groupId: 'grp-ras-mains',
          roomId: 'silent-focus',
          focusSession: expect.objectContaining({
            subject: 'Polity',
          }),
        }),
      });
    });

    it('opens the selected Group Hall directly without intermediate redirects and restores existing active Hall without duplicating sessions', async () => {
      const openPayload = {
        groupId: 'grp-ras-mains',
        roomId: 'silent-focus' as const,
        focusSession: {
          sessionId: 'focus-1',
          subject: 'Polity',
          startedAt: '2026-11-26T00:00:00.000Z',
          elapsedSeconds: 45,
          status: 'focusing' as const,
        },
      };
      mockRoute.params = { openGroupRoom: openPayload };

      const view = render(<GroupsScreen />);

      // Should not flash the Groups discovery list or Group Detail tabs while resolving direct hall
      expect(view.queryByText('Recommended')).toBeNull();
      expect(view.queryByText('Live Study')).toBeNull();

      await waitFor(() => {
        expect(mockCreateRoomSession).toHaveBeenCalledTimes(1);
        expect(view.getAllByText('Silent Focus Hall').length).toBeGreaterThan(0);
      }, { timeout: 5000 });
      expect(mockNavigation.setParams).toHaveBeenCalledWith({ openGroupRoom: undefined });

      // Simulate returning to Focus Centre (minimizing active room) and re-opening same Hall
      fireEvent.press(view.getByLabelText('Back to Focus Centre'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('FocusCenter');

      // Now navigate back to Groups with a new openGroupRoom target for the SAME group
      mockRoute.params = {
        openGroupRoom: {
          ...openPayload,
          focusSession: { ...openPayload.focusSession, elapsedSeconds: 90 },
        },
      };
      view.rerender(<GroupsScreen />);

      await waitFor(() => {
        expect(mockNavigation.setParams).toHaveBeenCalledWith({ openGroupRoom: undefined });
      }, { timeout: 5000 });
      // Must restore existing Hall rather than creating a second room session
      expect(mockCreateRoomSession).toHaveBeenCalledTimes(1);
      expect(view.getAllByText('Silent Focus Hall').length).toBeGreaterThan(0);

      // Tapping Back to Focus Centre again must still work (returningToFocusRef properly reset)
      fireEvent.press(view.getByLabelText('Back to Focus Centre'));
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Part 2 — Focus Stop Confirmation Popup Dismissal', () => {
    it('dismisses End Focus Session popup via X, backdrop tap, Continue Focus, and Android back without stopping or resetting session', async () => {
      jest.useFakeTimers();
      jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
        mockBackListeners.push(handler as () => boolean);
        return { remove: jest.fn() } as ReturnType<typeof BackHandler.addEventListener>;
      });

      const task = { id: 'task-polity', category: 'Tasks' as const, title: 'Indian Polity', subject: 'Polity', date: localDateOffset(0), durationMinutes: 25 };
      mockRoute.params = {
        focusSession: {
          mode: 'timer',
          durationMinutes: 25,
          selection: 'schedule',
          tag: 'Polity',
          task,
          scheduleOccurrenceId: `task-polity::${localDateOffset(0)}`,
        },
      };

      const view = render(<FocusCenterScreen />);
      await act(async () => { await Promise.resolve(); });

      // Advance 2 minutes 10 seconds -> 1370s remaining
      act(() => jest.advanceTimersByTime(130_000));
      expect(view.getByTestId('timer-remaining').props.children).toBe('1370');

      // 1) Dismiss via X button
      fireEvent.press(view.getByText('Stop Focus'));
      expect(view.getByText('End Focus Session?')).toBeTruthy();
      fireEvent.press(view.getByLabelText('Close stop confirmation'));
      expect(view.queryByText('End Focus Session?')).toBeNull();
      expect(view.getByTestId('timer-state').props.children).toBe('running');
      expect(view.getByTestId('timer-subject').props.children).toContain('Indian Polity');

      // Timer continues ticking after dismiss
      act(() => jest.advanceTimersByTime(5_000));
      expect(view.getByTestId('timer-remaining').props.children).toBe('1365');

      // 2) Dismiss via backdrop tap
      fireEvent.press(view.getByText('Stop Focus'));
      expect(view.getByText('End Focus Session?')).toBeTruthy();
      fireEvent.press(view.getByLabelText('Dismiss stop confirmation'));
      expect(view.queryByText('End Focus Session?')).toBeNull();
      expect(view.getByTestId('timer-state').props.children).toBe('running');

      // 3) Dismiss via Continue Focus button
      fireEvent.press(view.getByText('Stop Focus'));
      expect(view.getByText('End Focus Session?')).toBeTruthy();
      fireEvent.press(view.getByText('Continue Focus'));
      expect(view.queryByText('End Focus Session?')).toBeNull();
      expect(view.getByTestId('timer-state').props.children).toBe('running');

      // 4) Dismiss via Android hardware back button
      fireEvent.press(view.getByText('Stop Focus'));
      expect(view.getByText('End Focus Session?')).toBeTruthy();
      act(() => {
        const latestHandler = mockBackListeners[mockBackListeners.length - 1];
        expect(latestHandler?.()).toBe(true);
      });
      expect(view.queryByText('End Focus Session?')).toBeNull();
      expect(view.getByTestId('timer-state').props.children).toBe('running');

      // Ensure no duplicate or premature completion occurred during any dismissal
      expect(mockAppendFocusHistory).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'recordFocusStudy' }));

      // 5) Explicit Save Session still executes complete flow
      fireEvent.press(view.getByText('Stop Focus'));
      fireEvent.press(view.getByText('Save Session'));
      await waitFor(() => expect(mockNavigation.replace).toHaveBeenCalledWith(
        'FocusCompletion',
        expect.objectContaining({
          session: expect.objectContaining({
            taskId: 'task-polity',
            status: 'saved_early',
          }),
        }),
      ));
      expect(mockAppendFocusHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('Part 3 — Smart Duration Selector', () => {
    it('validates custom focus duration integers cleanly', () => {
      expect(FOCUS_DURATION_PRESETS).toEqual([15, 25, 40]);
      expect(validateCustomFocusDuration('35')).toEqual({ valid: true, minutes: 35, error: null });
      expect(validateCustomFocusDuration('1')).toEqual({ valid: true, minutes: 1, error: null });
      expect(validateCustomFocusDuration('360')).toEqual({ valid: true, minutes: 360, error: null });
      expect(validateCustomFocusDuration('').valid).toBe(false);
      expect(validateCustomFocusDuration('0').valid).toBe(false);
      expect(validateCustomFocusDuration('-15').valid).toBe(false);
      expect(validateCustomFocusDuration('12.5').valid).toBe(false);
      expect(validateCustomFocusDuration('abc').valid).toBe(false);
      expect(validateCustomFocusDuration('361').valid).toBe(false);
    });

    it('renders 15m, 25m, 40m presets and Custom input, rejects invalid values, and clears custom on preset tap', () => {
      const onContinue = jest.fn();
      const view = render(<ControlledSetupModal onContinue={onContinue} />);

      expect(view.getByText('15m')).toBeTruthy();
      expect(view.getByText('25m')).toBeTruthy();
      expect(view.getByText('40m')).toBeTruthy();
      expect(view.getByText('Custom')).toBeTruthy();
      expect(view.queryByText('50m')).toBeNull();

      // Select Custom and enter invalid values
      fireEvent.press(view.getByLabelText('Custom duration'));
      const input = view.getByLabelText('Custom duration minutes');
      fireEvent.changeText(input, '0');
      expect(view.getByText('Duration must be at least 1 minute.')).toBeTruthy();
      fireEvent.press(view.getByText('Continue to Full Focus'));
      expect(onContinue).not.toHaveBeenCalled();

      fireEvent.changeText(input, '-5');
      expect(view.getByText('Enter a whole number of minutes (positive integers only).')).toBeTruthy();
      fireEvent.press(view.getByText('Continue to Full Focus'));
      expect(onContinue).not.toHaveBeenCalled();

      // Enter valid custom value
      fireEvent.changeText(input, '55');
      fireEvent.press(view.getByText('Continue to Full Focus'));
      expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ durationMinutes: 55 }));

      // Selecting preset clears custom input
      fireEvent.press(view.getByText('15m'));
      expect(view.queryByLabelText('Custom duration minutes')).toBeNull();
      fireEvent.press(view.getByText('Continue to Full Focus'));
      expect(onContinue).toHaveBeenLastCalledWith(expect.objectContaining({ durationMinutes: 15 }));
    });
  });

  describe('Part 4 — Smart Add from Schedule Integration', () => {
    it('calculates remaining duration from planned minus aggregated eligible sessions (Cases A, B, C) and allows manual override without mutating planner item', () => {
      const today = localDateOffset(0);
      const taskA = {
        id: 'plan-a',
        category: 'Tasks' as const,
        title: 'Modern History Revision',
        subject: 'History',
        date: today,
        startTime: '09:00',
        endTime: '10:00',
        durationMinutes: 60,
        durationLabel: '60 min',
      };
      const taskB = {
        id: 'plan-b',
        category: 'Tasks' as const,
        title: 'Polity Laxmikanth Ch 4',
        subject: 'Polity',
        date: today,
        startTime: '11:00',
        endTime: '12:00',
        durationMinutes: 60,
        durationLabel: '60 min',
      };
      const taskC = {
        id: 'plan-c',
        category: 'Tasks' as const,
        title: 'Geography Mapping',
        subject: 'Geography',
        date: today,
        startTime: '14:00',
        endTime: '15:00',
        durationMinutes: 60,
        durationLabel: '60 min',
      };

      mockStoreState = {
        ...mockStoreState,
        plannerScheduleItems: [taskA, taskB, taskC],
        focusHistory: [
          // Task B: 15m + 10m = 25m eligible; plus duplicate, break, meditation, interrupted (excluded)
          { id: 'b1', sessionId: 'b1', taskId: 'plan-b', scheduleId: 'plan-b', scheduleOccurrenceId: `plan-b::${today}`, date: today, completedAt: `${today}T11:15:00.000Z`, focusedSeconds: 15 * 60, actualSeconds: 15 * 60, status: 'saved_early', sessionType: 'study' },
          { id: 'b1', sessionId: 'b1', taskId: 'plan-b', scheduleId: 'plan-b', scheduleOccurrenceId: `plan-b::${today}`, date: today, completedAt: `${today}T11:15:00.000Z`, focusedSeconds: 15 * 60, actualSeconds: 15 * 60, status: 'saved_early', sessionType: 'study' },
          { id: 'b2', sessionId: 'b2', taskId: 'plan-b', scheduleId: 'plan-b', scheduleOccurrenceId: `plan-b::${today}`, date: today, completedAt: `${today}T11:30:00.000Z`, focusedSeconds: 10 * 60, actualSeconds: 10 * 60, status: 'completed', sessionType: 'study' },
          { id: 'b-brk', sessionId: 'b-brk', taskId: 'plan-b', scheduleId: 'plan-b', scheduleOccurrenceId: `plan-b::${today}`, date: today, completedAt: `${today}T11:35:00.000Z`, focusedSeconds: 5 * 60, actualSeconds: 5 * 60, status: 'completed', sessionType: 'break' },
          { id: 'b-med', sessionId: 'b-med', taskId: 'plan-b', scheduleId: 'plan-b', scheduleOccurrenceId: `plan-b::${today}`, date: today, completedAt: `${today}T11:45:00.000Z`, focusedSeconds: 10 * 60, actualSeconds: 10 * 60, status: 'completed', sessionType: 'meditation' },
          { id: 'b-int', sessionId: 'b-int', taskId: 'plan-b', scheduleId: 'plan-b', scheduleOccurrenceId: `plan-b::${today}`, date: today, completedAt: `${today}T11:55:00.000Z`, focusedSeconds: 10 * 60, actualSeconds: 10 * 60, status: 'interrupted', sessionType: 'study' },
          // Task C: 60m completed
          { id: 'c1', sessionId: 'c1', taskId: 'plan-c', scheduleId: 'plan-c', scheduleOccurrenceId: `plan-c::${today}`, date: today, completedAt: `${today}T15:00:00.000Z`, focusedSeconds: 60 * 60, actualSeconds: 60 * 60, status: 'completed', sessionType: 'study' },
        ],
      };

      // Unit check of helper calculations
      const occA = getPlannerScheduleOccurrence(mockStoreState as State, taskA, today, today);
      const occB = getPlannerScheduleOccurrence(mockStoreState as State, taskB, today, today);
      const occC = getPlannerScheduleOccurrence(mockStoreState as State, taskC, today, today);
      expect(calculateScheduleFocusDuration(occA).remainingMinutes).toBe(60);
      expect(calculateScheduleFocusDuration(occB).remainingMinutes).toBe(35);
      expect(calculateScheduleFocusDuration(occC)).toMatchObject({ remainingMinutes: 0, isTaskComplete: true });

      const onContinue = jest.fn();
      const view = render(<ControlledSetupModal onContinue={onContinue} />);

      // Case A: 60m planned, 0m focused -> 60m auto-filled
      fireEvent.press(view.getByText('Add from Schedule'));
      fireEvent.press(view.getByText('Modern History Revision'));
      expect(view.getByLabelText('Custom duration minutes').props.value).toBe('60');

      // Case B: 60m planned, 25m focused -> 35m auto-filled + manual override to 20m
      fireEvent.press(view.getByText('Change'));
      fireEvent.press(view.getByText('Polity Laxmikanth Ch 4'));
      expect(view.getByLabelText('Custom duration minutes').props.value).toBe('35');

      fireEvent.changeText(view.getByLabelText('Custom duration minutes'), '20');
      fireEvent.press(view.getByText('Continue to Full Focus'));
      expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({
        durationMinutes: 20,
        selection: 'schedule',
        scheduleOccurrenceId: `plan-b::${today}`,
        task: expect.objectContaining({ id: 'plan-b', durationMinutes: 60 }),
      }));
      // Original planner item duration stays 60m
      expect(taskB.durationMinutes).toBe(60);

      // Case C: Completed task (60m / 60m) -> 0m auto-filled, prevents zero-duration start
      onContinue.mockClear();
      fireEvent.press(view.getByText('Change'));
      fireEvent.press(view.getByRole('tab', { name: 'Completed' }));
      fireEvent.press(view.getByText('Geography Mapping'));
      expect(view.getByLabelText('Custom duration minutes').props.value).toBe('0');
      expect(view.getByText(/already complete/i)).toBeTruthy();

      fireEvent.press(view.getByText('Continue to Full Focus'));
      expect(onContinue).not.toHaveBeenCalled();
    });
  });
});
