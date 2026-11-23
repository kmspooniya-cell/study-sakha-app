import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { updateFocusHistoryRecord } from '../lib/focusHistory';

jest.mock('@react-native-async-storage/async-storage', () => {
  const values: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: async (key: string) => values[key] ?? null,
      setItem: async (key: string, value: string) => {
        values[key] = value;
      },
      clear: async () => {
        Object.keys(values).forEach((key) => delete values[key]);
      },
    },
  };
});

describe('focus history updates', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves the chosen subject and focus quality without losing session data', async () => {
    const record = {
      id: 'session-1',
      completedAt: '2026-11-19T10:02:35.000Z',
      status: 'completed',
      subject: 'Physics',
      topic: 'Mechanics',
    };
    await AsyncStorage.setItem('focus-history', JSON.stringify([record]));

    await updateFocusHistoryRecord('focus-history', record.id, {
      subject: 'History',
      focusQuality: 'flow',
    });

    expect(JSON.parse((await AsyncStorage.getItem('focus-history')) ?? '[]')).toEqual([
      { ...record, subject: 'History', focusQuality: 'flow' },
    ]);
  });

  it('reports when the session is missing instead of silently creating a record', async () => {
    await expect(
      updateFocusHistoryRecord('focus-history', 'missing', { subject: 'History' }),
    ).rejects.toThrow('The saved focus session could not be found.');
  });
});
