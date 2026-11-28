import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithSSDS } from './ssdsTestUtils';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

let mockScheme: 'light' | 'dark' = 'light';
const mockDispatch = jest.fn();

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('../components/Shell', () => ({
  Shell: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="mock-shell">{children}</View>;
  },
}));

jest.mock('../lib/store', () => ({
  useStore: () => ({
    state: {
      user: { id: 'u1', name: 'Asha' },
      settings: { themeMode: mockScheme },
    },
    dispatch: mockDispatch,
  }),
  dayKey: () => '2026-11-27',
  getUserScopedStorageKey: (base: string, userId?: string | null) => (userId ? `${base}:user:${userId}` : base),
}));

jest.mock('../lib/theme', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    reduceMotion: true,
    colors:
      mockScheme === 'dark'
        ? {
            bg: '#090D16',
            card: '#111827',
            surface: '#1F2937',
            border: '#1F2937',
            text: '#F8FAFC',
            sub: '#94A3B8',
            muted: '#64748B',
            accent: '#6366F1',
            success: '#10B981',
            warning: '#F59E0B',
            danger: '#F43F5E',
          }
        : {
            bg: '#F8FAFC',
            card: '#FFFFFF',
            surface: '#F1F5F9',
            border: '#E2E8F0',
            text: '#0F172A',
            sub: '#475569',
            muted: '#64748B',
            accent: '#4F46E5',
            success: '#059669',
            warning: '#D97706',
            danger: '#E11D48',
          },
  }),
}));

jest.mock('../lib/focusLockNative', () => ({
  focusLockNative: null,
  subscribeFocusLockEvent: () => () => undefined,
}));

jest.mock('../lib/focusHistory', () => ({
  appendFocusHistory: jest.fn(() => Promise.resolve([])),
}));

import FocusLockScreen from '../screens/FocusLockScreen';

describe('FocusLockScreen UI cleanup & feature removal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScheme = 'light';
  });

  it('renders only Blocking Profiles, Discipline Controls (5 items), and Android Protection Readiness', async () => {
    const view = renderWithSSDS(<FocusLockScreen />);

    await waitFor(() => {
      expect(view.getByText('BLOCKING PROFILES')).toBeTruthy();
    });

    // 1. Blocking Profiles (without Manage Apps button)
    expect(view.queryByText(/Manage Apps/)).toBeNull();

    // 2. Discipline Controls (only the 5 retained cards)
    expect(view.getByText('DISCIPLINE CONTROLS')).toBeTruthy();
    expect(view.getByText('Blocking Modes')).toBeTruthy();
    expect(view.getByText('App Selection')).toBeTruthy();
    expect(view.getByText('Strict Mode')).toBeTruthy();
    expect(view.getByText('Focus Analytics')).toBeTruthy();
    expect(view.getByText('Web & Shorts')).toBeTruthy();

    // 3. Android Protection Readiness
    expect(view.getByText('Android Protection Readiness')).toBeTruthy();

    // Removed sections & features must not appear anywhere
    expect(view.queryByText('Ready to Focus')).toBeNull();
    expect(view.queryByText('Blocked Apps')).toBeNull();
    expect(view.queryByText('Duration')).toBeNull();
    expect(view.queryByText('Blocked Today')).toBeNull();
    expect(view.queryByText('Quick Focus Lock')).toBeNull();
    expect(view.queryByText('Instant Start')).toBeNull();
    expect(view.queryByText('START FOCUS LOCK')).toBeNull();
    expect(view.queryByText('Sakha Owl • Ready to Guard')).toBeNull();
    expect(view.queryByText('Preview Intervention Screen')).toBeNull();
    expect(view.queryByText('Sakha AI →')).toBeNull();
    expect(view.queryByText('Usage Rules')).toBeNull();
    expect(view.queryByText('Smart Schedules')).toBeNull();
    expect(view.queryByText('Smart Breaks')).toBeNull();
    expect(view.queryByText('Study Sakha Exclusive Suite')).toBeNull();
  });

  it('opens each retained Discipline Controls screen correctly', async () => {
    const view = renderWithSSDS(<FocusLockScreen />);

    await waitFor(() => {
      expect(view.getByText('Blocking Modes')).toBeTruthy();
    });

    fireEvent.press(view.getByText('Blocking Modes'));
    expect(view.getByText('Choose how Study Sakha enforces protection')).toBeTruthy();

    // Verify dark mode also renders cleanly
    mockScheme = 'dark';
    const darkView = renderWithSSDS(<FocusLockScreen />);
    await waitFor(() => {
      expect(darkView.getByText('App Selection')).toBeTruthy();
    });
    fireEvent.press(darkView.getByText('App Selection'));
    expect(darkView.getByText('App Management')).toBeTruthy();

    // Strict Mode
    const strictView = renderWithSSDS(<FocusLockScreen />);
    await waitFor(() => {
      expect(strictView.getByText('Strict Mode')).toBeTruthy();
    });
    fireEvent.press(strictView.getByText('Strict Mode'));
    expect(strictView.getByText('Configure discipline friction & safeguards')).toBeTruthy();

    // Focus Analytics
    const analyticsView = renderWithSSDS(<FocusLockScreen />);
    await waitFor(() => {
      expect(analyticsView.getByText('Focus Analytics')).toBeTruthy();
    });
    fireEvent.press(analyticsView.getByText('Focus Analytics'));
    expect(analyticsView.getByText('Actual usage vs blocked attempts kept separate')).toBeTruthy();

    // Web & Shorts
    const contentView = renderWithSSDS(<FocusLockScreen />);
    await waitFor(() => {
      expect(contentView.getByText('Web & Shorts')).toBeTruthy();
    });
    fireEvent.press(contentView.getByText('Web & Shorts'));
    expect(contentView.getByText('Content & Web Filtering')).toBeTruthy();
  });
});
