import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import FocusCompletionScreen from '../screens/FocusCompletionScreen';

const mockNavigation = {
  navigate: jest.fn(),
  popTo: jest.fn(),
};
const mockRoute = {
  params: {
    session: {
      id: 'session-1',
      sessionId: 'session-1',
      startedAt: '2026-11-19T10:00:00.000Z',
      endedAt: '2026-11-19T10:02:35.000Z',
      completedAt: '2026-11-19T10:02:35.000Z',
      focusedSeconds: 155,
      actualSeconds: 155,
      plannedSeconds: 1500,
      minutes: 155 / 60,
      mode: 'stopwatch' as const,
      status: 'saved_early' as const,
      topic: 'Review Polity',
      subject: 'Polity',
    },
    message: 'Good Effort! Your Focus Session Has Been Saved.',
  },
};
let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));
jest.mock('../lib/theme', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    colors: {
      amber: '#F59E0B',
      rose: '#F43F5E',
      teal: '#14B8A6',
      textMuted: '#667085',
      textFaint: '#98A2B3',
      blue: '#2563EB',
      border: '#D0D5DD',
      surface: '#FFFFFF',
      surfaceAlt: '#F2F4F7',
      warning: '#B54708',
    },
  }),
}));
jest.mock('../components/Shell', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Shell: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
  };
});
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
  it.each(['light', 'dark'] as const)('renders session details in %s mode', (scheme) => {
    mockScheme = scheme;
    const view = render(<FocusCompletionScreen />);

    expect(view.getByText('Good Effort! Your Focus Session Has Been Saved.')).toBeTruthy();
    expect(view.getByText('02:35')).toBeTruthy();
    expect(view.getByText('25:00')).toBeTruthy();
    expect(view.getByText('Stopwatch')).toBeTruthy();
    expect(view.getByText('Saved early')).toBeTruthy();
    expect(view.getByText('Review Polity')).toBeTruthy();
    view.unmount();
  });
});
