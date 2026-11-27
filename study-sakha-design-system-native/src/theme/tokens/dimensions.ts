/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/tokens/dimensions.ts
 * Target: Expo SDK 57 / React Native 0.86.3 / TypeScript
 */

import { useWindowDimensions } from 'react-native';

export const DIMENSIONS = {
  screenHeaderHeight: 56,
  bottomNavigationHeight: 64,
  buttonHeightSmall: 34,
  buttonHeightMedium: 42,
  buttonHeightLarge: 50,
  inputHeight: 44,
  iconSize: 20,
  avatarSize: 40,
  touchTargetSize: 44,
  cardMinHeight: 72,
  contentMaxWidth: 1120,
  modalMaxWidth: 480,
} as const;

export type DimensionTokens = typeof DIMENSIONS;

export type DeviceBreakpoint = 'smallPhone' | 'phone' | 'largePhone' | 'tablet' | 'desktop';

export interface ResponsiveLayoutInfo {
  width: number;
  height: number;
  isLandscape: boolean;
  breakpoint: DeviceBreakpoint;
  isCompact: boolean;
  isTabletOrLarger: boolean;
  columns: number;
}

export function useResponsiveLayout(): ResponsiveLayoutInfo {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  let breakpoint: DeviceBreakpoint = 'phone';
  if (width < 375) {
    breakpoint = 'smallPhone';
  } else if (width < 415) {
    breakpoint = 'phone';
  } else if (width < 600) {
    breakpoint = 'largePhone';
  } else if (width < 1024) {
    breakpoint = 'tablet';
  } else {
    breakpoint = 'desktop';
  }

  const isCompact = width < 600;
  const isTabletOrLarger = width >= 600;
  const columns = width >= 1024 ? 4 : width >= 600 ? 2 : 1;

  return {
    width,
    height,
    isLandscape,
    breakpoint,
    isCompact,
    isTabletOrLarger,
    columns,
  };
}
