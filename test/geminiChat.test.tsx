import { describe, expect, it, jest } from '@jest/globals';
import { validateApiBaseUrl } from '../lib/apiConfig';

describe('Sakha AI API URL validation', () => {
  it('accepts absolute HTTPS URLs and removes trailing slashes', () => {
    expect(validateApiBaseUrl(' https://api.example.com/// ')).toBe('https://api.example.com');
  });

  it.each(['http://api.example.com', '/api', 'api.example.com'])('rejects non-HTTPS or relative URL: %s', (value) => {
    expect(() => validateApiBaseUrl(value)).toThrow('absolute HTTPS URL');
  });
});

const mockSupabaseAuth = {
  auth: { getSession: jest.fn(async () => ({ data: { session: { access_token: 'test-session-token' } }, error: null })) },
};

jest.mock('../lib/supabase', () => ({
  supabase: mockSupabaseAuth,
  supabaseConfigured: true,
}));

const { askGemini, classifyGeminiError } = require('../lib/geminiChat') as typeof import('../lib/geminiChat');

describe('Sakha AI chat request retry budget', () => {
  it('classifies authentication, quota, server, model-timeout and network errors', () => {
    expect(classifyGeminiError({ status: 401, message: 'no session' })).toBe('authentication');
    expect(classifyGeminiError({ status: 429, message: 'busy' })).toBe('rate-limit');
    expect(classifyGeminiError({ status: 503, message: 'unavailable' })).toBe('server');
    expect(classifyGeminiError({ status: 504, message: 'AI took too long' })).toBe('model');
    expect(classifyGeminiError(new Error('The Study Sakha API could not be reached.'))).toBe('network');
  });

  it('retries one transient server failure with the original prompt and auth token', async () => {
    const priorUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
    const first = { ok: false, status: 503, json: async () => ({ error: 'Busy' }) } as Response;
    const success = { ok: true, status: 200, json: async () => ({ text: 'Ready', sources: [] }) } as Response;
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce(first).mockResolvedValueOnce(success);
    try {
      const response = await askGemini({ message: 'Study Planner कहाँ है?', history: [] });
      expect(response.text).toBe('Ready');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const firstInit = fetchMock.mock.calls[0][1] as RequestInit;
      const secondInit = fetchMock.mock.calls[1][1] as RequestInit;
      expect(firstInit.headers).toMatchObject({ Authorization: 'Bearer test-session-token' });
      expect(secondInit.headers).toMatchObject({ Authorization: 'Bearer test-session-token' });
      expect(JSON.parse(firstInit.body as string).message).toBe('Study Planner कहाँ है?');
      expect(JSON.parse(secondInit.body as string).message).toBe('Study Planner कहाँ है?');
    } finally {
      fetchMock.mockRestore();
      if (priorUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
      else process.env.EXPO_PUBLIC_API_BASE_URL = priorUrl;
    }
  });
});
