/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/tokens/motion.ts
 * Target: Expo SDK 57 / React Native 0.86.3 / TypeScript
 */

import { Easing } from 'react-native';

export type AnimationIntensity = 'none' | 'subtle' | 'standard';

export interface MotionTokens {
  durationFast: number;
  durationNormal: number;
  durationSlow: number;
  easingStandard: (value: number) => number;
  easingEmphasized: (value: number) => number;
  pressScale: number;
  reducedMotion: boolean;
}

export function buildMotionTokens(
  animationIntensity: AnimationIntensity,
  reduceMotion: boolean
): MotionTokens {
  const disabled = reduceMotion || animationIntensity === 'none';
  const mult = disabled ? 0 : animationIntensity === 'subtle' ? 0.65 : 1;

  return {
    durationFast: Math.round(120 * mult),
    durationNormal: Math.round(200 * mult),
    durationSlow: Math.round(320 * mult),
    easingStandard: Easing.bezier(0.2, 0, 0, 1),
    easingEmphasized: Easing.bezier(0.2, 0.8, 0.2, 1),
    pressScale: disabled ? 1 : 0.98,
    reducedMotion: disabled,
  };
}
