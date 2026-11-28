import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, waitFor } from '@testing-library/react-native';
import { renderWithSSDS } from './ssdsTestUtils';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

const mockDispatch = jest.fn();
const mockAsyncSetItem = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockPeekPendingCompletions = jest.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => []);
const mockAcknowledgePendingCompletions = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockGetInstalledApps = jest.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => []);
const mockGetBlockingStatus = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetUsageStats = jest.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => []);

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'notif-1'),
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: (...args: unknown[]) => mockAsyncSetItem(...args),
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
      plannerScheduleItems: [],
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
    peekPendingCompletions: (...args: unknown[]) => mockPeekPendingCompletions(...args),
    acknowledgePendingCompletions: (...args: unknown[]) => mockAcknowledgePendingCompletions(...args),
  },
  subscribeFocusLockEvent: () => () => undefined,
}));

jest.mock('../lib/focusHistory', () => ({
  appendFocusHistory: jest.fn(async () => []),
}));

import FocusLockScreen from '../screens/FocusLockScreen';

describe('Focus Lock P3 Production Hardening', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    mockPeekPendingCompletions.mockResolvedValue([]);
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
  });

  afterAll(() => {
    jest.useRealTimers();
    Platform.OS = originalPlatform;
  });

  it('does not write to AsyncStorage on every 1-second countdown tick', async () => {
    jest.useFakeTimers();
    const now = Date.now();
    mockGetBlockingStatus.mockResolvedValue({
      available: true,
      accessibilityEnabled: true,
      usageAccessEnabled: true,
      exactAlarmEnabled: true,
      notificationsEnabled: true,
      batteryOptimizationIgnored: true,
      dndAccessEnabled: true,
      serviceRunning: true,
      activeSession: {
        id: 'session-tick-test',
        userId: 'u1',
        startedAt: now - 5_000,
        endsAt: now + 600_000,
        packageIds: ['com.instagram.android'],
        strategy: 'block',
        status: 'active',
      },
      blockedAttemptsToday: 0,
    });

    renderWithSSDS(<FocusLockScreen />);
    await act(async () => { jest.advanceTimersByTime(0); });
    await waitFor(() => expect(mockAsyncSetItem).toHaveBeenCalledTimes(1));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    mockAsyncSetItem.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockAsyncSetItem).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('acknowledges pending completions only after processing them', async () => {
    const now = Date.now();
    mockPeekPendingCompletions.mockResolvedValueOnce([
      {
        id: 'pending-p3-1',
        userId: 'u1',
        startedAt: now - 600_000,
        endsAt: now - 1_000,
        completedAt: now - 1_000,
        packageIds: ['com.instagram.android'],
        strategy: 'block',
      },
    ]);

    renderWithSSDS(<FocusLockScreen />);
    await waitFor(() => expect(mockAcknowledgePendingCompletions).toHaveBeenCalledWith(['pending-p3-1']));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'recordFocusStudy', id: 'pending-p3-1' }),
    );
  });

  it('verifies native P3 memory-leak, performance, predictive-back, and logging invariants', () => {
    const nativeDir = path.resolve(__dirname, '../native/focus-lock/android/java/com/anonymous/agonpreview');
    const serviceKt = fs.readFileSync(path.join(nativeDir, 'FocusLockAccessibilityService.kt'), 'utf8');
    const blockingKt = fs.readFileSync(path.join(nativeDir, 'FocusLockBlockingActivity.kt'), 'utf8');
    const moduleKt = fs.readFileSync(path.join(nativeDir, 'FocusLockModule.kt'), 'utf8');
    const alarmKt = fs.readFileSync(path.join(nativeDir, 'FocusLockAlarm.kt'), 'utf8');
    const bootKt = fs.readFileSync(path.join(nativeDir, 'FocusLockBootReceiver.kt'), 'utf8');

    expect(serviceKt).toContain('OnSharedPreferenceChangeListener');
    expect(serviceKt).toContain('unregisterOnSharedPreferenceChangeListener');
    expect(serviceKt).toContain('runCatching { startActivity(intent) }');
    expect(blockingKt).toContain('OnBackInvokedCallback');
    expect(blockingKt).toContain('unregisterOnBackInvokedCallback');
    expect(moduleKt).toContain('fun peekPendingCompletions');
    expect(moduleKt).toContain('fun acknowledgePendingCompletions');
    expect(moduleKt).not.toContain('iconAsBase64(info)?.let');
    expect(alarmKt).toContain('StudySakhaFocusLock');
    expect(bootKt).toContain('StudySakhaFocusLock');
  });
});
