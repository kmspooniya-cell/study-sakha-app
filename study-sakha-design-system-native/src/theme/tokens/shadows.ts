/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/tokens/shadows.ts
 * Target: Expo SDK 57 / React Native 0.86.3 / TypeScript
 */

import { Platform, ViewStyle } from 'react-native';

export type ShadowIntensity = 'none' | 'subtle' | 'medium';

export type ElevationStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

export interface ShadowTokens {
  elevation0: ElevationStyle;
  elevation1: ElevationStyle;
  elevation2: ElevationStyle;
  elevation3: ElevationStyle;
  elevation4: ElevationStyle;
  elevation5: ElevationStyle;
}

const NO_SHADOW: ElevationStyle = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

function makeNativeElevation(
  level: number,
  isDark: boolean,
  alphaMult: number
): ElevationStyle {
  if (alphaMult === 0 || level === 0) {
    return NO_SHADOW;
  }

  const baseColor = isDark ? '#000000' : '#0F172A';
  const configs: Record<number, { y: number; radius: number; lightOp: number; darkOp: number; android: number }> = {
    1: { y: 1, radius: 2, lightOp: 0.05, darkOp: 0.25, android: 1 },
    2: { y: 2, radius: 6, lightOp: 0.07, darkOp: 0.35, android: 3 },
    3: { y: 6, radius: 14, lightOp: 0.09, darkOp: 0.45, android: 6 },
    4: { y: 10, radius: 22, lightOp: 0.12, darkOp: 0.55, android: 10 },
    5: { y: 16, radius: 32, lightOp: 0.16, darkOp: 0.65, android: 16 },
  };

  const c = configs[level] ?? configs[1];
  const opacity = Math.min(0.85, (isDark ? c.darkOp : c.lightOp) * alphaMult);
  const androidElevation = isDark
    ? Math.max(1, Math.round(c.android * 0.65 * alphaMult))
    : Math.round(c.android * alphaMult);

  return Platform.select<ElevationStyle>({
    android: {
      elevation: androidElevation,
      shadowColor: baseColor,
    },
    ios: {
      shadowColor: baseColor,
      shadowOffset: { width: 0, height: c.y },
      shadowOpacity: opacity,
      shadowRadius: c.radius,
    },
    default: {
      shadowColor: baseColor,
      shadowOffset: { width: 0, height: c.y },
      shadowOpacity: opacity,
      shadowRadius: c.radius,
      elevation: androidElevation,
    },
  })!;
}

export function buildShadowTokens(isDark: boolean, intensity: ShadowIntensity): ShadowTokens {
  const mult = intensity === 'none' ? 0 : intensity === 'medium' ? 1.5 : 1;

  return {
    elevation0: NO_SHADOW,
    elevation1: makeNativeElevation(1, isDark, mult),
    elevation2: makeNativeElevation(2, isDark, mult),
    elevation3: makeNativeElevation(3, isDark, mult),
    elevation4: makeNativeElevation(4, isDark, mult),
    elevation5: makeNativeElevation(5, isDark, mult),
  };
}
