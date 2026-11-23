import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActiveStudyGroupIds,
  submitStudyMemberActivityToGroups,
} from './groupRooms';
import type { StudyMemberActivity } from './groupRooms';

type ActivitySyncFailure = {
  eventId: string;
  groupId: string;
  message: string;
};

type PendingStudyMemberActivity = StudyMemberActivity & { groupIds?: string[] };

const pendingActivityKey = (userId: string) => `study-sakha-pending-group-activity-v1:${userId}`;
const pendingWrites = new Map<string, Promise<PendingStudyMemberActivity[]>>();
const pendingRetries = new Map<string, Promise<ActivitySyncFailure[]>>();

function isStudyMemberActivity(value: unknown): value is PendingStudyMemberActivity {
  if (!value || typeof value !== 'object') return false;
  const activity = value as Record<string, unknown>;
  return typeof activity.userId === 'string' &&
    typeof activity.eventId === 'string' &&
    (activity.activityType === 'focus_session' || activity.activityType === 'planner_task_completed') &&
    typeof activity.actualSeconds === 'number' &&
    Number.isFinite(activity.actualSeconds) &&
    activity.actualSeconds >= 0 &&
    typeof activity.occurredAt === 'string' &&
    (activity.status === undefined || ['completed', 'saved_early', 'interrupted', 'abandoned'].includes(String(activity.status))) &&
    (activity.plannedSeconds === undefined ||
      activity.plannedSeconds === null ||
      (typeof activity.plannedSeconds === 'number' && Number.isFinite(activity.plannedSeconds) && activity.plannedSeconds >= 0)) &&
    (activity.mode === undefined || activity.mode === 'timer' || activity.mode === 'stopwatch' || activity.mode === 'pomodoro') &&
    (activity.groupIds === undefined ||
      (Array.isArray(activity.groupIds) && activity.groupIds.every((groupId) => typeof groupId === 'string'))) &&
    ['taskId', 'subject', 'startedAt', 'endedAt', 'scheduleId', 'scheduleOccurrenceId'].every(
      (key) => activity[key] === undefined || typeof activity[key] === 'string',
    );
}

function parsePendingActivities(raw: string | null, userId: string): PendingStudyMemberActivity[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Saved group activity retries contain invalid JSON.');
  }
  if (!Array.isArray(parsed) ||
    !parsed.every((activity) => isStudyMemberActivity(activity) && activity.userId === userId)) {
    throw new Error('Saved group activity retries have an invalid format.');
  }
  return parsed as PendingStudyMemberActivity[];
}

function updatePendingActivities(
  userId: string,
  update: (activities: PendingStudyMemberActivity[]) => PendingStudyMemberActivity[],
) {
  const previous = pendingWrites.get(userId) ?? Promise.resolve([]);
  const write = previous.catch(() => []).then(async () => {
    const key = pendingActivityKey(userId);
    const current = parsePendingActivities(await AsyncStorage.getItem(key), userId);
    const next = update(current);
    if (next.length) await AsyncStorage.setItem(key, JSON.stringify(next));
    else await AsyncStorage.removeItem(key);
    return next;
  });
  pendingWrites.set(userId, write);
  void write.finally(() => {
    if (pendingWrites.get(userId) === write) pendingWrites.delete(userId);
  }).catch(() => {});
  return write;
}

function activityKey(activity: StudyMemberActivity) {
  return `${activity.activityType}:${activity.eventId}`;
}

export async function syncStudyMemberActivityWithRetry(activity: StudyMemberActivity) {
  await updatePendingActivities(activity.userId, (activities) =>
    activities.some((item) => activityKey(item) === activityKey(activity))
      ? activities
      : [...activities, activity],
  );

  const pending = await getPendingActivity(activity.userId, activity);
  const groupIds = await getActivityGroupIds(pending);
  const result = await submitStudyMemberActivityToGroups(groupIds, pending);
  if (!result.failures.length) {
    await updatePendingActivities(activity.userId, (activities) =>
      activities.filter((item) => activityKey(item) !== activityKey(activity)),
    );
  }
  return result;
}

async function getPendingActivity(userId: string, activity: StudyMemberActivity) {
  const activities = await updatePendingActivities(userId, (current) => current);
  const pending = activities.find((item) => activityKey(item) === activityKey(activity));
  if (!pending) throw new Error('The saved group activity retry could not be found.');
  return pending;
}

async function getActivityGroupIds(activity: PendingStudyMemberActivity) {
  if (activity.groupIds) return activity.groupIds;
  const groupIds = await getActiveStudyGroupIds(activity.userId);
  await updatePendingActivities(activity.userId, (activities) =>
    activities.map((item) => activityKey(item) === activityKey(activity) ? { ...item, groupIds } : item),
  );
  return groupIds;
}

async function retryPendingActivities(userId: string): Promise<ActivitySyncFailure[]> {
  const pending = await updatePendingActivities(userId, (activities) => activities);
  const failures: ActivitySyncFailure[] = [];

  for (const activity of pending) {
    try {
      const groupIds = await getActivityGroupIds(activity);
      const result = await submitStudyMemberActivityToGroups(groupIds, activity);
      if (result.failures.length) {
        failures.push(...result.failures.map((failure) => ({ ...failure, eventId: activity.eventId })));
      } else {
        await updatePendingActivities(userId, (activities) =>
          activities.filter((item) => activityKey(item) !== activityKey(activity)),
        );
      }
    } catch (error) {
      failures.push({
        eventId: activity.eventId,
        groupId: 'all joined groups',
        message: error instanceof Error ? error.message : 'Unexpected synchronization error.',
      });
    }
  }

  return failures;
}

export function retryPendingStudyMemberActivities(userId: string) {
  const existing = pendingRetries.get(userId);
  if (existing) return existing;

  const retry = retryPendingActivities(userId);
  pendingRetries.set(userId, retry);
  void retry.finally(() => {
    if (pendingRetries.get(userId) === retry) pendingRetries.delete(userId);
  }).catch(() => {});
  return retry;
}
