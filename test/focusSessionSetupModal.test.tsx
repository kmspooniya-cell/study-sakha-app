import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FocusSessionSetupModal } from '../components/FocusSessionSetupModal';
import type { State } from '../lib/store';

let mockState: Partial<State>;

jest.mock('../lib/store', () => ({
  useStore: () => ({ state: mockState }),
}));

jest.mock('../lib/theme', () => ({
  useTheme: () => ({
    scheme: 'light',
    colors: {
      text: '#111111',
      textMuted: '#666666',
      surface: '#FFFFFF',
      surfaceAlt: '#F3F4F6',
      blue: '#2563EB',
      border: '#DDDDDD',
    },
  }),
}));

jest.mock('../components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) =>
      React.createElement(Pressable, { accessibilityRole: 'button', onPress }, React.createElement(Text, null, label)),
    Txt: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));

function dateOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function setupModal() {
  const value = {
    mode: 'timer' as const,
    durationMinutes: 25,
    selection: null,
    tag: '',
    task: null,
  };
  return render(
    <FocusSessionSetupModal
      visible
      value={value}
      onChange={jest.fn()}
      onClose={jest.fn()}
      onContinue={jest.fn()}
    />,
  );
}

describe('Focus Session Setup schedule picker', () => {
  beforeEach(() => {
    mockState = {
      storageReady: true,
      plannerScheduleItems: [
        { id: 'missed', category: 'Tasks', title: 'Missed Plan', date: dateOffset(-1) },
        { id: 'upcoming', category: 'Classes', title: 'Upcoming Plan', date: dateOffset(1) },
      ],
      plannerScheduleCompletions: {},
      plannerTaskStudySeconds: {},
    } as Partial<State>;
  });

  it('opens the schedule bottom sheet with only the selected Missed or Upcoming plans', () => {
    const view = setupModal();
    fireEvent.press(view.getByText('Add from Schedule'));

    expect(view.getByRole('tab', { name: 'Upcoming' })).toBeTruthy();
    expect(view.getByText('Upcoming Plan')).toBeTruthy();
    expect(view.queryByText('Missed Plan')).toBeNull();

    fireEvent.press(view.getByRole('tab', { name: 'Missed' }));
    expect(view.getByText('Missed Plan')).toBeTruthy();
    expect(view.queryByText('Upcoming Plan')).toBeNull();
  });

  it('shows an explicit empty state for a tab with no matching plans', () => {
    mockState = {
      storageReady: true,
      plannerScheduleItems: [],
      plannerScheduleCompletions: {},
      plannerTaskStudySeconds: {},
    } as Partial<State>;
    const view = setupModal();
    fireEvent.press(view.getByText('Add from Schedule'));

    expect(view.getByText('No upcoming plans')).toBeTruthy();
    expect(view.getByText('Add a plan in Study Planner to see it here.')).toBeTruthy();

    fireEvent.press(view.getByRole('tab', { name: 'Missed' }));
    expect(view.getByText('No missed plans')).toBeTruthy();
    expect(view.getByText('You’re all caught up with past plans.')).toBeTruthy();
  });
});
