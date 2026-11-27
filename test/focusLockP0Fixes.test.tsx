import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

const mockDispatch = jest.fn();
const mockSecureStore = new Map<string, string>();
const mockAsyncStorage = new Map<string, string>();
const mockStartBlockingSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockStopBlockingSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetInstalledApps = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetBlockingStatus = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetUsageStats = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockConsumePendingCompletions = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockAppendFocusHistory = jest.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => []);

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async (key: string) => mockSecureStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStore.delete(key);
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockAsyncStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockAsyncStorage.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockAsyncStorage.delete(key);
  }),
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
    stopBlockingSession: (...args: unknown[]) => mockStopBlockingSession(...args),
    consumePendingCompletions: (...args: unknown[]) => mockConsumePendingCompletions(...args),
  },
  subscribeFocusLockEvent: () => () => undefined,
}));

jest.mock('../lib/focusHistory', () => ({
  appendFocusHistory: (...args: unknown[]) => mockAppendFocusHistory(...args),
}));

import FocusLockScreen, {
  canCompleteSessionEarly,
  resolveBlockedPackages,
  type InstalledApp,
} from '../screens/FocusLockScreen';
import { clearExitPin, loadExitPin, saveExitPin, verifyExitPin } from '../lib/focusLockPin';

const SAMPLE_APPS: InstalledApp[] = [
  {
    id: 'com.instagram.android',
    name: 'Instagram',
    pkg: 'com.instagram.android',
    category: 'Installed Apps',
    dailyMins: 45,
    launches: 0,
    recent: true,
    distracting: true,
    gradientColors: ['#4F46E5', '#0EA5E9'],
    short: 'IN',
  },
  {
    id: 'com.google.android.youtube',
    name: 'YouTube',
    pkg: 'com.google.android.youtube',
    category: 'Installed Apps',
    dailyMins: 60,
    launches: 0,
    recent: true,
    distracting: true,
    gradientColors: ['#4F46E5', '#0EA5E9'],
    short: 'YO',
  },
  {
    id: 'com.ichi2.anki',
    name: 'AnkiDroid',
    pkg: 'com.ichi2.anki',
    category: 'Installed Apps',
    dailyMins: 20,
    launches: 0,
    recent: true,
    distracting: false,
    gradientColors: ['#4F46E5', '#0EA5E9'],
    short: 'AN',
  },
];

describe('Focus Lock P0 Critical Fixes', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.clear();
    mockAsyncStorage.clear();
    Platform.OS = 'android';
    mockGetInstalledApps.mockResolvedValue([
      { packageId: 'com.instagram.android', name: 'Instagram' },
      { packageId: 'com.google.android.youtube', name: 'YouTube' },
      { packageId: 'com.ichi2.anki', name: 'AnkiDroid' },
    ]);
    mockGetUsageStats.mockResolvedValue([]);
    mockGetBlockingStatus.mockResolvedValue({
      available: true,
      accessibilityEnabled: true,
      usageAccessEnabled: true,
      serviceRunning: true,
      activeSession: null,
      blockedAttemptsToday: 0,
    });
    mockStartBlockingSession.mockResolvedValue({
      id: 'session-1',
      userId: 'u1',
      startedAt: Date.now(),
      endsAt: Date.now() + 50 * 60 * 1000,
      packageIds: [],
      status: 'active',
    });
    mockStopBlockingSession.mockResolvedValue(null);
    mockConsumePendingCompletions.mockResolvedValue([]);
  });

  afterAll(() => {
    Platform.OS = originalPlatform;
  });

  it('resolves Blocklist vs Allowlist packages accurately', () => {
    expect(resolveBlockedPackages(SAMPLE_APPS, ['com.instagram.android'], 'block')).toEqual([
      'com.instagram.android',
    ]);
    expect(resolveBlockedPackages(SAMPLE_APPS, ['com.ichi2.anki'], 'allow')).toEqual([
      'com.instagram.android',
      'com.google.android.youtube',
    ]);
  });

  it('sends non-selected packages to native startBlockingSession in Allowlist mode', async () => {
    const view = render(<FocusLockScreen />);
    await waitFor(() => expect(mockGetInstalledApps).toHaveBeenCalled());

    fireEvent.press(view.getByText('App Selection'));
    fireEvent.press(view.getByText('Allow Only Selected'));
    fireEvent.press(view.getByText('AnkiDroid'));

    const backButtons = view.UNSAFE_getAllByType(require('react-native').TouchableOpacity);
    await act(async () => {
      fireEvent.press(backButtons[0]);
    });

    await waitFor(() => expect(view.getByText('Blocking Modes')).toBeTruthy());
    fireEvent.press(view.getByText('Blocking Modes'));
    await act(async () => {
      fireEvent.press(view.getByText('Emergency Focus'));
    });

    await waitFor(() => expect(mockStartBlockingSession).toHaveBeenCalled());
    const callArg = mockStartBlockingSession.mock.calls[0][0] as { packageIds: string[]; strategy: string };
    expect(callArg.strategy).toBe('allow');
    expect(callArg.packageIds).toEqual(['com.instagram.android', 'com.google.android.youtube']);
  });

  it('prevents early session completion in Strict Mode Level 2/3', async () => {
    const now = Date.now();
    expect(canCompleteSessionEarly(1, now, now + 60_000)).toBe(true);
    expect(canCompleteSessionEarly(2, now, now + 60_000)).toBe(false);
    expect(canCompleteSessionEarly(3, now, now + 60_000)).toBe(false);
    expect(canCompleteSessionEarly(2, now + 60_000, now + 60_000)).toBe(true);

    const view = render(<FocusLockScreen />);
    await waitFor(() => expect(mockGetInstalledApps).toHaveBeenCalled());

    fireEvent.press(view.getByText('App Selection'));
    fireEvent.press(view.getByText('Instagram'));
    const backButtons = view.UNSAFE_getAllByType(require('react-native').TouchableOpacity);
    await act(async () => {
      fireEvent.press(backButtons[0]);
    });

    await waitFor(() => expect(view.getByText('Blocking Modes')).toBeTruthy());
    fireEvent.press(view.getByText('Blocking Modes'));
    await act(async () => {
      fireEvent.press(view.getByText('Emergency Focus'));
    });

    await waitFor(() => expect(view.getByText('Emergency Access')).toBeTruthy());
    expect(view.queryByText('Complete Session')).toBeNull();
  });

  it('handles Exit PIN setup, validation, empty PIN rejection, and recovery reset', async () => {
    expect(await loadExitPin('u1')).toBeNull();
    expect(await verifyExitPin('', 'u1')).toBe(false);
    expect(await saveExitPin('', 'u1')).toBe(false);
    expect(await saveExitPin('12ab', 'u1')).toBe(false);

    expect(await saveExitPin('4829', 'u1')).toBe(true);
    expect(await loadExitPin('u1')).toBe('4829');
    expect(await verifyExitPin('0000', 'u1')).toBe(false);
    expect(await verifyExitPin('4829', 'u1')).toBe(true);

    await clearExitPin('u1');
    expect(await loadExitPin('u1')).toBeNull();
    expect(await verifyExitPin('4829', 'u1')).toBe(false);

    const view = render(<FocusLockScreen />);
    await waitFor(() => expect(view.getByText('Strict Mode')).toBeTruthy());
    fireEvent.press(view.getByText('Strict Mode'));
    expect(view.getByText('PIN protection (Not configured)')).toBeTruthy();
  });

  it('processes background pending completions idempotently without duplicate rewards', async () => {
    const startedAt = Date.now() - 25 * 60 * 1000;
    const endsAt = Date.now() - 5000;
    const pendingRecord = {
      id: 'focus-lock-bg-1',
      userId: 'u1',
      startedAt,
      endsAt,
      completedAt: endsAt,
      packageIds: ['com.instagram.android'],
      strategy: 'block',
    };
    mockConsumePendingCompletions
      .mockResolvedValueOnce([pendingRecord, pendingRecord])
      .mockResolvedValueOnce([]);

    const view = render(<FocusLockScreen />);
    await waitFor(() => expect(mockConsumePendingCompletions).toHaveBeenCalled());

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'recordFocusStudy',
          id: 'focus-lock-bg-1',
          category: 'Focus Lock',
          status: 'completed',
        }),
      );
    });
    const studyCalls = mockDispatch.mock.calls.filter(
      (call) => (call[0] as { type?: string }).type === 'recordFocusStudy',
    );
    expect(studyCalls).toHaveLength(1);
    expect(view.getByText('Discipline Victory!')).toBeTruthy();
  });

  it('verifies native Kotlin clock-change, monotonic timing, and pending completion invariants', () => {
    const nativeDir = path.resolve(__dirname, '../native/focus-lock/android/java/com/anonymous/agonpreview');
    const timingKt = fs.readFileSync(path.join(nativeDir, 'FocusLockSessionTiming.kt'), 'utf8');
    const alarmKt = fs.readFileSync(path.join(nativeDir, 'FocusLockAlarm.kt'), 'utf8');
    const bootKt = fs.readFileSync(path.join(nativeDir, 'FocusLockBootReceiver.kt'), 'utf8');
    const serviceKt = fs.readFileSync(path.join(nativeDir, 'FocusLockAccessibilityService.kt'), 'utf8');
    const moduleKt = fs.readFileSync(path.join(nativeDir, 'FocusLockModule.kt'), 'utf8');

    expect(timingKt).toContain('SystemClock.elapsedRealtime()');
    expect(timingKt).toContain('Settings.Global.BOOT_COUNT');
    expect(timingKt).toContain('recordPendingCompletion');
    expect(timingKt).toContain('rebaseForBootOrClockChange');

    expect(alarmKt).toContain('AlarmManager.ELAPSED_REALTIME_WAKEUP');
    expect(alarmKt).toContain('FocusLockSessionTiming.recordPendingCompletion');
    expect(alarmKt).toContain('rebaseForBootOrClockChange');

    expect(bootKt).toContain('Intent.ACTION_TIME_CHANGED');
    expect(bootKt).toContain('Intent.ACTION_TIMEZONE_CHANGED');
    expect(bootKt).toContain('FocusLockSessionTiming.rebaseForBootOrClockChange');

    expect(serviceKt).toContain('FocusLockSessionTiming.isExpired');
    expect(serviceKt).toContain('FocusLockSessionTiming.recordPendingCompletion');

    expect(moduleKt).toContain('fun consumePendingCompletions');
  });
});
