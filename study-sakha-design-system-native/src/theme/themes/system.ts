/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/themes/system.ts
 */

import { ColorSchemeName } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

export function resolveThemeMode(
  preference: ThemeMode,
  systemScheme: ColorSchemeName
): ResolvedThemeMode {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}
