import { describe, expect, it } from '@jest/globals';
import {
  addPendingFocusSeconds,
  getActualFocusSeconds,
  getFocusedSeconds,
  shouldPromptToSaveFocusSession,
  type TimestampFocusSegment,
} from '../lib/focusTimerAccounting';

describe('focus timer accounting', () => {
  it('adds completed focus segments and excludes a break segment', () => {
    const firstSegment = getActualFocusSeconds(0, 'timer', 25 * 60, 10 * 60, false);
    const duringBreak = getActualFocusSeconds(firstSegment, 'timer', 5 * 60, 2 * 60, true);
    const resumedFocus = getActualFocusSeconds(duringBreak, 'timer', 25 * 60, 20 * 60, false);

    expect(firstSegment).toBe(15 * 60);
    expect(duringBreak).toBe(15 * 60);
    expect(resumedFocus).toBe(20 * 60);
  });

  it('includes the full completed segment when the countdown reaches zero', () => {
    expect(getActualFocusSeconds(15 * 60, 'timer', 25 * 60, 0, false)).toBe(40 * 60);
  });

  it('keeps elapsed time unchanged during pause and counts stopwatch elapsed directly', () => {
    const pausedAt = getActualFocusSeconds(5 * 60, 'timer', 25 * 60, 20 * 60, false);
    expect(addPendingFocusSeconds(pausedAt, 0, false)).toBe(pausedAt);
    expect(getActualFocusSeconds(5 * 60, 'stopwatch', 0, 90, false)).toBe(5 * 60 + 90);
    expect(getActualFocusSeconds(0, 'pomodoro', 15 * 60, 10 * 60, false)).toBe(5 * 60);
  });

  it('does not add background time while on break', () => {
    expect(addPendingFocusSeconds(900, 300, true)).toBe(900);
    expect(addPendingFocusSeconds(900, 30, false)).toBe(930);
  });

  it('uses timestamps for exact elapsed seconds and excludes paused or break time', () => {
    const running: TimestampFocusSegment = {
      accumulatedMilliseconds: 60_000,
      startedAtMilliseconds: 10_000,
      plannedSeconds: 600,
      mode: 'timer',
      phase: 'focus',
    };
    expect(getFocusedSeconds(running, 105_999)).toBe(155);
    expect(getFocusedSeconds({ ...running, phase: 'paused', startedAtMilliseconds: null }, 400_000)).toBe(60);
    expect(getFocusedSeconds({ ...running, phase: 'break' }, 400_000)).toBe(60);
  });

  it('caps countdown sessions at their plan but lets stopwatch time continue', () => {
    const ended: TimestampFocusSegment = {
      accumulatedMilliseconds: 0,
      startedAtMilliseconds: 1_000,
      plannedSeconds: 120,
      mode: 'timer',
      phase: 'focus',
    };
    expect(getFocusedSeconds(ended, 200_999)).toBe(120);
    expect(getFocusedSeconds({ ...ended, mode: 'stopwatch', plannedSeconds: null }, 200_999)).toBe(199);
  });

  it('only prompts to save sessions at or above exactly two minutes', () => {
    expect(shouldPromptToSaveFocusSession(119)).toBe(false);
    expect(shouldPromptToSaveFocusSession(120)).toBe(true);
    expect(shouldPromptToSaveFocusSession(155)).toBe(true);
  });
});