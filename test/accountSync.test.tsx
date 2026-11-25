import { describe, expect, it } from '@jest/globals';
import { addTombstones, mergeAccountDocuments } from '../lib/sync/syncConflictResolver';
import type { AccountSyncDocument } from '../lib/sync/syncTypes';

function document(overrides: Partial<AccountSyncDocument> = {}): AccountSyncDocument {
  return {
    schemaVersion: 1,
    updatedAt: '2026-11-25T00:00:00.000Z',
    deviceId: 'test-device',
    tombstones: {},
    settings: { themeMode: 'light', dailyGoalMin: 180 },
    notes: [],
    plannerTasks: [],
    results: [],
    plannerCompletions: {},
    recordedFocusSessionIds: [],
    ...overrides,
  };
}

describe('account sync conflict resolution', () => {
  it('merges independent notes and de-duplicates stable records', () => {
    const merged = mergeAccountDocuments(
      document({ notes: [{ id: 'a', title: 'A', updatedAt: 10 }] }),
      document({ notes: [{ id: 'b', title: 'B', updatedAt: 11 }] }),
    );
    expect(merged.notes).toHaveLength(2);
  });

  it('preserves planner completion history from both devices', () => {
    const merged = mergeAccountDocuments(
      document({ plannerCompletions: { '2026-11-25': [{ taskId: 'a' }] } }),
      document({ plannerCompletions: { '2026-11-25': [{ taskId: 'b' }] } }),
    );
    expect((merged.plannerCompletions as Record<string, unknown>)['2026-11-25']).toEqual(expect.arrayContaining([{ taskId: 'a' }, { taskId: 'b' }]));
  });

  it('propagates deletions as tombstones instead of resurrecting records', () => {
    const deleted = addTombstones(
      document({ notes: [{ id: 'a', title: 'A', updatedAt: 10 }] }),
      document({ notes: [], updatedAt: '2026-11-25T00:01:00.000Z' }),
    );
    const merged = mergeAccountDocuments(deleted, document({ notes: [{ id: 'a', title: 'stale', updatedAt: 10 }] }));
    expect(merged.notes).toEqual([]);
    expect(merged.tombstones.notes.a).toBe('2026-11-25T00:01:00.000Z');
  });

  it('keeps independent setting changes at field granularity', () => {
    const merged = mergeAccountDocuments(
      document({ settings: { themeMode: 'dark', dailyGoalMin: 180 }, fieldUpdatedAt: { 'settings.themeMode': '2026-11-25T00:02:00.000Z' } }),
      document({ settings: { themeMode: 'light', dailyGoalMin: 240 }, fieldUpdatedAt: { 'settings.dailyGoalMin': '2026-11-25T00:03:00.000Z' } }),
    );
    expect(merged.settings).toEqual({ themeMode: 'dark', dailyGoalMin: 240 });
  });
});
