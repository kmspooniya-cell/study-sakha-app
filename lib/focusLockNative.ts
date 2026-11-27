import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

export type InstalledFocusApp = {
  packageId: string;
  name: string;
  iconBase64?: string;
};

export type FocusAppUsage = { packageId: string; dailyMins: number; launches: number };

export type NativeBlockingSession = {
  id: string;
  userId: string;
  startedAt: number;
  endsAt: number;
  packageIds: string[];
  strategy?: 'block' | 'allow';
  status: 'active' | 'paused' | 'completed' | 'stopped';
  pausedRemainingMs?: number;
  pausedAt?: number;
  emergencyExit?: boolean;
};

export type PendingFocusCompletion = {
  id: string;
  userId: string;
  startedAt: number;
  endsAt: number;
  completedAt: number;
  packageIds: string[];
  strategy?: 'block' | 'allow';
};

export type BlockingStatus = {
  available: boolean;
  accessibilityEnabled: boolean;
  usageAccessEnabled: boolean;
  exactAlarmEnabled?: boolean;
  notificationsEnabled?: boolean;
  batteryOptimizationIgnored?: boolean;
  dndAccessEnabled?: boolean;
  serviceRunning: boolean;
  activeSession: NativeBlockingSession | null;
  blockedAttemptsToday?: number;
};

export type FocusLockEventName =
  | 'onBlockingStarted'
  | 'onBlockingPaused'
  | 'onBlockingStopped'
  | 'onBlockedAppDetected'
  | 'onSessionExpired'
  | 'onPermissionChanged'
  | 'onBlockingError';

type FocusLockModule = {
  getInstalledApps(): Promise<InstalledFocusApp[]>;
  getUsageStats(): Promise<FocusAppUsage[]>;
  getBlockingStatus(): Promise<BlockingStatus>;
  openAccessibilitySettings(): Promise<void>;
  requestAccessibilityPermission(): Promise<void>;
  openUsageAccessSettings(): Promise<void>;
  openExactAlarmSettings?(): Promise<void>;
  openNotificationSettings?(): Promise<void>;
  openBatteryOptimizationSettings?(): Promise<void>;
  openDndSettings?(): Promise<void>;
  setDndEnabled?(enabled: boolean): Promise<boolean>;
  setRestartRecoveryEnabled?(enabled: boolean): Promise<void>;
  isAccessibilityEnabled(): Promise<boolean>;
  startBlockingSession(config: { sessionId: string; userId: string; startedAt: number; endsAt: number; packageIds: string[]; strategy?: 'block' | 'allow' }): Promise<NativeBlockingSession>;
  pauseBlockingSession?(sessionId: string): Promise<NativeBlockingSession>;
  resumeBlockingSession?(sessionId: string): Promise<NativeBlockingSession>;
  stopBlockingSession(sessionId: string, emergencyExit?: boolean): Promise<NativeBlockingSession | null>;
  getActiveSession(): Promise<NativeBlockingSession | null>;
  getRemainingTime(): Promise<number>;
  getBlockedPackages(): Promise<string[]>;
  peekPendingCompletions?(): Promise<PendingFocusCompletion[]>;
  acknowledgePendingCompletions?(sessionIds: string[]): Promise<void>;
  consumePendingCompletions?(): Promise<PendingFocusCompletion[]>;
  addBlockedPackage(packageId: string): Promise<string[]>;
  removeBlockedPackage(packageId: string): Promise<string[]>;
};

const nativeModule = Platform.OS === 'android'
  ? (NativeModules.StudySakhaFocusLock as FocusLockModule | undefined)
  : undefined;

export const focusLockNative = nativeModule;
export const focusLockEvents = nativeModule && new NativeEventEmitter(NativeModules.StudySakhaFocusLock);

export function isFocusLockNativeAvailable() {
  return Boolean(nativeModule);
}

export function subscribeFocusLockEvent(name: FocusLockEventName, listener: (payload: unknown) => void) {
  if (!focusLockEvents) return () => undefined;
  const subscription = focusLockEvents.addListener(name, listener);
  return () => subscription.remove();
}
