import type { AccountSyncDocument, SyncTombstones } from './syncTypes';

const COLLECTION_KEYS = new Set([
  'notes',
  'plannerTasks',
  'plannerScheduleItems',
  'results',
  'chat',
  'notifications',
]);

const ITEM_TIME_KEYS = ['updatedAt', 'at', 'takenAt', 'occurredAt', 'createdAt', 'completedAt'];

function recordId(value: unknown): string | null {
  return value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string'
    ? (value as { id: string }).id
    : null;
}

function itemTime(value: Record<string, unknown>): number {
  for (const key of ITEM_TIME_KEYS) {
    const candidate = value[key];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string') {
      const parsed = Date.parse(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function mergeCollection(local: unknown, remote: unknown, tombstones: Record<string, string>) {
  const localItems = Array.isArray(local) ? local : [];
  const remoteItems = Array.isArray(remote) ? remote : [];
  const byId = new Map<string, Record<string, unknown>>();
  const withoutId: unknown[] = [];

  for (const item of [...localItems, ...remoteItems]) {
    const id = recordId(item);
    if (!id || !item || typeof item !== 'object') {
      if (!withoutId.some((candidate) => JSON.stringify(candidate) === JSON.stringify(item))) withoutId.push(item);
      continue;
    }
    const deletedAt = tombstones[id];
    if (deletedAt && new Date(deletedAt).getTime() >= itemTime(item as Record<string, unknown>)) continue;
    const existing = byId.get(id);
    if (!existing || itemTime(item as Record<string, unknown>) >= itemTime(existing)) {
      byId.set(id, item as Record<string, unknown>);
    }
  }

  return [...byId.values(), ...withoutId];
}

function mergeObjectMap(local: unknown, remote: unknown) {
  if (!local || typeof local !== 'object' || Array.isArray(local)) return remote;
  if (!remote || typeof remote !== 'object' || Array.isArray(remote)) return local;
  return { ...(remote as Record<string, unknown>), ...(local as Record<string, unknown>) };
}

function mergedTombstones(local: SyncTombstones | undefined, remote: SyncTombstones | undefined): SyncTombstones {
  const result: SyncTombstones = {};
  for (const [category, entries] of Object.entries(remote ?? {})) result[category] = { ...entries };
  for (const [category, entries] of Object.entries(local ?? {})) {
    result[category] = { ...(result[category] ?? {}), ...entries };
  }
  return result;
}

export function mergeAccountDocuments(
  local: AccountSyncDocument,
  remote: AccountSyncDocument,
): AccountSyncDocument {
  const tombstones = mergedTombstones(local.tombstones, remote.tombstones);
  const result: AccountSyncDocument = {
    ...remote,
    ...local,
    schemaVersion: 1,
    updatedAt: new Date(Math.max(Date.parse(local.updatedAt), Date.parse(remote.updatedAt))).toISOString(),
    tombstones,
  };

  for (const key of COLLECTION_KEYS) {
    result[key] = mergeCollection(local[key], remote[key], tombstones[key] ?? {});
  }

  for (const key of ['progress', 'planDone', 'plannerScheduleCompletions', 'plannerMinutesCredited', 'plannerTaskStudySeconds', 'studyLog']) {
    result[key] = mergeObjectMap(local[key], remote[key]);
  }

  const localIds = Array.isArray(local.recordedFocusSessionIds) ? local.recordedFocusSessionIds : [];
  const remoteIds = Array.isArray(remote.recordedFocusSessionIds) ? remote.recordedFocusSessionIds : [];
  result.recordedFocusSessionIds = Array.from(new Set([...remoteIds, ...localIds]));

  const localCompletions = local.plannerCompletions && typeof local.plannerCompletions === 'object' ? local.plannerCompletions as Record<string, unknown> : {};
  const remoteCompletions = remote.plannerCompletions && typeof remote.plannerCompletions === 'object' ? remote.plannerCompletions as Record<string, unknown> : {};
  const plannerCompletions: Record<string, unknown> = {};
  for (const date of new Set([...Object.keys(localCompletions), ...Object.keys(remoteCompletions)])) {
    plannerCompletions[date] = mergeCollection(localCompletions[date], remoteCompletions[date], {});
  }
  result.plannerCompletions = plannerCompletions;

  // Preferences are merged at field granularity. The engine records the local
  // mutation time for each changed setting, avoiding unrelated overwrites.
  if (local.settings && remote.settings && typeof local.settings === 'object' && typeof remote.settings === 'object') {
    const settings: Record<string, unknown> = {};
    const localSettings = local.settings as Record<string, unknown>;
    const remoteSettings = remote.settings as Record<string, unknown>;
    for (const key of new Set([...Object.keys(localSettings), ...Object.keys(remoteSettings)])) {
      const localTime = Date.parse(local.fieldUpdatedAt?.[`settings.${key}`] ?? local.updatedAt);
      const remoteTime = Date.parse(remote.fieldUpdatedAt?.[`settings.${key}`] ?? remote.updatedAt);
      settings[key] = localTime >= remoteTime ? localSettings[key] : remoteSettings[key];
    }
    result.settings = settings;
  }

  return result;
}

export function addTombstones(
  previous: AccountSyncDocument | null,
  next: AccountSyncDocument,
): AccountSyncDocument {
  if (!previous) return next;
  const tombstones = mergedTombstones(previous.tombstones, next.tombstones);
  for (const key of COLLECTION_KEYS) {
    const before = Array.isArray(previous[key]) ? previous[key] : [];
    const afterIds = new Set((Array.isArray(next[key]) ? next[key] : []).map(recordId).filter((id): id is string => Boolean(id)));
    const category = tombstones[key] ?? {};
    for (const item of before) {
      const id = recordId(item);
      if (id && !afterIds.has(id)) category[id] = next.updatedAt;
    }
    tombstones[key] = category;
  }
  return { ...next, tombstones };
}

