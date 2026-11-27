import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

type NativeAlarmRecord = {
  id: string;
  hour: number;
  minute: number;
  title: string;
  enabled: boolean;
  skippedOnce: boolean;
  days: string[];
  specificDate: string;
  soundId: string;
  volume: number;
  gradualVolume: boolean;
  vibration: boolean;
  vibrationPattern: string;
  snoozeEnabled?: boolean;
  snoozeDuration?: number;
  antiSnooze?: boolean;
  heavySleeper?: boolean;
  missionBeforeSnooze?: boolean;
};

export type MissionCapabilities = {
  hasAccelerometer: boolean;
  hasStepCounter: boolean;
  hasStepDetector: boolean;
  activityRecognitionGranted: boolean;
  cameraGranted: boolean;
};

export type MissionSensorEvent = {
  sessionId: string;
  type: 'shake' | 'steps';
  count: number;
  target: number;
};

export type NativeCaptureBarcodeResult =
  | { ok: true; code: string; format: string }
  | { ok: false; reason: string };

export type NativeReferencePhotoResult =
  | { ok: true; referenceUri: string }
  | { ok: false; reason: string };

export type NativeVerifyPhotoResult =
  | { ok: true; matched: boolean; similarity: number; threshold: number }
  | { ok: false; reason: string };

export type NativeSensorStartResult = {
  ok: boolean;
  reason?: string;
};

type NativeAlarmEngine = {
  syncAlarms(snapshot: string): Promise<void>;
  cancelAlarm(alarmId: string): Promise<void>;
  scheduleSnooze(config: {
    alarmId: string;
    atMillis: number;
    title: string;
    soundId: string;
    volume: number;
    gradualVolume: boolean;
    vibration: boolean;
    vibrationPattern: string;
    heavySleeper?: boolean;
    missionBeforeSnooze?: boolean;
  }): Promise<void>;
  stopAlarm(alarmId: string): Promise<void>;
  peekPendingAlarm?(): Promise<{ alarmId: string; title: string } | null>;
  clearPendingAlarm?(alarmId: string): Promise<void>;
  consumePendingAlarm(): Promise<{ alarmId: string; title: string } | null>;
  consumePendingAction?(): Promise<{ alarmId: string; action: 'dismissed' | 'snoozed'; snoozeMinutes: number } | null>;
  getMissionCapabilities?(): Promise<MissionCapabilities>;
  startShakeMission?(sessionId: string, target: number, thresholdG: number): Promise<NativeSensorStartResult>;
  startStepMission?(sessionId: string, target: number): Promise<NativeSensorStartResult>;
  stopSensorMission?(sessionId?: string | null): Promise<void>;
  captureBarcode?(): Promise<NativeCaptureBarcodeResult>;
  captureReferencePhoto?(alarmId: string): Promise<NativeReferencePhotoResult>;
  verifyPhotoAgainstReference?(alarmId: string, thresholdPercent: number): Promise<NativeVerifyPhotoResult>;
};

const nativeEngine = Platform.OS === 'android'
  ? (NativeModules.StudySakhaAlarmEngine as NativeAlarmEngine | undefined)
  : undefined;

export function syncNativeAlarms(alarms: NativeAlarmRecord[], settings: { use24h: boolean }) {
  if (!nativeEngine) return Promise.resolve();
  return nativeEngine.syncAlarms(JSON.stringify({
    alarms: alarms.map(({ id, hour, minute, title, enabled, skippedOnce, days, specificDate, soundId, volume, gradualVolume, vibration, vibrationPattern, snoozeEnabled, snoozeDuration, antiSnooze, heavySleeper, missionBeforeSnooze }) => ({
      id,
      hour,
      minute,
      title,
      enabled,
      skippedOnce,
      days,
      specificDate,
      soundId,
      volume,
      gradualVolume,
      vibration,
      vibrationPattern,
      snoozeEnabled: snoozeEnabled ?? true,
      snoozeDuration: snoozeDuration ?? 5,
      antiSnooze: antiSnooze ?? false,
      heavySleeper: heavySleeper ?? false,
      missionBeforeSnooze: missionBeforeSnooze ?? false,
    })),
    settings: { use24h: settings.use24h },
  }));
}

export function scheduleNativeSnooze(config: Parameters<NativeAlarmEngine['scheduleSnooze']>[0]) {
  return nativeEngine?.scheduleSnooze(config) ?? Promise.resolve();
}

export function stopNativeAlarm(alarmId: string) {
  return nativeEngine?.stopAlarm(alarmId) ?? Promise.resolve();
}

export function cancelNativeAlarm(alarmId: string) {
  return nativeEngine?.cancelAlarm(alarmId) ?? Promise.resolve();
}

export function peekPendingNativeAlarm() {
  if (nativeEngine?.peekPendingAlarm) return nativeEngine.peekPendingAlarm();
  return Promise.resolve(null);
}

export function clearPendingNativeAlarm(alarmId: string) {
  return nativeEngine?.clearPendingAlarm?.(alarmId) ?? Promise.resolve();
}

export function consumePendingNativeAlarm() {
  return nativeEngine?.consumePendingAlarm() ?? Promise.resolve(null);
}

export function consumePendingNativeAction() {
  return nativeEngine?.consumePendingAction?.() ?? Promise.resolve(null);
}

export function subscribeToNativeAlarm(callback: (payload: { alarmId: string; title: string }) => void) {
  if (!nativeEngine) return () => {};
  const subscription = new NativeEventEmitter(nativeEngine as never).addListener('onStudySakhaAlarmTriggered', callback);
  return () => subscription.remove();
}

export function subscribeToNativeAlarmAction(
  callback: (payload: { alarmId: string; action: 'dismissed' | 'snoozed'; snoozeMinutes: number }) => void
) {
  if (!nativeEngine) return () => {};
  const subscription = new NativeEventEmitter(nativeEngine as never).addListener('onStudySakhaAlarmAction', callback);
  return () => subscription.remove();
}

export function getMissionCapabilities(): Promise<MissionCapabilities> {
  if (!nativeEngine?.getMissionCapabilities) {
    return Promise.resolve({
      hasAccelerometer: false,
      hasStepCounter: false,
      hasStepDetector: false,
      activityRecognitionGranted: false,
      cameraGranted: false,
    });
  }
  return nativeEngine.getMissionCapabilities();
}

export function startNativeShakeMission(
  sessionId: string,
  target: number,
  thresholdG = 2.15
): Promise<NativeSensorStartResult> {
  if (!nativeEngine?.startShakeMission) {
    return Promise.resolve({ ok: false, reason: 'native_module_unavailable' });
  }
  return nativeEngine.startShakeMission(sessionId, target, thresholdG);
}

export function startNativeStepMission(
  sessionId: string,
  target: number
): Promise<NativeSensorStartResult> {
  if (!nativeEngine?.startStepMission) {
    return Promise.resolve({ ok: false, reason: 'native_module_unavailable' });
  }
  return nativeEngine.startStepMission(sessionId, target);
}

export function stopNativeSensorMission(sessionId?: string | null): Promise<void> {
  return nativeEngine?.stopSensorMission?.(sessionId ?? null) ?? Promise.resolve();
}

export function captureNativeBarcode(): Promise<NativeCaptureBarcodeResult> {
  if (!nativeEngine?.captureBarcode) {
    return Promise.resolve({ ok: false, reason: 'native_module_unavailable' });
  }
  return nativeEngine.captureBarcode();
}

export function captureNativeReferencePhoto(alarmId: string): Promise<NativeReferencePhotoResult> {
  if (!nativeEngine?.captureReferencePhoto) {
    return Promise.resolve({ ok: false, reason: 'native_module_unavailable' });
  }
  return nativeEngine.captureReferencePhoto(alarmId);
}

export function verifyNativePhotoAgainstReference(
  alarmId: string,
  thresholdPercent: number
): Promise<NativeVerifyPhotoResult> {
  if (!nativeEngine?.verifyPhotoAgainstReference) {
    return Promise.resolve({ ok: false, reason: 'native_module_unavailable' });
  }
  return nativeEngine.verifyPhotoAgainstReference(alarmId, thresholdPercent);
}

export function subscribeToMissionSensor(callback: (payload: MissionSensorEvent) => void) {
  if (!nativeEngine) return () => {};
  const subscription = new NativeEventEmitter(nativeEngine as never).addListener('onStudySakhaMissionSensor', callback);
  return () => subscription.remove();
}
