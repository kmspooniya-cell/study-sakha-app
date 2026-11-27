import AsyncStorage from '@react-native-async-storage/async-storage';

export const ALARM_STORAGE_KEY = '@study_sakha_alarm_module_v1';

type StoredAlarm = {
  hour?: unknown;
  minute?: unknown;
  enabled?: unknown;
  skippedOnce?: unknown;
};

type StoredAlarmState = {
  alarms?: unknown;
  settings?: { use24h?: unknown };
};

export type AlarmSummary = {
  activeCount: number;
  nextAlarm: { hour: number; minute: number } | null;
  use24h: boolean;
};

export type AlarmSchedule = {
  hour: number;
  minute: number;
  days?: readonly string[];
  specificDate?: string;
};

export function getSecondsUntilAlarm(alarm: AlarmSchedule, now = new Date()) {
  const makeTarget = (date: Date) => {
    const target = new Date(date);
    target.setHours(alarm.hour, alarm.minute, 0, 0);
    return target;
  };

  if (alarm.specificDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(alarm.specificDate);
    if (!match) return Number.POSITIVE_INFINITY;
    const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), alarm.hour, alarm.minute, 0, 0);
    return target.getTime() > now.getTime()
      ? Math.floor((target.getTime() - now.getTime()) / 1000)
      : Number.POSITIVE_INFINITY;
  }

  const scheduledDays = alarm.days ?? [];
  for (let offset = 0; offset <= (scheduledDays.length > 0 ? 7 : 0); offset += 1) {
    const candidateDate = new Date(now);
    candidateDate.setDate(candidateDate.getDate() + offset);
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][candidateDate.getDay()];
    if (scheduledDays.length > 0 && !scheduledDays.includes(weekday)) continue;
    const target = makeTarget(candidateDate);
    if (target.getTime() > now.getTime()) return Math.floor((target.getTime() - now.getTime()) / 1000);
  }

  return Number.POSITIVE_INFINITY;
}

function isValidAlarm(value: unknown): value is Required<Pick<StoredAlarm, 'hour' | 'minute'>> & StoredAlarm {
  if (!value || typeof value !== 'object') return false;
  const alarm = value as StoredAlarm;
  return Number.isInteger(alarm.hour) && Number.isInteger(alarm.minute)
    && Number(alarm.hour) >= 0 && Number(alarm.hour) <= 23
    && Number(alarm.minute) >= 0 && Number(alarm.minute) <= 59;
}

export async function readAlarmSummary(): Promise<AlarmSummary> {
  try {
    const raw = await AsyncStorage.getItem(ALARM_STORAGE_KEY);
    if (!raw) return { activeCount: 0, nextAlarm: null, use24h: false };

    const parsed = JSON.parse(raw) as StoredAlarmState;
    const alarms = Array.isArray(parsed.alarms) ? parsed.alarms.filter(isValidAlarm) : [];
    const active = alarms.filter((alarm) => alarm.enabled === true && alarm.skippedOnce !== true);
    const nextAlarm = active
      .map((alarm) => ({ alarm, seconds: getSecondsUntilAlarm(alarm as AlarmSchedule) }))
      .filter((entry) => Number.isFinite(entry.seconds))
      .sort((a, b) => a.seconds - b.seconds)[0]?.alarm;

    return {
      activeCount: active.length,
      nextAlarm: nextAlarm ? { hour: Number(nextAlarm.hour), minute: Number(nextAlarm.minute) } : null,
      use24h: parsed.settings?.use24h === true,
    };
  } catch {
    return { activeCount: 0, nextAlarm: null, use24h: false };
  }
}
