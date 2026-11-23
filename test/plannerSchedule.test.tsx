import { describe, expect, it } from '@jest/globals';
import type { PlannerScheduleItem, State } from '../lib/store';
import {
  getPlannerScheduleOccurrence,
  getPlannerScheduleOccurrences,
  getScheduleOccurrenceId,
} from '../lib/planner';

const dailyPlan: PlannerScheduleItem = {
  id: 'plan-1',
  category: 'Tasks',
  title: 'Review Polity',
  date: '2026-11-20',
  recurrence: 'daily',
  durationMinutes: 60,
};

function makeState(overrides: Partial<State> = {}) {
  return {
    plannerScheduleItems: [dailyPlan],
    plannerScheduleCompletions: {},
    plannerTaskStudySeconds: {},
    ...overrides,
  } as State;
}

describe('schedule plan occurrences', () => {
  it('classifies missed, upcoming and completed occurrences with capped progress and actual time', () => {
    const firstId = getScheduleOccurrenceId(dailyPlan.id, '2026-11-20');
    const completedId = getScheduleOccurrenceId(dailyPlan.id, '2026-11-21');
    const state = makeState({
      plannerTaskStudySeconds: {
        [firstId]: 15 * 60,
        [completedId]: 75 * 60,
      },
    });

    const missed = getPlannerScheduleOccurrence(state, dailyPlan, '2026-11-20', '2026-11-22');
    const completed = getPlannerScheduleOccurrence(state, dailyPlan, '2026-11-21', '2026-11-22');
    const upcoming = getPlannerScheduleOccurrence(state, dailyPlan, '2026-11-22', '2026-11-22');

    expect(missed).toMatchObject({ status: 'missed', actualSeconds: 900, plannedSeconds: 3600, progressPercent: 25 });
    expect(completed).toMatchObject({ status: 'completed', actualSeconds: 4500, plannedSeconds: 3600, progressPercent: 100 });
    expect(upcoming).toMatchObject({ status: 'upcoming', actualSeconds: 0, progressPercent: 0 });
  });

  it('keeps recurring occurrences independent and applies manual completion to one date only', () => {
    const completedId = getScheduleOccurrenceId(dailyPlan.id, '2026-11-21');
    const state = makeState({
      plannerScheduleCompletions: { [completedId]: '2026-11-21' },
    });

    const occurrences = getPlannerScheduleOccurrences(state, '2026-11-20', '2026-11-22', '2026-11-22');

    expect(occurrences.map(({ date, status, actualSeconds }) => ({ date, status, actualSeconds }))).toEqual([
      { date: '2026-11-20', status: 'missed', actualSeconds: 0 },
      { date: '2026-11-21', status: 'completed', actualSeconds: 0 },
      { date: '2026-11-22', status: 'upcoming', actualSeconds: 0 },
    ]);
  });
});
