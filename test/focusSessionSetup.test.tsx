import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppState, type AppStateStatus } from 'react-native';
import {
  endGroupRoomFocus,
  getGroupRoomFocusActivity,
  setGroupRoomFocusContext,
  subscribeGroupRoomFocus,
} from '../lib/groupRoomFocusBridge';
import { VirtualStudyHall } from '../components/VirtualStudyHall';

const mockBlurListeners: (() => void)[] = [];
const mockAppStateListeners: ((state: AppStateStatus) => void)[] = [];
const mockNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
  setParams: jest.fn(),
  replace: jest.fn(),
  dispatch: jest.fn(),
  popTo: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn((event: string, listener: () => void) => {
    if (event === 'blur') mockBlurListeners.push(listener);
    return jest.fn();
  }),
};
const mockRoute = { params: {} as Record<string, unknown> };
const mockPlannerTask = {
  id: 'task-1',
  label: 'Revise Polity',
  minutes: 40,
  category: 'Polity',
  completed: false,
  completedOn: null,
  targetDate: '2026-11-19',
  taskType: 'Revision' as const,
  priority: 'High' as const,
  scope: 'daily' as const,
  periodKey: '2026-11-19',
};
const mockStorage = new Map<string, string>();
const mockSubmitStudyMemberActivity = jest.fn(async (_input: {
  groupId: string;
  eventId: string;
  activityType: 'focus_session' | 'planner_task_completed';
  taskId?: string;
  subject?: string;
  actualSeconds: number;
  status?: 'completed' | 'saved_early' | 'interrupted' | 'abandoned';
  occurredAt: string;
}) => undefined);
const mockSubmitAllGroupsActivity = jest.fn(async (activity: {
  userId: string;
  eventId: string;
  activityType: 'focus_session' | 'planner_task_completed';
  taskId?: string;
  subject?: string;
  actualSeconds: number;
  status?: 'completed' | 'saved_early' | 'interrupted' | 'abandoned';
  occurredAt: string;
}) => {
  await mockSubmitStudyMemberActivity({ groupId: 'grp-ras-mains', ...activity });
  return { groupIds: ['grp-ras-mains'], failures: [] };
});
const mockFinishRoomSession = jest.fn(async () => undefined);
const mockStore = {
  state: {
    plannerTasksLoaded: true,
    plannerTaskLoadError: null,
    plannerTasks: [mockPlannerTask],
    user: { id: 'user-1', name: 'Test User', display_name: 'Test User' },
  },
  dispatch: jest.fn(),
};
const mockAppendFocusHistory = jest.fn(async (_key: string, record: { id: string }) => [record]);

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => mockNavigation,
    useRoute: () => mockRoute,
    useFocusEffect: (callback: React.EffectCallback) => React.useEffect(callback, [callback]),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('../components/Shell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Shell: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    useLayout: () => ({ isMobile: true }),
  };
});

jest.mock('../components/ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Button: ({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) =>
      React.createElement(Pressable, { accessibilityRole: 'button', onPress, disabled }, React.createElement(Text, null, label)),
    Card: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    Chip: ({ label, onPress }: { label: string; onPress?: () => void }) =>
      React.createElement(Pressable, { onPress }, React.createElement(Text, null, label)),
    Field: (props: React.ComponentProps<typeof TextInput>) => React.createElement(TextInput, props),
    SectionHeader: ({ title }: { title: string }) => React.createElement(Text, null, title),
    Txt: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-audio', () => {
  const player = {
    pause: jest.fn(),
    play: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    loop: false,
  };
  return {
    setAudioModeAsync: jest.fn(async () => undefined),
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0 }),
  };
});
jest.mock('../lib/store', () => ({
  useStore: () => mockStore,
  dayKey: () => '2026-11-19',
  getUserScopedStorageKey: (key: string) => `${key}:user-1`,
}));
jest.mock('../lib/groupRooms', () => {
  const actual = jest.requireActual<typeof import('../lib/groupRooms')>('../lib/groupRooms');
  return {
    ...actual,
    createRoomSession: jest.fn(async () => 'room-session-1'),
    getActiveStudyGroups: jest.fn(async () => [{ id: 'grp-ras-mains', name: 'RAS Mains 2026 — Rajasthan Special' }]),
    listDiscoverableStudyGroups: jest.fn(async () => [{
      id: 'grp-ras-mains',
      name: 'RAS Mains 2026 — Rajasthan Special',
      privacy: 'Private',
      joinMethod: 'Leader Approval',
      ownerId: 'user-1',
      createdAt: '2026-11-26T00:00:00.000Z',
      memberCount: 1,
      isMember: true,
      memberRole: 'Owner',
    }]),
    getActiveStudyGroupIds: jest.fn(async () => ['grp-ras-mains']),
    submitStudyMemberActivityToGroups: jest.fn(async (groupIds: string[], activity: Record<string, unknown>) => {
      await Promise.all(groupIds.map((groupId) => mockSubmitStudyMemberActivity({ groupId, ...activity } as Parameters<typeof mockSubmitStudyMemberActivity>[0])));
      return { groupIds, failures: [] };
    }),
    getStudyRoomLogs: jest.fn(async () => []),
    getStudyRoomProfiles: jest.fn(async () => []),
    updateRoomSession: jest.fn(async () => undefined),
    finishRoomSession: mockFinishRoomSession,
    submitStudyMemberActivity: mockSubmitStudyMemberActivity,
    submitStudyMemberActivityToJoinedGroups: mockSubmitAllGroupsActivity,
  };
});
jest.mock('../lib/groupRoomRealtime', () => ({
  useGroupFocusPresence: jest.fn(),
  useGroupRoomRealtime: () => ({
    participants: [],
    messages: [],
    phase: 'focus',
    setPhase: jest.fn(),
    connected: false,
    error: null,
    lastReaction: null,
    sendSilentReaction: jest.fn(),
  }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
  },
}));
jest.mock('../lib/focusHistory', () => ({
  appendFocusHistory: (...args: [string, { id: string }]) => mockAppendFocusHistory(...args),
}));
jest.mock('../components/GeminiFocusTimer', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({ timer, subject, onPause, onStop, onBreak }: {
      timer: { remainingSeconds: number; running: boolean; isBreak: boolean; modeLabel: string };
      subject: string;
      onPause: () => void;
      onStop: () => void;
      onBreak: () => void;
    }) => {
      const minutes = Math.floor(timer.remainingSeconds / 60).toString().padStart(2, '0');
      const seconds = (timer.remainingSeconds % 60).toString().padStart(2, '0');
      return React.createElement(View, null,
        React.createElement(Text, null, timer.isBreak ? 'BREAK' : timer.modeLabel),
        React.createElement(Text, null, `${minutes}:${seconds}`),
        React.createElement(Text, null, subject),
        React.createElement(Pressable, { onPress: onPause }, React.createElement(Text, null, timer.running ? 'Pause' : 'Resume')),
        React.createElement(Pressable, { onPress: onBreak }, React.createElement(Text, null, timer.isBreak ? 'Back to focus' : 'Take a break')),
        React.createElement(Pressable, { onPress: onStop }, React.createElement(Text, null, 'Stop Focus')),
      );
    },
  };
});
jest.mock('../components/MeditationPresets', () => ({
  MEDITATION_SOUND_LIST: [
    { id: 'pure_cosmic_waves', name: 'Pure Cosmic Waves', subtitle: 'Cosmic soundscape', icon: 'sparkles-outline', source: 1, isDownloadable: true, filename: 'pure_cosmic_waves.mp3', downloadUrl: '/api/audio/pure_cosmic_waves.mp3', sizeBytes: 100 },
    { id: 'deep_positive_energy', name: 'Deep Positive Energy', subtitle: 'Positive soundscape', icon: 'water-outline', source: 2, isDownloadable: true, filename: 'deep_positive_energy.mp3', downloadUrl: '/api/audio/deep_positive_energy.mp3', sizeBytes: 100 },
  ],
}));
jest.mock('../lib/audioDownloadManager', () => ({
  AudioDownloadManager: { subscribe: () => jest.fn(), download: jest.fn(), deleteDownloaded: jest.fn() },
}));

const GroupsScreen = require('../screens/GroupsScreen').default as typeof import('../screens/GroupsScreen').default;
const FocusCenterScreen = require('../screens/FocusCenterScreen').default as typeof import('../screens/FocusCenterScreen').default;

describe('shared focus session setup', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockBlurListeners.length = 0;
    mockAppStateListeners.length = 0;
    const activeRoomFocus = getGroupRoomFocusActivity();
    if (activeRoomFocus) endGroupRoomFocus(activeRoomFocus.roomSessionId);
    mockRoute.params = {};
  });

  it('opens the shared setup and starts Focus Center with the room session linked', async () => {
    jest.useFakeTimers();
    const view = render(<GroupsScreen />);
    await waitFor(() => expect(view.getByRole('button', { name: 'Open RAS Mains 2026 — Rajasthan Special' })).toBeTruthy());
    fireEvent.press(view.getByRole('button', { name: 'Open RAS Mains 2026 — Rajasthan Special' }));
    await act(async () => {
      fireEvent.press(view.getAllByText('Join room')[0]);
      await Promise.resolve();
    });
    fireEvent.press(view.getByText('Start Focusing'));
    expect(view.getByText('Focus Session Setup')).toBeTruthy();
    expect(view.queryByText('Begin Focus Session')).toBeNull();
    expect(mockNavigation.push).not.toHaveBeenCalled();
    fireEvent.press(view.getByText('Continue to Full Focus'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('FocusCenter', {
      focusSession: {
        mode: 'timer',
        durationMinutes: 25,
        selection: 'manual',
        tag: 'Current Affairs',
        task: null,
      },
      roomFocus: {
        groupId: 'grp-ras-mains',
        roomId: 'silent-focus',
        roomSessionId: 'room-session-1',
      },
    });
    view.unmount();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('rejects a malformed focus setup instead of creating a negative timer', async () => {
    mockRoute.params = {
      focusSession: {
        mode: 'timer',
        durationMinutes: -5,
        selection: null,
        tag: '',
        task: null,
      },
    };
    render(<FocusCenterScreen />);

    await waitFor(() => expect(mockNavigation.setParams).toHaveBeenCalledWith({ focusSession: undefined }));
    expect(mockStore.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'recordFocusStudy' }));
  });

  it('exits Silent Focus Hall freely without a leave confirmation or ending the session', async () => {
    jest.useFakeTimers();
    const view = render(<GroupsScreen />);
    await waitFor(() => expect(view.getByRole('button', { name: 'Open RAS Mains 2026 — Rajasthan Special' })).toBeTruthy());
    fireEvent.press(view.getByRole('button', { name: 'Open RAS Mains 2026 — Rajasthan Special' }));
    await act(async () => {
      fireEvent.press(view.getAllByText('Join room')[0]);
      await Promise.resolve();
    });

    expect(view.queryByRole('button', { name: 'Exit Silent Focus Hall' })).toBeNull();
    fireEvent.press(view.getByRole('button', { name: 'Back from Silent Focus Hall' }));

    expect(mockFinishRoomSession).not.toHaveBeenCalled();
    expect(view.queryByText('Leave Silent Focus Hall?')).toBeNull();
    expect(view.getByText('RAS Mains 2026 — Rajasthan Special')).toBeTruthy();
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    setGroupRoomFocusContext(null);
    view.unmount();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('redirects an empty focus route to Homepage and starts a supplied setup directly', async () => {
    const landing = render(<FocusCenterScreen />);
    await waitFor(() => expect(mockNavigation.popTo).toHaveBeenCalledWith('DashboardRoot'));
    landing.unmount();

    mockRoute.params = {
      focusSession: {
        mode: 'stopwatch',
        durationMinutes: 25,
        selection: 'manual',
        tag: 'Polity',
        task: null,
      },
    };
    const active = render(<FocusCenterScreen />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(active.getByText('STOPWATCH')).toBeTruthy();
    expect(active.getByText('00:00')).toBeTruthy();
    expect(active.getByText('Polity')).toBeTruthy();
  });

  it('counts down a five-minute break started from stopwatch mode without recording break time', async () => {
    jest.useFakeTimers();
    mockRoute.params = {
      focusSession: {
        mode: 'stopwatch',
        durationMinutes: 25,
        selection: 'manual',
        tag: 'Work',
        task: null,
      },
    };

    try {
      const view = render(<FocusCenterScreen />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(view.getByText('STOPWATCH')).toBeTruthy();
      fireEvent.press(view.getByText('Take a break'));
      expect(view.getByText('BREAK')).toBeTruthy();
      expect(view.getByText('05:00')).toBeTruthy();

      act(() => jest.advanceTimersByTime(5 * 60 * 1000));

      expect(view.getByText('00:00')).toBeTruthy();
      expect(mockStore.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'recordFocusStudy' }));
      expect(view.getByText('STOPWATCH')).toBeTruthy();
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('publishes linked room focus updates and clears the chair when the session stops', async () => {
    const events: string[] = [];
    const unsubscribe = subscribeGroupRoomFocus((event) => events.push(event.type));
    mockRoute.params = {
      focusSession: {
        mode: 'timer',
        durationMinutes: 25,
        selection: 'manual',
        tag: 'Polity',
        task: null,
      },
      roomFocus: {
        groupId: 'group-1',
        roomId: 'silent-focus',
        roomSessionId: 'room-session-1',
      },
    };

    const view = render(<FocusCenterScreen />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getGroupRoomFocusActivity()).toMatchObject({
      groupId: 'group-1',
      roomId: 'silent-focus',
      roomSessionId: 'room-session-1',
      subject: 'Polity',
      status: 'focusing',
    });

    fireEvent.press(view.getByText('Pause'));
    expect(getGroupRoomFocusActivity()?.status).toBe('paused');

    fireEvent.press(view.getByText('Take a break'));
    expect(getGroupRoomFocusActivity()?.status).toBe('break');
    fireEvent.press(view.getByText('Back to focus'));
    expect(getGroupRoomFocusActivity()?.status).toBe('focusing');

    act(() => mockBlurListeners.forEach((listener) => listener()));
    expect(getGroupRoomFocusActivity()?.roomSessionId).toBe('room-session-1');

    await act(async () => {
      fireEvent.press(view.getByText('Stop Focus'));
      await Promise.resolve();
    });
    fireEvent.press(view.getByText('Leave'));
    await act(async () => { await Promise.resolve(); });
    expect(getGroupRoomFocusActivity()).toBeNull();
    expect(mockNavigation.setParams).toHaveBeenCalledWith({ roomFocus: undefined });
    expect(events.filter((event) => event !== 'update')).toEqual(['start', 'pause', 'break', 'resume', 'pause', 'stop']);
    unsubscribe();
  });

  it('asks before leaving a stopwatch session stopped at 1:59 and returns to Homepage without saving', async () => {
    jest.useFakeTimers();
    mockRoute.params = {
      focusSession: { mode: 'stopwatch', durationMinutes: 25, selection: null, tag: '', task: null },
    };
    const view = render(<FocusCenterScreen />);
    await act(async () => { await Promise.resolve(); });
    act(() => jest.advanceTimersByTime(119_000));
    await act(async () => {
      fireEvent.press(view.getByText('Stop Focus'));
      await Promise.resolve();
    });

    expect(view.getByText('Are you sure you want to leave?')).toBeTruthy();
    expect(view.getByText('Stay')).toBeTruthy();
    expect(view.getByText('Leave')).toBeTruthy();
    fireEvent.press(view.getByText('Leave'));
    await waitFor(() => expect(mockNavigation.popTo).toHaveBeenCalledWith('DashboardRoot'));
    expect(mockStore.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'recordFocusStudy' }));
    expect(mockAppendFocusHistory).not.toHaveBeenCalled();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('resumes without losing focused time when Stay is selected under two minutes', async () => {
    jest.useFakeTimers();
    mockRoute.params = {
      focusSession: { mode: 'stopwatch', durationMinutes: 25, selection: null, tag: '', task: null },
    };
    const view = render(<FocusCenterScreen />);
    await act(async () => { await Promise.resolve(); });
    act(() => jest.advanceTimersByTime(119_000));
    fireEvent.press(view.getByText('Stop Focus'));
    expect(view.getByText('Are you sure you want to leave?')).toBeTruthy();

    fireEvent.press(view.getByText('Stay'));
    expect(view.queryByText('Are you sure you want to leave?')).toBeNull();
    act(() => jest.advanceTimersByTime(2_000));
    expect(view.getAllByText('02:01').length).toBeGreaterThan(0);
    expect(view.getByText('Pause')).toBeTruthy();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('returns an early-discarded Group Room session to the same room without saving it', async () => {
    jest.useFakeTimers();
    mockRoute.params = {
      focusSession: { mode: 'stopwatch', durationMinutes: 25, selection: null, tag: '', task: null },
      roomFocus: { groupId: 'grp-ras-mains', roomId: 'silent-focus', roomSessionId: 'room-session-1' },
    };
    const view = render(<FocusCenterScreen />);
    await act(async () => { await Promise.resolve(); });
    act(() => jest.advanceTimersByTime(119_000));
    fireEvent.press(view.getByText('Stop Focus'));
    fireEvent.press(view.getByText('Leave'));

    await waitFor(() => expect(mockNavigation.popTo).toHaveBeenCalledWith('Groups'));
    expect(mockStore.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'recordFocusStudy' }));
    expect(mockAppendFocusHistory).not.toHaveBeenCalled();
    expect(getGroupRoomFocusActivity()).toBeNull();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows the save/delete sheet at exactly two minutes', async () => {
    jest.useFakeTimers();
    mockRoute.params = {
      focusSession: { mode: 'stopwatch', durationMinutes: 25, selection: null, tag: '', task: null },
    };
    const view = render(<FocusCenterScreen />);
    await act(async () => { await Promise.resolve(); });
    act(() => jest.advanceTimersByTime(120_000));
    fireEvent.press(view.getByText('Stop Focus'));

    expect(view.getByText('End Focus Session?')).toBeTruthy();
    expect(view.getAllByText('02:00').length).toBeGreaterThan(0);
    fireEvent.press(view.getByText('Delete Session'));
    await act(async () => { await Promise.resolve(); });
    expect(mockStore.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'recordFocusStudy' }));
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('saves exactly 155 seconds once when Save is pressed repeatedly', async () => {
    jest.useFakeTimers();
    mockRoute.params = {
      focusSession: { mode: 'stopwatch', durationMinutes: 25, selection: 'manual', tag: 'History', task: null },
    };
    const view = render(<FocusCenterScreen />);
    await act(async () => { await Promise.resolve(); });
    act(() => jest.advanceTimersByTime(155_000));
    fireEvent.press(view.getByText('Stop Focus'));
    expect(view.getAllByText('02:35').length).toBeGreaterThan(0);

    act(() => {
      fireEvent.press(view.getByText('Save Session'));
      fireEvent.press(view.getByText('Save Session'));
    });
    await waitFor(() => expect(mockNavigation.replace).toHaveBeenCalledWith(
      'FocusCompletion',
      expect.objectContaining({
        session: expect.objectContaining({
          focusedSeconds: 155,
          actualSeconds: 155,
          status: 'saved_early',
          subject: 'History',
        }),
      }),
    ));

    expect(mockAppendFocusHistory).toHaveBeenCalledTimes(1);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
    expect(mockStore.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'recordFocusStudy',
      seconds: 155,
    }));
    expect(mockStore.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'upsertFocusHistory' }));
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('excludes a five-minute pause from the saved stopwatch duration', async () => {
    jest.useFakeTimers();
    mockRoute.params = {
      focusSession: { mode: 'stopwatch', durationMinutes: 25, selection: null, tag: '', task: null },
    };
    const view = render(<FocusCenterScreen />);
    await act(async () => { await Promise.resolve(); });
    act(() => jest.advanceTimersByTime(60_000));
    fireEvent.press(view.getByText('Pause'));
    act(() => jest.advanceTimersByTime(5 * 60_000));
    fireEvent.press(view.getByText('Resume'));
    act(() => jest.advanceTimersByTime(95_000));
    fireEvent.press(view.getByText('Stop Focus'));

    expect(view.getAllByText('02:35').length).toBeGreaterThan(0);
    expect(view.getByText('End Focus Session?')).toBeTruthy();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('automatically saves a naturally completed timer exactly once', async () => {
    jest.useFakeTimers();
    mockRoute.params = {
      focusSession: { mode: 'timer', durationMinutes: 1, selection: null, tag: '', task: null },
    };
    render(<FocusCenterScreen />);
    await act(async () => { await Promise.resolve(); });
    act(() => jest.advanceTimersByTime(60_000));

    await waitFor(() => expect(mockNavigation.replace).toHaveBeenCalledWith(
      'FocusCompletion',
      expect.objectContaining({
        session: expect.objectContaining({
          focusedSeconds: 60,
          actualSeconds: 60,
          plannedSeconds: 60,
          status: 'completed',
        }),
      }),
    ));
    expect(mockAppendFocusHistory).toHaveBeenCalledTimes(1);
    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
    expect(mockStore.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'recordFocusStudy',
      seconds: 60,
    }));
    expect(mockStore.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'upsertFocusHistory' }));
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('restores a persisted session and calculates time from its original timestamp', async () => {
    jest.useFakeTimers();
    const now = Date.now();
    mockStorage.set('study-sakha-focus-active-session-v1:user-1', JSON.stringify({
      id: 'restored-session',
      userId: 'user-1',
      startedAt: new Date(now - 125_000).toISOString(),
      mode: 'stopwatch',
      plannedSeconds: null,
      focusedMilliseconds: 0,
      focusSegmentStartedAt: now - 125_000,
      phase: 'focus',
      resumePhase: null,
      breakElapsedMilliseconds: 0,
      breakStartedAt: null,
      subject: null,
      topic: null,
      taskId: null,
      task: null,
      groupId: null,
      sessionLabel: 'Stopwatch',
      endRequested: false,
    }));

    const view = render(<FocusCenterScreen />);
    await act(async () => { await Promise.resolve(); });
    expect(view.getAllByText('02:05').length).toBeGreaterThan(0);
    fireEvent.press(view.getByText('Stop Focus'));
    expect(view.getByText('End Focus Session?')).toBeTruthy();
    expect(view.getAllByText('02:05').length).toBeGreaterThan(0);
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('updates from timestamps when returning to the app after background time', async () => {
    jest.useFakeTimers();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((event, listener) => {
      if (event === 'change') mockAppStateListeners.push(listener);
      return { remove: jest.fn() };
    });
    mockRoute.params = {
      focusSession: { mode: 'stopwatch', durationMinutes: 25, selection: null, tag: '', task: null },
    };
    const view = render(<FocusCenterScreen />);
    await act(async () => { await Promise.resolve(); });
    act(() => jest.advanceTimersByTime(60_000));
    jest.clearAllTimers();
    act(() => jest.advanceTimersByTime(5 * 60_000));

    act(() => mockAppStateListeners.forEach((listener) => listener('active')));
    expect(view.getAllByText('05:00').length).toBeGreaterThan(0);
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('credits a scheduled focus save and synchronizes its group event once', async () => {
    jest.useFakeTimers();
    mockRoute.params = {
      focusSession: {
        mode: 'stopwatch',
        durationMinutes: 25,
        selection: 'schedule',
        tag: '',
        task: { id: 'scheduled-task', category: 'Tasks', title: 'Review Polity', subject: 'Polity' },
      },
      roomFocus: { groupId: 'grp-ras-mains', roomId: 'silent-focus', roomSessionId: 'room-session-1' },
    };
    const view = render(<FocusCenterScreen />);
    await act(async () => { await Promise.resolve(); });
    act(() => jest.advanceTimersByTime(155_000));
    fireEvent.press(view.getByText('Stop Focus'));
    fireEvent.press(view.getByText('Save Session'));

    await waitFor(() => expect(mockNavigation.replace).toHaveBeenCalledWith(
      'FocusCompletion',
      expect.objectContaining({
        session: expect.objectContaining({
          taskId: 'scheduled-task',
          subject: 'Polity',
          focusedSeconds: 155,
          status: 'saved_early',
          groupId: 'grp-ras-mains',
        }),
      }),
    ));
    expect(mockStore.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'recordFocusStudy',
      id: expect.any(String),
      taskId: 'scheduled-task',
      seconds: 155,
      category: 'Polity',
    }));
    expect(mockSubmitStudyMemberActivity).toHaveBeenCalledTimes(1);
    expect(mockSubmitStudyMemberActivity).toHaveBeenCalledWith(expect.objectContaining({
      groupId: 'grp-ras-mains',
      eventId: expect.any(String),
      activityType: 'focus_session',
      taskId: 'scheduled-task',
      subject: 'Polity',
      actualSeconds: 155,
      status: 'saved_early',
    }));
    expect(mockStore.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'plannerCompletion' }));
    jest.clearAllTimers();
    jest.useRealTimers();
  });
});

describe('virtual study hall seating', () => {
  const colors = {
    surface: '#FFFFFF',
    surfaceElevated: '#F3F4F6',
    border: '#D1D5DB',
    textPrimary: '#111827',
    textSecondary: '#374151',
    textMuted: '#6B7280',
    successSoft: '#DCFCE7',
    successBorder: '#16A34A',
    successText: '#15803D',
    warningSoft: '#FEF3C7',
    warningBorder: '#D97706',
    warning: '#B45309',
  };

  it('keeps the personal chair empty and does not show presence alone as focusing', () => {
    const view = render(
      <VirtualStudyHall
        width={390}
        userId="self"
        userName="Study Partner"
        userInitials="SP"
        activity={null}
        participants={[{
          userId: 'peer',
          name: 'Room Peer',
          initials: 'RP',
          subject: 'Polity',
          focusSessionId: null,
          focusStartedAt: null,
          streak: 1,
          focusing: false,
          focusSessionActive: false,
          focusSessionState: 'focusing',
          focusElapsedSeconds: 0,
          focusUpdatedAt: null,
        }]}
        colors={colors}
        connectionMessage={null}
      />
    );

    expect(view.getByText('Your Chair')).toBeTruthy();
    expect(view.getByText('Room Peer')).toBeTruthy();
    expect(view.getByText('In the hall')).toBeTruthy();
    expect(view.queryByText('Focusing')).toBeNull();
  });

  it('shows a real break activity as an amber-state chair with subject and elapsed time', () => {
    const view = render(
      <VirtualStudyHall
        width={390}
        userId="self"
        userName="Study Partner"
        userInitials="SP"
        activity={{
          groupId: 'group-1',
          roomId: 'silent-focus',
          roomSessionId: 'session-1',
          subject: 'Economy',
          status: 'break',
          startedAt: '2026-11-20T13:00:00.000Z',
          elapsedSeconds: 300,
          updatedAt: '2026-11-20T13:05:00.000Z',
        }}
        participants={[]}
        colors={colors}
        connectionMessage={null}
      />
    );

    expect(view.getByText('Study Partner')).toBeTruthy();
    expect(view.getByText('Economy')).toBeTruthy();
    expect(view.getByText('On break')).toBeTruthy();
    expect(view.getByText('05:00')).toBeTruthy();
    view.unmount();
  });
});
