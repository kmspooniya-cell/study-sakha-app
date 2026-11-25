import { describe, expect, it } from '@jest/globals';
import { darkPalette, lightPalette, resolveThemeScheme } from '../lib/theme';

describe('theme tokens', () => {
  it('provides distinct light and dark surfaces', () => {
    expect(lightPalette.bg).not.toBe(darkPalette.bg);
    expect(lightPalette.text).not.toBe(darkPalette.text);
    expect(lightPalette.surface).not.toBe(darkPalette.surface);
  });

  it('only follows the device scheme in system mode', () => {
    expect(resolveThemeScheme('light', 'dark')).toBe('light');
    expect(resolveThemeScheme('dark', 'light')).toBe('dark');
    expect(resolveThemeScheme('system', 'dark')).toBe('dark');
    expect(resolveThemeScheme('system', 'light')).toBe('light');
  });
});
