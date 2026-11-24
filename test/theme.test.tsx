import { describe, expect, it } from '@jest/globals';
import { darkPalette, lightPalette } from '../lib/theme';

describe('theme tokens', () => {
  it('provides distinct light and dark surfaces', () => {
    expect(lightPalette.bg).not.toBe(darkPalette.bg);
    expect(lightPalette.text).not.toBe(darkPalette.text);
    expect(lightPalette.surface).not.toBe(darkPalette.surface);
  });
});
