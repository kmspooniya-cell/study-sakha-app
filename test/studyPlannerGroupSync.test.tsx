import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { State } from '../lib/store';
import StudyPlannerScreen from '../screens/StudyPlannerScreen';

let mockState: Partial<State>;
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../lib/store', () => ({
  useStore: () => ({ state: mockState, dispatch: mockDispatch }),
}));

jest.mock('../lib/theme', () => ({
  useTheme: () => ({ scheme: 'light' }),
}));

jest.mock('../components/Shell', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    Shell: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('../components/FocusSessionSetupModal', () => ({
  FocusSessionSetupModal: () => null,
}));

jest.mock('../lib/groupRooms', () => ({
  submitStudyMemberActivityToJoinedGroups: jest.fn(async () => ({
    groupIds: ['group-1', 'group-2'],
    failures: [],
  })),
}));

import { submitStudyMemberActivityToJoinedGroups } from '../lib/groupRooms';
const mockSubmitJoined = jest.mocked(submitStudyMemberActivityToJoinedGroups);

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: View,
    Path: View,
    Circle: View,
    Rect: View,
    Ellipse: View,
  };
});

function localTodayISO() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

describe('Study Planner completion group sync', () => {
  const planId = 'plan-polity-1';
  let todayISO: string;
  let occurrenceId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    todayISO = localTodayISO();
    occurrenceId = `${planId}::${todayISO}`;
    mockState = {
      storageReady: true,
      user: {
        id: 'user-1',
        name: 'Test User',
        display_name: 'Test User',
        email: 'user@example.com',
        role: 'learner',
        exam: 'upsc',
        joined: '2026-01-01',
      },
      plannerScheduleItems: [
        {
          id: planId,
          category: 'Tasks',
          title: 'Revise Polity',
          subject: 'Polity',
          date: todayISO,
          durationMinutes: 45,
          durationLabel: '45 min',
          dateRangeMode: 'none',
          recurrence: 'none',
          completed: false,
        },
      ],
      plannerScheduleCompletions: {},
      plannerTaskStudySeconds: {},
    } as Partial<State>;
  });

  it('marks a plan complete and synchronizes it to every active joined group', async () => {
    const view = render(<StudyPlannerScreen />);
    fireEvent.press(view.getByText('List'));
    expect(view.getByText('Revise Polity')).toBeTruthy();

    fireEvent.press(view.getByText('Revise Polity'));
    expect(view.getByText('Mark as Completed')).toBeTruthy();

    fireEvent.press(view.getByText('Mark as Completed'));

    await waitFor(() => expect(mockSubmitJoined).toHaveBeenCalledTimes(1));
    expect(mockSubmitJoined).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        eventId: `planner-task-completed:${occurrenceId}`,
        activityType: 'planner_task_completed',
        taskId: occurrenceId,
        subject: 'Polity',
        actualSeconds: 0,
        status: 'completed',
        scheduleId: planId,
        scheduleOccurrenceId: occurrenceId,
        occurredAt: expect.any(String),
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'setPlannerScheduleCompletion',
        occurrenceId,
        date: todayISO,
        completed: true,
      }),
    );
    view.unmount();
  });

  it('does not synchronize a plan that is already completed', () => {
    mockState = {
      ...mockState,
      plannerScheduleCompletions: { [occurrenceId]: todayISO },
    } as Partial<State>;
    const view = render(<StudyPlannerScreen />);
    fireEvent.press(view.getByText('List'));
    // Completed occurrences are filtered out of the upcoming list, so there is
    // no completion action and nothing is synchronized.
    expect(view.queryByText('Revise Polity')).toBeNull();
    expect(mockSubmitJoined).not.toHaveBeenCalled();
    view.unmount();
  });

  it('still completes the plan locally when the user has no active session', () => {
    mockState = { ...mockState, user: null } as Partial<State>;
    const view = render(<StudyPlannerScreen />);
    fireEvent.press(view.getByText('List'));
    fireEvent.press(view.getByText('Revise Polity'));
    fireEvent.press(view.getByText('Mark as Completed'));
    expect(mockSubmitJoined).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'setPlannerScheduleCompletion',
        occurrenceId,
        date: todayISO,
        completed: true,
      }),
    );
    view.unmount();
  });
});
