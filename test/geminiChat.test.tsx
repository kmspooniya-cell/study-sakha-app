import { describe, expect, it } from '@jest/globals';
import { validateApiBaseUrl } from '../lib/apiConfig';

describe('Sakha AI API URL validation', () => {
  it('accepts absolute HTTPS URLs and removes trailing slashes', () => {
    expect(validateApiBaseUrl(' https://api.example.com/// ')).toBe('https://api.example.com');
  });

  it.each(['http://api.example.com', '/api', 'api.example.com'])('rejects non-HTTPS or relative URL: %s', (value) => {
    expect(() => validateApiBaseUrl(value)).toThrow('absolute HTTPS URL');
  });
});
