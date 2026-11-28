import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export const brand = {
  navy: '#2B4C7E',
  blue: '#2B4C7E',
  teal: '#2E6F6B',
  amber: '#B87314',
  rose: '#C63636',
  violet: '#6C5CE7',
};

/**
 * Semantic palette names are added alongside the original names below.
 * Existing consumers can continue using bg/surface/text/border without a
 * migration, while new UI can describe intent rather than color placement.
 */
export const lightPalette = {
  ...brand,
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EFF2F6',
  text: '#111827',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  border: '#E2E7EF',
  separator: '#CBD4E1',
  overlay: 'rgba(0,0,0,0.4)',
  tint: '#EBF1FA',
  tealTint: '#E8F4F3',
  primaryLight: '#EBF1FA',
  blue: '#2B4C7E',
  green: '#1E7E4E',
  orange: '#B4690E',
  purple: '#6C5CE7',
  red: '#C63636',
  teal: '#2E6F6B',
  dark: '#111827',
  success: '#1E7E4E',
  danger: '#C63636',
  warning: '#B4690E',
  shadow: '#000000',
  brandPrimary: '#2B4C7E',
  brandSecondary: '#2E6F6B',
  brandAccent: '#B87314',
  surfaceBase: '#F7F8FA',
  surfaceRaised: '#FFFFFF',
  surfaceSubtle: '#F9FAFC',
  surfaceInteractive: '#E6EAF0',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  borderSubtle: '#EEF1F6',
  borderStrong: '#CBD4E1',
  info: '#1F639B',
  focus: '#2B4C7E',
  focusRing: 'rgba(43,76,126,0.25)',
  selected: '#2B4C7E',
  selectedSurface: '#EBF1FA',
  chartPrimary: '#2B4C7E',
  chartSecondary: '#2E6F6B',
  chartTertiary: '#B87314',
};

export const darkPalette: typeof lightPalette = {
  ...brand,
  navy: '#6B9CE8',
  bg: '#0D1117',
  surface: '#161C26',
  surfaceAlt: '#1B222E',
  text: '#F1F5F9',
  textMuted: '#8592A6',
  textFaint: '#68758A',
  border: '#263040',
  separator: '#38465C',
  overlay: 'rgba(0,0,0,0.65)',
  tint: '#1B283D',
  tealTint: '#172E2C',
  primaryLight: '#1B283D',
  blue: '#6B9CE8',
  green: '#3FB97C',
  orange: '#E5A13E',
  purple: '#9B8CFF',
  red: '#E86161',
  teal: '#4FB0A8',
  dark: '#F1F5F9',
  success: '#3FB97C',
  danger: '#E86161',
  warning: '#E5A13E',
  shadow: '#000000',
  brandPrimary: '#6B9CE8',
  brandSecondary: '#4FB0A8',
  brandAccent: '#E09F3E',
  surfaceBase: '#0D1117',
  surfaceRaised: '#1F2735',
  surfaceSubtle: '#131820',
  surfaceInteractive: '#222B3A',
  textPrimary: '#F1F5F9',
  textSecondary: '#B0BAC9',
  textTertiary: '#68758A',
  borderSubtle: '#1E2634',
  borderStrong: '#38465C',
  info: '#5AA4E8',
  focus: '#6B9CE8',
  focusRing: 'rgba(107,156,232,0.35)',
  selected: '#6B9CE8',
  selectedSurface: '#1B283D',
  chartPrimary: '#6B9CE8',
  chartSecondary: '#4FB0A8',
  chartTertiary: '#E09F3E',
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
  reduceMotion: boolean;
  animationIntensity: 'minimal' | 'balanced' | 'rich';
  layoutDensity: 'compact' | 'comfortable';
};

export function resolveThemeScheme(mode: ThemeMode, system: 'light' | 'dark' | 'unspecified' | null | undefined): 'light' | 'dark' {
  return mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
}

const ThemeCtx = createContext<Ctx>({
  mode: 'system',
  scheme: 'light',
  colors: lightPalette,
  textScale: 1,
  f: (s) => s,
  reduceMotion: false,
  animationIntensity: 'balanced',
  layoutDensity: 'comfortable',
});

const accentValues: Record<string, string> = {
  indigo: '#2B4C7E',
  amber: '#d97706',
  emerald: '#059669',
  rose: '#e11d48',
  violet: '#7c3aed',
  teal: '#0d9488',
  slate: '#334155',
};

const backgroundValues: Record<string, { light: string; dark: string }> = {
  'subtle-grid': { light: '#eef2f7', dark: '#172033' },
  'warm-paper': { light: '#fefce8', dark: '#292524' },
  'royal-jaipur': { light: '#fff7ed', dark: '#431407' },
  'deep-aurora': { light: '#eef2ff', dark: '#064e3b' },
};

export function ThemeProvider({
  mode,
  textScale = 1,
  accentColor = 'indigo',
  customAccentHex = null,
  highContrast = false,
  reduceMotion = false,
  animationIntensity = 'balanced',
  displayScaling = 100,
  layoutDensity = 'comfortable',
  backgroundId = 'none',
  backgroundOpacity = 100,
  overlayIntensity = 0,
  children,
}: {
  mode: ThemeMode;
  textScale?: number;
  accentColor?: string;
  customAccentHex?: string | null;
  highContrast?: boolean;
  reduceMotion?: boolean;
  animationIntensity?: 'minimal' | 'balanced' | 'rich';
  displayScaling?: number;
  layoutDensity?: 'compact' | 'comfortable';
  backgroundId?: string;
  backgroundOpacity?: number;
  overlayIntensity?: number;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const scheme = resolveThemeScheme(mode, system);
  const f = useCallback(
    (s: number) => Math.round(s * textScale * (displayScaling / 100)),
    [displayScaling, textScale],
  );
  const value = useMemo<Ctx>(() => {
      const base = scheme === 'dark' ? darkPalette : lightPalette;
      const hasCustomHex = /^#[0-9a-f]{6}$/i.test(customAccentHex ?? '');
      const hasCustomPreset = Boolean(accentColor && accentColor !== 'indigo' && accentValues[accentColor]);
      const accent = hasCustomHex
        ? customAccentHex!
        : hasCustomPreset
          ? accentValues[accentColor]
          : base.brandPrimary;
      const background = backgroundValues[backgroundId]?.[scheme] ?? base.bg;
      const opacity = Math.min(1, Math.max(0.1, backgroundOpacity / 100));
      const overlay = Math.min(0.85, Math.max(0, overlayIntensity / 100));
      const blendedBackground = backgroundId === 'none'
        ? base.bg
        : scheme === 'dark'
          ? `rgba(13,17,23,${1 - opacity * (1 - overlay)})`
          : `rgba(247,248,250,${1 - opacity * (1 - overlay)})`;
      const isDefaultBrand = !hasCustomHex && !hasCustomPreset;
      const colors = {
        ...base,
        bg: blendedBackground,
        blue: accent,
        brandPrimary: accent,
        focus: accent,
        selected: accent,
        chartPrimary: accent,
        focusRing: isDefaultBrand ? base.focusRing : `${accent}55`,
        selectedSurface: isDefaultBrand ? base.selectedSurface : `${accent}18`,
        tint: isDefaultBrand ? base.tint : `${accent}18`,
        primaryLight: isDefaultBrand ? base.primaryLight : `${accent}18`,
        border: highContrast ? (scheme === 'dark' ? '#94a3b8' : '#334155') : base.border,
      } as Palette;
      return {
      mode,
      scheme,
      colors,
      textScale,
      f,
      reduceMotion,
      animationIntensity,
      layoutDensity,
    };
    }, [accentColor, animationIntensity, backgroundId, backgroundOpacity, customAccentHex, f, highContrast, layoutDensity, mode, overlayIntensity, reduceMotion, scheme, textScale]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
