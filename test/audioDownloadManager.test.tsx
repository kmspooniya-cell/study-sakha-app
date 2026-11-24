import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AudioDownloadManager } from '../lib/audioDownloadManager';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => mockStorage.set(key, value)),
    removeItem: jest.fn(async (key: string) => mockStorage.delete(key)),
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(async () => ({ exists: true })),
}));

describe('AudioDownloadManager', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('does not notify an unsubscribed listener after async state recovery', async () => {
    const listener = jest.fn();
    const unsubscribe = AudioDownloadManager.subscribe('rain', listener);

    unsubscribe();
    await Promise.resolve();
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('falls back safely when saved download state is malformed', async () => {
    mockStorage.set('study-sakha-downloaded-audio-bad', JSON.stringify({ status: 'downloaded' }));

    await expect(AudioDownloadManager.getState('bad')).resolves.toMatchObject({
      status: 'idle',
      progress: 0,
      localUri: null,
    });
  });
});
