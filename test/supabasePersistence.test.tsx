import { describe, expect, it, jest } from '@jest/globals';

const mockCreateClient = jest.fn((..._args: unknown[]) => ({
  auth: { onAuthStateChange: jest.fn() },
  realtime: { setAuth: jest.fn() },
  storage: { from: jest.fn() },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('../lib/supabase');

describe('Supabase native session configuration', () => {
  it('enables AsyncStorage persistence and token refresh', () => {
    const options = mockCreateClient.mock.calls[0]?.[2] as unknown as { auth: Record<string, unknown> };
    expect(options.auth.persistSession).toBe(true);
    expect(options.auth.autoRefreshToken).toBe(true);
    expect(options.auth.detectSessionInUrl).toBe(false);
    expect(options.auth.storage).toBeDefined();
  });
});
