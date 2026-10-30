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

/**
 * Semantic palette names are added alongside the original names below.
 * Existing consumers can continue using bg/surface/text/border without a
 * migration, while new UI can describe intent rather than color placement.
 */
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
  brandPrimary: brand.blue,
  brandSecondary: brand.teal,
  brandAccent: brand.violet,
  surfaceBase: '#F6F8FC',
  surfaceRaised: '#FFFFFF',
  surfaceSubtle: '#F1F4FA',
  surfaceInteractive: '#EAF0FF',
  textPrimary: '#182230',
  textSecondary: '#5B6779',
  textTertiary: '#8A94A6',
  borderSubtle: '#E4E8F0',
  borderStrong: '#C9D2E3',
  info: '#4778F5',
  focus: '#4778F5',
  focusRing: 'rgba(71,120,245,0.28)',
  selected: '#4778F5',
  selectedSurface: 'rgba(71,120,245,0.10)',
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
  brandPrimary: '#5C7BD6',
  brandSecondary: '#2BD6C2',
  brandAccent: '#9A82FF',
  surfaceBase: '#0C1220',
  surfaceRaised: '#141C2E',
  surfaceSubtle: '#1B2439',
  surfaceInteractive: '#202C48',
  textPrimary: '#EDF1F8',
  textSecondary: '#9AA6BC',
  textTertiary: '#6D7A91',
  borderSubtle: '#253049',
  borderStrong: '#3A4968',
  info: '#6F95FF',
  focus: '#6F95FF',
  focusRing: 'rgba(111,149,255,0.38)',
  selected: '#6F95FF',
  selectedSurface: 'rgba(111,149,255,0.18)',
};

export type Palette = typeof lightPalette;

export const space = (n: number) => n * 8;
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  card: 16,
  section: 24,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
  control: 14,
  card: 20,
  dialog: 28,
};

const webStack = "Inter, Manrope, 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const webDisplay = "Manrope, Inter, 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif";

export const fonts = {
  body: Platform.OS === 'web' ? webStack : undefined,
  display: Platform.OS === 'web' ? webDisplay : undefined,
};

export type TypographyRole = {
  fontFamily: string | undefined;
  fontSize: number;
  lineHeight: number;
  fontWeight: '500' | '600' | '700' | '800';
  letterSpacing?: number;
};

/** Base typography roles. Use useTheme().f when applying sizes in a screen. */
export const typography: Record<
  'display' | 'pageTitle' | 'sectionTitle' | 'cardTitle' | 'body' | 'supporting' | 'caption' | 'label' | 'kpi',
  TypographyRole
> = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  pageTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 25, fontWeight: '800', letterSpacing: -0.3 },
  cardTitle: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  supporting: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  caption: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, fontWeight: '500' },
  label: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  kpi: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
};

export const shadowTokens = {
  subtle: { opacity: 0.06, radius: 10, offsetY: 3, elevation: 2 },
  medium: { opacity: 0.09, radius: 20, offsetY: 8, elevation: 5 },
  elevated: { opacity: 0.14, radius: 34, offsetY: 14, elevation: 10 },
} as const;

export function shadow(p: Palette, level: 1 | 2 | 3 = 1) {
  const conf = {
    1: shadowTokens.subtle,
    2: shadowTokens.medium,
    3: shadowTokens.elevated,
  }[level];
  return {
    shadowColor: p.shadow,
    shadowOpacity: conf.opacity,
    shadowRadius: conf.radius,
    shadowOffset: { width: 0, height: conf.offsetY },
    elevation: conf.elevation,
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
