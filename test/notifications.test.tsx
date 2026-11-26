import { describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

const mockSetNotificationHandler = jest.fn();
const mockSetNotificationChannelAsync = jest.fn(async () => undefined);
const mockGetPermissionsAsync = jest.fn(async () => ({ granted: true, status: 'granted' }));
const mockRequestPermissionsAsync = jest.fn(async () => ({ granted: true, status: 'granted' }));
const mockCancelScheduledNotificationAsync = jest.fn(async () => undefined);
const mockScheduleNotificationAsync = jest.fn(async (request: unknown) => ({ identifier: 'mock-id', request }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare', appOwnership: null },
  ExecutionEnvironment: { StoreClient: 'storeClient', Bare: 'bare', Standalone: 'standalone' },
}));
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
  getAllScheduledNotificationsAsync: undefined,
}));

Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const notifications = require('../lib/notifications') as typeof import('../lib/notifications');

describe('planner local reminders', () => {
  it('creates the Android channel and schedules only the earliest incomplete item', async () => {
    const now = new Date('2026-11-24T08:00:00').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    await notifications.syncUpcomingPlannerReminder(true, [
      { id: 'later', title: 'Later', date: '2026-11-24', startTime: '11:00', completed: false } as never,
      { id: 'first', title: 'First', date: '2026-11-24', startTime: '09:00', completed: false } as never,
      { id: 'done', title: 'Done', date: '2026-11-24', startTime: '08:30', completed: true } as never,
    ]);
    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
      notifications.STUDY_REMINDER_CHANNEL_ID,
      expect.objectContaining({ name: 'Study reminders' }),
    );
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ body: 'First', channelId: notifications.STUDY_REMINDER_CHANNEL_ID }),
    }));
    await notifications.syncUpcomingPlannerReminder(true, [
      { id: 'later', title: 'Later', date: '2026-11-24', startTime: '11:00', completed: false } as never,
      { id: 'first', title: 'First', date: '2026-11-24', startTime: '09:00', completed: false } as never,
      { id: 'done', title: 'Done', date: '2026-11-24', startTime: '08:30', completed: true } as never,
    ]);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('cancels the deterministic reminder when notifications are disabled', async () => {
    await notifications.syncUpcomingPlannerReminder(false, []);
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalled();
  });

  it('does not call channel APIs in Expo Go and still schedules a local reminder', async () => {
    jest.resetModules();
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { executionEnvironment: 'storeClient', appOwnership: 'expo' },
      ExecutionEnvironment: { StoreClient: 'storeClient' },
    }));
    const setChannel = jest.fn(async () => undefined);
    const schedule = jest.fn(async () => ({ identifier: 'expo-go-id' }));
    jest.doMock('expo-notifications', () => ({
      AndroidImportance: { DEFAULT: 3 },
      SchedulableTriggerInputTypes: { DATE: 'date' },
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: setChannel,
      getPermissionsAsync: jest.fn(async () => ({ granted: true })),
      requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
      cancelScheduledNotificationAsync: jest.fn(async () => undefined),
      scheduleNotificationAsync: schedule,
      getAllScheduledNotificationsAsync: undefined,
    }));
    const module = require('../lib/notifications') as typeof import('../lib/notifications');
    await module.syncUpcomingPlannerReminder(true, [
      { id: 'expo-go', title: 'Expo Go reminder', date: '2099-01-01', startTime: '09:00', completed: false } as never,
    ]);
    expect(setChannel).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.not.objectContaining({ channelId: expect.anything() }),
    }));
  });
});
