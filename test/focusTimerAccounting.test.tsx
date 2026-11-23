import { describe, expect, it } from '@jest/globals';
import { addPendingFocusSeconds, getActualFocusSeconds } from '../lib/focusTimerAccounting';

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
});