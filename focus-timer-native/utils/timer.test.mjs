import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTime, remainingSecondsAt } from './timer.ts';

test('formats timer values with fixed minute and second digits', () => {
  assert.equal(formatTime(24 * 60 + 57), '24:57');
  assert.equal(formatTime(5), '00:05');
  assert.equal(formatTime(-1), '00:00');
});

test('counts a partial second as remaining and clamps at zero', () => {
  assert.equal(remainingSecondsAt(5000, 4001), 1);
  assert.equal(remainingSecondsAt(5000, 4000), 1);
  assert.equal(remainingSecondsAt(5000, 5000), 0);
  assert.equal(remainingSecondsAt(5000, 8000), 0);
});