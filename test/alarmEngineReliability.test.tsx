import { describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const alarmStorage = require('../src/modules/alarm/alarmStorage') as typeof import('../src/modules/alarm/alarmStorage');

describe('Issue 2 — Shared next-occurrence calculation & Today/Tomorrow labels', () => {
  it('shows Today when the next occurrence is later on the same local calendar day', () => {
    const fridayMorning = new Date(2026, 10, 27, 7, 30, 0); // Fri Nov 27, 07:30
    const occ = alarmStorage.getNextAlarmOccurrence({ hour: 8, minute: 0, days: ['Fri', 'Sat'] }, fridayMorning);
    expect(occ).not.toBeNull();
    expect(occ?.dayRelation).toBe('today');
    expect(occ?.dayLabel).toBe('Today');
    expect(occ?.secondsUntil).toBe(30 * 60);
    expect(alarmStorage.formatAlarmOccurrenceLabel({ hour: 8, minute: 0, days: ['Fri', 'Sat'] }, fridayMorning)).toBe('Today');
  });

  it('shows Tomorrow across midnight even when the alarm is less than 24 hours away', () => {
    const lateNight = new Date(2026, 10, 27, 23, 30, 0); // Fri Nov 27, 23:30
    const occ = alarmStorage.getNextAlarmOccurrence({ hour: 1, minute: 0, days: ['Fri', 'Sat'] }, lateNight);
    expect(occ).not.toBeNull();
    expect(occ?.dayRelation).toBe('tomorrow');
    expect(occ?.dayLabel).toBe('Tomorrow');
    expect(occ?.secondsUntil).toBe(90 * 60);
  });

  it('shows weekday and date when the next repeat day is beyond tomorrow', () => {
    const fridayMorning = new Date(2026, 10, 27, 10, 0, 0); // Fri Nov 27, 10:00
    const occ = alarmStorage.getNextAlarmOccurrence({ hour: 6, minute: 30, days: ['Mon'] }, fridayMorning);
    expect(occ).not.toBeNull();
    expect(occ?.dayRelation).toBe('future');
    expect(occ?.dayLabel).toBe('Mon, Nov 30');
  });

  it('uses specificDate for one-time alarms and rejects invalid calendar rollover dates', () => {
    const fridayMorning = new Date(2026, 10, 27, 8, 0, 0);
    expect(
      alarmStorage.formatAlarmOccurrenceLabel({ hour: 9, minute: 0, specificDate: '2026-11-27' }, fridayMorning),
    ).toBe('Today');
    expect(
      alarmStorage.formatAlarmOccurrenceLabel({ hour: 9, minute: 0, specificDate: '2026-11-28' }, fridayMorning),
    ).toBe('Tomorrow');
    expect(
      alarmStorage.formatAlarmOccurrenceLabel({ hour: 9, minute: 0, specificDate: '2026-12-01' }, fridayMorning),
    ).toBe('Tue, Dec 1');
    expect(
      alarmStorage.getNextAlarmOccurrence({ hour: 9, minute: 0, specificDate: '2026-02-30' }, fridayMorning),
    ).toBeNull();
  });

  it('uses shared occurrence helper in StudySakhaAlarmModule instead of hardcoded Tomorrow', () => {
    const alarmModule = readRepoFile('src/modules/alarm/StudySakhaAlarmModule.tsx');
    expect(alarmModule).not.toContain('Tomorrow · {formatRepeatLabel');
    expect(alarmModule).toContain('formatAlarmOccurrenceLabel(nextAlarm, now)');
    expect(alarmModule).toContain('formatAlarmOccurrenceLabel(alarm, now)');
    expect(alarmModule).toContain('Today · {formatLocalDateLabel(now)}');
  });
});

describe('Issue 1 — Native Android Alarm Engine & Lock-Screen Activity contracts', () => {
  it('registers AlarmRingingActivity with lock-screen, screen-wake, and singleInstance flags', () => {
    const plugin = readRepoFile('plugins/withAlarmEngine.js');
    const activityKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmRingingActivity.kt');

    expect(plugin).toContain("'AlarmRingingActivity.kt'");
    expect(plugin).toContain("'.AlarmRingingActivity'");
    expect(plugin).toContain("'android:launchMode': 'singleInstance'");
    expect(plugin).toContain("'android:showWhenLocked': 'true'");
    expect(plugin).toContain("'android:turnScreenOn': 'true'");

    expect(activityKt).toContain('setShowWhenLocked(true)');
    expect(activityKt).toContain('setTurnScreenOn(true)');
    expect(activityKt).toContain('FLAG_KEEP_SCREEN_ON');
    expect(activityKt).toContain('Start Mission to Dismiss');
    expect(activityKt).toContain('Dismiss Alarm');
    expect(activityKt).toContain('fun finishActive');
  });

  it('targets AlarmRingingActivity from AlarmPlaybackService and prevents duplicate triggers in Receiver', () => {
    const serviceKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmPlaybackService.kt');
    const receiverKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmEngineReceiver.kt');
    const schedulerKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmEngineScheduler.kt');
    const moduleKt = readRepoFile('native/alarm/android/java/com/anonymous/agonpreview/AlarmEngineModule.kt');

    expect(serviceKt).toContain('Intent(this, AlarmRingingActivity::class.java)');
    expect(serviceKt).toContain('AlarmRingingActivity.finishActive(alarmId)');
    expect(serviceKt).toContain('fun isAlarmRinging(alarmId: String): Boolean');

    expect(receiverKt).toContain('if (AlarmPlaybackService.isAlarmRinging(alarmId))');
    expect(receiverKt).toContain('PowerManager.PARTIAL_WAKE_LOCK');

    expect(schedulerKt).toContain('manager.setAlarmClock(');
    expect(schedulerKt).toContain('rescheduleStoredSnoozes(context)');

    expect(moduleKt).toContain('fun getAlarmPermissionStatus');
    expect(moduleKt).toContain('fun openFullScreenIntentSettings');
    expect(moduleKt).toContain('fun openNotificationSettings');
  });
});
