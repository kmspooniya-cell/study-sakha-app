import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import FocusCompletionScreen from '../screens/FocusCompletionScreen';
import type { AppStackParamList } from '../lib/navigation';
import { updateFocusHistoryRecord } from '../lib/focusHistory';

const mockNavigation = {
  navigate: jest.fn<(route: string, params?: object) => void>(),
  popTo: jest.fn<(route: string) => void>(),
};
const mockDispatch = jest.fn();
const initialSession: AppStackParamList['FocusCompletion']['session'] = {
  id: 'session-1',
  sessionId: 'session-1',
  startedAt: '2026-11-19T10:00:00.000Z',
  endedAt: '2026-11-19T10:02:35.000Z',
  completedAt: '2026-11-19T10:02:35.000Z',
  focusedSeconds: 155,
  actualSeconds: 155,
  plannedSeconds: 1500,
  minutes: 155 / 60,
  mode: 'stopwatch',
  status: 'saved_early',
  topic: 'Review Polity',
  subject: 'Polity',
};
const mockRoute: { params: AppStackParamList['FocusCompletion'] } = {
  params: {
    session: initialSession,
    message: 'Good Effort! Your Focus Session Has Been Saved.',
  },
};
let mockScheme: 'light' | 'dark' = 'light';
let mockMode: 'light' | 'dark' | 'system' = 'light';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));
jest.mock('../lib/store', () => ({
  dayKey: (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  },
  getUserScopedStorageKey: (key: string, userId: string | null | undefined) =>
    userId ? `${key}:user:${userId}` : key,
  useStore: () => ({
    state: {
      user: { id: 'user-1' },
      settings: { dailyGoalMin: 120 },
      studyLog: { '2026-11-19': 42 },
      recordedFocusSessionIds: ['session-1'],
    },
    streak: 3,
    dispatch: mockDispatch,
  }),
}));
jest.mock('../lib/theme', () => ({
  useTheme: () => ({
    mode: mockMode,
    scheme: mockScheme,
  }),
}));
jest.mock('../components/Shell', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Shell: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
  };
});
jest.mock('../lib/focusHistory', () => ({
  updateFocusHistoryRecord: jest.fn(() => Promise.resolve([])),
}));
jest.mock('expo-media-library', () => ({
  Asset: { create: () => Promise.resolve({}) },
  requestPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => Promise.resolve(true),
  shareAsync: () => Promise.resolve(),
}));
jest.mock('react-native-view-shot', () => ({
  captureRef: () => Promise.resolve('file://proof.png'),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('../components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Button: ({ label, onPress }: { label: string; onPress?: () => void }) =>
      React.createElement(Pressable, { onPress }, React.createElement(Text, null, label)),
    Card: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    Txt: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));

describe('focus completion screen', () => {
  beforeEach(() => {
    mockNavigation.navigate.mockClear();
    mockNavigation.popTo.mockClear();
    mockDispatch.mockClear();
    jest.mocked(updateFocusHistoryRecord).mockClear();
    mockRoute.params = {
      session: { ...initialSession },
      message: 'Good Effort! Your Focus Session Has Been Saved.',
    };
    mockScheme = 'light';
    mockMode = 'light';
  });

  it.each(['light', 'dark'] as const)('renders session details in %s mode', (scheme) => {
    mockScheme = scheme;
    const view = render(<FocusCompletionScreen />);

    expect(view.getByText('02:35')).toBeTruthy();
    expect(view.getByText('of 25:00 goal')).toBeTruthy();
    expect(view.getByText('Review Polity')).toBeTruthy();
    expect(view.getAllByText('Saved Early')).toHaveLength(2);
    expect(view.queryByText('Goal Met')).toBeNull();
    view.unmount();
  });

  it('resumes with the uncompleted duration and selected subject', () => {
    const view = render(<FocusCompletionScreen />);

    fireEvent.press(view.getByText('Resume Remaining (22:25)'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('FocusCenter', {
      focusSession: {
        mode: 'stopwatch',
        durationMinutes: 23,
        selection: 'manual',
        tag: 'Polity',
        task: null,
      },
    });
  });

  it('shows only the goal-met outcome and starts a break for completed sessions', () => {
    mockRoute.params.session = {
      ...mockRoute.params.session,
      focusedSeconds: 1500,
      actualSeconds: 1500,
      plannedSeconds: 1500,
      status: 'completed',
    };
    const view = render(<FocusCompletionScreen />);

    expect(view.getByText('Goal Met')).toBeTruthy();
    expect(view.queryByText('Saved Early')).toBeNull();
    fireEvent.press(view.getByText('Take 5m Smart Break'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('FocusCenter', {
      focusSession: {
        mode: 'timer',
        durationMinutes: 25,
        selection: 'manual',
        tag: 'Polity',
        task: null,
        startInBreak: true,
      },
    });
  });

  it('does not report goal achievement when a completed record is short of its plan', () => {
    mockRoute.params.session = {
      ...mockRoute.params.session,
      focusedSeconds: 120,
      actualSeconds: 120,
      plannedSeconds: 1500,
      status: 'completed',
    };
    const view = render(<FocusCompletionScreen />);

    expect(view.getAllByText('Saved Early')).toHaveLength(2);
    expect(view.queryByText('Goal Met')).toBeNull();
  });

  it('shows a safe recovery screen for malformed session parameters', () => {
    mockRoute.params = { session: { id: 'broken' } } as never;
    const view = render(<FocusCompletionScreen />);

    expect(view.getByText('This focus session could not be opened.')).toBeTruthy();
    fireEvent.press(view.getByText('Return to Dashboard'));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('DashboardRoot');
  });

  it('routes statistics to the existing screen', () => {
    const view = render(<FocusCompletionScreen />);

    fireEvent.press(view.getByText('View Statistics'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Statistics');
  });

  it('saves the selected focus quality to the session history', () => {
    const view = render(<FocusCompletionScreen />);

    fireEvent.press(view.getByText('Deep Flow'));

    expect(jest.mocked(updateFocusHistoryRecord)).toHaveBeenCalledWith(
      'study-sakha-focus-history-v1:user:user-1',
      'session-1',
      { focusQuality: 'flow' },
    );
  });
});
