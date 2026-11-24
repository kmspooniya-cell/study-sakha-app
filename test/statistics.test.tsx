import { describe, expect, it } from '@jest/globals';
import { deriveStatistics } from '../lib/statistics';
import type { State } from '../lib/store';

const state = {
  plannerTasks: [],
  plannerScheduleItems: [],
  plannerScheduleCompletions: {},
  plannerTaskStudySeconds: {},
  planDone: {},
  plannerDefaultOverrides: {},
  plannerDeletedDefaults: [],
} as unknown as State;

describe('derived statistics', () => {
  it('deduplicates a persisted focus record and aggregates actual time', () => {
    const session = { id: 'focus-1', completedAt: '2026-11-24T10:00:00.000Z', actualSeconds: 150 };
    const result = deriveStatistics(state, [session, session], { startDate: '2026-11-24', endDate: '2026-11-24' });

    expect(result.focus.totalSessions).toBe(1);
    expect(result.focus.totalActualSeconds).toBe(150);
    expect(result.dailyActivity[0]).toMatchObject({ actualSeconds: 150, focusSessionCount: 1 });
  });
});
