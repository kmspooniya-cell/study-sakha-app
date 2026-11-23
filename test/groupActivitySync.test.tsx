import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  retryPendingStudyMemberActivities,
  syncStudyMemberActivityWithRetry,
} from '../lib/groupActivitySync';

const mockStorage = new Map<string, string>();
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
    mockSubmitActivity.mockReset();
    mockSubmitActivity.mockResolvedValue({ groupIds: ['group-1'], failures: [] });
  });

  it('keeps a group-scoped activity locally and removes it after a successful retry', async () => {
    mockSubmitActivity
      .mockResolvedValueOnce({
        groupIds: ['group-1'],
        failures: [{ groupId: 'group-1', message: 'Temporary network error' }],
      })
      .mockResolvedValueOnce({ groupIds: ['group-1'], failures: [] });

    await expect(syncStudyMemberActivityWithRetry(activity, ['group-1'])).resolves.toMatchObject({
      failures: [{ groupId: 'group-1', message: 'Temporary network error' }],
    });
    expect(JSON.parse(mockStorage.get('study-sakha-pending-group-activity-v2:user-1') ?? '[]')).toHaveLength(1);
    expect(JSON.parse(mockStorage.get('study-sakha-pending-group-activity-v2:user-1') ?? '[]')[0].groupIds).toEqual(['group-1']);

    await expect(retryPendingStudyMemberActivities('user-1')).resolves.toEqual([]);
    expect(mockStorage.has('study-sakha-pending-group-activity-v2:user-1')).toBe(false);
    expect(mockSubmitActivity).toHaveBeenCalledTimes(2);
    expect(mockSubmitActivity).toHaveBeenNthCalledWith(2, ['group-1'], expect.objectContaining({ eventId: 'focus-1' }));
  });

  it('does not enqueue the same event twice when a save is retried', async () => {
    mockSubmitActivity.mockResolvedValue({
      groupIds: ['group-1'],
      failures: [{ groupId: 'group-1', message: 'Temporary network error' }],
    });

    await syncStudyMemberActivityWithRetry(activity, ['group-2', 'group-2']);
    await syncStudyMemberActivityWithRetry(activity, ['group-1']);

    expect(JSON.parse(mockStorage.get('study-sakha-pending-group-activity-v2:user-1') ?? '[]')).toHaveLength(1);
    expect(JSON.parse(mockStorage.get('study-sakha-pending-group-activity-v2:user-1') ?? '[]')[0].groupIds).toEqual(['group-2']);
  });

  it('rejects empty scope instead of broadcasting to memberships', async () => {
    await expect(syncStudyMemberActivityWithRetry(activity, [])).rejects.toThrow(
      'Choose a study group before synchronizing group activity.',
    );
    expect(mockSubmitActivity).not.toHaveBeenCalled();
  });

  it('submits to every group in scope and clears the queue when all groups succeed', async () => {
    mockSubmitActivity.mockResolvedValue({ groupIds: ['group-1', 'group-2'], failures: [] });

    await expect(syncStudyMemberActivityWithRetry(activity, ['group-1', 'group-2'])).resolves.toMatchObject({
      failures: [],
    });

    expect(mockSubmitActivity).toHaveBeenCalledTimes(1);
    expect(mockSubmitActivity).toHaveBeenCalledWith(
      ['group-1', 'group-2'],
      expect.objectContaining({ eventId: 'focus-1', groupIds: ['group-1', 'group-2'] }),
    );
    expect(mockStorage.has('study-sakha-pending-group-activity-v2:user-1')).toBe(false);
  });

  it('keeps the activity queued when one group fails so it can be retried later', async () => {
    mockSubmitActivity.mockResolvedValue({
      groupIds: ['group-1', 'group-2'],
      failures: [{ groupId: 'group-2', message: 'Group temporarily unavailable' }],
    });

    await expect(syncStudyMemberActivityWithRetry(activity, ['group-1', 'group-2'])).resolves.toMatchObject({
      failures: [{ groupId: 'group-2', message: 'Group temporarily unavailable' }],
    });

    expect(mockSubmitActivity).toHaveBeenCalledTimes(1);
    const queued = JSON.parse(mockStorage.get('study-sakha-pending-group-activity-v2:user-1') ?? '[]');
    expect(queued).toHaveLength(1);
    expect(queued[0].groupIds).toEqual(['group-1', 'group-2']);

    mockSubmitActivity.mockResolvedValue({ groupIds: ['group-1', 'group-2'], failures: [] });
    await expect(retryPendingStudyMemberActivities('user-1')).resolves.toEqual([]);
    expect(mockStorage.has('study-sakha-pending-group-activity-v2:user-1')).toBe(false);
    expect(mockSubmitActivity).toHaveBeenCalledTimes(2);
  });

  it('resolves old pending group scope from the saved session and drops personal activity', async () => {
    mockStorage.set('study-sakha-pending-group-activity-v1:user-1', JSON.stringify([
      { ...activity, groupIds: ['group-1', 'group-2'] },
      { ...activity, eventId: 'personal-focus', groupIds: ['group-1'] },
    ]));
    mockStorage.set('study-sakha-focus-history-v1:user:user-1', JSON.stringify([
      { id: 'focus-1', groupId: 'group-2' },
      { id: 'personal-focus' },
    ]));

    await expect(retryPendingStudyMemberActivities('user-1')).resolves.toEqual([]);

    expect(mockSubmitActivity).toHaveBeenCalledTimes(1);
    expect(mockSubmitActivity).toHaveBeenCalledWith(
      ['group-2'],
      expect.objectContaining({ eventId: 'focus-1' }),
    );
    expect(mockStorage.has('study-sakha-pending-group-activity-v1:user-1')).toBe(false);
  });

  it('preserves legacy activity when its owning session cannot be verified', async () => {
    mockStorage.set('study-sakha-pending-group-activity-v1:user-1', JSON.stringify([
      { ...activity, groupIds: ['group-1'] },
    ]));

    await expect(retryPendingStudyMemberActivities('user-1')).resolves.toMatchObject([
      { eventId: 'focus-1', groupId: 'unknown group scope' },
    ]);

    expect(mockSubmitActivity).not.toHaveBeenCalled();
    expect(mockStorage.has('study-sakha-pending-group-activity-v1:user-1')).toBe(true);
  });
});
