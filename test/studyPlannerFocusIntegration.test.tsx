import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getPlannerScheduleOccurrence } from '../lib/planner';
import type { State } from '../lib/store';

const mockStorage = new Map<string, string>();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockAuthListeners = new Set<(event: string, session: { access_token: string } | null) => void>();
let mockCurrentSession: { access_token: string } | null = { access_token: 'user-token' };

const mockUser = {
  id: 'planner-user-1',
  email: 'aspirant@example.test',
  created_at: '2026-01-01T00:00:00.000Z',
  user_metadata: { display_name: 'Aspirant', exam_id: 'upsc' },
};

const mockSupabase = {
  auth: {
    getSession: jest.fn(async () => ({ data: { session: mockCurrentSession }, error: null })),
    getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })),
    onAuthStateChange: jest.fn((listener: (event: string, session: { access_token: string } | null) => void) => {
      mockAuthListeners.add(listener);
      return { data: { subscription: { unsubscribe: () => mockAuthListeners.delete(listener) } } };
    }),
    signOut: jest.fn(async () => ({ error: null })),
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
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
    getAllKeys: jest.fn(async () => [...mockStorage.keys()]),
  },
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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, setParams: mockSetParams }),
}));

jest.mock('../lib/theme', () => ({
  useTheme: () => ({ scheme: 'light' }),
}));

jest.mock('../components/Shell', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    Shell: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('../components/FocusSessionSetupModal', () => ({
  FocusSessionSetupModal: () => null,
}));

jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: View,
    Path: View,
    Circle: View,
    Rect: View,
    Ellipse: View,
  };
});

const { StoreProvider, getUserScopedStorageKey, reducer, useStore } = require('../lib/store') as typeof import('../lib/store');
const StudyPlannerScreen = require('../screens/StudyPlannerScreen').default as typeof import('../screens/StudyPlannerScreen').default;

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

describe('Study Planner real task data & focus integration', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockAuthListeners.clear();
    mockCurrentSession = { access_token: 'user-token' };
    jest.clearAllMocks();
  });

  it('keeps an empty planner genuinely empty across restarts without inserting demo tasks', async () => {
    const firstMount = render(
      <StoreProvider>
        <StudyPlannerScreen />
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(firstMount.queryByText('Solve Calculus Integration Worksheet')).toBeNull();
      expect(firstMount.queryByText('Physics Mechanics Lecture')).toBeNull();
      expect(firstMount.queryByText('Peer Math Study Circle')).toBeNull();
    });

    const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
    await waitFor(() => {
      const saved = JSON.parse(mockStorage.get(storageKey) ?? '{}');
      expect(saved.plannerScheduleItems).toEqual([]);
    });

    firstMount.unmount();

    const restartedMount = render(
      <StoreProvider>
        <StudyPlannerScreen />
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(restartedMount.queryByText('Solve Calculus Integration Worksheet')).toBeNull();
      expect(restartedMount.queryByText('Peer Math Study Circle')).toBeNull();
    });
    restartedMount.unmount();
  });

  it('does not recreate deleted tasks after app restart', async () => {
    const today = localToday();
    const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
    mockStorage.set(storageKey, JSON.stringify({
      plannerScheduleItems: [
        {
          id: 'seed_1',
          category: 'Tasks',
          title: 'Old Demo Task',
          date: today,
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          durationLabel: '60 min',
        },
      ],
    }));

    const view = render(
      <StoreProvider>
        <StudyPlannerScreen />
      </StoreProvider>,
    );

    await waitFor(() => expect(view.getByText('Old Demo Task')).toBeTruthy());
    fireEvent.press(view.getByLabelText('Delete plan'));
    fireEvent.press(view.getByText('Delete'));

    await waitFor(() => {
      expect(view.queryByText('Old Demo Task')).toBeNull();
      const saved = JSON.parse(mockStorage.get(storageKey) ?? '{}');
      expect(saved.plannerScheduleItems).toEqual([]);
    });
    view.unmount();

    const restarted = render(
      <StoreProvider>
        <StudyPlannerScreen />
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(restarted.queryByText('Old Demo Task')).toBeNull();
      expect(restarted.queryByText('Solve Calculus Integration Worksheet')).toBeNull();
    });
    restarted.unmount();
  });

  it('displays dynamic form-entered planned duration (45 min -> 60 min) in Task Detail', async () => {
    const today = localToday();
    const view = render(
      <StoreProvider>
        <StudyPlannerScreen />
      </StoreProvider>,
    );

    await waitFor(() => expect(view.getByText('Today')).toBeTruthy());
    fireEvent.press(view.getByText('List'));
    fireEvent.press(view.getByText('Add Plan'));

    fireEvent.changeText(view.getByPlaceholderText('Task Title'), 'Current Affairs');
    fireEvent.changeText(view.getByLabelText('Planned duration minutes'), '45');
    fireEvent.press(view.getByText(/Save \(/));

    await waitFor(() => expect(view.getByText('Current Affairs')).toBeTruthy());
    fireEvent.press(view.getByText('Current Affairs'));

    expect(view.getByText('45 min')).toBeTruthy();
    expect(view.getByText('0m focused / 45m planned · 0%')).toBeTruthy();

    fireEvent.press(view.getByText('Edit Plan'));
    fireEvent.changeText(view.getByLabelText('Planned duration minutes'), '60');
    fireEvent.press(view.getByText('Update Task'));

    await waitFor(() => expect(view.getByText('Current Affairs')).toBeTruthy());
    fireEvent.press(view.getByText('Current Affairs'));
    expect(view.getByText('60 min')).toBeTruthy();
    expect(view.getByText('0m focused / 60m planned · 0%')).toBeTruthy();

    const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
    const saved = JSON.parse(mockStorage.get(storageKey) ?? '{}');
    expect(saved.plannerScheduleItems[0]).toMatchObject({
      title: 'Current Affairs',
      date: today,
      durationMinutes: 60,
      durationLabel: '60 min',
    });
    view.unmount();
  });

  it('aggregates multiple eligible focus sessions, excludes meditation/breaks/interrupted/duplicates, and handles >100% and 0m', () => {
    const today = localToday();
    const taskId = 'task-ca-1';
    const occurrenceId = `${taskId}::${today}`;
    const item = {
      id: taskId,
      category: 'Tasks' as const,
      title: 'Current Affairs',
      subject: 'General Studies',
      taskType: 'Reading',
      date: today,
      durationMinutes: 60,
      durationLabel: '60 min',
    };

    const baseState = {
      plannerScheduleItems: [item],
      plannerScheduleCompletions: {},
      plannerTaskStudySeconds: {},
      recordedFocusSessionIds: [],
      focusHistory: [],
      studyLog: {},
    } as unknown as State;

    // 4 eligible sessions: 20m + 15m + 10m + 15m = 60m
    // Plus 1 duplicate of s1, 1 interrupted, 1 break, 1 meditation, 1 ambient, 1 other task
    let next = baseState;
    const records = [
      { id: 's1', sessionId: 's1', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T09:20:00.000Z`, focusedSeconds: 20 * 60, actualSeconds: 20 * 60, status: 'saved_early' as const, sessionType: 'study' as const },
      { id: 's1', sessionId: 's1', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T09:20:00.000Z`, focusedSeconds: 20 * 60, actualSeconds: 20 * 60, status: 'saved_early' as const, sessionType: 'study' as const },
      { id: 's2', sessionId: 's2', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T10:15:00.000Z`, focusedSeconds: 15 * 60, actualSeconds: 15 * 60, status: 'saved_early' as const, sessionType: 'study' as const },
      { id: 's3', sessionId: 's3', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T11:10:00.000Z`, focusedSeconds: 10 * 60, actualSeconds: 10 * 60, status: 'saved_early' as const, sessionType: 'study' as const },
      { id: 's4', sessionId: 's4', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T12:15:00.000Z`, focusedSeconds: 15 * 60, actualSeconds: 15 * 60, status: 'completed' as const, sessionType: 'study' as const },
      { id: 's-int', sessionId: 's-int', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T13:00:00.000Z`, focusedSeconds: 10 * 60, actualSeconds: 10 * 60, status: 'interrupted' as const, sessionType: 'study' as const },
      { id: 's-brk', sessionId: 's-brk', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T13:05:00.000Z`, focusedSeconds: 5 * 60, actualSeconds: 5 * 60, status: 'completed' as const, sessionType: 'break' as const },
      { id: 's-med', sessionId: 's-med', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T13:20:00.000Z`, focusedSeconds: 10 * 60, actualSeconds: 10 * 60, status: 'completed' as const, sessionType: 'meditation' as const },
      { id: 's-amb', sessionId: 's-amb', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T13:30:00.000Z`, focusedSeconds: 10 * 60, actualSeconds: 10 * 60, status: 'completed' as const, sessionType: 'ambient' as const },
      { id: 's-other', sessionId: 's-other', taskId: 'other-task', scheduleId: 'other-task', date: today, completedAt: `${today}T14:00:00.000Z`, focusedSeconds: 30 * 60, actualSeconds: 30 * 60, status: 'completed' as const, sessionType: 'study' as const },
    ];

    for (const record of records) {
      next = reducer(next, { type: 'upsertFocusHistory', record });
      next = reducer(next, {
        type: 'recordFocusStudy',
        id: record.sessionId,
        date: today,
        taskId: record.taskId,
        seconds: record.focusedSeconds,
        scheduleOccurrenceId: record.scheduleOccurrenceId,
        schedulePlannedSeconds: 3600,
        status: record.status,
        sessionType: record.sessionType,
      });
    }

    const occ = getPlannerScheduleOccurrence(next, item, today, today);
    expect(occ.actualSeconds).toBe(3600);
    expect(occ.plannedSeconds).toBe(3600);
    expect(occ.progressPercent).toBe(100);
    expect(occ.status).toBe('completed');

    // Exceeding planned time: actualSeconds stays uncapped while progressPercent caps at 100
    next = reducer(next, {
      type: 'upsertFocusHistory',
      record: {
        id: 's5',
        sessionId: 's5',
        taskId,
        scheduleId: taskId,
        scheduleOccurrenceId: occurrenceId,
        date: today,
        completedAt: `${today}T15:00:00.000Z`,
        focusedSeconds: 20 * 60,
        actualSeconds: 20 * 60,
        status: 'completed',
        sessionType: 'study',
      },
    });
    const overTarget = getPlannerScheduleOccurrence(next, item, today, today);
    expect(overTarget.actualSeconds).toBe(4800);
    expect(overTarget.progressPercent).toBe(100);

    // Zero planned duration must not divide by zero
    const zeroItem = { ...item, id: 'zero-task', durationMinutes: 0 };
    const zeroOcc = getPlannerScheduleOccurrence(next, zeroItem, today, today);
    expect(zeroOcc.plannedSeconds).toBe(0);
    expect(zeroOcc.progressPercent).toBe(0);
    expect(Number.isFinite(zeroOcc.progressPercent)).toBe(true);
  });

  it('displays aggregated focus progress in Task Detail and survives restart', async () => {
    const today = localToday();
    const taskId = 'task-gs-1';
    const occurrenceId = `${taskId}::${today}`;
    const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
    mockStorage.set(storageKey, JSON.stringify({
      plannerScheduleItems: [
        {
          id: taskId,
          category: 'Tasks',
          title: 'Current Affairs',
          subject: 'General Studies',
          taskType: 'Reading',
          date: today,
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          durationLabel: '60 min',
        },
      ],
      focusHistory: [
        { id: 'f1', sessionId: 'f1', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T09:20:00.000Z`, focusedSeconds: 20 * 60, actualSeconds: 20 * 60, status: 'saved_early', sessionType: 'study' },
        { id: 'f2', sessionId: 'f2', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T10:25:00.000Z`, focusedSeconds: 25 * 60, actualSeconds: 25 * 60, status: 'saved_early', sessionType: 'study' },
        { id: 'f-med', sessionId: 'f-med', taskId, scheduleId: taskId, scheduleOccurrenceId: occurrenceId, date: today, completedAt: `${today}T11:00:00.000Z`, focusedSeconds: 15 * 60, actualSeconds: 15 * 60, status: 'completed', sessionType: 'meditation' },
      ],
    }));

    const view = render(
      <StoreProvider>
        <StudyPlannerScreen />
      </StoreProvider>,
    );

    await waitFor(() => expect(view.getByText('Current Affairs')).toBeTruthy());
    fireEvent.press(view.getByText('Current Affairs'));

    expect(view.getByText('60 min')).toBeTruthy();
    expect(view.getByText('45m')).toBeTruthy();
    expect(view.getAllByText('45m focused / 60m planned · 75%').length).toBeGreaterThan(0);
    expect(view.getAllByText('75%').length).toBeGreaterThan(0);
    expect(view.getByText('Continue')).toBeTruthy();
    view.unmount();

    const restarted = render(
      <StoreProvider>
        <StudyPlannerScreen />
      </StoreProvider>,
    );
    await waitFor(() => expect(restarted.getByText('Current Affairs')).toBeTruthy());
    fireEvent.press(restarted.getByText('Current Affairs'));
    expect(restarted.getAllByText('45m focused / 60m planned · 75%').length).toBeGreaterThan(0);
    restarted.unmount();
  });
});
