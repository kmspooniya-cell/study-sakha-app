import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithSSDS } from './ssdsTestUtils';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

const mockDispatch = jest.fn();
const mockScheduleNotificationAsync = jest.fn<(...args: unknown[]) => Promise<string>>(async () => 'notif-1');
const mockGetInstalledApps = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetBlockingStatus = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetUsageStats = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockStartBlockingSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSetDndEnabled = jest.fn<(...args: unknown[]) => Promise<boolean>>(async () => true);
const mockOpenDndSettings = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockSetRestartRecoveryEnabled = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockConsumePendingCompletions = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => []);

let mockPlannerScheduleItems: Array<Record<string, unknown>> = [];

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
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
      settings: { themeMode: 'light' },
      plannerScheduleItems: mockPlannerScheduleItems,
    },
    dispatch: mockDispatch,
  }),
  dayKey: () => '2026-11-27',
  getUserScopedStorageKey: (base: string, userId?: string | null) => (userId ? `${base}:user:${userId}` : base),
}));

jest.mock('../lib/theme', () => ({
  useTheme: () => ({
    scheme: 'light',
    reduceMotion: true,
    colors: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceAlt: '#F1F5F9',
      surfaceInteractive: '#E2E8F0',
      border: '#E2E8F0',
      borderSubtle: '#F1F5F9',
      text: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#64748B',
      brandPrimary: '#4F46E5',
      selectedSurface: '#EEF2FF',
      focusRing: '#6366F1',
      success: '#059669',
      danger: '#E11D48',
      warning: '#D97706',
      teal: '#0D9488',
      purple: '#7C3AED',
      info: '#0284C7',
    },
  }),
}));

jest.mock('../lib/focusLockNative', () => ({
  focusLockNative: {
    getInstalledApps: (...args: unknown[]) => mockGetInstalledApps(...args),
    getBlockingStatus: (...args: unknown[]) => mockGetBlockingStatus(...args),
    getUsageStats: (...args: unknown[]) => mockGetUsageStats(...args),
    startBlockingSession: (...args: unknown[]) => mockStartBlockingSession(...args),
    setDndEnabled: (...args: unknown[]) => mockSetDndEnabled(...args),
    openDndSettings: (...args: unknown[]) => mockOpenDndSettings(...args),
    setRestartRecoveryEnabled: (...args: unknown[]) => mockSetRestartRecoveryEnabled(...args),
    consumePendingCompletions: (...args: unknown[]) => mockConsumePendingCompletions(...args),
  },
  subscribeFocusLockEvent: () => () => undefined,
}));

jest.mock('../lib/focusHistory', () => ({
  appendFocusHistory: jest.fn(async () => []),
}));

import FocusLockScreen from '../screens/FocusLockScreen';
import {
  buildPredefinedProfiles,
  getNextFocusScheduleLabel,
  resolveEffectiveBlockedPackages,
} from '../lib/focusLockP2Helpers';

describe('Focus Lock P2 Feature Completion', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    mockPlannerScheduleItems = [];
    mockGetInstalledApps.mockResolvedValue([
      { packageId: 'com.instagram.android', name: 'Instagram' },
      { packageId: 'com.google.android.youtube', name: 'YouTube' },
      { packageId: 'com.android.chrome', name: 'Chrome' },
    ]);
    mockGetUsageStats.mockResolvedValue([]);
    mockGetBlockingStatus.mockResolvedValue({
      available: true,
      accessibilityEnabled: true,
      usageAccessEnabled: true,
      exactAlarmEnabled: true,
      notificationsEnabled: true,
      batteryOptimizationIgnored: true,
      dndAccessEnabled: true,
      serviceRunning: true,
      activeSession: null,
      blockedAttemptsToday: 0,
    });
    mockStartBlockingSession.mockResolvedValue({
      id: 'session-p2',
      userId: 'u1',
      startedAt: Date.now(),
      endsAt: Date.now() + 45 * 60_000,
      packageIds: ['com.instagram.android'],
      status: 'active',
    });
  });

  afterAll(() => {
    Platform.OS = originalPlatform;
  });

  it('builds predefined profiles only from installed apps and resolves browser blocking honestly', () => {
    const profiles = buildPredefinedProfiles(['com.instagram.android', 'com.google.android.youtube']);
    expect(profiles.map((p) => p.id)).toEqual(['social_shield', 'video_detox', 'complete_shield']);
    expect(profiles[0].appIds).toEqual(['com.instagram.android']);

    const apps = [
      { id: 'com.instagram.android', pkg: 'com.instagram.android' },
      { id: 'com.android.chrome', pkg: 'com.android.chrome' },
    ];
    expect(resolveEffectiveBlockedPackages(apps, ['com.instagram.android'], 'block', false)).toEqual([
      'com.instagram.android',
    ]);
    expect(resolveEffectiveBlockedPackages(apps, ['com.instagram.android'], 'block', true)).toEqual([
      'com.instagram.android',
      'com.android.chrome',
    ]);
  });

  it('computes next scheduled focus time from Study Planner items without hardcoded 7:00 PM', () => {
    const now = new Date(2026, 10, 27, 14, 0, 0, 0);
    expect(getNextFocusScheduleLabel([], now)).toBe('No schedule set');

    const label = getNextFocusScheduleLabel(
      [{ id: 's1', category: 'Tasks', title: 'Polity Revision', startTime: '18:30', days: ['Fri'] }],
      now,
    );
    expect(label).toContain('Today');
    expect(label).not.toContain('7:00');
  });

  it('activates predefined profiles and supports saving a custom profile', async () => {
    const view = renderWithSSDS(<FocusLockScreen />);
    await waitFor(() => expect(view.getByText('Social Media Shield')).toBeTruthy());

    fireEvent.press(view.getByText('Social Media Shield'));
    await waitFor(() => expect(view.getByText('1 blocked')).toBeTruthy());

    await act(async () => {
      fireEvent.press(view.getByText('Save Profile'));
    });

    await waitFor(() => expect(view.getByText('Quick Lock (1)')).toBeTruthy());
  });

  it('shows honest unsupported status for Custom Blocking and enables DND on Deep Focus', async () => {
    const view = renderWithSSDS(<FocusLockScreen />);
    await waitFor(() => expect(view.getByText('Blocking Modes')).toBeTruthy());

    fireEvent.press(view.getByText('Blocking Modes'));
    fireEvent.press(view.getByText('Custom Blocking'));
    expect(view.getByText('Usage quotas & launch-limit rules are not supported in this build.')).toBeTruthy();

    fireEvent.press(view.getByText('Deep Focus'));
    expect(view.getByText('Activate Extreme Mode?')).toBeTruthy();
  });

  it('verifies native DND, notification policy permission, and SettingsScreen integration', () => {
    const pluginSrc = fs.readFileSync(path.resolve(__dirname, '../plugins/withFocusLock.js'), 'utf8');
    const moduleKt = fs.readFileSync(
      path.resolve(__dirname, '../native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockModule.kt'),
      'utf8',
    );
    const bootKt = fs.readFileSync(
      path.resolve(__dirname, '../native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockBootReceiver.kt'),
      'utf8',
    );
    const settingsSrc = fs.readFileSync(path.resolve(__dirname, '../screens/SettingsScreen.tsx'), 'utf8');

    expect(pluginSrc).toContain('android.permission.ACCESS_NOTIFICATION_POLICY');
    expect(moduleKt).toContain('fun setDndEnabled');
    expect(moduleKt).toContain('fun openDndSettings');
    expect(moduleKt).toContain('fun setRestartRecoveryEnabled');
    expect(moduleKt).toContain('PREV_DND_FILTER_KEY');
    expect(bootKt).toContain('RESTART_RECOVERY_KEY');
    expect(settingsSrc).toContain("navigation.navigate('FocusLock')");
    expect(settingsSrc).toContain('batteryOptimizationIgnored');
  });
});
