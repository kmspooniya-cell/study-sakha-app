import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  buildPlannerRecoveryEntry,
  describePlannerRecoveryIssue,
  migratePlannerScheduleItem,
  normalizePlannerTime,
  plannerScheduleIssue,
  stripInvalidTimeFromRecord,
} from '../lib/plannerSchedule';

const mockStorage = new Map<string, string>();
const mockAuthListeners = new Set<(event: string, session: MockSession | null) => void>();
let mockCurrentSession: MockSession | null = null;

type MockSession = { access_token: string };

const mockUser = {
  id: 'user-planner-1',
  email: 'aspirant@example.test',
  created_at: '2026-01-01T00:00:00.000Z',
  user_metadata: { display_name: 'Aspirant', exam_id: 'upsc' },
};

const mockSupabase = {
  auth: {
    getSession: jest.fn(async () => ({ data: { session: mockCurrentSession }, error: null })),
    getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })),
    onAuthStateChange: jest.fn((listener: (event: string, session: MockSession | null) => void) => {
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

jest.mock('../lib/ssds', () => require('./ssdsScreenMocks'));
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
  useNavigation: () => ({ navigate: jest.fn() }),
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
const { planToScheduleItem } = require('../screens/StudyPlannerScreen') as typeof import('../screens/StudyPlannerScreen');

function RecoveryHarness() {
  const {
    state,
    plannerRecoveryCount,
    plannerRecoveredCount,
    plannerRecoveryIssues,
    plannerRecoveryEntries,
    retryPlannerRecovery,
    resolvePlannerRecoveryEntry,
  } = useStore();

  const snapshot = JSON.stringify({
    hydrated: state.hydrated && state.storageReady,
    items: state.plannerScheduleItems,
    plannerRecoveryCount,
    plannerRecoveredCount,
    plannerRecoveryIssues,
    plannerRecoveryEntries,
  });

  return (
    <>
      <Text testID="recovery-snapshot">{snapshot}</Text>
      <Pressable testID="retry-recovery" onPress={retryPlannerRecovery}>
        <Text>Retry</Text>
      </Pressable>
      <Pressable
        testID="restore-first-cleared"
        onPress={() => {
          const first = plannerRecoveryEntries[0];
          if (!first) return;
          const patched = stripInvalidTimeFromRecord(
            first.record,
            first.fieldHint === 'endTime' ? 'endTime' : 'time',
          );
          if (patched) {
            void resolvePlannerRecoveryEntry(first.fingerprint, patched);
          }
        }}
      >
        <Text>Restore first</Text>
      </Pressable>
    </>
  );
}

function readRecoverySnapshot(getByTestId: ReturnType<typeof render>['getByTestId']) {
  return JSON.parse(getByTestId('recovery-snapshot').props.children as string) as {
    hydrated: boolean;
    items: import('../lib/plannerSchedule').PlannerScheduleItem[];
    plannerRecoveryCount: number;
    plannerRecoveredCount: number;
    plannerRecoveryIssues: string[];
    plannerRecoveryEntries: import('../lib/plannerSchedule').PlannerRecoveryEntry[];
  };
}

describe('Planner schedule normalization & lossless recovery', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockAuthListeners.clear();
    mockCurrentSession = { access_token: 'A' };
    jest.clearAllMocks();
  });

  describe('normalizePlannerTime', () => {
    it('accepts canonical HH:mm values unchanged', () => {
      expect(normalizePlannerTime('00:00')).toEqual({ ok: true, value: '00:00' });
      expect(normalizePlannerTime('09:30')).toEqual({ ok: true, value: '09:30' });
      expect(normalizePlannerTime('23:59')).toEqual({ ok: true, value: '23:59' });
    });

    it('normalizes unambiguous 12-hour and single-digit 24-hour legacy times to HH:mm', () => {
      expect(normalizePlannerTime('9:30 AM')).toEqual({ ok: true, value: '09:30' });
      expect(normalizePlannerTime('12:00 PM')).toEqual({ ok: true, value: '12:00' });
      expect(normalizePlannerTime('12:15 AM')).toEqual({ ok: true, value: '00:15' });
      expect(normalizePlannerTime('1:05 pm')).toEqual({ ok: true, value: '13:05' });
      expect(normalizePlannerTime('9:30 p.m.')).toEqual({ ok: true, value: '21:30' });
      expect(normalizePlannerTime('9 AM')).toEqual({ ok: true, value: '09:00' });
      expect(normalizePlannerTime('9:00')).toEqual({ ok: true, value: '09:00' });
      expect(normalizePlannerTime('0:45')).toEqual({ ok: true, value: '00:45' });
      expect(normalizePlannerTime('17:00:00')).toEqual({ ok: true, value: '17:00' });
      expect(normalizePlannerTime('09:30:00 PM')).toEqual({ ok: true, value: '21:30' });
    });

    it('treats undefined, null, and empty/whitespace strings as absent optional times', () => {
      expect(normalizePlannerTime(undefined)).toEqual({ ok: true, value: undefined });
      expect(normalizePlannerTime(null)).toEqual({ ok: true, value: undefined });
      expect(normalizePlannerTime('')).toEqual({ ok: true, value: undefined });
      expect(normalizePlannerTime('   ')).toEqual({ ok: true, value: undefined });
    });

    it('rejects invalid hours, invalid minutes, ambiguous fragments, and wrong JS types', () => {
      for (const bad of ['24:00', '25:10', '09:60', '13:00 PM', '0:30 AM', '09:5', '9', 'morning', '09:', ':30']) {
        expect(normalizePlannerTime(bad).ok).toBe(false);
      }
      expect(normalizePlannerTime(930).ok).toBe(false);
      expect(normalizePlannerTime({}).ok).toBe(false);
    });
  });

  describe('migratePlannerScheduleItem & schema handling', () => {
    it('preserves existing valid planner records untouched', () => {
      const valid = {
        id: 'valid-1',
        category: 'Classes' as const,
        title: 'Polity Lecture',
        date: '2026-11-26',
        startTime: '09:00',
        endTime: '10:30',
        occurs: 'Weekly' === 'Weekly' ? ('Repeating' as const) : ('Once' as const),
        repeatDays: [1, 3, 5],
        notes: 'Bring notes',
      };
      expect(migratePlannerScheduleItem(valid)).toEqual(valid);
    });

    it('recovers all 5 task types with missing optional endTime, empty strings, null optional fields, and 12h times', () => {
      const legacyTask = {
        id: 't-1',
        category: 'Task',
        title: 'Solve Polity MCQs',
        date: '2026-11-26T00:00:00.000Z',
        time: '',
        startTime: '9:30 AM',
        endTime: '',
        whereMode: '',
        endDate: '',
        fromDate: '',
        untilDate: '',
        rangeFrom: '',
        rangeUntil: '',
        repeatUntil: '',
        notes: null,
      };
      expect(migratePlannerScheduleItem(legacyTask)).toEqual({
        id: 't-1',
        category: 'Tasks',
        title: 'Solve Polity MCQs',
        date: '2026-11-26',
        startTime: '09:30',
      });

      const legacyExam = {
        id: 'seed_3',
        category: 'Exams',
        title: 'Organic Chemistry Unit Test',
        date: '2026-11-28',
        startTime: '10:00',
        endTime: '',
        durationMinutes: 90,
        durationLabel: '90 min',
      };
      expect(migratePlannerScheduleItem(legacyExam)).toEqual({
        id: 'seed_3',
        category: 'Exams',
        title: 'Organic Chemistry Unit Test',
        date: '2026-11-28',
        startTime: '10:00',
        durationMinutes: 90,
        durationLabel: '90 min',
      });

      const legacyClass = {
        id: 'c-1',
        category: 'Class',
        title: 'Economy',
        date: '2026-11-26',
        timeSlots: [{ id: 'slot-1', days: ['Mon', 'Wed'], startTime: '2:00 PM', endTime: '3:30 PM' }],
      };
      expect(migratePlannerScheduleItem(legacyClass)).toEqual({
        id: 'c-1',
        category: 'Classes',
        title: 'Economy',
        date: '2026-11-26',
        timeSlots: [{ id: 'slot-1', days: ['Mon', 'Wed'], startTime: '14:00', endTime: '15:30' }],
      });

      const legacyVacation = {
        id: 'v-1',
        category: 'Vacation',
        title: 'Study Break',
        date: '2026-12-01',
        endDate: '2026-12-03',
        durationMinutes: null,
        startTime: null,
        endTime: null,
      };
      expect(migratePlannerScheduleItem(legacyVacation)).toEqual({
        id: 'v-1',
        category: 'Vacations',
        title: 'Study Break',
        date: '2026-12-01',
        endDate: '2026-12-03',
      });

      const legacyActivity = {
        id: 'a-1',
        category: 'Activity',
        title: 'Evening Walk',
        date: '2026-11-26',
        time: '5:15 PM',
      };
      expect(migratePlannerScheduleItem(legacyActivity)).toEqual({
        id: 'a-1',
        category: 'Activities',
        title: 'Evening Walk',
        date: '2026-11-26',
        time: '17:15',
      });
    });

    it('never invents missing times and rejects malformed values with user-friendly guidance', () => {
      const noTime = { id: 'all-day', category: 'Tasks', title: 'All day revision', date: '2026-11-26' };
      const migratedNoTime = migratePlannerScheduleItem(noTime);
      expect(migratedNoTime).toEqual(noTime);
      expect(migratedNoTime?.startTime).toBeUndefined();
      expect(migratedNoTime?.endTime).toBeUndefined();

      const badEnd = {
        id: 'bad-end',
        category: 'Tasks',
        title: 'Mock Review',
        date: '2026-11-26',
        startTime: '09:00',
        endTime: '25:99',
      };
      expect(migratePlannerScheduleItem(badEnd)).toBeNull();
      const reason = plannerScheduleIssue(badEnd);
      expect(reason).toBe('endTime is not a valid 24-hour time');
      const guidance = describePlannerRecoveryIssue(reason, badEnd);
      expect(guidance).toContain('end time');
      expect(guidance).not.toContain('24-hour time');

      const entry = buildPlannerRecoveryEntry({
        index: 0,
        reason,
        record: badEnd,
        fingerprint: JSON.stringify(badEnd),
      });
      expect(entry.canClearInvalidTime).toBe(true);
      expect(stripInvalidTimeFromRecord(badEnd, 'endTime')).toEqual({
        id: 'bad-end',
        category: 'Tasks',
        title: 'Mock Review',
        date: '2026-11-26',
        startTime: '09:00',
      });
    });

    it('normalizes canonical output in planToScheduleItem and store reducer', () => {
      const item = planToScheduleItem({
        id: 'form-1',
        category: 'exam',
        title: 'GS Paper 1',
        date: '2026-11-30',
        time: '',
        startTime: '10:00',
        endTime: '',
        durationMinutes: 120,
        duration: '120 min',
        whereMode: undefined,
      });
      expect(item).not.toHaveProperty('time');
      expect(item).not.toHaveProperty('endTime');
      expect(item).not.toHaveProperty('whereMode');
      expect(item).toMatchObject({
        id: 'form-1',
        category: 'Exams',
        title: 'GS Paper 1',
        date: '2026-11-30',
        startTime: '10:00',
      });

      const baseState = { plannerScheduleItems: [] } as unknown as import('../lib/store').State;
      const next = reducer(baseState, {
        type: 'addPlannerScheduleItem',
        item: {
          id: 'r-1',
          category: 'Tasks',
          title: 'Reducer Test',
          date: '2026-11-26',
          time: '',
          startTime: '9:15 AM',
          endTime: '10:15 AM',
        } as unknown as import('../lib/store').PlannerScheduleItem,
      });
      expect(next.plannerScheduleItems).toEqual([
        {
          id: 'r-1',
          category: 'Tasks',
          title: 'Reducer Test',
          date: '2026-11-26',
          startTime: '09:15',
          endTime: '10:15',
        },
      ]);
    });
  });

  describe('StoreProvider end-to-end recovery, idempotency, and duplicate prevention', () => {
    it('automatically recovers the 5 quarantined legacy entries (2 empty endTime exams + 3 empty time tasks) without duplicates', async () => {
      const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
      const quarantineKey = getUserScopedStorageKey('sakha-planner-quarantine-v2', mockUser.id);

      const validItems = Array.from({ length: 9 }, (_, i) => ({
        id: `valid_${i + 1}`,
        category: 'Tasks',
        title: `Valid Plan ${i + 1}`,
        date: '2026-11-26',
        startTime: '08:00',
        endTime: '09:00',
      }));
      const quarantinedRecords = [
        {
          index: 9,
          reason: 'endTime is not a valid 24-hour time',
          record: {
            id: 'seed_3',
            category: 'Exams',
            title: 'Organic Chemistry Unit Test',
            date: '2026-11-28',
            startTime: '10:00',
            endTime: '',
            durationMinutes: 90,
          },
          fingerprint: 'f10',
          archivedAt: 1,
        },
        {
          index: 10,
          reason: 'endTime is not a valid 24-hour time',
          record: {
            id: 'seed_7',
            category: 'Exams',
            title: 'English Essay Quiz',
            date: '2026-11-29',
            startTime: '14:00',
            endTime: '',
            durationMinutes: 45,
          },
          fingerprint: 'f11',
          archivedAt: 1,
        },
        {
          index: 11,
          reason: 'time is not a valid 24-hour time',
          record: {
            id: 'user_task_1',
            category: 'Tasks',
            title: 'Polity Revision',
            date: '2026-11-26',
            time: '',
            startTime: '17:00',
            endTime: '18:30',
            endDate: '',
            whereMode: '',
          },
          fingerprint: 'f12',
          archivedAt: 1,
        },
        {
          index: 12,
          reason: 'time is not a valid 24-hour time',
          record: {
            id: 'user_task_2',
            category: 'Classes',
            title: 'Economy Class',
            date: '2026-11-27',
            time: '',
            startTime: '9:30 AM',
            endTime: '11:00 AM',
            rangeFrom: '',
            rangeUntil: '',
          },
          fingerprint: 'f13',
          archivedAt: 1,
        },
        {
          index: 13,
          reason: 'time is not a valid 24-hour time',
          record: {
            id: 'user_task_3',
            category: 'Activities',
            title: 'Evening Run',
            date: '2026-11-27',
            time: '',
            startTime: '18:00',
            endTime: '19:00',
            whereMode: '',
          },
          fingerprint: 'f14',
          archivedAt: 1,
        },
      ];

      mockStorage.set(storageKey, JSON.stringify({ plannerScheduleItems: validItems }));
      mockStorage.set(quarantineKey, JSON.stringify(quarantinedRecords));

      const view = render(
        <StoreProvider>
          <RecoveryHarness />
        </StoreProvider>,
      );

      await waitFor(() => {
        const snapshot = readRecoverySnapshot(view.getByTestId);
        expect(snapshot.hydrated).toBe(true);
        expect(snapshot.plannerRecoveryCount).toBe(0);
        expect(snapshot.plannerRecoveredCount).toBe(5);
        expect(snapshot.items).toHaveLength(14);
        expect(snapshot.items.find((item) => item.id === 'user_task_2')).toMatchObject({
          startTime: '09:30',
          endTime: '11:00',
        });
      });

      await waitFor(() => {
        expect(JSON.parse(mockStorage.get(quarantineKey) ?? '[]')).toHaveLength(0);
        const saved = JSON.parse(mockStorage.get(storageKey) ?? '{}');
        expect(saved.plannerScheduleItems).toHaveLength(14);
      });

      // Repeated recovery attempts do not create duplicates.
      await act(async () => fireEvent.press(view.getByTestId('retry-recovery')));
      await waitFor(() => {
        const snapshot = readRecoverySnapshot(view.getByTestId);
        expect(snapshot.hydrated).toBe(true);
        expect(snapshot.items).toHaveLength(14);
      });
    });

    it('recovers mixed valid/recoverable and unrecoverable entries, preserves originals, and allows safe manual restoration', async () => {
      const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
      const quarantineKey = getUserScopedStorageKey('sakha-planner-quarantine-v2', mockUser.id);

      const unrecoverableRecord = {
        id: 'broken-time',
        category: 'Tasks',
        title: 'Corrupted End Time Task',
        date: '2026-11-26',
        startTime: '09:00',
        endTime: '27:99',
      };

      mockStorage.set(storageKey, JSON.stringify({
        plannerScheduleItems: [
          { id: 'v1', category: 'Tasks', title: 'Valid Task', date: '2026-11-26', startTime: '08:00', endTime: '09:00' },
          unrecoverableRecord,
        ],
      }));
      mockStorage.set(quarantineKey, JSON.stringify([
        {
          index: 5,
          reason: 'time is not a valid 24-hour time',
          record: {
            id: 'legacy-12h',
            category: 'Task',
            title: 'Legacy Morning Task',
            date: '2026-11-26',
            time: '',
            startTime: '7:30 AM',
          },
          fingerprint: 'legacy-fp',
          archivedAt: 1,
        },
      ]));

      const view = render(
        <StoreProvider>
          <RecoveryHarness />
        </StoreProvider>,
      );

      await waitFor(() => {
        const snapshot = readRecoverySnapshot(view.getByTestId);
        expect(snapshot.hydrated).toBe(true);
        expect(snapshot.plannerRecoveredCount).toBe(1);
        expect(snapshot.plannerRecoveryCount).toBe(1);
        expect(snapshot.items.map((item) => item.id)).toEqual(['v1', 'legacy-12h']);
      });

      // Original unrecoverable record is preserved verbatim in recovery storage.
      await waitFor(() => {
        const archived = JSON.parse(mockStorage.get(quarantineKey) ?? '[]');
        expect(archived).toHaveLength(1);
        expect(archived[0].record).toEqual(unrecoverableRecord);
      });

      // Safe one-tap recovery removes invalid endTime and restores the entry without duplicates.
      await act(async () => fireEvent.press(view.getByTestId('restore-first-cleared')));
      await waitFor(() => {
        const snapshot = readRecoverySnapshot(view.getByTestId);
        expect(snapshot.plannerRecoveryCount).toBe(0);
        expect(snapshot.plannerRecoveredCount).toBe(2);
        expect(snapshot.items.map((item) => item.id)).toEqual(['broken-time', 'v1', 'legacy-12h']);
        expect(snapshot.items[0].endTime).toBeUndefined();
      });
    });
  });

  describe('StudyPlannerScreen recovery UI & canonical saving', () => {
    it('renders recovery counts, hides technical error jargon, allows inspecting & editing an invalid entry, and preserves midnight 00:30', async () => {
      const storageKey = getUserScopedStorageKey('sakha-store-v1', mockUser.id);
      const quarantineKey = getUserScopedStorageKey('sakha-planner-quarantine-v2', mockUser.id);
      const invalidMidnight = {
        id: 'broken-midnight',
        category: 'Tasks',
        title: 'Late Night Polity',
        date: '2026-11-26',
        startTime: '00:30',
        endTime: '25:00',
      };

      mockStorage.set(storageKey, JSON.stringify({
        plannerScheduleItems: [
          { id: 'ok-1', category: 'Tasks', title: 'Valid Morning Study', date: '2026-11-26', startTime: '09:00', endTime: '10:00' },
          invalidMidnight,
        ],
      }));
      mockStorage.set(quarantineKey, JSON.stringify([
        {
          index: 9,
          reason: 'time is not a valid 24-hour time',
          record: {
            id: 'auto-1',
            category: 'Tasks',
            title: 'Auto Restored',
            date: '2026-11-26',
            time: '',
            startTime: '11:00',
          },
          fingerprint: 'auto-fp',
          archivedAt: 1,
        },
      ]));

      const view = render(
        <StoreProvider>
          <StudyPlannerScreen />
        </StoreProvider>,
      );

      await waitFor(() => {
        expect(view.getByText('Some planner entries need review')).toBeTruthy();
        expect(view.getByText(/1 entry was automatically recovered\./)).toBeTruthy();
        expect(view.getByText(/1 saved entry needs manual review/)).toBeTruthy();
        expect(view.queryByText(/is not a valid 24-hour time/)).toBeNull();
      });

      fireEvent.press(view.getByText('Review entries (1)'));
      expect(view.getByText('Review Saved Entries')).toBeTruthy();
      expect(view.getByText('Late Night Polity')).toBeTruthy();
      expect(view.getByText(/couldn't be recognized/i)).toBeTruthy();

      fireEvent.press(view.getByText('Edit & Restore'));
      expect(view.getByText('Fix & Restore Entry')).toBeTruthy();
      // Preserves midnight 00:30 instead of shifting to 09:30.
      expect(view.getByDisplayValue('00:30')).toBeTruthy();

      // Provide a valid end time and restore safely.
      fireEvent.changeText(view.getByPlaceholderText('10:00'), '01:15');
      await act(async () => fireEvent.press(view.getByText('Save & Restore')));

      await waitFor(() => {
        expect(view.getByText('Planner entries recovered')).toBeTruthy();
        const saved = JSON.parse(mockStorage.get(storageKey) ?? '{}');
        const restored = saved.plannerScheduleItems.find((item: { id: string }) => item.id === 'broken-midnight');
        expect(restored).toMatchObject({
          id: 'broken-midnight',
          startTime: '00:30',
          endTime: '01:15',
        });
      });
    });
  });
});
