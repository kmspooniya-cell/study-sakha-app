import React, { createContext, useContext, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export const brand = {
  navy: '#243B80',
  blue: '#4778F5',
  teal: '#18B6A4',
  amber: '#F5A524',
  rose: '#F2555A',
  violet: '#7C5CF0',
};

export const lightPalette = {
  ...brand,
  bg: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F4FA',
  text: '#182230',
  textMuted: '#5B6779',
  textFaint: '#8A94A6',
  border: '#E4E8F0',
  overlay: 'rgba(16,24,40,0.45)',
  tint: 'rgba(71,120,245,0.10)',
  tealTint: 'rgba(24,182,164,0.12)',
  success: '#12A871',
  danger: '#F2555A',
  warning: '#F5A524',
  shadow: '#101828',
};

export const darkPalette: typeof lightPalette = {
  ...brand,
  navy: '#5C7BD6',
  bg: '#0C1220',
  surface: '#141C2E',
  surfaceAlt: '#1B2439',
  text: '#EDF1F8',
  textMuted: '#9AA6BC',
  textFaint: '#6D7A91',
  border: '#253049',
  overlay: 'rgba(5,8,15,0.6)',
  tint: 'rgba(71,120,245,0.18)',
  tealTint: 'rgba(24,182,164,0.18)',
  success: '#2BD69B',
  danger: '#FF6B70',
  warning: '#FFB84D',
  shadow: '#000000',
};

export type Palette = typeof lightPalette;

export const space = (n: number) => n * 8;
export const radii = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

const webStack = "Inter, Manrope, 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const webDisplay = "Manrope, Inter, 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif";

export const fonts = {
  body: Platform.OS === 'web' ? webStack : undefined,
  display: Platform.OS === 'web' ? webDisplay : undefined,
};

export function shadow(p: Palette, level: 1 | 2 | 3 = 1) {
  const conf = {
    1: { o: 0.06, r: 10, h: 3, e: 2 },
    2: { o: 0.09, r: 20, h: 8, e: 5 },
    3: { o: 0.14, r: 34, h: 14, e: 10 },
  }[level];
  return {
    shadowColor: p.shadow,
    shadowOpacity: conf.o,
    shadowRadius: conf.r,
    shadowOffset: { width: 0, height: conf.h },
    elevation: conf.e,
  };
}

type Ctx = {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  colors: Palette;
  textScale: number;
  f: (size: number) => number;
};

const ThemeCtx = createContext<Ctx>({
  mode: 'system',
  scheme: 'light',
  colors: lightPalette,
  textScale: 1,
  f: (s) => s,
});

export function ThemeProvider({
  mode,
  textScale = 1,
  children,
}: {
  mode: ThemeMode;
  textScale?: number;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const scheme: 'light' | 'dark' = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo<Ctx>(
    () => ({
      mode,
      scheme,
      colors: scheme === 'dark' ? darkPalette : lightPalette,
      textScale,
      f: (s: number) => Math.round(s * textScale),
    }),
    [mode, scheme, textScale]
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
