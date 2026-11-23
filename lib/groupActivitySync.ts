import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitStudyMemberActivityToGroups } from './groupRooms';
import type { StudyMemberActivity } from './groupRooms';

type ActivitySyncFailure = {
  eventId: string;
  groupId: string;
  message: string;
};

type PendingStudyMemberActivity = StudyMemberActivity & { groupIds: string[] };

const legacyPendingActivityKey = (userId: string) => `study-sakha-pending-group-activity-v1:${userId}`;
const pendingActivityKey = (userId: string) => `study-sakha-pending-group-activity-v2:${userId}`;
const focusHistoryKey = (userId: string) =>
  `study-sakha-focus-history-v1:user:${encodeURIComponent(userId)}`;
const pendingWrites = new Map<string, Promise<PendingStudyMemberActivity[]>>();
const pendingRetries = new Map<string, Promise<ActivitySyncFailure[]>>();

function isStudyMemberActivity(value: unknown): value is StudyMemberActivity {
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
    ['taskId', 'subject', 'startedAt', 'endedAt', 'scheduleId', 'scheduleOccurrenceId'].every(
      (key) => activity[key] === undefined || typeof activity[key] === 'string',
    );
}

function isPendingStudyMemberActivity(value: unknown): value is PendingStudyMemberActivity {
  if (!isStudyMemberActivity(value)) return false;
  const groupIds = (value as Record<string, unknown>).groupIds;
  return Array.isArray(groupIds) &&
    groupIds.length > 0 &&
    groupIds.every((groupId) => typeof groupId === 'string' && groupId.length > 0);
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
    !parsed.every((activity) => isPendingStudyMemberActivity(activity) && activity.userId === userId)) {
    throw new Error('Saved group activity retries have an invalid format.');
  }
  return parsed as PendingStudyMemberActivity[];
}

function parseLegacyPendingActivities(raw: string, userId: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Saved legacy group activity retries contain invalid JSON.');
  }
  if (!Array.isArray(parsed) ||
    !parsed.every((activity) => isStudyMemberActivity(activity) && activity.userId === userId)) {
    throw new Error('Saved legacy group activity retries have an invalid format.');
  }
  return parsed as StudyMemberActivity[];
}

function parseFocusHistory(raw: string | null) {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Saved focus history contains invalid JSON.');
  }
  if (!Array.isArray(parsed) || parsed.some((record) =>
    !record || typeof record !== 'object' ||
    typeof (record as Record<string, unknown>).id !== 'string'
  )) {
    throw new Error('Saved focus history has an invalid format.');
  }
  return parsed as Record<string, unknown>[];
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

export async function syncStudyMemberActivityWithRetry(
  activity: StudyMemberActivity,
  groupIds: string[],
) {
  const scopedActivity: PendingStudyMemberActivity = {
    ...activity,
    groupIds: Array.from(new Set(groupIds.map((groupId) => groupId.trim()).filter(Boolean))),
  };
  if (!scopedActivity.groupIds.length) {
    throw new Error('Choose a study group before synchronizing group activity.');
  }

  await updatePendingActivities(activity.userId, (activities) =>
    activities.some((item) => activityKey(item) === activityKey(activity))
      ? activities
      : [...activities, scopedActivity],
  );

  const pending = await getPendingActivity(activity.userId, scopedActivity);
  const result = await submitStudyMemberActivityToGroups(pending.groupIds, pending);
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

async function migrateLegacyPendingActivities(userId: string): Promise<ActivitySyncFailure[]> {
  const legacyKey = legacyPendingActivityKey(userId);
  const raw = await AsyncStorage.getItem(legacyKey);
  if (!raw) return [];

  const legacy = parseLegacyPendingActivities(raw, userId);
  const history = parseFocusHistory(await AsyncStorage.getItem(focusHistoryKey(userId)));
  const migrated: PendingStudyMemberActivity[] = [];
  const unresolved: StudyMemberActivity[] = [];

  legacy.forEach((activity) => {
    const historyRecord = history.find((record) =>
      activity.activityType === 'focus_session'
        ? record.id === activity.eventId
        : typeof record.scheduleOccurrenceId === 'string' &&
          record.scheduleOccurrenceId === (activity.scheduleOccurrenceId ?? activity.taskId)
    );
    if (!historyRecord) {
      unresolved.push(activity);
      return;
    }

    const groupId = typeof historyRecord.groupId === 'string' ? historyRecord.groupId.trim() : '';
    if (!groupId) return;
    migrated.push({ ...activity, groupIds: [groupId] });
  });

  if (migrated.length) {
    await updatePendingActivities(userId, (current) => {
      const currentKeys = new Set(current.map(activityKey));
      return [...current, ...migrated.filter((activity) => !currentKeys.has(activityKey(activity)))];
    });
  }

  if (unresolved.length) {
    await AsyncStorage.setItem(legacyKey, JSON.stringify(unresolved));
  } else {
    await AsyncStorage.removeItem(legacyKey);
  }

  return unresolved.map((activity) => ({
    eventId: activity.eventId,
    groupId: 'unknown group scope',
    message: 'Saved group activity could not be safely scoped and remains queued.',
  }));
}

async function retryPendingActivities(userId: string): Promise<ActivitySyncFailure[]> {
  const failures = await migrateLegacyPendingActivities(userId);
  const pending = await updatePendingActivities(userId, (activities) => activities);

  for (const activity of pending) {
    try {
      const result = await submitStudyMemberActivityToGroups(activity.groupIds, activity);
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
        groupId: activity.groupIds.join(', '),
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
