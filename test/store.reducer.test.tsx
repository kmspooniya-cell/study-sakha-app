import { describe, expect, it, jest } from '@jest/globals';
import type { State } from '../lib/store';
import { classifyAuthFailure, dayKey, reducer } from '../lib/store';
import { localDateKey } from '../lib/statistics';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));


const baseState = {
  notes: [],
  planDone: {},
  starred: [],
  bookmarks: [],
  settings: { themeMode: 'system', language: 'en', dailyGoalMin: 180, textScale: 1, notifications: true },
  user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'student', exam: 'upsc', joined: '2026-01-01' },
} as unknown as State;

describe('store reducer learning data', () => {
  it('normalizes null persisted collections before screens call includes', () => {
    const hydrated = reducer(baseState, {
      type: 'hydrate',
      payload: {
        starred: null,
        bookmarks: null,
        planDone: null,
        plannerDeletedDefaults: null,
        recordedFocusSessionIds: null,
      } as unknown as Partial<State>,
    });

    expect(() => hydrated.starred.includes('resource-1')).not.toThrow();
    expect(() => hydrated.bookmarks.includes('question-1')).not.toThrow();
    expect(hydrated.starred).toEqual([]);
    expect(hydrated.bookmarks).toEqual([]);
    expect(hydrated.planDone).toEqual({});
    expect(hydrated.plannerDeletedDefaults).toEqual([]);
    expect(hydrated.recordedFocusSessionIds).toEqual([]);
  });

  it('uses the same local calendar date as statistics for focus crediting', () => {
    const date = new Date(2026, 10, 24, 0, 30);

    expect(dayKey(date)).toBe(localDateKey(date));
  });

  it('creates and edits a note by stable ID without duplicating it', () => {
    const note = { id: 'note-1', title: 'Polity', body: 'Article 32', folder: 'Revision', tags: [], exam: 'upsc' as const, subject: 'Polity', updatedAt: 1 };
    const created = reducer(baseState, { type: 'saveNote', note });
    const edited = reducer(created, { type: 'saveNote', note: { ...note, title: 'Polity updated', updatedAt: 2 } });

    expect(edited.notes).toHaveLength(1);
    expect(edited.notes[0]).toMatchObject({ id: 'note-1', title: 'Polity updated' });
  });

  it('completes and reopens a planner item idempotently', () => {
    const date = '2026-11-24';
    const completed = reducer(baseState, { type: 'recoveryPlan', id: 'task-1', date, completed: true });
    const repeated = reducer(completed, { type: 'recoveryPlan', id: 'task-1', date, completed: true });
    const reopened = reducer(repeated, { type: 'recoveryPlan', id: 'task-1', date, completed: false });

    expect(repeated.planDone[date]).toEqual(['task-1']);
    expect(reopened.planDone[date]).toEqual([]);
  });

  it('records focus time for both a planner task and its schedule occurrence', () => {
    const occurrenceId = 'schedule-1::2026-11-24';
    const next = reducer(
      {
        ...baseState,
        plannerTaskStudySeconds: {},
        plannerScheduleCompletions: {},
        recordedFocusSessionIds: [],
        studyLog: {},
      } as State,
      {
        type: 'recordFocusStudy',
        id: 'focus-1',
        date: '2026-11-24',
        taskId: 'schedule-1',
        seconds: 1800,
        scheduleOccurrenceId: occurrenceId,
        schedulePlannedSeconds: 1800,
      },
    );

    expect(next.plannerTaskStudySeconds).toEqual({
      'schedule-1': 1800,
      [occurrenceId]: 1800,
    });
    expect(next.plannerScheduleCompletions[occurrenceId]).toBe('2026-11-24');
  });

  it('clears the previous account when session verification fails', () => {
    const next = reducer(
      {
        ...baseState,
        hydrated: true,
        storageReady: true,
        authReady: true,
      } as State,
      { type: 'authCheckFailed' },
    );

    expect(next.user).toBeNull();
    expect(next.authReady).toBe(true);
    expect(next.hydrated).toBe(false);
    expect(next.storageReady).toBe(false);
  });

  it('keeps the authenticated account during a transient auth/network failure', () => {
    const state = {
      ...baseState,
      hydrated: true,
      storageReady: true,
      authReady: true,
      authStatus: 'authenticated',
    } as State;
    const next = reducer(state, { type: 'authTransientFailure', status: 'network_unavailable' });

    expect(next.user?.id).toBe('user-1');
    expect(next.hydrated).toBe(true);
    expect(next.storageReady).toBe(true);
    expect(next.authReady).toBe(true);
    expect(next.authStatus).toBe('network_unavailable');
  });

  it('distinguishes retryable network errors from revoked sessions', () => {
    expect(classifyAuthFailure(new Error('Failed to fetch'))).toBe('network_unavailable');
    expect(classifyAuthFailure({ status: 401, message: 'Invalid refresh token' })).toBe('token_refresh_failed');
  });
});
