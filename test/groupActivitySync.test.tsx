import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  retryPendingStudyMemberActivities,
  syncStudyMemberActivityWithRetry,
} from '../lib/groupActivitySync';

const mockStorage = new Map<string, string>();
const mockGetActiveGroupIds = jest.fn(async (_userId: string) => ['group-1']);
const mockSubmitActivity = jest.fn(async (_groupIds: string[], _activity: unknown) => ({
  groupIds: ['group-1'],
  failures: [] as { groupId: string; message: string }[],
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
  },
}));

jest.mock('../lib/groupRooms', () => ({
  getActiveStudyGroupIds: (...args: [string]) => mockGetActiveGroupIds(...args),
  submitStudyMemberActivityToGroups: (...args: [string[], unknown]) => mockSubmitActivity(...args),
}));

const activity = {
  userId: 'user-1',
  eventId: 'focus-1',
  activityType: 'focus_session' as const,
  actualSeconds: 240,
  occurredAt: '2026-11-23T06:00:00.000Z',
};

describe('saved group activity retries', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockGetActiveGroupIds.mockReset();
    mockGetActiveGroupIds.mockResolvedValue(['group-1']);
    mockSubmitActivity.mockReset();
    mockSubmitActivity.mockResolvedValue({ groupIds: ['group-1'], failures: [] });
  });

  it('keeps failed activity locally and removes it after a successful retry', async () => {
    mockSubmitActivity
      .mockResolvedValueOnce({
        groupIds: ['group-1'],
        failures: [{ groupId: 'group-1', message: 'Temporary network error' }],
      })
      .mockResolvedValueOnce({ groupIds: ['group-1'], failures: [] });

    await expect(syncStudyMemberActivityWithRetry(activity)).resolves.toMatchObject({
      failures: [{ groupId: 'group-1', message: 'Temporary network error' }],
    });
    expect(JSON.parse(mockStorage.get('study-sakha-pending-group-activity-v1:user-1') ?? '[]')).toHaveLength(1);
    expect(JSON.parse(mockStorage.get('study-sakha-pending-group-activity-v1:user-1') ?? '[]')[0].groupIds).toEqual(['group-1']);

    mockGetActiveGroupIds.mockResolvedValue(['group-2']);
    await expect(retryPendingStudyMemberActivities('user-1')).resolves.toEqual([]);
    expect(mockStorage.has('study-sakha-pending-group-activity-v1:user-1')).toBe(false);
    expect(mockSubmitActivity).toHaveBeenCalledTimes(2);
    expect(mockSubmitActivity).toHaveBeenNthCalledWith(2, ['group-1'], expect.objectContaining({ eventId: 'focus-1' }));
  });

  it('does not enqueue the same event twice when a save is retried', async () => {
    mockSubmitActivity.mockResolvedValue({
      groupIds: ['group-1'],
      failures: [{ groupId: 'group-1', message: 'Temporary network error' }],
    });

    await syncStudyMemberActivityWithRetry(activity);
    await syncStudyMemberActivityWithRetry(activity);

    expect(JSON.parse(mockStorage.get('study-sakha-pending-group-activity-v1:user-1') ?? '[]')).toHaveLength(1);
  });
});
