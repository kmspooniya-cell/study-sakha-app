import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

const mockDispatch = jest.fn();
const mockGetInstalledApps = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetBlockingStatus = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetUsageStats = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockStartBlockingSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPauseBlockingSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockResumeBlockingSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockOpenExactAlarmSettings = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockOpenNotificationSettings = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockOpenBatteryOptimizationSettings = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockConsumePendingCompletions = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => []);
let capturedOnAndroidBack: (() => boolean) | undefined;

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

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
  Shell: ({ children, onAndroidBack }: { children: React.ReactNode; onAndroidBack?: () => boolean }) => {
    capturedOnAndroidBack = onAndroidBack;
    const { View } = require('react-native');
    return <View testID="mock-shell">{children}</View>;
  },
}));

jest.mock('../lib/store', () => ({
  useStore: () => ({
    state: {
      user: { id: 'u1', name: 'Asha' },
      settings: { themeMode: 'light' },
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
    pauseBlockingSession: (...args: unknown[]) => mockPauseBlockingSession(...args),
    resumeBlockingSession: (...args: unknown[]) => mockResumeBlockingSession(...args),
    openExactAlarmSettings: (...args: unknown[]) => mockOpenExactAlarmSettings(...args),
    openNotificationSettings: (...args: unknown[]) => mockOpenNotificationSettings(...args),
    openBatteryOptimizationSettings: (...args: unknown[]) => mockOpenBatteryOptimizationSettings(...args),
    consumePendingCompletions: (...args: unknown[]) => mockConsumePendingCompletions(...args),
  },
  subscribeFocusLockEvent: () => () => undefined,
}));

jest.mock('../lib/focusHistory', () => ({
  appendFocusHistory: jest.fn(async () => []),
}));

import FocusLockScreen from '../screens/FocusLockScreen';
import {
  computeDurationSession,
  computeEndOfDaySession,
  computeUntilTimeSession,
} from '../lib/focusLockDuration';

describe('Focus Lock P1 High-Priority Fixes', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnAndroidBack = undefined;
    Platform.OS = 'android';
    mockGetInstalledApps.mockResolvedValue([
      { packageId: 'com.instagram.android', name: 'Instagram' },
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
      id: 'session-p1',
      userId: 'u1',
      startedAt: Date.now(),
      endsAt: Date.now() + 45 * 60_000,
      packageIds: ['com.instagram.android'],
      status: 'active',
    });
    mockPauseBlockingSession.mockResolvedValue({
      id: 'session-p1',
      userId: 'u1',
      startedAt: Date.now(),
      endsAt: Date.now() + 45 * 60_000,
      packageIds: ['com.instagram.android'],
      status: 'paused',
      pausedRemainingMs: 44 * 60_000,
    });
    mockResumeBlockingSession.mockResolvedValue({
      id: 'session-p1',
      userId: 'u1',
      startedAt: Date.now(),
      endsAt: Date.now() + 44 * 60_000,
      packageIds: ['com.instagram.android'],
      status: 'active',
    });
  });

  afterAll(() => {
    Platform.OS = originalPlatform;
  });

  it('computes Until Time and End of Day durations accurately across midnight', () => {
    const morning = new Date(2026, 10, 27, 10, 0, 0, 0);
    const sameDayUntil = computeUntilTimeSession('11:30', morning);
    expect(sameDayUntil?.durationMins).toBe(90);

    const lateNight = new Date(2026, 10, 27, 23, 30, 0, 0);
    const midnightRollover = computeUntilTimeSession('01:00', lateNight);
    expect(midnightRollover?.durationMins).toBe(90);

    const eod = computeEndOfDaySession(lateNight);
    expect(eod.durationMins).toBe(30);

    expect(computeUntilTimeSession('99:99', morning)).toBeNull();
    expect(computeDurationSession(0, morning)).toBeNull();
    expect(computeDurationSession(-10, morning)).toBeNull();
  });

  it('synchronizes native Pause & Resume during active sessions', async () => {
    const view = render(<FocusLockScreen />);
    await waitFor(() => expect(mockGetInstalledApps).toHaveBeenCalled());

    fireEvent.press(view.getByText('App Selection'));
    fireEvent.press(view.getByText('Instagram'));
    await act(async () => {
      expect(capturedOnAndroidBack?.()).toBe(true);
    });

    fireEvent.press(view.getByText('Blocking Modes'));
    await act(async () => {
      fireEvent.press(view.getByText('Emergency Focus'));
    });

    await waitFor(() => expect(view.getByText('Pause')).toBeTruthy());
    await act(async () => {
      fireEvent.press(view.getByText('Pause'));
    });
    expect(mockPauseBlockingSession).toHaveBeenCalled();

    await waitFor(() => expect(view.getByText('Resume')).toBeTruthy());
    await act(async () => {
      fireEvent.press(view.getByText('Resume'));
    });
    expect(mockResumeBlockingSession).toHaveBeenCalled();
  });

  it('calculates Android Protection Readiness dynamically from all 5 real permissions', async () => {
    const view = render(<FocusLockScreen />);
    await waitFor(() => expect(view.getByText('100%')).toBeTruthy());

    mockGetBlockingStatus.mockResolvedValueOnce({
      available: true,
      accessibilityEnabled: true,
      usageAccessEnabled: true,
      exactAlarmEnabled: false,
      notificationsEnabled: false,
      batteryOptimizationIgnored: false,
      dndAccessEnabled: false,
      serviceRunning: true,
      activeSession: null,
      blockedAttemptsToday: 0,
    });

    const viewPartial = render(<FocusLockScreen />);
    await waitFor(() => expect(viewPartial.getByText('33%')).toBeTruthy());
  });

  it('handles nested Hardware Back navigation and prevents accidental exit during active session', async () => {
    const view = render(<FocusLockScreen />);
    await waitFor(() => expect(view.getByText('Blocking Modes')).toBeTruthy());

    // Idle on home -> returns false to allow exiting FocusLock route
    expect(capturedOnAndroidBack?.()).toBe(false);

    // Nested sub-screen -> returns true and navigates back to home
    fireEvent.press(view.getByText('Blocking Modes'));
    expect(view.getByText('Choose how Study Sakha enforces protection')).toBeTruthy();
    await act(async () => {
      expect(capturedOnAndroidBack?.()).toBe(true);
    });
    expect(view.getByText('DISCIPLINE CONTROLS')).toBeTruthy();

    // Active session -> prevents accidental exit
    fireEvent.press(view.getByText('App Selection'));
    fireEvent.press(view.getByText('Instagram'));
    await act(async () => {
      expect(capturedOnAndroidBack?.()).toBe(true);
    });
    fireEvent.press(view.getByText('Blocking Modes'));
    await act(async () => {
      fireEvent.press(view.getByText('Emergency Focus'));
    });
    await waitFor(() => expect(view.getByText('Emergency Access')).toBeTruthy());
    await act(async () => {
      expect(capturedOnAndroidBack?.()).toBe(true);
    });
    expect(view.getByText('Emergency Access')).toBeTruthy();
  });

  it('verifies Exact Alarm manifest/runtime handling and Accessibility burst debounce invariants', () => {
    const pluginSrc = fs.readFileSync(path.resolve(__dirname, '../plugins/withFocusLock.js'), 'utf8');
    const alarmKt = fs.readFileSync(
      path.resolve(__dirname, '../native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAlarm.kt'),
      'utf8',
    );
    const serviceKt = fs.readFileSync(
      path.resolve(__dirname, '../native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAccessibilityService.kt'),
      'utf8',
    );
    const shellSrc = fs.readFileSync(path.resolve(__dirname, '../components/Shell.tsx'), 'utf8');

    expect(pluginSrc).toContain('android.permission.SCHEDULE_EXACT_ALARM');
    expect(alarmKt).toContain('canScheduleExactAlarms(context)');
    expect(alarmKt).toContain('catch (err: SecurityException)');
    expect(serviceKt).toContain('BURST_DEBOUNCE_MS = 150L');
    expect(serviceKt).toContain('SystemClock.elapsedRealtime()');
    expect(serviceKt).toContain('AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED');
    expect(serviceKt).toContain('lastBlockedPackage = null');
    expect(shellSrc).toContain("['DashboardRoot', 'Groups'].includes(route.name)");
  });
});
