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

export type NextAlarmOccurrence = {
  targetDate: Date;
  secondsUntil: number;
  dayRelation: 'today' | 'tomorrow' | 'future';
  dayLabel: string;
};

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function formatLocalDateLabel(date: Date): string {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

export function getNextAlarmOccurrence(alarm: AlarmSchedule, now = new Date()): NextAlarmOccurrence | null {
  if (
    !Number.isInteger(alarm.hour) ||
    !Number.isInteger(alarm.minute) ||
    alarm.hour < 0 ||
    alarm.hour > 23 ||
    alarm.minute < 0 ||
    alarm.minute > 59
  ) {
    return null;
  }

  let targetDate: Date | null = null;

  if (alarm.specificDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(alarm.specificDate.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const candidate = new Date(year, monthIndex, day, alarm.hour, alarm.minute, 0, 0);
    if (
      candidate.getFullYear() !== year ||
      candidate.getMonth() !== monthIndex ||
      candidate.getDate() !== day
    ) {
      return null;
    }
    if (candidate.getTime() > now.getTime()) {
      targetDate = candidate;
    }
  } else {
    const scheduledDays = (alarm.days ?? []).map((d) => d.slice(0, 3).toLowerCase());
    const maxOffset = scheduledDays.length > 0 ? 7 : 0;
    for (let offset = 0; offset <= maxOffset; offset += 1) {
      const candidate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
        alarm.hour,
        alarm.minute,
        0,
        0,
      );
      const weekday = WEEKDAY_NAMES[candidate.getDay()].toLowerCase();
      if (scheduledDays.length > 0 && !scheduledDays.includes(weekday)) continue;
      if (candidate.getTime() > now.getTime()) {
        targetDate = candidate;
        break;
      }
    }
  }

  if (!targetDate) return null;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();

  let dayRelation: NextAlarmOccurrence['dayRelation'] = 'future';
  let dayLabel: string;
  if (targetStart === todayStart) {
    dayRelation = 'today';
    dayLabel = 'Today';
  } else if (targetStart === tomorrowStart) {
    dayRelation = 'tomorrow';
    dayLabel = 'Tomorrow';
  } else {
    dayLabel = formatLocalDateLabel(targetDate);
  }

  return {
    targetDate,
    secondsUntil: Math.floor((targetDate.getTime() - now.getTime()) / 1000),
    dayRelation,
    dayLabel,
  };
}

export function formatAlarmOccurrenceLabel(alarm: AlarmSchedule, now = new Date()): string | null {
  return getNextAlarmOccurrence(alarm, now)?.dayLabel ?? null;
}

export function getSecondsUntilAlarm(alarm: AlarmSchedule, now = new Date()) {
  return getNextAlarmOccurrence(alarm, now)?.secondsUntil ?? Number.POSITIVE_INFINITY;
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
