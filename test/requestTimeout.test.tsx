import { afterEach, describe, expect, it, jest } from '@jest/globals';

const { createTimeoutFetch, withAbortTimeout } = require('../server/requestTimeout') as typeof import('../server/requestTimeout');

describe('server request timeouts', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('aborts a Gemini operation and returns its internal timeout code', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const operation = jest.fn((receivedSignal: AbortSignal) => {
      signal = receivedSignal;
      return new Promise(() => undefined);
    });

    const result = withAbortTimeout(operation, 1000, 'GEMINI_REQUEST_TIMEOUT');
    const rejection = expect(result).rejects.toMatchObject({ code: 'GEMINI_REQUEST_TIMEOUT' });
    await jest.advanceTimersByTimeAsync(1000);

    await rejection;
    expect(signal?.aborted).toBe(true);
  });

  it('aborts the Supabase fetch and returns its internal timeout code', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    jest.spyOn(global, 'fetch').mockImplementation(async (_input, init) => {
      signal = init?.signal;
      return new Promise<Response>(() => undefined);
    });

    const fetchWithTimeout = createTimeoutFetch(1000, 'SUPABASE_AUTH_TIMEOUT');
    const result = fetchWithTimeout('https://example.test/user');
    const rejection = expect(result).rejects.toMatchObject({ code: 'SUPABASE_AUTH_TIMEOUT' });
    await jest.advanceTimersByTimeAsync(1000);

    await rejection;
    expect(signal?.aborted).toBe(true);
  });
});
