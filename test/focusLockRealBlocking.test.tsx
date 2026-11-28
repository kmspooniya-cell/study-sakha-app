import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithSSDS } from './ssdsTestUtils';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

const mockGetInstalledApps = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockGetBlockingStatus = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetUsageStats = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockSetAppUsageLimits = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockSuspendAppReminder = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRequestEmergencyAccess = jest.fn<(...args: unknown[]) => Promise<unknown>>();

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
      plannerScheduleItems: [],
    },
    dispatch: jest.fn(),
  }),
  dayKey: () => '2026-11-28',
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
    setAppUsageLimits: (...args: unknown[]) => mockSetAppUsageLimits(...args),
    suspendAppReminder: (...args: unknown[]) => mockSuspendAppReminder(...args),
    requestEmergencyAccess: (...args: unknown[]) => mockRequestEmergencyAccess(...args),
    peekPendingCompletions: jest.fn(async () => []),
    acknowledgePendingCompletions: jest.fn(async () => undefined),
  },
  subscribeFocusLockEvent: () => () => undefined,
}));

jest.mock('../lib/focusHistory', () => ({
  appendFocusHistory: jest.fn(async () => []),
}));

import FocusLockScreen from '../screens/FocusLockScreen';
import {
  computeSuspensionExpiryMs,
  formatUsageDuration,
  getRemainingLimitMs,
  isAppLimitExceeded,
} from '../lib/focusLockUsageLimits';

describe('Focus Lock Real Blocking, Usage Limits & Profiles Cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    mockGetInstalledApps.mockResolvedValue([
      { packageId: 'com.android.chrome', name: 'Chrome' },
      { packageId: 'com.instagram.android', name: 'Instagram' },
    ]);
    mockGetUsageStats.mockResolvedValue([
      { packageId: 'com.android.chrome', dailyMins: 5.5, usedMs: 330_000, launches: 4 },
    ]);
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
    mockSuspendAppReminder.mockResolvedValue({
      packageId: 'com.android.chrome',
      duration: 'rest_of_day',
      createdAtMs: Date.now(),
      suspendedUntilMs: Date.now() + 3600_000,
    });
  });

  it('computes per-app daily usage limit exceedance and temporary suspension expiry accurately', () => {
    const now = new Date(2026, 10, 28, 14, 30, 0, 0).getTime();
    expect(isAppLimitExceeded(5 * 60_000, 5, undefined, now)).toBe(true);
    expect(isAppLimitExceeded(4 * 60_000, 5, undefined, now)).toBe(false);
    expect(getRemainingLimitMs(5 * 60_000, 5)).toBe(0);
    expect(getRemainingLimitMs(3 * 60_000, 5)).toBe(120_000);
    expect(formatUsageDuration(125_000)).toBe('2m');

    const restOfDay = computeSuspensionExpiryMs('rest_of_day', now);
    const tillTomorrow = computeSuspensionExpiryMs('till_tomorrow', now);
    const sevenDays = computeSuspensionExpiryMs('7_days', now);

    expect(restOfDay).toBe(new Date(2026, 10, 29, 0, 0, 0, 0).getTime());
    expect(tillTomorrow).toBe(new Date(2026, 10, 30, 0, 0, 0, 0).getTime());
    expect(sevenDays).toBe(new Date(2026, 11, 5, 0, 0, 0, 0).getTime());
    expect(isAppLimitExceeded(10 * 60_000, 5, restOfDay, now)).toBe(false);
    expect(isAppLimitExceeded(10 * 60_000, 5, restOfDay, restOfDay + 1)).toBe(true);
  });

  it('verifies native Kotlin blocking, usage limits, intervention screen, and emergency pass contracts', () => {
    const nativeDir = path.join(process.cwd(), 'native', 'focus-lock', 'android', 'java', 'com', 'anonymous', 'agonpreview');
    const usageLimitsKt = fs.readFileSync(path.join(nativeDir, 'FocusLockUsageLimits.kt'), 'utf8');
    const serviceKt = fs.readFileSync(path.join(nativeDir, 'FocusLockAccessibilityService.kt'), 'utf8');
    const activityKt = fs.readFileSync(path.join(nativeDir, 'FocusLockBlockingActivity.kt'), 'utf8');
    const alarmKt = fs.readFileSync(path.join(nativeDir, 'FocusLockAlarm.kt'), 'utf8');
    const pluginJs = fs.readFileSync(path.join(process.cwd(), 'plugins', 'withFocusLock.js'), 'utf8');

    expect(pluginJs).toContain("'FocusLockUsageLimits.kt'");
    expect(pluginJs).toContain("'android:launchMode': 'singleInstance'");
    expect(pluginJs).toContain("'android:taskAffinity': ''");
    expect(usageLimitsKt).toContain('queryEvents(');
    expect(usageLimitsKt).toContain('resumedClasses');
    expect(usageLimitsKt).toContain('forceRefresh: Boolean = true');
    expect(usageLimitsKt).toContain('computeSuspensionExpiryMs');
    expect(usageLimitsKt).toContain('grantEmergencyPass');
    expect(usageLimitsKt).toContain('requiresPinForEmergency');

    expect(serviceKt).toContain('allowedPackageIds');
    expect(serviceKt).toContain('syncCachesFromPrefs()');
    expect(serviceKt).toContain('refreshLimitsAndRecheck()');
    expect(serviceKt).toContain('currentForegroundBaseUsedMs + liveDelta');
    expect(serviceKt).toContain('isHomeLauncherPackage');
    expect(serviceKt).toContain('mainHandler.postDelayed(limitCheckRunnable, BURST_DEBOUNCE_MS)');
    expect(serviceKt).toContain('FocusLockUsageLimits.isPackageUnderEmergencyPass');
    expect(serviceKt).toContain('reason = "usage_limit"');
    expect(serviceKt).toContain('recheckForegroundOnEmergencyExpiry');
    expect(serviceKt).toContain('BlockingActivity launch result: SUCCESS');

    expect(activityKt).toContain('DAILY LIMIT EXCEEDED');
    expect(activityKt).toContain('isPackageBlockedBySession');
    expect(activityKt).toContain('isPackageBlockedByUsageLimit');
    expect(activityKt).toContain('effectiveReason');
    expect(activityKt).toContain('Close App');
    expect(activityKt).toContain('Rest of the day');
    expect(activityKt).toContain('Till tomorrow');
    expect(activityKt).toContain('7 days');
    expect(activityKt).toContain('if (authorized && targetPackageId.isNotBlank())');

    const moduleKt = fs.readFileSync(path.join(nativeDir, 'FocusLockModule.kt'), 'utf8');
    expect(moduleKt).toContain('FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()');

    expect(alarmKt).toContain('FOCUS_LOCK_EMERGENCY_EXPIRED');
    expect(alarmKt).toContain('scheduleEmergencyExpiry');
  });

  it('does not overwrite native app limits before nativeLimitsHydrated resolves', async () => {
    mockGetInstalledApps.mockResolvedValue([
      { packageId: 'com.android.chrome', name: 'Chrome' },
    ]);
    const mockGetAppUsageLimits = jest.fn(async () => ({ 'com.android.chrome': 5 }));
    const { focusLockNative } = require('../lib/focusLockNative');
    const prevGetLimits = focusLockNative.getAppUsageLimits;
    const prevGetSusp = focusLockNative.getReminderSuspensions;
    const prevGetEmg = focusLockNative.getEmergencyAccessState;
    focusLockNative.getAppUsageLimits = mockGetAppUsageLimits;
    focusLockNative.getReminderSuspensions = jest.fn(async () => ({}));
    focusLockNative.getEmergencyAccessState = jest.fn(async () => null);

    try {
      const view = renderWithSSDS(<FocusLockScreen />);
      await waitFor(() => expect(mockGetAppUsageLimits).toHaveBeenCalled());
      await waitFor(() => expect(mockSetAppUsageLimits).toHaveBeenCalledWith({ 'com.android.chrome': 5 }));
      expect(mockSetAppUsageLimits).not.toHaveBeenCalledWith({});
      view.unmount();
    } finally {
      focusLockNative.getAppUsageLimits = prevGetLimits;
      focusLockNative.getReminderSuspensions = prevGetSusp;
      focusLockNative.getEmergencyAccessState = prevGetEmg;
    }
  });

  it('removes Duplicate and Save Focus Profile modal and saves+applies directly', async () => {
    const view = renderWithSSDS(<FocusLockScreen />);
    await waitFor(() => expect(mockGetInstalledApps).toHaveBeenCalled());

    expect(view.queryByText('Duplicate')).toBeNull();
    expect(view.queryByText('Save Focus Profile')).toBeNull();
    expect(view.getByText('Save Profile')).toBeTruthy();

    // Empty selection should not create a profile
    fireEvent.press(view.getByText('Save Profile'));
    expect(view.queryByText('Save Focus Profile')).toBeNull();
    expect(view.getByText('Select at least one app before saving a profile')).toBeTruthy();

    // Select Chrome, then save profile directly
    fireEvent.press(view.getByText('App Selection'));
    fireEvent.press(view.getByText('Chrome'));
    const backButtons = view.UNSAFE_getAllByType(require('react-native').TouchableOpacity);
    await act(async () => {
      fireEvent.press(backButtons[0]);
    });

    await waitFor(() => expect(view.getByText('Save Profile')).toBeTruthy());
    fireEvent.press(view.getByText('Save Profile'));
    expect(view.queryByText('Save Focus Profile')).toBeNull();
    expect(view.queryByText('Duplicate')).toBeNull();
    expect(view.getByText('Quick Lock (1)')).toBeTruthy();
  });

  it('allows setting per-app daily usage limits and temporary reminder suspension', async () => {
    const view = renderWithSSDS(<FocusLockScreen />);
    await waitFor(() => expect(mockGetInstalledApps).toHaveBeenCalled());

    fireEvent.press(view.getByText('App Selection'));
    const limitButtons = view.getAllByText('Set Daily Limit');
    fireEvent.press(limitButtons[0]);

    await waitFor(() => expect(view.getByText('Daily Limit: 5m')).toBeTruthy());
    expect(mockSetAppUsageLimits).toHaveBeenCalledWith({ 'com.android.chrome': 5 });

    fireEvent.press(view.getByText('Turn Off Reminder'));
    expect(view.getByText('Rest of the day')).toBeTruthy();
    expect(view.getByText('Till tomorrow')).toBeTruthy();
    expect(view.getByText('7 days')).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByText('Rest of the day'));
    });
    expect(mockSuspendAppReminder).toHaveBeenCalledWith('com.android.chrome', 'rest_of_day');
  });
});
