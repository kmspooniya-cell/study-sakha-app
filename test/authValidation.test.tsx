import { describe, expect, it } from '@jest/globals';
import { validateSignInCredentials } from '../lib/authValidation';

describe('sign-in validation', () => {
  it('requires both email and password', () => {
    expect(validateSignInCredentials('', 'secret')).toBe('Enter both your email and password.');
    expect(validateSignInCredentials('student@example.com', '')).toBe('Enter both your email and password.');
  });

  it('accepts non-empty credentials for backend validation', () => {
    expect(validateSignInCredentials(' student@example.com ', 'secret')).toBeNull();
  });
});
