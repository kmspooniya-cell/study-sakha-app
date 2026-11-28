import type { ReminderSuspendDuration } from './focusLockNative';

export const APP_DAILY_LIMIT_PRESETS_MINS = [0, 5, 15, 30, 60, 120] as const;

export function getLocalDateKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeSuspensionExpiryMs(
  duration: ReminderSuspendDuration,
  nowMs: number = Date.now(),
): number {
  const target = new Date(nowMs);
  target.setHours(0, 0, 0, 0);
  if (duration === 'rest_of_day') {
    target.setDate(target.getDate() + 1);
  } else if (duration === 'till_tomorrow') {
    target.setDate(target.getDate() + 2);
  } else {
    target.setDate(target.getDate() + 7);
  }
  return target.getTime();
}

export function isAppLimitExceeded(
  usedMs: number,
  limitMins: number,
  suspendedUntilMs?: number,
  nowMs: number = Date.now(),
): boolean {
  if (!limitMins || limitMins <= 0) return false;
  if (suspendedUntilMs && suspendedUntilMs > nowMs) return false;
  return usedMs >= limitMins * 60_000;
}

export function getRemainingLimitMs(usedMs: number, limitMins: number): number {
  if (!limitMins || limitMins <= 0) return 0;
  return Math.max(0, limitMins * 60_000 - Math.max(0, usedMs));
}

export function formatUsageDuration(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
}

export function formatSuspensionLabel(duration: string): string {
  if (duration === 'rest_of_day') return 'Paused for rest of the day';
  if (duration === 'till_tomorrow') return 'Paused till tomorrow';
  if (duration === '7_days') return 'Paused for 7 days';
  return 'Reminder paused';
}
