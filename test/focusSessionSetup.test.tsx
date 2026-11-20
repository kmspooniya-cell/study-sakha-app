import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  endGroupRoomFocus,
  getGroupRoomFocusActivity,
  subscribeGroupRoomFocus,
} from '../lib/groupRoomFocusBridge';
import { VirtualStudyHall } from '../components/VirtualStudyHall';

const mockBlurListeners: (() => void)[] = [];
const mockNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
  setParams: jest.fn(),
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
const mockStore = {
  state: {
    plannerTasksLoaded: true,
    plannerTaskLoadError: null,
    plannerTasks: [mockPlannerTask],
    user: { id: 'user-1', name: 'Test User', display_name: 'Test User' },
  },
  dispatch: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => mockNavigation,
    useRoute: () => mockRoute,
    useFocusEffect: (callback: React.EffectCallback) => React.useEffect(callback, [callback]),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

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
    loop: false,
  };
  return {
    setAudioModeAsync: jest.fn(),
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0 }),
  };
});
jest.mock('../lib/store', () => ({
  useStore: () => mockStore,
  dayKey: () => '2026-11-19',
  getUserScopedStorageKey: () => 'focus-history',
}));
jest.mock('../lib/groupRooms', () => {
  const actual = jest.requireActual<typeof import('../lib/groupRooms')>('../lib/groupRooms');
  return {
    ...actual,
    createRoomSession: jest.fn(async () => 'room-session-1'),
    getActiveStudyGroupIds: jest.fn(async () => ['grp-ras-mains']),
    getStudyRoomLogs: jest.fn(async () => []),
    getStudyRoomProfiles: jest.fn(async () => []),
    updateRoomSession: jest.fn(async () => undefined),
  };
});
jest.mock('../lib/groupRoomRealtime', () => ({
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
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));
jest.mock('../lib/focusHistory', () => ({ appendFocusHistory: jest.fn(async () => undefined) }));
jest.mock('../components/DashboardStudyTools', () => ({ FocusActivityTimer: () => null }));
jest.mock('../components/FullScreenMeditation', () => ({ FullScreenMeditation: () => null }));
jest.mock('../components/MeditationPresets', () => ({
  getPresetById: () => ({ title: 'Preset', accentColor: '#FFF', icon: 'leaf' }),
}));
jest.mock('../components/MeditationSceneRenderer', () => ({ MeditationSceneRenderer: () => null }));
jest.mock('../lib/audioDownloadManager', () => ({
  AudioDownloadManager: { subscribe: () => jest.fn(), download: jest.fn(), deleteDownloaded: jest.fn() },
}));

const GroupsScreen = require('../screens/GroupsScreen').default as typeof import('../screens/GroupsScreen').default;
const FocusCenterScreen = require('../screens/FocusCenterScreen').default as typeof import('../screens/FocusCenterScreen').default;

describe('shared focus session setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBlurListeners.length = 0;
    const activeRoomFocus = getGroupRoomFocusActivity();
    if (activeRoomFocus) endGroupRoomFocus(activeRoomFocus.roomSessionId);
    mockRoute.params = {};
  });

  it('opens the shared setup and starts Focus Center with the room session linked', async () => {
    jest.useFakeTimers();
    const view = render(<GroupsScreen />);
    fireEvent.press(view.getByRole('button', { name: 'Open RAS Mains 2026 — Rajasthan Special' }));
    await act(async () => {
      fireEvent.press(view.getAllByText('Join room')[0]);
      await Promise.resolve();
    });
    fireEvent.press(view.getByRole('button', { name: 'Start Focusing' }));
    expect(view.getByText('Focus Session Setup')).toBeTruthy();
    expect(mockNavigation.push).not.toHaveBeenCalled();
    fireEvent.press(view.getByText('Continue to Full Focus'));

    expect(mockNavigation.push).toHaveBeenCalledWith('FocusCenter', {
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

  it('opens from Focus Center, closes in place, and starts the chosen focus session', () => {
    const view = render(<FocusCenterScreen />);
    fireEvent.press(view.getByText('Focus for Study'));
    expect(view.getByText('Focus Session Setup')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Close focus session setup' }));
    expect(view.getByText('Focus Lock')).toBeTruthy();
    expect(view.queryByText('FULL FOCUS')).toBeNull();

    fireEvent.press(view.getByText('Focus for Study'));
    fireEvent.press(view.getByText('Stopwatch'));
    fireEvent.press(view.getByText('Tag Manually'));
    fireEvent.press(view.getByText('Polity'));
    fireEvent.press(view.getByText('Continue to Full Focus'));

    expect(view.getByText('STOPWATCH')).toBeTruthy();
    expect(view.getByText('00:00')).toBeTruthy();
    expect(view.getByText('Polity')).toBeTruthy();
  });

  it('publishes linked room focus updates and clears the chair when the session stops', () => {
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
    fireEvent.press(view.getByText('Resume'));
    expect(getGroupRoomFocusActivity()?.status).toBe('focusing');

    act(() => mockBlurListeners.forEach((listener) => listener()));
    expect(getGroupRoomFocusActivity()?.roomSessionId).toBe('room-session-1');

    fireEvent.press(view.getByText('Stop Focus'));
    expect(getGroupRoomFocusActivity()).toBeNull();
    expect(mockNavigation.setParams).toHaveBeenCalledWith({ roomFocus: undefined });
    expect(events.filter((event) => event !== 'update')).toEqual(['start', 'pause', 'break', 'resume', 'stop']);
    unsubscribe();
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
