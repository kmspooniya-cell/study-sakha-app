import { describe, expect, it } from '@jest/globals';
import { darkPalette, lightPalette, resolveThemeScheme } from '../lib/theme';

describe('theme tokens', () => {
  it('provides distinct light and dark surfaces', () => {
    expect(lightPalette.bg).not.toBe(darkPalette.bg);
    expect(lightPalette.text).not.toBe(darkPalette.text);
    expect(lightPalette.surface).not.toBe(darkPalette.surface);
  });

  it('matches the authoritative Study Sakha brand palette in light and dark modes', () => {
    expect(lightPalette.brandPrimary).toBe('#2B4C7E');
    expect(lightPalette.primaryLight).toBe('#EBF1FA');
    expect(lightPalette.brandSecondary).toBe('#2E6F6B');
    expect(lightPalette.brandAccent).toBe('#B87314');
    expect(lightPalette.bg).toBe('#F7F8FA');
    expect(lightPalette.surface).toBe('#FFFFFF');
    expect(lightPalette.textPrimary).toBe('#111827');
    expect(lightPalette.border).toBe('#E2E7EF');
    expect(lightPalette.success).toBe('#1E7E4E');
    expect(lightPalette.warning).toBe('#B4690E');
    expect(lightPalette.danger).toBe('#C63636');
    expect(lightPalette.info).toBe('#1F639B');
    expect(lightPalette.chartPrimary).toBe('#2B4C7E');
    expect(lightPalette.chartSecondary).toBe('#2E6F6B');
    expect(lightPalette.chartTertiary).toBe('#B87314');

    expect(darkPalette.brandPrimary).toBe('#6B9CE8');
    expect(darkPalette.primaryLight).toBe('#1B283D');
    expect(darkPalette.brandSecondary).toBe('#4FB0A8');
    expect(darkPalette.brandAccent).toBe('#E09F3E');
    expect(darkPalette.bg).toBe('#0D1117');
    expect(darkPalette.surface).toBe('#161C26');
    expect(darkPalette.textPrimary).toBe('#F1F5F9');
    expect(darkPalette.border).toBe('#263040');
    expect(darkPalette.success).toBe('#3FB97C');
    expect(darkPalette.warning).toBe('#E5A13E');
    expect(darkPalette.danger).toBe('#E86161');
    expect(darkPalette.info).toBe('#5AA4E8');
    expect(darkPalette.chartPrimary).toBe('#6B9CE8');
    expect(darkPalette.chartSecondary).toBe('#4FB0A8');
    expect(darkPalette.chartTertiary).toBe('#E09F3E');
  });

  it('only follows the device scheme in system mode', () => {
    expect(resolveThemeScheme('light', 'dark')).toBe('light');
    expect(resolveThemeScheme('dark', 'light')).toBe('dark');
    expect(resolveThemeScheme('system', 'dark')).toBe('dark');
    expect(resolveThemeScheme('system', 'light')).toBe('light');
  });
});
