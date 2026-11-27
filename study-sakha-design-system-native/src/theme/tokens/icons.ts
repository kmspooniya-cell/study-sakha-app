/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/tokens/icons.ts
 * Target: Expo SDK 57 / React Native 0.86.3 / TypeScript
 */

export const ICON_TOKENS = {
  iconXS: 14,
  iconSM: 16,
  iconMD: 20,
  iconLG: 24,
  iconXL: 32,
  icon2XL: 44,
  iconStrokeWidth: 1.75,
} as const;

export type IconTokens = typeof ICON_TOKENS;
export type IconSizeKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
