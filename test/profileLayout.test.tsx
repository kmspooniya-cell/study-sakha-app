import { describe, expect, it } from '@jest/globals';
import { getProfileContentMaxWidth } from '../lib/profileLayout';

describe('Profile card responsive column', () => {
  it('uses a shared fluid column on phones and a centered maximum width on tablets', () => {
    expect(getProfileContentMaxWidth(390)).toBeUndefined();
    expect(getProfileContentMaxWidth(768)).toBeUndefined();
    expect(getProfileContentMaxWidth(1024)).toBe(840);
    expect(getProfileContentMaxWidth(1366)).toBe(840);
  });
});
