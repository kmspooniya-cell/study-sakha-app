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

  it('does not include TODAY_PLAN demo tasks when user has no scheduled tasks', () => {
    const result = deriveStatistics(state, [], { startDate: '2026-11-24', endDate: '2026-11-28' });

    expect(result.tasks).toEqual([]);
    expect(result.overall.scheduledTaskCount).toBe(0);
    expect(result.overall.pendingTaskCount).toBe(0);
    expect(result.overall.overdueTaskCount).toBe(0);
    expect(result.overall.completedTaskCount).toBe(0);
  });

  it('includes only genuine user-created tasks in derived statistics', () => {
    const userState = {
      ...state,
      plannerTasks: [
        {
          id: 'user-task-1',
          label: 'Revise Economy Budget',
          category: 'Economy',
          minutes: 60,
          taskType: 'Revision',
          priority: 'High',
          completed: false,
          completedOn: null,
          targetDate: '2026-11-28',
          scope: 'daily',
          periodKey: '2026-11-28',
        },
      ],
    } as unknown as State;

    const result = deriveStatistics(userState, [], { startDate: '2026-11-28', endDate: '2026-11-28' });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      taskId: 'user-task-1',
      title: 'Revise Economy Budget',
      category: 'Economy',
      plannedMinutes: 60,
      completed: false,
    });
  });
});
