import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ThemeProvider } from '../lib/theme';

const mockNavigate = jest.fn();
const mockStore = {
  state: {
    settings: { themeMode: 'system', language: 'en', textScale: 1, notifications: true },
    user: { name: 'Asha', email: 'asha@example.test', role: 'learner', exam: 'upsc' },
  },
  dispatch: jest.fn(),
  signOut: jest.fn(async () => ({ ok: true })),
  saveProfile: jest.fn(async () => ({ ok: true })),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
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
  default: { clear: jest.fn(async () => undefined) },
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

    expect(view.getByText('Personal Settings')).toBeTruthy();
    expect(view.getByText('Group Settings')).toBeTruthy();
    expect(view.getByText('About & Support')).toBeTruthy();

    fireEvent.press(view.getByRole('button', { name: 'Dark theme' }));
    expect(mockStore.dispatch).toHaveBeenCalledWith({ type: 'settings', patch: { themeMode: 'dark' } });

    fireEvent.press(view.getByRole('button', { name: 'Study Preferences' }));
    expect(mockNavigate).toHaveBeenCalledWith('StudyPlanner');
    fireEvent.press(view.getByRole('button', { name: /My Groups/ }));
    expect(mockNavigate).toHaveBeenCalledWith('Groups');

    fireEvent.press(view.getByRole('button', { name: /Category/ }));
    fireEvent.press(view.getByText('SSC CGL & CHSL'));
    await waitFor(() => expect(mockStore.saveProfile).toHaveBeenCalledWith({ exam: 'ssc' }));
  });
});
