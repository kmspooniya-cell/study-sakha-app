import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStorage = new Map<string, string>();
const mockAuthListeners = new Set<(event: string, session: MockSession | null) => void>();
let mockCurrentSession: MockSession | null = null;

type MockSession = { access_token: string };
type MockUser = {
  id: string;
  email: string;
  created_at: string;
  user_metadata: { display_name: string; exam_id: 'upsc' };
};

const users: Record<string, MockUser> = {
  A: {
    id: 'user-a',
    email: 'a@example.test',
    created_at: '2026-01-01T00:00:00.000Z',
    user_metadata: { display_name: 'User A', exam_id: 'upsc' },
  },
  B: {
    id: 'user-b',
    email: 'b@example.test',
    created_at: '2026-01-02T00:00:00.000Z',
    user_metadata: { display_name: 'User B', exam_id: 'upsc' },
  },
};

const mockSupabase = {
  auth: {
    getSession: jest.fn(async () => ({ data: { session: mockCurrentSession }, error: null })),
    getUser: jest.fn(async (accessToken?: string) => ({
      data: { user: accessToken ? users[accessToken] : users.A },
      error: null,
    })),
    onAuthStateChange: jest.fn((listener: (event: string, session: MockSession | null) => void) => {
      mockAuthListeners.add(listener);
      return { data: { subscription: { unsubscribe: () => mockAuthListeners.delete(listener) } } };
    }),
    signOut: jest.fn(async () => {
      mockCurrentSession = null;
      for (const listener of mockAuthListeners) listener('SIGNED_OUT', null);
      return { error: null };
    }),
  },
  from: jest.fn(() => {
    const query = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      order: jest.fn(async () => ({ data: [], error: null })),
      maybeSingle: jest.fn(async () => ({ data: null, error: null })),
    };
    return query;
  }),
  rpc: jest.fn(async () => ({ data: false, error: null })),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
  getAllKeys: jest.fn(async () => [...mockStorage.keys()]),
}));

jest.mock('../lib/supabase', () => ({
  STUDENT_CONTENT_BUCKET: 'Student-content',
  supabase: mockSupabase,
  supabaseConfigured: true,
}));

const { StoreProvider, getUserScopedStorageKey, useStore } = require('../lib/store') as typeof import('../lib/store');

const userANote = {
  id: 'note-a', title: 'A private note', folder: 'My Revision', tags: [], body: 'A', exam: 'upsc' as const, subject: 'Polity', updatedAt: 1,
};
const userATask = {
  id: 'task-a', label: 'A private task', minutes: 30, category: 'Polity', completed: false, completedOn: null,
  targetDate: '2026-11-03', taskType: 'Study' as const, priority: 'High' as const, scope: 'daily' as const, periodKey: '2026-11-03',
};
const userAScheduleItem = {
  id: 'schedule-a', category: 'Classes' as const, title: 'A private class', date: '2026-11-03',
  startTime: '09:00', endTime: '10:00', occurs: 'Repeating' as const, days: ['Mon', 'Wed'],
};
const userAResult = {
  id: 'result-a', testId: 'test-a', title: 'A private result', exam: 'upsc' as const, takenAt: 1, score: 1, maxScore: 1,
  correct: 1, wrong: 0, skipped: 0, accuracy: 100, percentile: 0, rank: 0, totalAspirants: 0, comparisonStatus: 'unavailable' as const,
  timeTakenSec: 10, bySubject: [{ subject: 'Polity', correct: 1, total: 1 }], answers: { q1: 0 },
};
const legacyNote = { ...userANote, id: 'legacy-note', title: 'Legacy note' };
const legacyTask = { ...userATask, id: 'legacy-task', label: 'Legacy task' };
const legacyResult = { ...userAResult, id: 'legacy-result', title: 'Legacy result' };

function Harness() {
  const { state, hydrationError, plannerRecoveryCount, plannerRecoveryIssues, retryPlannerRecovery, dispatch, importLegacyData, legacyMigrationAvailable, signOut } = useStore();
  const snapshot = JSON.stringify({
    userId: state.user?.id ?? null,
    themeMode: state.settings.themeMode,
    hydrated: state.hydrated && state.storageReady,
    hydrationError,
    plannerRecoveryCount,
    plannerRecoveryIssues,
    noteIds: state.notes.map((note) => note.id),
    taskIds: state.plannerTasks.map((task) => task.id),
    scheduleItemIds: state.plannerScheduleItems.map((item) => item.id),
    scheduleSummary: state.plannerScheduleItems.map(({ id, category, date, startTime, endTime }) => ({ id, category, date, startTime, endTime })),
    resultIds: state.results.map((result) => result.id),
    legacyMigrationAvailable,
  });

  return <>
    <Text testID="snapshot">{snapshot}</Text>
    <Pressable testID="seed-user-a" onPress={() => {
      dispatch({ type: 'saveNote', note: userANote });
      dispatch({ type: 'savePlannerTasks', tasks: [userATask] });
      dispatch({ type: 'addPlannerScheduleItem', item: userAScheduleItem });
      dispatch({ type: 'result', result: userAResult });
    }}><Text>seed</Text></Pressable>
    <Pressable testID="set-light-theme" onPress={() => dispatch({ type: 'settings', patch: { themeMode: 'light' } })}><Text>light</Text></Pressable>
    <Pressable testID="import-legacy" onPress={() => void importLegacyData()}><Text>import</Text></Pressable>
    <Pressable testID="sign-out" onPress={() => void signOut()}><Text>sign out</Text></Pressable>
    <Pressable testID="retry-planner-recovery" onPress={retryPlannerRecovery}><Text>retry recovery</Text></Pressable>
  </>;
}

function readSnapshot(getByTestId: ReturnType<typeof render>['getByTestId']) {
  return JSON.parse(getByTestId('snapshot').props.children as string) as {
    userId: string | null;
    themeMode: 'light' | 'dark' | 'system';
    hydrated: boolean;
    hydrationError: string | null;
    plannerRecoveryCount: number;
    plannerRecoveryIssues: string[];
    noteIds: string[];
    taskIds: string[];
    scheduleItemIds: string[];
    scheduleSummary: { id: string; category: string; date?: string; startTime?: string; endTime?: string }[];
    resultIds: string[];
    legacyMigrationAvailable: boolean;
  };
}

async function switchTo(userKey: keyof typeof users) {
  mockCurrentSession = { access_token: userKey };
  await act(async () => {
    for (const listener of mockAuthListeners) listener('SIGNED_IN', mockCurrentSession);
  });
}

describe('StoreProvider account-scoped persistence', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockAuthListeners.clear();
    mockCurrentSession = { access_token: 'A' };
    jest.clearAllMocks();
  });

  it('isolates accounts, restores each account, and imports legacy data only after consent', async () => {
    const view = render(<StoreProvider><Harness /></StoreProvider>);

    await waitFor(() => expect(readSnapshot(view.getByTestId).userId).toBe('user-a'));
    await waitFor(() => expect(readSnapshot(view.getByTestId).hydrated).toBe(true));

    fireEvent.press(view.getByTestId('seed-user-a'));
    const userAKey = getUserScopedStorageKey('sakha-store-v1', 'user-a');
    await waitFor(() => {
      const saved = JSON.parse(mockStorage.get(userAKey) ?? '{}');
      expect(saved.notes.some((note: { id: string }) => note.id === userANote.id)).toBe(true);
      expect(saved.plannerTasks.some((task: { id: string }) => task.id === userATask.id)).toBe(true);
      expect(saved.plannerScheduleItems.some((item: { id: string }) => item.id === userAScheduleItem.id)).toBe(true);
      expect(saved.results.some((result: { id: string }) => result.id === userAResult.id)).toBe(true);
    });

    await act(async () => fireEvent.press(view.getByTestId('sign-out')));
    await waitFor(() => expect(readSnapshot(view.getByTestId).userId).toBe(null));

    mockStorage.set('sakha-store-v1', JSON.stringify({ notes: [legacyNote], plannerTasks: [legacyTask], results: [legacyResult] }));
    await switchTo('B');
    await waitFor(() => expect(readSnapshot(view.getByTestId).userId).toBe('user-b'));
    await waitFor(() => expect(readSnapshot(view.getByTestId).hydrated).toBe(true));

    let snapshot = readSnapshot(view.getByTestId);
    expect(snapshot.noteIds).not.toContain(userANote.id);
    expect(snapshot.taskIds).not.toContain(userATask.id);
    expect(snapshot.scheduleItemIds).not.toContain(userAScheduleItem.id);
    expect(snapshot.resultIds).not.toContain(userAResult.id);
    expect(snapshot.noteIds).not.toContain(legacyNote.id);
    expect(snapshot.taskIds).not.toContain(legacyTask.id);
    expect(snapshot.resultIds).not.toContain(legacyResult.id);
    await waitFor(() => expect(readSnapshot(view.getByTestId).legacyMigrationAvailable).toBe(true));

    fireEvent.press(view.getByTestId('import-legacy'));
    await waitFor(() => {
      snapshot = readSnapshot(view.getByTestId);
      expect(snapshot.noteIds).toContain(legacyNote.id);
      expect(snapshot.taskIds).toContain(legacyTask.id);
      expect(snapshot.resultIds).toContain(legacyResult.id);
    });

    await switchTo('A');
    await waitFor(() => expect(readSnapshot(view.getByTestId).userId).toBe('user-a'));
    await waitFor(() => expect(readSnapshot(view.getByTestId).hydrated).toBe(true));
    snapshot = readSnapshot(view.getByTestId);
    expect(snapshot.noteIds).toContain(userANote.id);
    expect(snapshot.taskIds).toContain(userATask.id);
    expect(snapshot.scheduleItemIds).toContain(userAScheduleItem.id);
    expect(snapshot.resultIds).toContain(userAResult.id);
    expect(snapshot.noteIds).not.toContain(legacyNote.id);
    expect(snapshot.taskIds).not.toContain(legacyTask.id);
    expect(snapshot.resultIds).not.toContain(legacyResult.id);
  });

  it('persists a manually selected light theme across a provider restart', async () => {
    const view = render(<StoreProvider><Harness /></StoreProvider>);
    await waitFor(() => expect(readSnapshot(view.getByTestId).hydrated).toBe(true));

    fireEvent.press(view.getByTestId('set-light-theme'));
    const themeKey = getUserScopedStorageKey('sakha-theme-mode-v1', 'user-a');
    await waitFor(() => expect(mockStorage.get(themeKey)).toBe('light'));

    view.unmount();
    const restarted = render(<StoreProvider><Harness /></StoreProvider>);
    await waitFor(() => {
      expect(readSnapshot(restarted.getByTestId).hydrated).toBe(true);
      expect(readSnapshot(restarted.getByTestId).themeMode).toBe('light');
    });
  });

  it('recovers valid schedule siblings and quarantines malformed records idempotently', async () => {
    const storageKey = getUserScopedStorageKey('sakha-store-v1', 'user-a');
    const saved = JSON.stringify({ plannerScheduleItems: [
      { ...userAScheduleItem },
      { id: 'legacy-item', category: 'Class', title: 'Legacy Class', date: '2026-11-04T00:00:00.000Z', startTime: '9:30 AM', endTime: '10:30 AM' },
      { id: 'bad-item', category: 'Unknown', title: 'Invalid category' },
      { ...userAScheduleItem, id: 'bad-date', date: '2026-02-31' },
      { ...userAScheduleItem, title: 'Conflicting duplicate ID' },
    ] });
    mockStorage.set(storageKey, saved);

    const view = render(<StoreProvider><Harness /></StoreProvider>);
    await waitFor(() => {
      const snapshot = readSnapshot(view.getByTestId);
      expect(snapshot.userId).toBe('user-a');
      expect(snapshot.hydrated).toBe(true);
      expect(snapshot.hydrationError).toBeNull();
      expect(snapshot.scheduleItemIds).toEqual([userAScheduleItem.id, 'legacy-item']);
      expect(snapshot.scheduleSummary[1]).toMatchObject({ id: 'legacy-item', category: 'Classes', date: '2026-11-04', startTime: '09:30', endTime: '10:30' });
      expect(snapshot.plannerRecoveryCount).toBe(3);
      expect(snapshot.plannerRecoveryIssues[0]).toContain('category');
      expect(snapshot.plannerRecoveryIssues[1]).toContain('date');
      expect(snapshot.plannerRecoveryIssues[2]).toContain('conflicts');
    });

    const quarantineKey = getUserScopedStorageKey('sakha-planner-quarantine-v2', 'user-a');
    const archived = JSON.parse(mockStorage.get(quarantineKey) ?? '[]');
    expect(archived).toHaveLength(3);
    expect(archived[0].record).toMatchObject({ id: 'bad-item', category: 'Unknown' });
    expect(archived[0].reason).toContain('category');
    expect(archived[1].reason).toContain('date');
    await act(async () => fireEvent.press(view.getByTestId('retry-planner-recovery')));
    await waitFor(() => expect(readSnapshot(view.getByTestId).hydrated).toBe(true));
    expect(JSON.parse(mockStorage.get(quarantineKey) ?? '[]')).toHaveLength(3);
    await waitFor(() => expect(JSON.parse(mockStorage.get(storageKey) ?? '{}').plannerDataVersion).toBe(2));
  });
});
