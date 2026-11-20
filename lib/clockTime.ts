export interface ClockTime {
  hour: string;
  minute: number;
  period: 'AM' | 'PM';
}

export function selectClockMinute(time: ClockTime, minute: number): ClockTime {
  if (!Number.isInteger(minute) || minute < 0 || minute > 55 || minute % 5 !== 0) {
    throw new RangeError('Clock minute must be a five-minute position from 00 to 55.');
  }
  return { ...time, minute };
}

export function formatClockMinute(minute: number): string {
  return String(minute).padStart(2, '0');
}
