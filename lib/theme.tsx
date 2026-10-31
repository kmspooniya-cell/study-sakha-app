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
  bg: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F2F7',
  text: '#1C1C1E',
  textMuted: '#8E8E93',
  textFaint: '#AEAEB2',
  border: '#E5E5EA',
  separator: '#C6C6C8',
  overlay: 'rgba(0,0,0,0.4)',
  tint: 'rgba(0,122,255,0.08)',
  tealTint: 'rgba(90,200,250,0.12)',
  blue: '#007AFF',
  green: '#34C759',
  orange: '#FF9500',
  purple: '#AF52DE',
  red: '#FF3B30',
  teal: '#5AC8FA',
  dark: '#1C1C1E',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  shadow: '#000000',
  brandPrimary: '#007AFF',
  brandSecondary: '#34C759',
  brandAccent: '#AF52DE',
  surfaceBase: '#F2F2F7',
  surfaceRaised: '#FFFFFF',
  surfaceSubtle: '#F2F2F7',
  surfaceInteractive: '#E5E5EA',
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  textTertiary: '#AEAEB2',
  borderSubtle: '#E5E5EA',
  borderStrong: '#D1D1D6',
  info: '#007AFF',
  focus: '#007AFF',
  focusRing: 'rgba(0,122,255,0.25)',
  selected: '#007AFF',
  selectedSurface: 'rgba(0,122,255,0.08)',
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
  separator: '#3A4968',
  overlay: 'rgba(0,0,0,0.65)',
  tint: 'rgba(111,149,255,0.15)',
  tealTint: 'rgba(90,200,250,0.18)',
  blue: '#6F95FF',
  green: '#2BD69B',
  orange: '#FFB84D',
  purple: '#9A82FF',
  red: '#FF6B70',
  teal: '#5AC8FA',
  dark: '#EDF1F8',
  success: '#2BD69B',
  danger: '#FF6B70',
  warning: '#FFB84D',
  shadow: '#000000',
  brandPrimary: '#6F95FF',
  brandSecondary: '#2BD69B',
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
  focusRing: 'rgba(111,149,255,0.35)',
  selected: '#6F95FF',
  selectedSurface: 'rgba(111,149,255,0.15)',
};

export type Palette = typeof lightPalette;

export const space = (n: number) => n * 8;
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
  card: 16,
  section: 20,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
  control: 14,
  card: 20,
  dialog: 24,
};

const webStack = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', 'Noto Sans Devanagari', 'Segoe UI', sans-serif";
const webDisplay = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Noto Sans Devanagari', sans-serif";

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
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6 },
  pageTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 16, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  cardTitle: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 20, fontWeight: '700', letterSpacing: -0.15 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  supporting: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
  caption: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, fontWeight: '500' },
  label: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  kpi: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4 },
};

export const shadowTokens = {
  subtle: { opacity: 0.04, radius: 10, offsetY: 2, elevation: 1 },
  medium: { opacity: 0.07, radius: 18, offsetY: 5, elevation: 3 },
  elevated: { opacity: 0.12, radius: 26, offsetY: 8, elevation: 6 },
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
