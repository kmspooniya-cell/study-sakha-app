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
};

type NativeAlarmEngine = {
  syncAlarms(snapshot: string): Promise<void>;
  scheduleSnooze(config: {
    alarmId: string;
    atMillis: number;
    title: string;
    soundId: string;
    volume: number;
    gradualVolume: boolean;
    vibration: boolean;
    vibrationPattern: string;
  }): Promise<void>;
  stopAlarm(alarmId: string): Promise<void>;
  consumePendingAlarm(): Promise<{ alarmId: string; title: string } | null>;
};

const nativeEngine = Platform.OS === 'android'
  ? (NativeModules.StudySakhaAlarmEngine as NativeAlarmEngine | undefined)
  : undefined;

export function syncNativeAlarms(alarms: NativeAlarmRecord[], settings: { use24h: boolean }) {
  if (!nativeEngine) return Promise.resolve();
  return nativeEngine.syncAlarms(JSON.stringify({
    alarms: alarms.map(({ id, hour, minute, title, enabled, skippedOnce, days, specificDate, soundId, volume, gradualVolume, vibration, vibrationPattern }) => ({
      id, hour, minute, title, enabled, skippedOnce, days, specificDate, soundId, volume, gradualVolume, vibration, vibrationPattern,
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

export function consumePendingNativeAlarm() {
  return nativeEngine?.consumePendingAlarm() ?? Promise.resolve(null);
}

export function subscribeToNativeAlarm(callback: (payload: { alarmId: string; title: string }) => void) {
  if (!nativeEngine) return () => {};
  const subscription = new NativeEventEmitter(nativeEngine as never).addListener('onStudySakhaAlarmTriggered', callback);
  return () => subscription.remove();
}
