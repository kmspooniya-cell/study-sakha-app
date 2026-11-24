import { describe, expect, it } from '@jest/globals';
import { getDisplayedFocusElapsedSeconds } from '../lib/groupFocusTimer';

describe('group focus display timer', () => {
  const updatedAt = '2026-11-24T10:00:00.000Z';
  const now = Date.parse('2026-11-24T10:00:41.900Z');

  it('advances from authoritative heartbeat data each displayed second', () => {
    expect(getDisplayedFocusElapsedSeconds(38, 'focusing', updatedAt, now)).toBe(79);
  });

  it('does not advance a paused or non-focusing participant', () => {
    expect(getDisplayedFocusElapsedSeconds(38, 'paused', updatedAt, now)).toBe(38);
    expect(getDisplayedFocusElapsedSeconds(0, 'here', updatedAt, now)).toBe(0);
  });

  it('keeps multiple participant calculations independent', () => {
    expect([
      getDisplayedFocusElapsedSeconds(38, 'focusing', updatedAt, now),
      getDisplayedFocusElapsedSeconds(12, 'focusing', '2026-11-24T10:00:35.000Z', now),
    ]).toEqual([79, 18]);
  });

  it('only changes the display calculation when the local clock changes', () => {
    expect(getDisplayedFocusElapsedSeconds(38, 'focusing', updatedAt, now + 1000)).toBe(80);
  });
});
