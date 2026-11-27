import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
}));

const { ALARM_STORAGE_KEY, getSecondsUntilAlarm, readAlarmSummary } = require('../src/modules/alarm/alarmStorage') as typeof import('../src/modules/alarm/alarmStorage');

describe('Alarm storage summary', () => {
  beforeEach(() => mockStorage.clear());

  it('returns an empty summary when no persisted Alarm state exists', async () => {
    await expect(readAlarmSummary()).resolves.toEqual({ activeCount: 0, nextAlarm: null, use24h: false });
  });

  it('counts only enabled, non-skipped persisted alarms and selects the next scheduled one', async () => {
    mockStorage.set(ALARM_STORAGE_KEY, JSON.stringify({
      settings: { use24h: true },
      alarms: [
        { id: 'later', hour: 23, minute: 0, enabled: true, skippedOnce: false, days: [] },
        { id: 'skipped', hour: 6, minute: 0, enabled: true, skippedOnce: true, days: [] },
        { id: 'disabled', hour: 5, minute: 0, enabled: false, skippedOnce: false, days: [] },
      ],
    }));

    const summary = await readAlarmSummary();
    expect(summary.activeCount).toBe(1);
    expect(summary.nextAlarm).toEqual({ hour: 23, minute: 0 });
    expect(summary.use24h).toBe(true);
  });

  it('honors repeat days and rejects a past one-time schedule as upcoming', () => {
    const fridayMorning = new Date(2026, 10, 27, 10, 0, 0);
    expect(getSecondsUntilAlarm({ hour: 9, minute: 0, days: ['Sat'] }, fridayMorning)).toBe(23 * 60 * 60);
    expect(getSecondsUntilAlarm({ hour: 9, minute: 0, days: [] }, fridayMorning)).toBe(Number.POSITIVE_INFINITY);
    expect(getSecondsUntilAlarm({ hour: 9, minute: 0, specificDate: '2026-11-26' }, fridayMorning)).toBe(Number.POSITIVE_INFINITY);
  });
});
