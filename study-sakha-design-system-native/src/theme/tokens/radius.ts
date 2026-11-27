/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/tokens/radius.ts
 * Target: Expo SDK 57 / React Native 0.86.3 / TypeScript
 */

export type RadiusMode = 'sharp' | 'default' | 'soft';

export const RADIUS_SCALE = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof RADIUS_SCALE;

export type RadiusTokens = Record<RadiusKey, number>;

export function buildRadiusTokens(radiusMode: RadiusMode): RadiusTokens {
  const mult = radiusMode === 'sharp' ? 0.5 : radiusMode === 'soft' ? 1.35 : 1;

  return {
    none: 0,
    xs: Math.round(RADIUS_SCALE.xs * mult),
    sm: Math.round(RADIUS_SCALE.sm * mult),
    md: Math.round(RADIUS_SCALE.md * mult),
    lg: Math.round(RADIUS_SCALE.lg * mult),
    xl: Math.round(RADIUS_SCALE.xl * mult),
    '2xl': Math.round(RADIUS_SCALE['2xl'] * mult),
    full: 9999,
  };
}
