import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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
  return { Shell: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

jest.mock('../components/FocusSessionSetupModal', () => ({
  FocusSessionSetupModal: () => null,
}));

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
  return { __esModule: true, default: View, Path: View, Circle: View, Rect: View, Ellipse: View };
});

function dateOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('Study Planner status filters', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = {
      storageReady: true,
      plannerScheduleItems: [
        { id: 'missed', category: 'Tasks', title: 'Missed Plan', date: dateOffset(-1) },
        { id: 'upcoming', category: 'Classes', title: 'Upcoming Plan', date: dateOffset(1) },
        { id: 'completed', category: 'Activities', title: 'Completed Plan', date: dateOffset(0) },
      ],
      plannerScheduleCompletions: {
        [`completed::${dateOffset(0)}`]: dateOffset(0),
      },
      plannerTaskStudySeconds: {},
    } as Partial<State>;
  });

  it('only shows status filters in List view and filters list plans by status', () => {
    const view = render(<StudyPlannerScreen />);
    expect(view.queryByRole('button', { name: 'Completed' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Missed' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Upcoming' })).toBeNull();

    fireEvent.press(view.getByText('List'));
    expect(view.getByRole('button', { name: 'Completed' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Missed' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Upcoming' })).toBeTruthy();
    expect(view.getByText('Upcoming Plan')).toBeTruthy();
    expect(view.queryByText('Missed Plan')).toBeNull();
    expect(view.queryByText('Completed Plan')).toBeNull();

    fireEvent.press(view.getByRole('button', { name: 'Missed' }));
    expect(view.getByText('Missed Plan')).toBeTruthy();
    expect(view.queryByText('Upcoming Plan')).toBeNull();

    fireEvent.press(view.getByText('Calendar'));
    expect(view.queryByRole('button', { name: 'Completed' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Missed' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Upcoming' })).toBeNull();
  });

  it('does not render a planned-focus duration control in Task, Class, or Activity forms', () => {
    const view = render(<StudyPlannerScreen />);
    fireEvent.press(view.getByText('List'));
    fireEvent.press(view.getByText('Add Plan'));

    expect(view.getByText('New Task')).toBeTruthy();
    expect(view.queryByText('PLANNED FOCUS DURATION')).toBeNull();

    const classTab = view.getAllByText('Classes').at(-1);
    if (!classTab) throw new Error('Class form tab was not rendered.');
    fireEvent.press(classTab);
    expect(view.getByText('New Class')).toBeTruthy();
    expect(view.queryByText('PLANNED FOCUS DURATION')).toBeNull();

    const activityTab = view.getAllByText('Activities').at(-1);
    if (!activityTab) throw new Error('Activity form tab was not rendered.');
    fireEvent.press(activityTab);
    expect(view.getByText('New Activity')).toBeTruthy();
    expect(view.queryByText('PLANNED FOCUS DURATION')).toBeNull();
  });

  it('preserves legacy planned duration data when editing a task', () => {
    mockState = {
      storageReady: true,
      plannerScheduleItems: [
        {
          id: 'legacy',
          category: 'Tasks',
          title: 'Legacy Plan',
          date: dateOffset(1),
          durationMinutes: 60,
          durationLabel: '60 min',
        },
      ],
      plannerScheduleCompletions: {},
      plannerTaskStudySeconds: {},
    } as Partial<State>;
    const view = render(<StudyPlannerScreen />);
    fireEvent.press(view.getByText('List'));
    fireEvent.press(view.getByLabelText('Edit plan'));
    expect(view.getByText('Edit Task')).toBeTruthy();
    expect(view.queryByText('PLANNED FOCUS DURATION')).toBeNull();

    fireEvent.press(view.getByText('Update Task'));
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'updatePlannerScheduleItem',
      item: expect.objectContaining({
        durationMinutes: 60,
        durationLabel: '60 min',
      }),
    }));
  });
});
