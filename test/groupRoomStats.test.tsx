import { describe, expect, it } from '@jest/globals';
import { getRoomFocusStreak } from '../lib/groupRoomStats';

describe('getRoomFocusStreak', () => {
  const today = new Date('2026-11-20T12:00:00.000Z');

  it('counts consecutive focus days through today', () => {
    expect(getRoomFocusStreak([
      { user_id: 'u1', started_at: '2026-11-20T09:00:00.000Z' },
      { user_id: 'u1', started_at: '2026-11-19T09:00:00.000Z' },
      { user_id: 'u1', started_at: '2026-11-18T09:00:00.000Z' },
      { user_id: 'u1', started_at: '2026-11-16T09:00:00.000Z' },
    ], 'u1', today)).toBe(3);
  });

  it('keeps yesterday’s streak active and isolates members', () => {
    expect(getRoomFocusStreak([
      { user_id: 'u1', started_at: '2026-11-19T23:00:00.000Z' },
      { user_id: 'u1', started_at: '2026-11-18T09:00:00.000Z' },
      { user_id: 'u2', started_at: '2026-11-20T09:00:00.000Z' },
    ], 'u1', today)).toBe(2);
    expect(getRoomFocusStreak([], 'u1', today)).toBe(0);
  });
});
