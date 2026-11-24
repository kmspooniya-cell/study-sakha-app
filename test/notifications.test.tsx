import { describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
const mockSetNotificationHandler = jest.fn();
const mockSetNotificationChannelAsync = jest.fn(async () => undefined);
const mockGetPermissionsAsync = jest.fn(async () => ({ granted: true, status: 'granted' }));
const mockRequestPermissionsAsync = jest.fn(async () => ({ granted: true, status: 'granted' }));
const mockCancelScheduledNotificationAsync = jest.fn(async () => undefined);
const mockScheduleNotificationAsync = jest.fn(async (request: unknown) => ({ identifier: 'mock-id', request }));

jest.mock('expo-notifications', () => ({
  __esModule: true,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: mockSetNotificationHandler,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
}));

Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

// The notification module must load after its native dependency is mocked.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { STUDY_REMINDER_CHANNEL_ID, syncUpcomingPlannerReminder } = require('../lib/notifications') as typeof import('../lib/notifications');

describe('planner local reminders', () => {
  it('creates the Android channel and schedules only the earliest incomplete item', async () => {
    const now = new Date('2026-11-24T08:00:00').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    await syncUpcomingPlannerReminder(true, [
      { id: 'later', title: 'Later', date: '2026-11-24', startTime: '11:00', completed: false } as never,
      { id: 'first', title: 'First', date: '2026-11-24', startTime: '09:00', completed: false } as never,
      { id: 'done', title: 'Done', date: '2026-11-24', startTime: '08:30', completed: true } as never,
    ]);

    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
      STUDY_REMINDER_CHANNEL_ID,
      expect.objectContaining({ name: 'Study reminders' }),
    );
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ title: 'Study Sakha reminder', body: 'First', channelId: STUDY_REMINDER_CHANNEL_ID }),
    }));
  });

  it('cancels the deterministic reminder when notifications are disabled', async () => {
    await syncUpcomingPlannerReminder(false, []);
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalled();
  });
});
