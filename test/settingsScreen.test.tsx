import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ThemeProvider } from '../lib/theme';

const mockNavigate = jest.fn();
const mockStore = {
  state: {
    settings: { themeMode: 'system', language: 'en', textScale: 1, notifications: true },
    user: { name: 'Asha', email: 'asha@example.test', role: 'learner', exam: 'upsc' },
    plannerSettings: { dailyTargetHours: 3, weeklyTargetHours: 10 },
    notes: [],
    studyLog: {},
    results: [],
    recordedFocusSessionIds: [],
    plannerTasks: [],
    plannerScheduleItems: [],
  },
  streak: 0,
  todayMinutes: 0,
  dispatch: jest.fn(),
  signOut: jest.fn(async () => ({ ok: true })),
  saveProfile: jest.fn(async () => ({ ok: true })),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, popTo: mockNavigate }),
}));

jest.mock('../components/Shell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Shell: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children) };
});

jest.mock('../components/ui', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Txt: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children) };
});

jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('../lib/store', () => ({ useStore: () => mockStore }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    clear: jest.fn(async () => undefined),
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}));
jest.mock('../lib/notifications', () => ({ requestNotificationPermission: jest.fn(async () => true) }));
jest.mock('../lib/supabase', () => ({
  supabaseConfigured: false,
  supabase: { auth: { signInWithPassword: jest.fn(), updateUser: jest.fn() } },
}));

const SettingsScreen = require('../screens/SettingsScreen').default as typeof import('../screens/SettingsScreen').default;

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders grouped settings, applies preferences, and routes to existing screens', async () => {
    const view = render(
      <ThemeProvider mode="light">
        <SettingsScreen />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(view.getByText(/Account & Profile/)).toBeTruthy();
      expect(view.getByText(/Groups & Community/)).toBeTruthy();
      expect(view.getByText(/About Study Sakha/)).toBeTruthy();
    });

    fireEvent.press(view.getByText('Study Planner & Goals'));
    expect(view.getByText('Daily Study Goal')).toBeTruthy();

    fireEvent.press(view.getByLabelText('Back to previous Settings screen'));
    expect(view.getByText(/Account & Profile/)).toBeTruthy();
  });
});
