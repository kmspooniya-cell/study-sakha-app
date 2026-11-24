import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';

const profileSource = readFileSync(join(__dirname, '../screens/ProfileScreen.tsx'), 'utf8');
const focusCenterSource = readFileSync(join(__dirname, '../screens/FocusCenterScreen.tsx'), 'utf8');
const realtimeSource = readFileSync(join(__dirname, '../lib/groupRoomRealtime.ts'), 'utf8');

describe('student-facing focus UI surfaces', () => {
  it('does not expose the Profile daily goal quick logger', () => {
    expect(profileSource).not.toContain('Daily Study Goal');
    expect(profileSource).not.toContain('+15m');
    expect(profileSource).not.toContain('handleLogQuickStudy');
  });

  it('keeps realtime diagnostics behind the development-only gate', () => {
    expect(focusCenterSource).toContain('{__DEV__ &&');
    expect(focusCenterSource).toContain('Realtime diagnostics');
  });

  it('keeps presence synchronization at its heartbeat cadence', () => {
    expect(realtimeSource).toContain('15_000');
    expect(realtimeSource).not.toMatch(/setInterval\([^\n]*1000\)/);
  });
});
