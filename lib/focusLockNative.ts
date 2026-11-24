import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

export type InstalledFocusApp = {
  packageId: string;
  name: string;
  iconBase64?: string;
};

export type NativeBlockingSession = {
  id: string;
  userId: string;
  startedAt: number;
  endsAt: number;
  packageIds: string[];
  status: 'active' | 'completed' | 'stopped';
  emergencyExit?: boolean;
};

export type BlockingStatus = {
  available: boolean;
  accessibilityEnabled: boolean;
  usageAccessEnabled: boolean;
  serviceRunning: boolean;
  activeSession: NativeBlockingSession | null;
};

export type FocusLockEventName =
  | 'onBlockingStarted'
  | 'onBlockingStopped'
  | 'onBlockedAppDetected'
  | 'onSessionExpired'
  | 'onPermissionChanged'
  | 'onBlockingError';

type FocusLockModule = {
  getInstalledApps(): Promise<InstalledFocusApp[]>;
  getBlockingStatus(): Promise<BlockingStatus>;
  openAccessibilitySettings(): Promise<void>;
  requestAccessibilityPermission(): Promise<void>;
  openUsageAccessSettings(): Promise<void>;
  isAccessibilityEnabled(): Promise<boolean>;
  startBlockingSession(config: { sessionId: string; userId: string; startedAt: number; endsAt: number; packageIds: string[] }): Promise<NativeBlockingSession>;
  stopBlockingSession(sessionId: string, emergencyExit?: boolean): Promise<NativeBlockingSession | null>;
  getActiveSession(): Promise<NativeBlockingSession | null>;
  getRemainingTime(): Promise<number>;
  getBlockedPackages(): Promise<string[]>;
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
