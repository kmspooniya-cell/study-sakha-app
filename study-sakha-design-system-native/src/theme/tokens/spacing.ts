/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/tokens/spacing.ts
 * Target: Expo SDK 57 / React Native 0.86.3 / TypeScript
 */

export type ContentDensity = 'compact' | 'comfortable' | 'spacious';

export const SPACING_SCALE = {
  2: 2,
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  56: 56,
  64: 64,
} as const;

export type BaseSpacingKey = keyof typeof SPACING_SCALE;

export interface SpacingTokens {
  2: number;
  4: number;
  8: number;
  12: number;
  16: number;
  20: number;
  24: number;
  32: number;
  40: number;
  48: number;
  56: number;
  64: number;
  screenPadding: number;
  sectionSpacing: number;
  cardPadding: number;
  componentGap: number;
  inputPadding: number;
  buttonPadding: number;
  listItemSpacing: number;
  headerSpacing: number;
}

export function buildSpacingTokens(density: ContentDensity): SpacingTokens {
  const mult = density === 'compact' ? 0.8 : density === 'spacious' ? 1.2 : 1;

  return {
    ...SPACING_SCALE,
    screenPadding: Math.round(16 * mult),
    sectionSpacing: Math.round(24 * mult),
    cardPadding: Math.round(16 * mult),
    componentGap: Math.round(12 * mult),
    inputPadding: Math.round(12 * mult),
    buttonPadding: Math.round(14 * mult),
    listItemSpacing: Math.round(10 * mult),
    headerSpacing: Math.round(16 * mult),
  };
}
