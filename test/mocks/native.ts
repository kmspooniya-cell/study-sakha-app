import { jest } from '@jest/globals';

export function createAsyncStorageMock() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      values.delete(key);
    }),
    clear: jest.fn(async () => values.clear()),
  };
}

export function createNotificationsMock() {
  return {
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => undefined),
    getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
    scheduleNotificationAsync: jest.fn(async (request: unknown) => ({ identifier: 'mock-id', request })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  };
}

export function createAudioMock() {
  return {
    pause: jest.fn(),
    play: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    loop: false,
  };
}

export function createNavigationMock() {
  return {
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
  };
}

export function createSupabaseAuthMock() {
  return {
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    refreshSession: jest.fn(),
  };
}
