# STUDY SAKHA DESIGN SYSTEM (SSDS v1.0) — COMPLETE EXPO REACT NATIVE MASTER SOURCE BUNDLE

**Target Stack:** Expo SDK 57 • React Native 0.86.3 • React 19.2.3 • TypeScript  
**Scope:** Complete Reusable Design System ONLY (Tokens, Themes, ThemeProvider, Components, Patterns, Screen Templates, Barrel Exports).  
**Excluded by Specification:** Dummy Application screens, Canvas Preview, Design System Playground UI, Appearance Studio UI, and App Root Navigation.  
**Total Source Files:** 69 TypeScript / TSX modules across Batches 1–5.

---

## BATCH 1 — CENTRAL DESIGN TOKENS, THEMES & THEME PROVIDER (13 FILES)

---

FILE PATH: src/theme/tokens/colors.ts

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/tokens/colors.ts
 * Target: Expo SDK 57 / React Native 0.86.3 / TypeScript
 *
 * Source Parity: 100% preserved from StudySakhaDesignSystem.jsx
 * Single source of truth for all 49 semantic color tokens, 7 curated presets,
 * and dynamic rgba tint derivation.
 */

export interface ColorTokens {
  // Brand Colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  accentSoft: string;
  brandGradientStart: string;
  brandGradientEnd: string;

  // Background & Surface Colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  surfaceElevated: string;
  surfaceSelected: string;
  surfaceDisabled: string;

  // Text Colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textInverse: string;
  textDisabled: string;
  textLink: string;
  textPlaceholder: string;

  // Border Colors
  border: string;
  borderSubtle: string;
  borderStrong: string;
  borderFocused: string;
  borderSelected: string;
  divider: string;

  // Semantic Colors
  success: string;
  successBackground: string;
  warning: string;
  warningBackground: string;
  danger: string;
  dangerBackground: string;
  info: string;
  infoBackground: string;
  neutral: string;
  neutralBackground: string;

  // Data Visualization Colors
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
  chartQuaternary: string;
  chartGrid: string;
  chartAxis: string;
  chartPositive: string;
  chartNegative: string;
  chartNeutral: string;
}

export type ColorTokenKey = keyof ColorTokens;

export interface PresetColorOverrides {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  accentSoft: string;
  background: string;
  surface: string;
}

export interface ThemePreset {
  id: 'classic' | 'ocean' | 'midnight' | 'forest' | 'warm' | 'graphite' | 'lavender';
  name: string;
  badge?: string;
  description: string;
  light: PresetColorOverrides;
  dark: PresetColorOverrides;
}

export interface CustomColorOverrides {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
}

export const BASE_LIGHT_COLORS: ColorTokens = {
  // Brand Colors (Study Sakha Classic - Restrained Academic Indigo & Slate Teal)
  primary: '#2B4C7E',
  primaryLight: '#EBF1FA',
  primaryDark: '#1E375C',
  secondary: '#2E6F6B',
  secondaryLight: '#E8F4F3',
  secondaryDark: '#1F4F4C',
  accent: '#B87314',
  accentSoft: '#FDF4E7',
  brandGradientStart: '#2B4C7E',
  brandGradientEnd: '#3D649E',

  // Background & Surface Colors
  background: '#F7F8FA',
  backgroundSecondary: '#EFF2F6',
  backgroundTertiary: '#E6EAF0',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9FAFC',
  surfaceTertiary: '#F1F4F8',
  surfaceElevated: '#FFFFFF',
  surfaceSelected: '#EEF3FA',
  surfaceDisabled: '#F2F4F7',

  // Text Colors (WCAG 2.2 AA+ Contrast)
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  textMuted: '#8B95A5',
  textInverse: '#FFFFFF',
  textDisabled: '#9CA3AF',
  textLink: '#2B4C7E',
  textPlaceholder: '#9CA3AF',

  // Border Colors
  border: '#E2E7EF',
  borderSubtle: '#EEF1F6',
  borderStrong: '#CBD4E1',
  borderFocused: '#2B4C7E',
  borderSelected: '#2B4C7E',
  divider: '#EAEFF5',

  // Semantic Colors
  success: '#1E7E4E',
  successBackground: '#EAF7F0',
  warning: '#B4690E',
  warningBackground: '#FEF6E7',
  danger: '#C63636',
  dangerBackground: '#FDECEC',
  info: '#1F639B',
  infoBackground: '#EBF4FC',
  neutral: '#526071',
  neutralBackground: '#F1F4F8',

  // Data Visualization
  chartPrimary: '#2B4C7E',
  chartSecondary: '#2E6F6B',
  chartTertiary: '#B87314',
  chartQuaternary: '#6C5CE7',
  chartGrid: '#E8EDF3',
  chartAxis: '#7B8794',
  chartPositive: '#1E7E4E',
  chartNegative: '#C63636',
  chartNeutral: '#94A3B8',
};

export const BASE_DARK_COLORS: ColorTokens = {
  // Brand Colors (Adjusted for dark surface legibility & eye comfort)
  primary: '#6B9CE8',
  primaryLight: '#1B283D',
  primaryDark: '#8BB4F0',
  secondary: '#4FB0A8',
  secondaryLight: '#172E2C',
  secondaryDark: '#73C7C0',
  accent: '#E09F3E',
  accentSoft: '#2E2414',
  brandGradientStart: '#3A5F99',
  brandGradientEnd: '#2B4C7E',

  // Background & Surface Colors (Surface differentiation over heavy shadows)
  background: '#0D1117',
  backgroundSecondary: '#131820',
  backgroundTertiary: '#1A212C',
  surface: '#161C26',
  surfaceSecondary: '#1B222E',
  surfaceTertiary: '#222B3A',
  surfaceElevated: '#1F2735',
  surfaceSelected: '#1E2C42',
  surfaceDisabled: '#191F29',

  // Text Colors
  textPrimary: '#F1F5F9',
  textSecondary: '#B0BAC9',
  textTertiary: '#8592A6',
  textMuted: '#68758A',
  textInverse: '#0D1117',
  textDisabled: '#556070',
  textLink: '#7AA8EE',
  textPlaceholder: '#6B778C',

  // Border Colors
  border: '#263040',
  borderSubtle: '#1E2634',
  borderStrong: '#38465C',
  borderFocused: '#6B9CE8',
  borderSelected: '#6B9CE8',
  divider: '#222B38',

  // Semantic Colors
  success: '#3FB97C',
  successBackground: '#132B20',
  warning: '#E5A13E',
  warningBackground: '#2D2212',
  danger: '#E86161',
  dangerBackground: '#2E1618',
  info: '#5AA4E8',
  infoBackground: '#142638',
  neutral: '#94A3B8',
  neutralBackground: '#1E2634',

  // Data Visualization
  chartPrimary: '#6B9CE8',
  chartSecondary: '#4FB0A8',
  chartTertiary: '#E09F3E',
  chartQuaternary: '#9B8CFF',
  chartGrid: '#222B38',
  chartAxis: '#8592A6',
  chartPositive: '#3FB97C',
  chartNegative: '#E86161',
  chartNeutral: '#64748B',
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classic',
    name: 'Study Sakha Classic',
    badge: 'Recommended',
    description: 'Restrained academic indigo & calm neutral surfaces built for long study sessions.',
    light: {
      primary: '#2B4C7E',
      primaryLight: '#EBF1FA',
      primaryDark: '#1E375C',
      secondary: '#2E6F6B',
      secondaryLight: '#E8F4F3',
      accent: '#B87314',
      accentSoft: '#FDF4E7',
      background: '#F7F8FA',
      surface: '#FFFFFF',
    },
    dark: {
      primary: '#6B9CE8',
      primaryLight: '#1B283D',
      primaryDark: '#8BB4F0',
      secondary: '#4FB0A8',
      secondaryLight: '#172E2C',
      accent: '#E09F3E',
      accentSoft: '#2E2414',
      background: '#0D1117',
      surface: '#161C26',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Crisp maritime blues with cool slate contrast.',
    light: {
      primary: '#0F5E9C',
      primaryLight: '#E8F3FC',
      primaryDark: '#0A4270',
      secondary: '#0E7C7B',
      secondaryLight: '#E6F5F5',
      accent: '#D97706',
      accentSoft: '#FEF3C7',
      background: '#F5F9FC',
      surface: '#FFFFFF',
    },
    dark: {
      primary: '#4BA3E3',
      primaryLight: '#132A3D',
      primaryDark: '#74BCEE',
      secondary: '#3BB2B0',
      secondaryLight: '#132C2C',
      accent: '#F59E0B',
      accentSoft: '#2E2210',
      background: '#0B131B',
      surface: '#131E29',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Navy',
    description: 'Deep executive navy with refined steel accents.',
    light: {
      primary: '#1E2F54',
      primaryLight: '#EAEFF7',
      primaryDark: '#121E38',
      secondary: '#475569',
      secondaryLight: '#F1F5F9',
      accent: '#9A6B2F',
      accentSoft: '#F8F2E8',
      background: '#F6F7FA',
      surface: '#FFFFFF',
    },
    dark: {
      primary: '#7D9CD6',
      primaryLight: '#1A243B',
      primaryDark: '#9EB7E5',
      secondary: '#94A3B8',
      secondaryLight: '#1E2530',
      accent: '#D6A45C',
      accentSoft: '#2B2316',
      background: '#090D16',
      surface: '#121826',
    },
  },
  {
    id: 'forest',
    name: 'Forest Green',
    description: 'Botanical deep sage & calm organic reading surfaces.',
    light: {
      primary: '#245943',
      primaryLight: '#EAF3EE',
      primaryDark: '#183D2E',
      secondary: '#4B6B5C',
      secondaryLight: '#EEF3F0',
      accent: '#B4690E',
      accentSoft: '#FCF4E6',
      background: '#F6F8F6',
      surface: '#FFFFFF',
    },
    dark: {
      primary: '#56B389',
      primaryLight: '#162C22',
      primaryDark: '#7AC9A5',
      secondary: '#7FA694',
      secondaryLight: '#1A2721',
      accent: '#E09F3E',
      accentSoft: '#2B2214',
      background: '#0C120F',
      surface: '#141D18',
    },
  },
  {
    id: 'warm',
    name: 'Warm Neutral',
    description: 'Paper-inspired warm stone palette to reduce glare during reading.',
    light: {
      primary: '#6B4E3D',
      primaryLight: '#F4EEEA',
      primaryDark: '#4D372A',
      secondary: '#4A635D',
      secondaryLight: '#EDF2F0',
      accent: '#A8621D',
      accentSoft: '#FAF1E6',
      background: '#F7F5F2',
      surface: '#FDFCFA',
    },
    dark: {
      primary: '#C99B7E',
      primaryLight: '#2B211B',
      primaryDark: '#DCBA9F',
      secondary: '#7EA69D',
      secondaryLight: '#1A2623',
      accent: '#E09B4B',
      accentSoft: '#2E2215',
      background: '#141210',
      surface: '#1D1A17',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Monochrome editorial precision with minimal visual noise.',
    light: {
      primary: '#27272A',
      primaryLight: '#F0F0F2',
      primaryDark: '#18181B',
      secondary: '#52525B',
      secondaryLight: '#F4F4F5',
      accent: '#3F6296',
      accentSoft: '#EDF2F8',
      background: '#F7F7F8',
      surface: '#FFFFFF',
    },
    dark: {
      primary: '#E4E4E7',
      primaryLight: '#27272A',
      primaryDark: '#FFFFFF',
      secondary: '#A1A1AA',
      secondaryLight: '#232326',
      accent: '#7CA3DE',
      accentSoft: '#1B2433',
      background: '#0E0E10',
      surface: '#17171A',
    },
  },
  {
    id: 'lavender',
    name: 'Soft Lavender',
    description: 'Muted academic plum & gentle slate surfaces.',
    light: {
      primary: '#544382',
      primaryLight: '#F1EEF8',
      primaryDark: '#3B2E5E',
      secondary: '#476A78',
      secondaryLight: '#ECF2F5',
      accent: '#B36B24',
      accentSoft: '#FBF2E8',
      background: '#F7F6FA',
      surface: '#FFFFFF',
    },
    dark: {
      primary: '#9D8CD6',
      primaryLight: '#231E36',
      primaryDark: '#B8ABE3',
      secondary: '#7BA9BA',
      secondaryLight: '#18262C',
      accent: '#E09A50',
      accentSoft: '#2E2216',
      background: '#0E0D14',
      surface: '#171521',
    },
  },
];

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) {
    return `rgba(43, 76, 126, ${alpha})`;
  }
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) {
    return `rgba(43, 76, 126, ${alpha})`;
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

---

FILE PATH: src/theme/tokens/typography.ts

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/tokens/typography.ts
 * Target: Expo SDK 57 / React Native 0.86.3 / TypeScript
 */

import { Platform, TextStyle } from 'react-native';

export type FontStylePreference = 'inter' | 'devanagari' | 'editorial';

export type TypographyVariant =
  | 'ScreenTitle'
  | 'ScreenSubtitle'
  | 'SectionTitle'
  | 'SectionDescription'
  | 'CardTitle'
  | 'CardSubtitle'
  | 'BodyPrimary'
  | 'BodySecondary'
  | 'ButtonLabel'
  | 'InputLabel'
  | 'HelperText'
  | 'ErrorText'
  | 'Caption'
  | 'Overline'
  | 'StatisticValue'
  | 'StatisticLabel'
  | 'NavigationLabel'
  | 'QuestionText'
  | 'AnswerText'
  | 'ReadingText'
  | 'AIResponseText';

export interface TypographySpec {
  size: number;
  weight: '400' | '500' | '600' | '700';
  lineHeightMultiplier: number;
  letterSpacingEm: number;
  transform?: 'uppercase' | 'none';
  numeric?: boolean;
  role: string;
}

export const TYPOGRAPHY_SPECS: Record<TypographyVariant, TypographySpec> = {
  ScreenTitle: { size: 24, weight: '700', lineHeightMultiplier: 1.32, letterSpacingEm: -0.02, role: 'Primary screen heading' },
  ScreenSubtitle: { size: 14, weight: '400', lineHeightMultiplier: 1.5, letterSpacingEm: 0, role: 'Screen header context' },
  SectionTitle: { size: 18, weight: '600', lineHeightMultiplier: 1.38, letterSpacingEm: -0.015, role: 'Content section heading' },
  SectionDescription: { size: 13, weight: '400', lineHeightMultiplier: 1.5, letterSpacingEm: 0, role: 'Supporting section text' },
  CardTitle: { size: 15, weight: '600', lineHeightMultiplier: 1.4, letterSpacingEm: -0.01, role: 'Primary card title' },
  CardSubtitle: { size: 13, weight: '400', lineHeightMultiplier: 1.45, letterSpacingEm: 0, role: 'Secondary card metadata' },
  BodyPrimary: { size: 15, weight: '400', lineHeightMultiplier: 1.6, letterSpacingEm: 0, role: 'Main readable body copy' },
  BodySecondary: { size: 13.5, weight: '400', lineHeightMultiplier: 1.55, letterSpacingEm: 0, role: 'Supporting body copy' },
  ButtonLabel: { size: 14, weight: '600', lineHeightMultiplier: 1.2, letterSpacingEm: 0.005, role: 'Interactive button label' },
  InputLabel: { size: 13, weight: '500', lineHeightMultiplier: 1.35, letterSpacingEm: 0, role: 'Form field label' },
  HelperText: { size: 12, weight: '400', lineHeightMultiplier: 1.45, letterSpacingEm: 0, role: 'Form guidance copy' },
  ErrorText: { size: 12, weight: '500', lineHeightMultiplier: 1.45, letterSpacingEm: 0, role: 'Validation error copy' },
  Caption: { size: 11.5, weight: '500', lineHeightMultiplier: 1.4, letterSpacingEm: 0.01, role: 'Timestamps & footnotes' },
  Overline: { size: 10.5, weight: '600', lineHeightMultiplier: 1.35, letterSpacingEm: 0.06, transform: 'uppercase', role: 'Eyebrow category label' },
  StatisticValue: { size: 26, weight: '700', lineHeightMultiplier: 1.2, letterSpacingEm: -0.025, numeric: true, role: 'Key metric figure' },
  StatisticLabel: { size: 12, weight: '500', lineHeightMultiplier: 1.35, letterSpacingEm: 0.01, role: 'Key metric caption' },
  NavigationLabel: { size: 11, weight: '500', lineHeightMultiplier: 1.25, letterSpacingEm: 0.01, role: 'Tab & bottom bar label' },
  QuestionText: { size: 16, weight: '500', lineHeightMultiplier: 1.68, letterSpacingEm: 0, role: 'Exam question (EN/HI)' },
  AnswerText: { size: 14.5, weight: '400', lineHeightMultiplier: 1.6, letterSpacingEm: 0, role: 'MCQ option text' },
  ReadingText: { size: 16, weight: '400', lineHeightMultiplier: 1.82, letterSpacingEm: 0.005, role: 'Long-form study notes' },
  AIResponseText: { size: 14.5, weight: '400', lineHeightMultiplier: 1.72, letterSpacingEm: 0, role: 'Sakha AI structured reply' },
};

export interface TypographyTokens {
  fontFamilyPrimary: string;
  fontFamilyHindi: string;
  fontFamilyMono: string;
  scale: number;
  styles: Record<TypographyVariant, TypographySpec>;
}

export function resolveFontFamilies(fontStyle: FontStylePreference): {
  fontFamilyPrimary: string;
  fontFamilyHindi: string;
  fontFamilyMono: string;
} {
  const defaultSans = Platform.select({ ios: 'System', android: 'Roboto', default: 'System' })!;
  const defaultSerif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' })!;
  const defaultMono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!;

  const fontFamilyPrimary =
    fontStyle === 'devanagari'
      ? 'NotoSansDevanagari_400Regular'
      : fontStyle === 'editorial'
      ? defaultSerif
      : defaultSans;

  return {
    fontFamilyPrimary,
    fontFamilyHindi: Platform.select({
      android: 'NotoSansDevanagari_400Regular',
      ios: 'Devanagari Sangam MN',
      default: defaultSans,
    })!,
    fontFamilyMono: defaultMono,
  };
}

export function resolveTypographyStyle(
  variant: TypographyVariant,
  typography: TypographyTokens,
  options?: { hindi?: boolean; mono?: boolean }
): TextStyle {
  const spec = typography.styles[variant] ?? typography.styles.BodyPrimary;
  const scaledSize = Math.round(spec.size * typography.scale * 10) / 10;
  const effectiveLineMult = options?.hindi
    ? Math.max(spec.lineHeightMultiplier, 1.68)
    : spec.lineHeightMultiplier;

  return {
    fontFamily: options?.mono
      ? typography.fontFamilyMono
      : options?.hindi
      ? typography.fontFamilyHindi
      : typography.fontFamilyPrimary,
    fontSize: scaledSize,
    fontWeight: spec.weight,
    lineHeight: Math.round(scaledSize * effectiveLineMult),
    letterSpacing: Math.round(scaledSize * spec.letterSpacingEm * 100) / 100,
    textTransform: spec.transform ?? 'none',
    fontVariant: spec.numeric ? ['tabular-nums'] : undefined,
    includeFontPadding: options?.hindi ? true : false,
  };
}
```

---

FILE PATH: src/theme/tokens/spacing.ts

```typescript
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
```

---

FILE PATH: src/theme/tokens/radius.ts

```typescript
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
```

---

FILE PATH: src/theme/tokens/shadows.ts

```typescript
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
```

---

FILE PATH: src/theme/tokens/dimensions.ts

```typescript
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
```

---

FILE PATH: src/theme/tokens/motion.ts

```typescript
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
```

---

FILE PATH: src/theme/tokens/icons.ts

```typescript
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
```

---

FILE PATH: src/theme/themes/light.ts

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/themes/light.ts
 */

import { BASE_LIGHT_COLORS, ColorTokens } from '../tokens/colors';

export const LIGHT_THEME_COLORS: ColorTokens = BASE_LIGHT_COLORS;
```

---

FILE PATH: src/theme/themes/dark.ts

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/themes/dark.ts
 */

import { BASE_DARK_COLORS, ColorTokens } from '../tokens/colors';

export const DARK_THEME_COLORS: ColorTokens = BASE_DARK_COLORS;
```

---

FILE PATH: src/theme/themes/system.ts

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/themes/system.ts
 */

import { ColorSchemeName } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

export function resolveThemeMode(
  preference: ThemeMode,
  systemScheme: ColorSchemeName
): ResolvedThemeMode {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}
```

---

FILE PATH: src/theme/ThemeProvider.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/ThemeProvider.tsx
 * Target: Expo SDK 57 / React Native 0.86.3 / React 19.2.3 / TypeScript
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text as RNText,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react-native';

import {
  ColorTokens,
  CustomColorOverrides,
  hexToRgba,
  THEME_PRESETS,
} from './tokens/colors';
import { LIGHT_THEME_COLORS } from './themes/light';
import { DARK_THEME_COLORS } from './themes/dark';
import { ResolvedThemeMode, resolveThemeMode, ThemeMode } from './themes/system';
import {
  FontStylePreference,
  resolveFontFamilies,
  TYPOGRAPHY_SPECS,
  TypographyTokens,
} from './tokens/typography';
import { buildSpacingTokens, ContentDensity, SpacingTokens } from './tokens/spacing';
import { buildRadiusTokens, RadiusMode, RadiusTokens } from './tokens/radius';
import { buildShadowTokens, ShadowIntensity, ShadowTokens } from './tokens/shadows';
import { DIMENSIONS, DimensionTokens } from './tokens/dimensions';
import { AnimationIntensity, buildMotionTokens, MotionTokens } from './tokens/motion';
import { ICON_TOKENS, IconTokens } from './tokens/icons';

export type CardAppearance = 'outlined' | 'elevated' | 'filled';
export type BorderIntensity = 'subtle' | 'default' | 'strong';
export type PresetId =
  | 'classic'
  | 'ocean'
  | 'midnight'
  | 'forest'
  | 'warm'
  | 'graphite'
  | 'lavender'
  | 'custom';

export interface AppearanceConfig {
  themeMode: ThemeMode;
  presetId: PresetId;
  customColors: CustomColorOverrides | null;
  typographyScale: number;
  fontStyle: FontStylePreference;
  density: ContentDensity;
  radiusMode: RadiusMode;
  cardAppearance: CardAppearance;
  borderIntensity: BorderIntensity;
  shadowIntensity: ShadowIntensity;
  animationIntensity: AnimationIntensity;
  reduceMotion: boolean;
}

export interface SavedCustomPreset {
  id: string;
  name: string;
  config: AppearanceConfig;
  createdAt: string;
}

export interface ToastPayload {
  type?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  message?: string;
  duration?: number;
}

interface ToastRecord extends ToastPayload {
  id: number;
}

export interface SnackbarPayload {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface SnackbarRecord extends SnackbarPayload {
  id: number;
}

export interface ThemeTokens {
  mode: ResolvedThemeMode;
  isDark: boolean;
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  dimensions: DimensionTokens;
  motion: MotionTokens;
  icons: IconTokens;
  typography: TypographyTokens;
  cardAppearance: CardAppearance;
}

export interface ThemeContextValue {
  tokens: ThemeTokens;
  appearance: AppearanceConfig;
  isHydrated: boolean;
  updateAppearance: (patch: Partial<AppearanceConfig>) => void;
  resetCurrentTheme: () => void;
  restoreDefaultAppearance: () => void;
  savedPresets: SavedCustomPreset[];
  saveCustomPreset: (name: string) => void;
  deleteCustomPreset: (id: string) => void;
  showToast: (payload: ToastPayload) => void;
  showSnackbar: (payload: SnackbarPayload) => void;
}

const STORAGE_KEY_APPEARANCE = 'ssds_appearance_v1';
const STORAGE_KEY_PRESETS = 'ssds_custom_presets_v1';

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  themeMode: 'light',
  presetId: 'classic',
  customColors: null,
  typographyScale: 1,
  fontStyle: 'inter',
  density: 'comfortable',
  radiusMode: 'default',
  cardAppearance: 'outlined',
  borderIntensity: 'default',
  shadowIntensity: 'subtle',
  animationIntensity: 'standard',
  reduceMotion: false,
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [appearance, setAppearance] = useState<AppearanceConfig>(DEFAULT_APPEARANCE);
  const [savedPresets, setSavedPresets] = useState<SavedCustomPreset[]>([]);
  const [osReduceMotion, setOsReduceMotion] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarRecord | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      try {
        const [rawAppearance, rawPresets] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_APPEARANCE),
          AsyncStorage.getItem(STORAGE_KEY_PRESETS),
        ]);
        if (!mounted) return;
        if (rawAppearance) {
          const parsed = JSON.parse(rawAppearance) as Partial<AppearanceConfig>;
          setAppearance({ ...DEFAULT_APPEARANCE, ...parsed });
        }
        if (rawPresets) {
          const parsedPresets = JSON.parse(rawPresets) as SavedCustomPreset[];
          if (Array.isArray(parsedPresets)) {
            setSavedPresets(parsedPresets);
          }
        }
      } catch {
        // Fallback silently to Study Sakha Classic defaults
      } finally {
        if (mounted) setIsHydrated(true);
      }
    }
    hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setOsReduceMotion)
      .catch(() => undefined);

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setOsReduceMotion
    );
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_APPEARANCE, JSON.stringify(appearance)).catch(
      () => undefined
    );
  }, [appearance, isHydrated]);

  const resolvedMode = resolveThemeMode(appearance.themeMode, systemColorScheme);
  const isDark = resolvedMode === 'dark';

  const tokens = useMemo<ThemeTokens>(() => {
    const base: ColorTokens = isDark ? { ...DARK_THEME_COLORS } : { ...LIGHT_THEME_COLORS };
    const preset =
      THEME_PRESETS.find((p) => p.id === appearance.presetId) ?? THEME_PRESETS[0];
    const presetOverrides = isDark ? preset.dark : preset.light;

    const colors: ColorTokens = { ...base, ...presetOverrides };

    if (appearance.presetId === 'custom' && appearance.customColors) {
      const c = appearance.customColors;
      if (c.primary) {
        colors.primary = c.primary;
        colors.primaryLight = hexToRgba(c.primary, isDark ? 0.18 : 0.1);
        colors.primaryDark = c.primary;
        colors.borderFocused = c.primary;
        colors.borderSelected = c.primary;
        colors.textLink = c.primary;
        colors.chartPrimary = c.primary;
        colors.brandGradientStart = c.primary;
      }
      if (c.secondary) {
        colors.secondary = c.secondary;
        colors.secondaryLight = hexToRgba(c.secondary, isDark ? 0.18 : 0.1);
        colors.chartSecondary = c.secondary;
      }
      if (c.accent) {
        colors.accent = c.accent;
        colors.accentSoft = hexToRgba(c.accent, isDark ? 0.18 : 0.12);
        colors.chartTertiary = c.accent;
      }
      if (c.background) colors.background = c.background;
      if (c.surface) colors.surface = c.surface;
    } else {
      colors.borderFocused = colors.primary;
      colors.borderSelected = colors.primary;
      colors.textLink = colors.primary;
      colors.chartPrimary = colors.primary;
      colors.chartSecondary = colors.secondary;
      colors.chartTertiary = colors.accent;
      colors.brandGradientStart = colors.primary;
      colors.brandGradientEnd = colors.secondary;
    }

    if (appearance.borderIntensity === 'subtle') {
      colors.border = colors.borderSubtle;
    } else if (appearance.borderIntensity === 'strong') {
      colors.border = colors.borderStrong;
    }

    const spacing = buildSpacingTokens(appearance.density);
    const radius = buildRadiusTokens(appearance.radiusMode);
    const shadows = buildShadowTokens(isDark, appearance.shadowIntensity);
    const motion = buildMotionTokens(
      appearance.animationIntensity,
      appearance.reduceMotion || osReduceMotion
    );

    const fontFamilies = resolveFontFamilies(appearance.fontStyle);
    const typography: TypographyTokens = {
      ...fontFamilies,
      scale: appearance.typographyScale,
      styles: TYPOGRAPHY_SPECS,
    };

    return {
      mode: resolvedMode,
      isDark,
      colors,
      spacing,
      radius,
      shadows,
      dimensions: DIMENSIONS,
      motion,
      icons: ICON_TOKENS,
      typography,
      cardAppearance: appearance.cardAppearance,
    };
  }, [appearance, isDark, osReduceMotion, resolvedMode]);

  const showToast = useCallback(
    ({ type = 'info', title, message, duration = 3200 }: ToastPayload) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-2), { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const showSnackbar = useCallback(
    ({ message, actionLabel, onAction, duration = 4000 }: SnackbarPayload) => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
      const id = Date.now();
      setSnackbar({ id, message, actionLabel, onAction, duration });
      snackbarTimerRef.current = setTimeout(() => {
        setSnackbar((prev) => (prev?.id === id ? null : prev));
      }, duration);
    },
    []
  );

  const updateAppearance = useCallback((patch: Partial<AppearanceConfig>) => {
    setAppearance((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetCurrentTheme = useCallback(() => {
    setAppearance((prev) => ({
      ...DEFAULT_APPEARANCE,
      themeMode: prev.themeMode,
      presetId: prev.presetId === 'custom' ? 'classic' : prev.presetId,
    }));
    showToast({
      type: 'info',
      title: 'Theme reset',
      message: 'Current theme settings restored to preset defaults.',
    });
  }, [showToast]);

  const restoreDefaultAppearance = useCallback(() => {
    setAppearance(DEFAULT_APPEARANCE);
    showToast({
      type: 'success',
      title: 'Defaults restored',
      message: 'Study Sakha Classic default appearance applied.',
    });
  }, [showToast]);

  const saveCustomPreset = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const newPreset: SavedCustomPreset = {
        id: `saved_${Date.now()}`,
        name: trimmed,
        config: { ...appearance },
        createdAt: new Date().toLocaleDateString(),
      };
      setSavedPresets((prev) => {
        const next = [newPreset, ...prev].slice(0, 6);
        AsyncStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(next)).catch(
          () => undefined
        );
        return next;
      });
      showToast({
        type: 'success',
        title: 'Preset saved',
        message: `"${trimmed}" saved to your custom themes.`,
      });
    },
    [appearance, showToast]
  );

  const deleteCustomPreset = useCallback((id: string) => {
    setSavedPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      AsyncStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(next)).catch(
        () => undefined
      );
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      tokens,
      appearance,
      isHydrated,
      updateAppearance,
      resetCurrentTheme,
      restoreDefaultAppearance,
      savedPresets,
      saveCustomPreset,
      deleteCustomPreset,
      showToast,
      showSnackbar,
    }),
    [
      tokens,
      appearance,
      isHydrated,
      updateAppearance,
      resetCurrentTheme,
      restoreDefaultAppearance,
      savedPresets,
      saveCustomPreset,
      deleteCustomPreset,
      showToast,
      showSnackbar,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}

      {toasts.length > 0 && (
        <View
          pointerEvents="box-none"
          style={[
            styles.toastContainer,
            { top: Math.max(insets.top + 12, 16) },
          ]}
        >
          {toasts.map((toast) => (
            <NativeToastItem
              key={toast.id}
              toast={toast}
              tokens={tokens}
              onClose={() =>
                setToasts((prev) => prev.filter((item) => item.id !== toast.id))
              }
            />
          ))}
        </View>
      )}

      {snackbar && (
        <View
          pointerEvents="box-none"
          style={[
            styles.snackbarWrapper,
            { bottom: Math.max(insets.bottom + 16, 20) },
          ]}
        >
          <View
            accessibilityRole="alert"
            style={[
              styles.snackbar,
              tokens.shadows.elevation4,
              {
                backgroundColor: tokens.isDark
                  ? tokens.colors.surfaceElevated
                  : '#182230',
                borderRadius: tokens.radius.md,
                borderColor: tokens.isDark ? tokens.colors.borderStrong : 'transparent',
              },
            ]}
          >
            <RNText style={styles.snackbarMessage} numberOfLines={2}>
              {snackbar.message}
            </RNText>
            {snackbar.actionLabel && (
              <Pressable
                onPress={() => {
                  snackbar.onAction?.();
                  setSnackbar(null);
                }}
                hitSlop={8}
                style={styles.snackbarActionBtn}
              >
                <RNText style={styles.snackbarActionText}>
                  {snackbar.actionLabel}
                </RNText>
              </Pressable>
            )}
            <Pressable
              onPress={() => setSnackbar(null)}
              accessibilityLabel="Dismiss notification"
              hitSlop={8}
            >
              <X size={16} color="#94A3B8" />
            </Pressable>
          </View>
        </View>
      )}
    </ThemeContext.Provider>
  );
}

function NativeToastItem({
  toast,
  tokens,
  onClose,
}: {
  toast: ToastRecord;
  tokens: ThemeTokens;
  onClose: () => void;
}) {
  const configMap = {
    success: { Icon: CheckCircle2, color: tokens.colors.success },
    warning: { Icon: AlertTriangle, color: tokens.colors.warning },
    danger: { Icon: AlertCircle, color: tokens.colors.danger },
    info: { Icon: Info, color: tokens.colors.info },
  };
  const cfg = configMap[toast.type ?? 'info'];
  const IconComp = cfg.Icon;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.toastItem,
        tokens.shadows.elevation3,
        {
          backgroundColor: tokens.colors.surfaceElevated,
          borderColor: tokens.colors.border,
          borderLeftColor: cfg.color,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <IconComp size={18} color={cfg.color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {!!toast.title && (
          <RNText
            style={{
              fontSize: 13.5,
              fontWeight: '600',
              color: tokens.colors.textPrimary,
            }}
          >
            {toast.title}
          </RNText>
        )}
        {!!toast.message && (
          <RNText
            style={{
              fontSize: 12.5,
              color: tokens.colors.textSecondary,
              marginTop: 2,
            }}
          >
            {toast.message}
          </RNText>
        )}
      </View>
      <Pressable onPress={onClose} accessibilityLabel="Close toast" hitSlop={8}>
        <X size={15} color={tokens.colors.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
    alignItems: 'center',
  },
  toastItem: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  snackbarWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9998,
    alignItems: 'center',
  },
  snackbar: {
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  snackbarMessage: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  snackbarActionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  snackbarActionText: {
    color: '#7AA8EE',
    fontWeight: '600',
    fontSize: 13,
  },
});
```

---

FILE PATH: src/theme/index.ts

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/index.ts
 */

export * from './tokens/colors';
export * from './tokens/typography';
export * from './tokens/spacing';
export * from './tokens/radius';
export * from './tokens/shadows';
export * from './tokens/dimensions';
export * from './tokens/motion';
export * from './tokens/icons';

export * from './themes/light';
export * from './themes/dark';
export * from './themes/system';
export * from './ThemeProvider';
```

> **BATCH 1 COMPLETE (13/13 files)**

---

## BATCH 2 — FOUNDATION, BUTTONS & CARDS (12 FILES)

---

FILE PATH: src/components/foundation/Text.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/foundation/Text.tsx
 */

import React from 'react';
import {
  StyleProp,
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorTokenKey } from '../../theme/tokens/colors';
import {
  resolveTypographyStyle,
  TypographyVariant,
} from '../../theme/tokens/typography';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorTokenKey | (string & {});
  align?: TextStyle['textAlign'];
  truncate?: boolean;
  maxLines?: number;
  mono?: boolean;
  hindi?: boolean;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

const SECONDARY_TEXT_VARIANTS: TypographyVariant[] = [
  'ScreenSubtitle',
  'SectionDescription',
  'CardSubtitle',
  'BodySecondary',
  'HelperText',
];

const TERTIARY_TEXT_VARIANTS: TypographyVariant[] = [
  'Caption',
  'Overline',
  'StatisticLabel',
  'NavigationLabel',
];

export function Text({
  variant = 'BodyPrimary',
  color,
  align,
  truncate = false,
  maxLines,
  mono = false,
  hindi = false,
  style,
  numberOfLines,
  ellipsizeMode,
  children,
  ...rest
}: TextProps) {
  const { tokens } = useTheme();

  const defaultColor =
    variant === 'ErrorText'
      ? tokens.colors.danger
      : SECONDARY_TEXT_VARIANTS.includes(variant)
      ? tokens.colors.textSecondary
      : TERTIARY_TEXT_VARIANTS.includes(variant)
      ? tokens.colors.textTertiary
      : tokens.colors.textPrimary;

  const resolvedColor = color
    ? (tokens.colors[color as ColorTokenKey] ?? color)
    : defaultColor;

  const typographyStyle = resolveTypographyStyle(variant, tokens.typography, {
    hindi,
    mono,
  });

  const resolvedLines = truncate ? 1 : maxLines ?? numberOfLines;

  return (
    <RNText
      numberOfLines={resolvedLines}
      ellipsizeMode={resolvedLines ? ellipsizeMode ?? 'tail' : ellipsizeMode}
      style={[
        typographyStyle,
        {
          color: resolvedColor,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
```

---

FILE PATH: src/components/foundation/Icon.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/foundation/Icon.tsx
 */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorTokenKey } from '../../theme/tokens/colors';
import { IconSizeKey } from '../../theme/tokens/icons';

export interface IconProps {
  icon?: LucideIcon;
  size?: IconSizeKey | number;
  color?: ColorTokenKey | (string & {});
  active?: boolean;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function Icon({
  icon: IconComp,
  size = 'md',
  color,
  active = false,
  strokeWidth,
  style,
}: IconProps) {
  const { tokens } = useTheme();

  if (!IconComp) {
    return null;
  }

  const sizeMap: Record<IconSizeKey, number> = {
    xs: tokens.icons.iconXS,
    sm: tokens.icons.iconSM,
    md: tokens.icons.iconMD,
    lg: tokens.icons.iconLG,
    xl: tokens.icons.iconXL,
    '2xl': tokens.icons.icon2XL,
  };

  const px = typeof size === 'number' ? size : (sizeMap[size] ?? tokens.icons.iconMD);

  const resolvedColor = color
    ? (tokens.colors[color as ColorTokenKey] ?? color)
    : active
    ? tokens.colors.primary
    : tokens.colors.textSecondary;

  return (
    <IconComp
      size={px}
      strokeWidth={strokeWidth ?? tokens.icons.iconStrokeWidth}
      color={resolvedColor}
      style={style}
    />
  );
}
```

---

FILE PATH: src/components/foundation/Divider.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/foundation/Divider.tsx
 */

import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerVariant = 'subtle' | 'strong';

export interface DividerProps {
  orientation?: DividerOrientation;
  variant?: DividerVariant;
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Divider({
  orientation = 'horizontal',
  variant = 'subtle',
  inset = false,
  style,
}: DividerProps) {
  const { tokens } = useTheme();
  const color =
    variant === 'strong' ? tokens.colors.borderStrong : tokens.colors.divider;

  if (orientation === 'vertical') {
    return (
      <View
        accessible={false}
        style={[
          {
            width: 1,
            alignSelf: 'stretch',
            backgroundColor: color,
            marginVertical: inset ? 6 : 0,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      accessible={false}
      style={[
        {
          height: 1,
          backgroundColor: color,
          marginLeft: inset ? 16 : 0,
          marginRight: inset ? 16 : 0,
        },
        style,
      ]}
    />
  );
}
```

---

FILE PATH: src/components/foundation/Surface.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/foundation/Surface.tsx
 */

import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { RadiusKey } from '../../theme/tokens/radius';
import { SpacingTokens } from '../../theme/tokens/spacing';

export type SurfaceVariant = 'flat' | 'elevated' | 'outlined' | 'filled' | 'selected';

export interface SurfaceProps extends ViewProps {
  variant?: SurfaceVariant;
  padding?: keyof SpacingTokens | number;
  radius?: RadiusKey;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Surface({
  variant = 'outlined',
  padding,
  radius = 'lg',
  style,
  children,
  ...rest
}: SurfaceProps) {
  const { tokens } = useTheme();

  const variantStyleMap: Record<SurfaceVariant, ViewStyle> = {
    flat: {
      backgroundColor: tokens.colors.surface,
      borderWidth: 0,
      ...tokens.shadows.elevation0,
    },
    elevated: {
      backgroundColor: tokens.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: tokens.isDark ? tokens.colors.border : tokens.colors.borderSubtle,
      ...tokens.shadows.elevation2,
    },
    outlined: {
      backgroundColor: tokens.colors.surface,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      ...tokens.shadows.elevation1,
    },
    filled: {
      backgroundColor: tokens.colors.surfaceTertiary,
      borderWidth: 1,
      borderColor: 'transparent',
      ...tokens.shadows.elevation0,
    },
    selected: {
      backgroundColor: tokens.colors.surfaceSelected,
      borderWidth: 1.5,
      borderColor: tokens.colors.borderSelected,
      ...tokens.shadows.elevation0,
    },
  };

  const resolvedPadding =
    padding === undefined
      ? undefined
      : typeof padding === 'number'
      ? padding
      : tokens.spacing[padding];

  return (
    <View
      style={[
        variantStyleMap[variant] ?? variantStyleMap.outlined,
        {
          borderRadius: tokens.radius[radius] ?? tokens.radius.lg,
          padding: resolvedPadding,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
```

---

FILE PATH: src/components/foundation/Spacer.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/foundation/Spacer.tsx
 */

import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { SpacingTokens } from '../../theme/tokens/spacing';

export interface SpacerProps {
  size?: keyof SpacingTokens | number;
  horizontal?: boolean;
}

export function Spacer({ size = 16, horizontal = false }: SpacerProps) {
  const { tokens } = useTheme();
  const px =
    typeof size === 'number'
      ? (tokens.spacing[size as keyof SpacingTokens] ?? size)
      : tokens.spacing[size];

  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={horizontal ? { width: px, flexShrink: 0 } : { height: px, flexShrink: 0 }}
    />
  );
}
```

---

FILE PATH: src/components/buttons/Button.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/buttons/Button.tsx
 */

import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text as RNText,
  TextStyle,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../foundation/Icon';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'ghost'
  | 'text'
  | 'destructive';

export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  variant = 'primary',
  size = 'medium',
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  loading = false,
  disabled = false,
  onPress,
  children,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { tokens } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isDisabled = disabled || loading;

  const sizeCfg = {
    small: {
      height: tokens.dimensions.buttonHeightSmall,
      px: 12,
      fontSize: 13,
      iconSize: 15,
      gap: 6,
    },
    medium: {
      height: tokens.dimensions.buttonHeightMedium,
      px: 16,
      fontSize: 14,
      iconSize: 17,
      gap: 8,
    },
    large: {
      height: tokens.dimensions.buttonHeightLarge,
      px: 20,
      fontSize: 15,
      iconSize: 19,
      gap: 8,
    },
  }[size];

  const getVariantColors = (pressed: boolean) => {
    switch (variant) {
      case 'primary':
        return {
          bg: pressed ? tokens.colors.primaryDark : tokens.colors.primary,
          color: tokens.colors.textInverse,
          border: 'transparent',
          px: sizeCfg.px,
        };
      case 'secondary':
        return {
          bg: pressed ? tokens.colors.surfaceSelected : tokens.colors.primaryLight,
          color: tokens.colors.primary,
          border: 'transparent',
          px: sizeCfg.px,
        };
      case 'tertiary':
        return {
          bg: pressed ? tokens.colors.backgroundTertiary : tokens.colors.surfaceTertiary,
          color: tokens.colors.textPrimary,
          border: 'transparent',
          px: sizeCfg.px,
        };
      case 'outline':
        return {
          bg: pressed ? tokens.colors.surfaceSecondary : 'transparent',
          color: tokens.colors.textPrimary,
          border: tokens.colors.borderStrong,
          px: sizeCfg.px,
        };
      case 'ghost':
        return {
          bg: pressed ? tokens.colors.surfaceTertiary : 'transparent',
          color: tokens.colors.textPrimary,
          border: 'transparent',
          px: sizeCfg.px,
        };
      case 'text':
        return {
          bg: 'transparent',
          color: tokens.colors.primary,
          border: 'transparent',
          px: 6,
        };
      case 'destructive':
        return {
          bg: pressed ? '#A82929' : tokens.colors.danger,
          color: '#FFFFFF',
          border: 'transparent',
          px: sizeCfg.px,
        };
    }
  };

  const handlePressIn = () => {
    if (isDisabled || tokens.motion.reducedMotion) return;
    Animated.timing(scaleAnim, {
      toValue: tokens.motion.pressScale,
      duration: tokens.motion.durationFast,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (tokens.motion.reducedMotion) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: tokens.motion.durationFast,
      useNativeDriver: true,
    }).start();
  };

  const hitSlop =
    sizeCfg.height < tokens.dimensions.touchTargetSize
      ? {
          top: Math.ceil((tokens.dimensions.touchTargetSize - sizeCfg.height) / 2),
          bottom: Math.ceil((tokens.dimensions.touchTargetSize - sizeCfg.height) / 2),
          left: 4,
          right: 4,
        }
      : undefined;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth ? styles.fullWidth : styles.autoWidth,
      ]}
    >
      <Pressable
        testID={testID}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
        }
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => {
          const vc = getVariantColors(pressed);
          return [
            styles.base,
            {
              height: sizeCfg.height,
              paddingHorizontal: vc.px,
              gap: sizeCfg.gap,
              borderRadius: tokens.radius.md,
              backgroundColor: isDisabled ? tokens.colors.surfaceDisabled : vc.bg,
              borderColor: isDisabled ? tokens.colors.borderSubtle : vc.border,
              opacity: isDisabled ? 0.72 : 1,
            },
            fullWidth && styles.fullWidth,
            style,
          ];
        }}
      >
        {({ pressed }) => {
          const vc = getVariantColors(pressed);
          const fgColor = isDisabled ? tokens.colors.textDisabled : vc.color;
          return (
            <>
              {loading ? (
                <ActivityIndicator size="small" color={fgColor} />
              ) : (
                leadingIcon && (
                  <Icon icon={leadingIcon} size={sizeCfg.iconSize} color={fgColor} />
                )
              )}
              {children !== undefined && children !== null && (
                <RNText
                  numberOfLines={1}
                  style={[
                    {
                      color: fgColor,
                      fontFamily: tokens.typography.fontFamilyPrimary,
                      fontSize: Math.round(sizeCfg.fontSize * tokens.typography.scale * 10) / 10,
                      fontWeight: '600',
                      includeFontPadding: false,
                    },
                    textStyle,
                  ]}
                >
                  {children}
                </RNText>
              )}
              {!loading && trailingIcon && (
                <Icon icon={trailingIcon} size={sizeCfg.iconSize} color={fgColor} />
              )}
            </>
          );
        }}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  autoWidth: {
    alignSelf: 'flex-start',
  },
});
```

---

FILE PATH: src/components/buttons/IconButton.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/buttons/IconButton.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../foundation/Icon';

export type IconButtonVariant = 'ghost' | 'primary' | 'secondary' | 'outline';
export type IconButtonSize = 'small' | 'medium' | 'large';

export interface IconButtonProps {
  icon: LucideIcon;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'medium',
  label,
  disabled = false,
  active = false,
  onPress,
  style,
  testID,
}: IconButtonProps) {
  const { tokens } = useTheme();

  const dim = size === 'small' ? 32 : size === 'large' ? 46 : 38;
  const iconPx = size === 'small' ? 16 : size === 'large' ? 22 : 18;
  const extraSlop = Math.max(0, Math.ceil((tokens.dimensions.touchTargetSize - dim) / 2));

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      hitSlop={extraSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      style={({ pressed }) => {
        const bg =
          variant === 'primary'
            ? pressed
              ? tokens.colors.primaryDark
              : tokens.colors.primary
            : variant === 'secondary' || active
            ? tokens.colors.primaryLight
            : variant === 'outline'
            ? pressed
              ? tokens.colors.surfaceSecondary
              : tokens.colors.surface
            : pressed
            ? tokens.colors.surfaceTertiary
            : 'transparent';

        return [
          styles.base,
          {
            width: dim,
            height: dim,
            borderRadius: tokens.radius.md,
            backgroundColor: disabled ? tokens.colors.surfaceDisabled : bg,
            borderColor:
              variant === 'outline' ? tokens.colors.border : 'transparent',
            opacity: disabled ? 0.65 : 1,
          },
          style,
        ];
      }}
    >
      <Icon
        icon={icon}
        size={iconPx}
        color={
          disabled
            ? tokens.colors.textDisabled
            : variant === 'primary'
            ? tokens.colors.textInverse
            : active || variant === 'secondary'
            ? tokens.colors.primary
            : tokens.colors.textSecondary
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
});
```

---

FILE PATH: src/components/buttons/FloatingButton.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/buttons/FloatingButton.tsx
 */

import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text as RNText,
  ViewStyle,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../foundation/Icon';

export interface FloatingButtonProps {
  icon?: LucideIcon;
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function FloatingButton({
  icon = Plus,
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: FloatingButtonProps) {
  const { tokens } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || tokens.motion.reducedMotion) return;
    Animated.timing(scaleAnim, {
      toValue: tokens.motion.pressScale,
      duration: tokens.motion.durationFast,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (tokens.motion.reducedMotion) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: tokens.motion.durationFast,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], alignSelf: 'flex-start' }}>
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? 'Quick action'}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.base,
          tokens.shadows.elevation3,
          {
            paddingHorizontal: label ? 18 : 14,
            borderRadius: tokens.radius.full,
            backgroundColor: disabled
              ? tokens.colors.surfaceDisabled
              : pressed
              ? tokens.colors.primaryDark
              : tokens.colors.primary,
          },
          style,
        ]}
      >
        <Icon
          icon={icon}
          size={20}
          color={disabled ? tokens.colors.textDisabled : tokens.colors.textInverse}
        />
        {!!label && (
          <RNText
            style={{
              color: disabled ? tokens.colors.textDisabled : tokens.colors.textInverse,
              fontFamily: tokens.typography.fontFamilyPrimary,
              fontSize: Math.round(14 * tokens.typography.scale * 10) / 10,
              fontWeight: '600',
              includeFontPadding: false,
            }}
          >
            {label}
          </RNText>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
```

---

FILE PATH: src/components/cards/BaseCard.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/cards/BaseCard.tsx
 */

import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Surface, SurfaceVariant } from '../foundation/Surface';

export interface BaseCardProps {
  variant?: SurfaceVariant;
  interactive?: boolean;
  selected?: boolean;
  compact?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}

export function BaseCard({
  variant,
  interactive = false,
  selected = false,
  compact = false,
  onPress,
  accessibilityLabel,
  style,
  children,
  testID,
}: BaseCardProps) {
  const { tokens } = useTheme();
  const resolvedVariant: SurfaceVariant = selected
    ? 'selected'
    : (variant ?? tokens.cardAppearance ?? 'outlined');
  const paddingValue = compact ? 12 : tokens.spacing.cardPadding;

  if (interactive || onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected }}
      >
        {({ pressed }) => (
          <Surface
            variant={resolvedVariant}
            padding={paddingValue}
            radius="lg"
            style={[
              pressed && !selected
                ? { borderColor: tokens.colors.borderStrong, opacity: 0.96 }
                : undefined,
              style,
            ]}
          >
            {children}
          </Surface>
        )}
      </Pressable>
    );
  }

  return (
    <Surface
      testID={testID}
      variant={resolvedVariant}
      padding={paddingValue}
      radius="lg"
      style={style}
    >
      {children}
    </Surface>
  );
}
```

---

FILE PATH: src/components/cards/StatisticCard.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/cards/StatisticCard.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { BaseCard } from './BaseCard';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Badge } from '../feedback/Badge';

export interface StatisticCardProps {
  label: string;
  value: string | number;
  delta?: string;
  positive?: boolean;
  icon?: LucideIcon;
  subtitle?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StatisticCard({
  label,
  value,
  delta,
  positive = true,
  icon,
  subtitle,
  compact = false,
  style,
}: StatisticCardProps) {
  const { tokens } = useTheme();

  return (
    <BaseCard compact={compact} style={style}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Text variant="StatisticLabel">{label}</Text>
          <View style={styles.valueRow}>
            <Text
              variant="StatisticValue"
              style={compact ? { fontSize: Math.round(22 * tokens.typography.scale) } : undefined}
            >
              {value}
            </Text>
            {!!delta && (
              <Badge variant={positive ? 'success' : 'danger'} size="sm">
                {delta}
              </Badge>
            )}
          </View>
          {!!subtitle && (
            <Text variant="Caption" style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
        {icon && (
          <View
            style={[
              styles.iconBox,
              {
                borderRadius: tokens.radius.md,
                backgroundColor: tokens.colors.primaryLight,
              },
            ]}
          >
            <Icon icon={icon} size={18} color="primary" />
          </View>
        )}
      </View>
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  subtitle: {
    marginTop: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
```

---

FILE PATH: src/components/cards/ProgressCard.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/cards/ProgressCard.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BaseCard } from './BaseCard';
import { Text } from '../foundation/Text';
import { Badge, BadgeVariant } from '../feedback/Badge';
import { ProgressBar } from '../data-display/ProgressBar';

export interface ProgressCardBadge {
  label: string;
  variant?: BadgeVariant;
}

export interface ProgressCardProps {
  title: string;
  subtitle?: string;
  progress?: number;
  meta?: string;
  badge?: ProgressCardBadge;
  hindi?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ProgressCard({
  title,
  subtitle,
  progress = 0,
  meta,
  badge,
  hindi = false,
  onPress,
  style,
}: ProgressCardProps) {
  return (
    <BaseCard interactive={!!onPress} onPress={onPress} style={style}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text variant="CardTitle" hindi={hindi}>
            {title}
          </Text>
          {!!subtitle && (
            <Text variant="CardSubtitle" hindi={hindi} style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
        {badge && (
          <Badge variant={badge.variant ?? 'neutral'} size="sm">
            {badge.label}
          </Badge>
        )}
      </View>

      <ProgressBar value={progress} showLabel={false} />

      <View style={styles.footerRow}>
        <Text variant="Caption">{meta ?? `${progress}% completed`}</Text>
        <Text variant="Caption" color="primary" style={styles.pctText}>
          {progress}%
        </Text>
      </View>
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  pctText: {
    fontWeight: '600',
  },
});
```

---

FILE PATH: src/components/cards/FeatureCard.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/cards/FeatureCard.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { BaseCard } from './BaseCard';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Badge, BadgeVariant } from '../feedback/Badge';

export interface FeatureCardBadge {
  label: string;
  variant?: BadgeVariant;
}

export interface FeatureCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: FeatureCardBadge;
  actionLabel?: string;
  onPress?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function FeatureCard({
  title,
  description,
  icon,
  badge,
  actionLabel,
  onPress,
  compact = false,
  style,
}: FeatureCardProps) {
  const { tokens } = useTheme();

  return (
    <BaseCard interactive={!!onPress} onPress={onPress} compact={compact} style={style}>
      <View style={styles.row}>
        {icon && (
          <View
            style={[
              styles.iconBox,
              {
                borderRadius: tokens.radius.md,
                backgroundColor: tokens.colors.surfaceTertiary,
                borderColor: tokens.colors.borderSubtle,
              },
            ]}
          >
            <Icon icon={icon} size={20} color="primary" />
          </View>
        )}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text variant="CardTitle">{title}</Text>
            {badge && (
              <Badge variant={badge.variant ?? 'primary'} size="sm">
                {badge.label}
              </Badge>
            )}
          </View>
          {!!description && (
            <Text variant="CardSubtitle" style={styles.description}>
              {description}
            </Text>
          )}
          {!!actionLabel && (
            <View style={styles.actionRow}>
              <Text variant="Caption" color="primary" style={styles.actionText}>
                {actionLabel}
              </Text>
              <ChevronRight size={14} color={tokens.colors.primary} />
            </View>
          )}
        </View>
      </View>
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  description: {
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
```

> **BATCH 2 COMPLETE (12/12 files)**

---

## BATCH 3 — LAYOUT, FORMS & FEEDBACK COMPONENTS (19 FILES)

---

FILE PATH: src/components/layout/ScreenContainer.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/layout/ScreenContainer.tsx
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';

export interface ScreenContainerProps {
  children?: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  maxWidth?: number;
  safeAreaEdges?: Edge[];
  keyboardAvoiding?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function ScreenContainer({
  children,
  scrollable = false,
  padding = true,
  maxWidth,
  safeAreaEdges = ['left', 'right'],
  keyboardAvoiding = false,
  style,
  contentContainerStyle,
}: ScreenContainerProps) {
  const { tokens } = useTheme();
  const resolvedMaxWidth = maxWidth ?? tokens.dimensions.contentMaxWidth;
  const pad = padding ? tokens.spacing.screenPadding : 0;

  const innerContent = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.centered,
        {
          maxWidth: resolvedMaxWidth,
          padding: pad,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        styles.centered,
        {
          maxWidth: resolvedMaxWidth,
          padding: pad,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {innerContent}
    </KeyboardAvoidingView>
  ) : (
    innerContent
  );

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[styles.flex, { backgroundColor: tokens.colors.background }, style]}
    >
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    width: '100%',
    alignSelf: 'center',
  },
});
```

---

FILE PATH: src/components/layout/ScreenHeader.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/layout/ScreenHeader.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { IconButton } from '../buttons/IconButton';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  onBackPress,
  rightActions,
  safeTop = false,
  style,
}: ScreenHeaderProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          minHeight: tokens.dimensions.screenHeaderHeight + (safeTop ? insets.top : 0),
          paddingTop: safeTop ? insets.top + 8 : 10,
          paddingBottom: 10,
          paddingHorizontal: tokens.spacing.screenPadding,
          backgroundColor: tokens.colors.surface,
          borderBottomColor: tokens.colors.divider,
        },
        style,
      ]}
    >
      <View style={styles.leftRow}>
        {onBackPress && (
          <IconButton
            icon={ArrowLeft}
            label="Go back"
            size="small"
            onPress={onBackPress}
          />
        )}
        <View style={styles.titleBlock}>
          <Text variant="SectionTitle" truncate accessibilityRole="header">
            {title}
          </Text>
          {!!subtitle && (
            <Text variant="Caption" truncate>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {!!rightActions && <View style={styles.rightRow}>{rightActions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
});
```

---

FILE PATH: src/components/layout/SectionHeader.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/layout/SectionHeader.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Button } from '../buttons/Button';
import { IconButton } from '../buttons/IconButton';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  accentIndicator?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  subtitle,
  description,
  icon,
  actionLabel,
  onAction,
  accentIndicator = false,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  compact = false,
  style,
}: SectionHeaderProps) {
  const { tokens } = useTheme();

  const leftContent = (
    <View style={styles.leftRow}>
      {accentIndicator && (
        <View
          style={[
            styles.accentBar,
            { backgroundColor: tokens.colors.primary },
          ]}
        />
      )}
      {icon && <Icon icon={icon} size={18} color="primary" />}
      <View style={styles.titleBlock}>
        <Text
          variant={compact ? 'CardTitle' : 'SectionTitle'}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {!!subtitle && <Text variant="Caption">{subtitle}</Text>}
      </View>
    </View>
  );

  return (
    <View style={[{ marginBottom: compact ? 8 : 12 }, style]}>
      <View style={styles.topRow}>
        {collapsible ? (
          <Pressable
            onPress={onToggleCollapse}
            style={styles.flex}
            accessibilityRole="button"
            accessibilityState={{ expanded: !collapsed }}
          >
            {leftContent}
          </Pressable>
        ) : (
          <View style={styles.flex}>{leftContent}</View>
        )}

        <View style={styles.rightRow}>
          {!!actionLabel && (
            <Button
              variant="text"
              size="small"
              trailingIcon={ChevronRight}
              onPress={onAction}
            >
              {actionLabel}
            </Button>
          )}
          {collapsible && (
            <IconButton
              icon={collapsed ? ChevronRight : ChevronDown}
              size="small"
              label={collapsed ? 'Expand section' : 'Collapse section'}
              onPress={onToggleCollapse}
            />
          )}
        </View>
      </View>

      {!!description && (
        <Text variant="SectionDescription" style={styles.description}>
          {description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  accentBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  description: {
    marginTop: 4,
  },
});
```

---

FILE PATH: src/components/layout/SectionContainer.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/layout/SectionContainer.tsx
 */

import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface SectionContainerProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionContainer({ children, style }: SectionContainerProps) {
  const { tokens } = useTheme();
  return (
    <View style={[{ marginBottom: tokens.spacing.sectionSpacing }, style]}>
      {children}
    </View>
  );
}
```

---

FILE PATH: src/components/layout/PageLayout.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/layout/PageLayout.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { ScreenContainer } from './ScreenContainer';

export interface PageLayoutProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  keyboardAvoiding?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function PageLayout({
  header,
  footer,
  scrollable = true,
  padding = true,
  keyboardAvoiding = false,
  style,
  contentContainerStyle,
  children,
}: PageLayoutProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: tokens.colors.background }, style]}>
      {header}
      <ScreenContainer
        scrollable={scrollable}
        padding={padding}
        keyboardAvoiding={keyboardAvoiding}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </ScreenContainer>
      {!!footer && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: tokens.colors.surface,
              borderTopColor: tokens.colors.divider,
              paddingBottom: Math.max(insets.bottom, 12),
              paddingHorizontal: tokens.spacing.screenPadding,
            },
          ]}
        >
          {footer}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
});
```

---

FILE PATH: src/components/forms/TextInput.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/TextInput.tsx
 */

import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';

export type SSDSInputType = 'text' | 'email' | 'password' | 'numeric';

export interface TextInputProps
  extends Omit<RNTextInputProps, 'onChange' | 'onChangeText' | 'style'> {
  label?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  type?: SSDSInputType;
  helperText?: string;
  errorText?: string;
  successText?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  multiline?: boolean;
  rows?: number;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  type = 'text',
  helperText,
  errorText,
  successText,
  required = false,
  disabled = false,
  readOnly = false,
  multiline = false,
  rows = 3,
  leadingIcon,
  trailingIcon,
  style,
  ...rest
}: TextInputProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const editable = !disabled && !readOnly;

  const keyboardType: KeyboardTypeOptions =
    type === 'email'
      ? 'email-address'
      : type === 'numeric'
      ? 'numeric'
      : 'default';

  const borderColor = errorText
    ? tokens.colors.danger
    : successText
    ? tokens.colors.success
    : focused
    ? tokens.colors.borderFocused
    : tokens.colors.border;

  return (
    <View style={[styles.wrapper, style]}>
      {!!label && (
        <View style={styles.labelRow}>
          <Text variant="InputLabel">{label}</Text>
          {required && (
            <Text variant="InputLabel" color="danger">
              *
            </Text>
          )}
        </View>
      )}

      <View
        style={[
          styles.inputBox,
          {
            minHeight: multiline
              ? rows * 22 + 20
              : tokens.dimensions.inputHeight,
            alignItems: multiline ? 'flex-start' : 'center',
            paddingVertical: multiline ? 10 : 0,
            paddingHorizontal: tokens.spacing.inputPadding,
            borderRadius: tokens.radius.md,
            borderColor,
            backgroundColor: disabled
              ? tokens.colors.surfaceDisabled
              : readOnly
              ? tokens.colors.surfaceSecondary
              : tokens.colors.surface,
          },
        ]}
      >
        {leadingIcon && (
          <Icon
            icon={leadingIcon}
            size={17}
            color={focused ? 'primary' : 'textTertiary'}
            style={multiline ? { marginTop: 2 } : undefined}
          />
        )}

        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.colors.textPlaceholder}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? rows : 1}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={type === 'email' || isPassword ? 'none' : 'sentences'}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: disabled
                ? tokens.colors.textDisabled
                : tokens.colors.textPrimary,
              fontFamily: tokens.typography.fontFamilyPrimary,
              fontSize: Math.round(14 * tokens.typography.scale * 10) / 10,
            },
          ]}
          {...rest}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((p) => !p)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon icon={showPassword ? EyeOff : Eye} size={17} color="textTertiary" />
          </Pressable>
        ) : (
          trailingIcon && <Icon icon={trailingIcon} size={17} color="textTertiary" />
        )}
      </View>

      {errorText ? (
        <Text variant="ErrorText">{errorText}</Text>
      ) : successText ? (
        <Text variant="HelperText" color="success">
          {successText}
        </Text>
      ) : helperText ? (
        <Text variant="HelperText">{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputBox: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
  },
});
```

---

FILE PATH: src/components/forms/SearchInput.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/SearchInput.tsx
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../foundation/Icon';

export interface SearchInputProps {
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search notes, tests, PYQs...',
  onClear,
  style,
}: SearchInputProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius: tokens.radius.md,
          backgroundColor: tokens.colors.surfaceSecondary,
          borderColor: focused ? tokens.colors.borderFocused : tokens.colors.border,
        },
        style,
      ]}
    >
      <Icon icon={Search} size={16} color={focused ? 'primary' : 'textTertiary'} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.textPlaceholder}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.fontFamilyPrimary,
            fontSize: Math.round(13.5 * tokens.typography.scale * 10) / 10,
          },
        ]}
      />
      {!!value && (
        <Pressable
          onPress={() => {
            onChangeText?.('');
            onClear?.();
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Icon icon={X} size={15} color="textTertiary" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 6,
  },
});
```

---

FILE PATH: src/components/forms/Select.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/Select.tsx
 *
 * Native Adaptation:
 * Replaces HTML <select> with an accessible Pressable trigger + React Native Modal sheet.
 */

import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { IconButton } from '../buttons/IconButton';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  label?: string;
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  helperText?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Select({
  label,
  value,
  placeholder = 'Select an option',
  options,
  onChange,
  helperText,
  disabled = false,
  style,
}: SelectProps) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={[styles.wrapper, style]}>
      {!!label && <Text variant="InputLabel">{label}</Text>}

      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityState={{ disabled, expanded: open }}
        style={[
          styles.trigger,
          {
            height: tokens.dimensions.inputHeight,
            borderRadius: tokens.radius.md,
            backgroundColor: disabled
              ? tokens.colors.surfaceDisabled
              : tokens.colors.surface,
            borderColor: open ? tokens.colors.borderFocused : tokens.colors.border,
          },
        ]}
      >
        <Text
          variant="BodySecondary"
          color={
            disabled
              ? 'textDisabled'
              : selectedOption
              ? 'textPrimary'
              : 'textPlaceholder'
          }
          truncate
          style={styles.triggerText}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <Icon icon={ChevronDown} size={16} color="textTertiary" />
      </Pressable>

      {!!helperText && <Text variant="HelperText">{helperText}</Text>}

      <Modal
        visible={open}
        transparent
        animationType={tokens.motion.reducedMotion ? 'none' : 'fade'}
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              tokens.shadows.elevation5,
              {
                backgroundColor: tokens.colors.surfaceElevated,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.xl,
                maxWidth: tokens.dimensions.modalMaxWidth,
              },
            ]}
            onPress={() => undefined}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: tokens.colors.divider }]}>
              <Text variant="SectionTitle">{label ?? 'Select Option'}</Text>
              <IconButton
                icon={X}
                size="small"
                label="Close selector"
                onPress={() => setOpen(false)}
              />
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange?.(item.value);
                      setOpen(false);
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        backgroundColor: isSelected
                          ? tokens.colors.surfaceSelected
                          : pressed
                          ? tokens.colors.surfaceSecondary
                          : 'transparent',
                        borderRadius: tokens.radius.md,
                      },
                    ]}
                  >
                    <Text
                      variant="BodyPrimary"
                      color={isSelected ? 'primary' : 'textPrimary'}
                      style={{ flex: 1, fontWeight: isSelected ? '600' : '400' }}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Icon icon={Check} size={18} color="primary" />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  triggerText: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 25, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  list: {
    padding: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    gap: 8,
  },
});
```

---

FILE PATH: src/components/forms/Checkbox.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/Checkbox.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  style,
}: CheckboxProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={() => !disabled && onChange?.(!checked)}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      style={[styles.row, { opacity: disabled ? 0.55 : 1 }, style]}
    >
      <View
        style={[
          styles.box,
          {
            borderRadius: tokens.radius.xs,
            borderColor: checked ? tokens.colors.primary : tokens.colors.borderStrong,
            backgroundColor: checked ? tokens.colors.primary : tokens.colors.surface,
          },
        ]}
      >
        {checked && (
          <Check size={13} strokeWidth={2.5} color={tokens.colors.textInverse} />
        )}
      </View>

      {(!!label || !!description) && (
        <View style={styles.textBlock}>
          {!!label && (
            <Text variant="BodySecondary" color="textPrimary" style={styles.label}>
              {label}
            </Text>
          )}
          {!!description && <Text variant="Caption">{description}</Text>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  box: {
    width: 20,
    height: 20,
    marginTop: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontWeight: '500',
  },
});
```

---

FILE PATH: src/components/forms/Radio.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/Radio.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export interface RadioProps {
  checked: boolean;
  onPress?: () => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Radio({
  checked,
  onPress,
  label,
  disabled = false,
  style,
}: RadioProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={() => !disabled && onPress?.()}
      hitSlop={6}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: checked, disabled }}
      style={[styles.row, { opacity: disabled ? 0.55 : 1 }, style]}
    >
      <View
        style={[
          styles.outer,
          {
            borderColor: checked ? tokens.colors.primary : tokens.colors.borderStrong,
            backgroundColor: tokens.colors.surface,
          },
        ]}
      >
        {checked && (
          <View style={[styles.inner, { backgroundColor: tokens.colors.primary }]} />
        )}
      </View>
      {!!label && (
        <Text variant="BodySecondary" color="textPrimary">
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  outer: {
    width: 20,
    height: 20,
    borderRadius: 9999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inner: {
    width: 10,
    height: 10,
    borderRadius: 9999,
  },
});
```

---

FILE PATH: src/components/forms/Switch.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/Switch.tsx
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  style,
}: SwitchProps) {
  const { tokens } = useTheme();
  const translateX = useRef(new Animated.Value(checked ? 20 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: checked ? 20 : 0,
      duration: tokens.motion.durationFast,
      useNativeDriver: true,
    }).start();
  }, [checked, tokens.motion.durationFast, translateX]);

  return (
    <View style={[styles.row, { opacity: disabled ? 0.55 : 1 }, style]}>
      {(!!label || !!description) && (
        <View style={styles.textBlock}>
          {!!label && (
            <Text variant="BodySecondary" color="textPrimary" style={styles.label}>
              {label}
            </Text>
          )}
          {!!description && <Text variant="Caption">{description}</Text>}
        </View>
      )}

      <Pressable
        disabled={disabled}
        onPress={() => !disabled && onChange?.(!checked)}
        hitSlop={8}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked, disabled }}
        style={[
          styles.track,
          {
            backgroundColor: checked
              ? tokens.colors.primary
              : tokens.colors.borderStrong,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX }] },
          ]}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontWeight: '500',
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 9999,
    padding: 3,
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
});
```

---

FILE PATH: src/components/forms/SegmentedControl.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/SegmentedControl.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';

export interface SegmentedOption<T extends string | number = string> {
  label: string;
  value: T;
  icon?: LucideIcon;
}

export interface SegmentedControlProps<T extends string | number = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange?: (value: T) => void;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string | number = string>({
  options,
  value,
  onChange,
  fullWidth = false,
  style,
}: SegmentedControlProps<T>) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          borderRadius: tokens.radius.md,
          backgroundColor: tokens.colors.surfaceTertiary,
          borderColor: tokens.colors.borderSubtle,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange?.(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.item,
              fullWidth && styles.flexItem,
              active && tokens.shadows.elevation1,
              {
                borderRadius: Math.max(tokens.radius.sm, 4),
                backgroundColor: active ? tokens.colors.surface : 'transparent',
              },
            ]}
          >
            {opt.icon && (
              <Icon
                icon={opt.icon}
                size={14}
                color={active ? 'primary' : 'textSecondary'}
              />
            )}
            <Text
              variant="Caption"
              color={active ? 'textPrimary' : 'textSecondary'}
              style={{
                fontSize: 13,
                fontWeight: active ? '600' : '500',
              }}
              truncate
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    minHeight: 34,
    gap: 6,
  },
  flexItem: {
    flex: 1,
  },
});
```

---

FILE PATH: src/components/forms/Slider.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/Slider.tsx
 *
 * Pure React Native Slider using PanResponder so zero additional native
 * packages are required beyond core React Native.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export interface SliderProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange?: (value: number) => void;
  style?: StyleProp<ViewStyle>;
}

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  disabled = false,
  onChange,
  style,
}: SliderProps) {
  const { tokens } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);

  const clampAndSnap = (ratio: number) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const raw = min + clampedRatio * (max - min);
    const snapped = Math.round((raw - min) / step) * step + min;
    return Math.max(min, Math.min(max, Math.round(snapped * 1000) / 1000));
  };

  const updateFromLocationX = (locationX: number) => {
    if (disabled || trackWidthRef.current <= 0) return;
    const next = clampAndSnap(locationX / trackWidthRef.current);
    onChange?.(next);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          updateFromLocationX(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          updateFromLocationX(evt.nativeEvent.locationX);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, min, max, step, onChange]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWidthRef.current = w;
    setTrackWidth(w);
  };

  const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const thumbLeft = Math.max(0, ratio * trackWidth - 10);

  return (
    <View style={[styles.wrapper, { opacity: disabled ? 0.5 : 1 }, style]}>
      {!!label && (
        <View style={styles.headerRow}>
          <Text variant="InputLabel">{label}</Text>
          <Text variant="Caption" color="primary" style={{ fontWeight: '600' }}>
            {value}
            {unit}
          </Text>
        </View>
      )}

      <View
        onLayout={handleLayout}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        style={styles.touchArea}
        {...panResponder.panHandlers}
      >
        <View
          pointerEvents="none"
          style={[
            styles.track,
            { backgroundColor: tokens.colors.surfaceTertiary },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                width: `${ratio * 100}%`,
                backgroundColor: tokens.colors.primary,
              },
            ]}
          />
        </View>
        {trackWidth > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              tokens.shadows.elevation2,
              {
                left: thumbLeft,
                backgroundColor: tokens.colors.primary,
                borderColor: tokens.colors.surface,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  touchArea: {
    height: 36,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 9999,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 9999,
    borderWidth: 2,
  },
});
```

---

FILE PATH: src/components/feedback/Badge.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/Badge.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'completed'
  | 'warning'
  | 'pending'
  | 'danger'
  | 'live'
  | 'info'
  | 'new'
  | 'premium'
  | 'neutral';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  style,
}: BadgeProps) {
  const { tokens } = useTheme();

  const paletteMap: Record<BadgeVariant, { bg: string; color: string }> = {
    primary: { bg: tokens.colors.primaryLight, color: tokens.colors.primary },
    secondary: { bg: tokens.colors.secondaryLight, color: tokens.colors.secondary },
    success: { bg: tokens.colors.successBackground, color: tokens.colors.success },
    completed: { bg: tokens.colors.successBackground, color: tokens.colors.success },
    warning: { bg: tokens.colors.warningBackground, color: tokens.colors.warning },
    pending: { bg: tokens.colors.warningBackground, color: tokens.colors.warning },
    danger: { bg: tokens.colors.dangerBackground, color: tokens.colors.danger },
    live: { bg: tokens.colors.dangerBackground, color: tokens.colors.danger },
    info: { bg: tokens.colors.infoBackground, color: tokens.colors.info },
    new: { bg: tokens.colors.infoBackground, color: tokens.colors.info },
    premium: { bg: tokens.colors.accentSoft, color: tokens.colors.accent },
    neutral: { bg: tokens.colors.neutralBackground, color: tokens.colors.neutral },
  };

  const palette = paletteMap[variant] ?? paletteMap.neutral;

  return (
    <View
      style={[
        styles.badge,
        {
          paddingVertical: size === 'sm' ? 2 : 4,
          paddingHorizontal: size === 'sm' ? 7 : 10,
          borderRadius: tokens.radius.sm,
          backgroundColor: palette.bg,
        },
        style,
      ]}
    >
      {(dot || variant === 'live') && (
        <View style={[styles.dot, { backgroundColor: palette.color }]} />
      )}
      <Text
        variant="Caption"
        color={palette.color}
        style={{
          fontSize: size === 'sm' ? 11 : 12,
          fontWeight: '600',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 9999,
  },
});
```

---

FILE PATH: src/components/feedback/Toast.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/Toast.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export type ToastType = 'info' | 'success' | 'warning' | 'danger';

export interface ToastProps {
  type?: ToastType;
  title?: string;
  message?: string;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Toast({
  type = 'info',
  title,
  message,
  onClose,
  style,
}: ToastProps) {
  const { tokens } = useTheme();

  const map = {
    success: { Icon: CheckCircle2, color: tokens.colors.success },
    warning: { Icon: AlertTriangle, color: tokens.colors.warning },
    danger: { Icon: AlertCircle, color: tokens.colors.danger },
    info: { Icon: Info, color: tokens.colors.info },
  };
  const cfg = map[type];
  const IconComp = cfg.Icon;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        tokens.shadows.elevation3,
        {
          backgroundColor: tokens.colors.surfaceElevated,
          borderColor: tokens.colors.border,
          borderLeftColor: cfg.color,
          borderRadius: tokens.radius.md,
        },
        style,
      ]}
    >
      <IconComp size={18} color={cfg.color} style={{ marginTop: 1 }} />
      <View style={styles.content}>
        {!!title && (
          <Text variant="CardTitle" style={{ fontSize: 13.5 }}>
            {title}
          </Text>
        )}
        {!!message && (
          <Text variant="Caption" color="textSecondary" style={{ marginTop: 2 }}>
            {message}
          </Text>
        )}
      </View>
      {onClose && (
        <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close toast">
          <X size={15} color={tokens.colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
```

---

FILE PATH: src/components/feedback/Snackbar.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/Snackbar.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text as RNText, View, ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Snackbar({
  message,
  actionLabel,
  onAction,
  onDismiss,
  style,
}: SnackbarProps) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        tokens.shadows.elevation4,
        {
          backgroundColor: tokens.isDark ? tokens.colors.surfaceElevated : '#182230',
          borderRadius: tokens.radius.md,
          borderColor: tokens.isDark ? tokens.colors.borderStrong : 'transparent',
        },
        style,
      ]}
    >
      <RNText style={styles.message} numberOfLines={2}>
        {message}
      </RNText>
      {!!actionLabel && (
        <Pressable onPress={onAction} hitSlop={8} style={styles.actionBtn}>
          <RNText style={styles.actionLabel}>{actionLabel}</RNText>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss">
          <X size={16} color="#94A3B8" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  actionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  actionLabel: {
    color: '#7AA8EE',
    fontWeight: '600',
    fontSize: 13,
  },
});
```

---

FILE PATH: src/components/feedback/EmptyState.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/EmptyState.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Button } from '../buttons/Button';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = BookOpen,
  title,
  description,
  primaryAction,
  secondaryAction,
  style,
}: EmptyStateProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius: tokens.radius.lg,
          borderColor: tokens.colors.borderStrong,
          backgroundColor: tokens.colors.surfaceSecondary,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          {
            borderRadius: tokens.radius.lg,
            backgroundColor: tokens.colors.surfaceTertiary,
          },
        ]}
      >
        <Icon icon={icon} size={24} color="textSecondary" />
      </View>

      <Text variant="CardTitle" align="center">
        {title}
      </Text>

      {!!description && (
        <Text variant="BodySecondary" align="center" style={styles.description}>
          {description}
        </Text>
      )}

      {(primaryAction || secondaryAction) && (
        <View style={styles.actions}>
          {primaryAction && (
            <Button size="small" onPress={primaryAction.onPress}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" size="small" onPress={secondaryAction.onPress}>
              {secondaryAction.label}
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  iconCircle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  description: {
    marginTop: 6,
    maxWidth: 320,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
});
```

---

FILE PATH: src/components/feedback/ErrorState.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/ErrorState.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { hexToRgba } from '../../theme/tokens/colors';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Button } from '../buttons/Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title = 'Unable to load content',
  description = 'Please check your connection and try again.',
  retryLabel = 'Retry',
  onRetry,
  style,
}: ErrorStateProps) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          borderRadius: tokens.radius.lg,
          borderColor: hexToRgba(tokens.colors.danger, 0.35),
          backgroundColor: tokens.colors.dangerBackground,
        },
        style,
      ]}
    >
      <Icon icon={AlertCircle} size={28} color="danger" style={styles.icon} />
      <Text variant="CardTitle" color="danger" align="center">
        {title}
      </Text>
      <Text variant="BodySecondary" align="center" style={styles.description}>
        {description}
      </Text>
      {onRetry && (
        <Button
          variant="outline"
          size="small"
          leadingIcon={RefreshCw}
          onPress={onRetry}
          style={styles.retryBtn}
        >
          {retryLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  icon: {
    marginBottom: 10,
  },
  description: {
    marginTop: 6,
    maxWidth: 320,
  },
  retryBtn: {
    marginTop: 14,
  },
});
```

---

FILE PATH: src/components/feedback/Skeleton.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/Skeleton.tsx
 */

import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { RadiusKey } from '../../theme/tokens/radius';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: RadiusKey | number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'sm',
  style,
}: SkeletonProps) {
  const { tokens } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (tokens.motion.reducedMotion) {
      opacity.setValue(0.75);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, tokens.motion.reducedMotion]);

  const resolvedRadius =
    typeof radius === 'number'
      ? radius
      : (tokens.radius[radius] ?? tokens.radius.sm);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no"
      style={[
        {
          width,
          height,
          borderRadius: resolvedRadius,
          backgroundColor: tokens.colors.surfaceTertiary,
          opacity,
        },
        style,
      ]}
    />
  );
}
```

> **BATCH 3 COMPLETE (19/19 files)**

---

## BATCH 4 — NAVIGATION, DATA DISPLAY, OVERLAYS & MEDIA (13 FILES)

---

FILE PATH: src/components/navigation/AppHeader.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/navigation/AppHeader.tsx
 *
 * Reusable design-system header component (independent of navigation router).
 */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { ScreenHeader } from '../layout/ScreenHeader';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppHeader({
  title,
  subtitle,
  onBackPress,
  rightActions,
  safeTop = true,
  style,
}: AppHeaderProps) {
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      onBackPress={onBackPress}
      rightActions={rightActions}
      safeTop={safeTop}
      style={style}
    />
  );
}
```

---

FILE PATH: src/components/navigation/BottomBar.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/navigation/BottomBar.tsx
 *
 * Reusable bottom navigation bar compatible with React Navigation custom tabBar
 * or standalone controlled state.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';

export interface BottomBarItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface BottomBarProps {
  items: BottomBarItem[];
  activeId: string;
  onChange?: (id: string) => void;
  safeBottom?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BottomBar({
  items,
  activeId,
  onChange,
  safeBottom = true,
  style,
}: BottomBarProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = safeBottom ? Math.max(insets.bottom, 6) : 6;

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          minHeight: tokens.dimensions.bottomNavigationHeight + (safeBottom ? insets.bottom : 0),
          paddingBottom: bottomPad,
          backgroundColor: tokens.colors.surface,
          borderTopColor: tokens.colors.divider,
        },
        style,
      ]}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange?.(item.id)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            style={[
              styles.tabItem,
              { minHeight: tokens.dimensions.touchTargetSize },
            ]}
          >
            <View
              style={[
                styles.pill,
                {
                  borderRadius: tokens.radius.full,
                  backgroundColor: active
                    ? tokens.colors.primaryLight
                    : 'transparent',
                },
              ]}
            >
              <Icon
                icon={item.icon}
                size={19}
                color={active ? 'primary' : 'textTertiary'}
              />
            </View>
            <Text
              variant="NavigationLabel"
              color={active ? 'primary' : 'textTertiary'}
              style={{ fontWeight: active ? '600' : '500' }}
              truncate
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

---

FILE PATH: src/components/navigation/TabBar.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/navigation/TabBar.tsx
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Badge } from '../feedback/Badge';

export interface TabBarItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export interface TabBarProps {
  tabs: TabBarItem[];
  activeId: string;
  onChange?: (id: string) => void;
  variant?: 'underline' | 'pill';
  style?: StyleProp<ViewStyle>;
}

export function TabBar({
  tabs,
  activeId,
  onChange,
  variant = 'underline',
  style,
}: TabBarProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        variant === 'underline' && {
          borderBottomWidth: 1,
          borderBottomColor: tokens.colors.divider,
        },
        style,
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.row,
          { gap: variant === 'pill' ? 6 : 4 },
        ]}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange?.(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                styles.tab,
                variant === 'pill'
                  ? {
                      paddingVertical: 7,
                      paddingHorizontal: 14,
                      borderRadius: tokens.radius.md,
                      backgroundColor: active
                        ? tokens.colors.primaryLight
                        : 'transparent',
                    }
                  : {
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderBottomWidth: 2,
                      borderBottomColor: active
                        ? tokens.colors.primary
                        : 'transparent',
                    },
              ]}
            >
              {tab.icon && (
                <Icon
                  icon={tab.icon}
                  size={15}
                  color={active ? 'primary' : 'textSecondary'}
                />
              )}
              <Text
                variant="BodySecondary"
                color={active ? 'primary' : 'textSecondary'}
                style={{ fontWeight: active ? '600' : '500' }}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined && (
                <Badge variant={active ? 'primary' : 'neutral'} size="sm">
                  {tab.count}
                </Badge>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
  },
});
```

---

FILE PATH: src/components/data-display/ProgressBar.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/data-display/ProgressBar.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorTokenKey } from '../../theme/tokens/colors';
import { Text } from '../foundation/Text';

export interface ProgressBarProps {
  value?: number;
  color?: ColorTokenKey | (string & {});
  height?: number;
  label?: string;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value = 0,
  color = 'primary',
  height = 7,
  label,
  showLabel = true,
  style,
}: ProgressBarProps) {
  const { tokens } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  const fill = tokens.colors[color as ColorTokenKey] ?? color;

  return (
    <View style={[styles.wrapper, style]}>
      {(!!label || showLabel) && (
        <View style={styles.headerRow}>
          {!!label ? (
            <Text variant="Caption" color="textSecondary">
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showLabel && (
            <Text variant="Caption" color="textPrimary" style={{ fontWeight: '600' }}>
              {clamped}%
            </Text>
          )}
        </View>
      )}

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clamped }}
        style={[
          styles.track,
          {
            height,
            borderRadius: tokens.radius.full,
            backgroundColor: tokens.colors.surfaceTertiary,
          },
        ]}
      >
        <View
          style={{
            width: `${clamped}%`,
            height: '100%',
            borderRadius: tokens.radius.full,
            backgroundColor: fill,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});
```

---

FILE PATH: src/components/data-display/CircularProgress.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/data-display/CircularProgress.tsx
 * Dependency: react-native-svg
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorTokenKey } from '../../theme/tokens/colors';
import { Text } from '../foundation/Text';

export interface CircularProgressProps {
  value?: number;
  size?: number;
  strokeWidth?: number;
  color?: ColorTokenKey | (string & {});
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function CircularProgress({
  value = 0,
  size = 64,
  strokeWidth = 6,
  color = 'primary',
  label,
  style,
}: CircularProgressProps) {
  const { tokens } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const strokeColor = tokens.colors[color as ColorTokenKey] ?? color;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[styles.wrapper, { width: size, height: size }, style]}
    >
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tokens.colors.surfaceTertiary}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>

      <View style={styles.labelContainer}>
        <Text
          variant="Caption"
          color="textPrimary"
          style={{
            fontWeight: '700',
            fontSize: size > 100 ? 22 : size > 70 ? 15 : 12,
          }}
        >
          {label ?? `${clamped}%`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

---

FILE PATH: src/components/data-display/ListItem.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/data-display/ListItem.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Divider } from '../foundation/Divider';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
  hindi?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  divider = false,
  hindi = false,
  style,
}: ListItemProps) {
  const { tokens } = useTheme();

  const content = (
    <>
      {!!leading && <View style={styles.leading}>{leading}</View>}
      <View style={styles.center}>
        <Text variant="CardTitle" hindi={hindi} truncate>
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="Caption" hindi={hindi} truncate style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      {!!trailing && <View style={styles.trailing}>{trailing}</View>}
    </>
  );

  return (
    <View style={style}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.row,
            {
              paddingVertical: tokens.spacing.listItemSpacing,
              borderRadius: tokens.radius.md,
              backgroundColor: pressed
                ? tokens.colors.surfaceSecondary
                : 'transparent',
            },
          ]}
        >
          {content}
        </Pressable>
      ) : (
        <View
          style={[
            styles.row,
            { paddingVertical: tokens.spacing.listItemSpacing },
          ]}
        >
          {content}
        </View>
      )}
      {divider && <Divider inset />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 12,
  },
  leading: {
    flexShrink: 0,
  },
  center: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
});
```

---

FILE PATH: src/components/data-display/StatItem.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/data-display/StatItem.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';

export interface StatItemProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function StatItem({ label, value, icon, style }: StatItemProps) {
  const { tokens } = useTheme();

  return (
    <View style={[styles.row, style]}>
      {icon && (
        <View
          style={[
            styles.iconBox,
            {
              borderRadius: tokens.radius.md,
              backgroundColor: tokens.colors.surfaceTertiary,
            },
          ]}
        >
          <Icon icon={icon} size={16} color="primary" />
        </View>
      )}
      <View>
        <Text variant="CardTitle" style={styles.value}>
          {value}
        </Text>
        <Text variant="Caption">{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
});
```

---

FILE PATH: src/components/overlays/Dialog.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/overlays/Dialog.tsx
 */

import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Button } from '../buttons/Button';
import { IconButton } from '../buttons/IconButton';

export type DialogVariant = 'default' | 'danger' | 'success' | 'info';

export interface DialogAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: DialogVariant;
  primaryAction?: DialogAction;
  secondaryAction?: DialogAction;
  children?: React.ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  variant = 'default',
  primaryAction,
  secondaryAction,
  children,
}: DialogProps) {
  const { tokens } = useTheme();

  return (
    <Modal
      visible={open}
      transparent
      animationType={tokens.motion.reducedMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={() => undefined}
          style={[
            styles.card,
            tokens.shadows.elevation5,
            {
              maxWidth: tokens.dimensions.modalMaxWidth,
              backgroundColor: tokens.colors.surfaceElevated,
              borderRadius: tokens.radius.xl,
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              {variant === 'danger' && (
                <Icon icon={AlertTriangle} size={22} color="danger" />
              )}
              {variant === 'success' && (
                <Icon icon={CheckCircle2} size={22} color="success" />
              )}
              {variant === 'info' && <Icon icon={Info} size={22} color="info" />}
              <Text variant="SectionTitle" style={styles.title}>
                {title}
              </Text>
            </View>
            <IconButton
              icon={X}
              size="small"
              label="Close dialog"
              onPress={onClose}
            />
          </View>

          {!!description && (
            <Text variant="BodySecondary" style={styles.description}>
              {description}
            </Text>
          )}

          {!!children && <View style={styles.body}>{children}</View>}

          {(primaryAction || secondaryAction) && (
            <View style={styles.footer}>
              {secondaryAction && (
                <Button
                  variant="outline"
                  size="medium"
                  onPress={secondaryAction.onPress}
                >
                  {secondaryAction.label}
                </Button>
              )}
              {primaryAction && (
                <Button
                  variant={variant === 'danger' ? 'destructive' : 'primary'}
                  size="medium"
                  loading={primaryAction.loading}
                  onPress={primaryAction.onPress}
                >
                  {primaryAction.label}
                </Button>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 25, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
  },
  description: {
    marginTop: 10,
  },
  body: {
    marginTop: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
});
```

---

FILE PATH: src/components/overlays/BottomSheet.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/overlays/BottomSheet.tsx
 */

import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { IconButton } from '../buttons/IconButton';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={open}
      transparent
      animationType={tokens.motion.reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={() => undefined}
          style={[
            styles.sheet,
            tokens.shadows.elevation5,
            {
              backgroundColor: tokens.colors.surfaceElevated,
              borderColor: tokens.colors.border,
              borderTopLeftRadius: tokens.radius['2xl'],
              borderTopRightRadius: tokens.radius['2xl'],
              paddingBottom: Math.max(insets.bottom + 16, 24),
            },
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: tokens.colors.borderStrong },
            ]}
          />
          <View style={styles.headerRow}>
            {!!title ? <Text variant="SectionTitle">{title}</Text> : <View />}
            <IconButton
              icon={X}
              size="small"
              label="Close bottom sheet"
              onPress={onClose}
            />
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 25, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
});
```

---

FILE PATH: src/components/overlays/ActionMenu.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/overlays/ActionMenu.tsx
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { BottomSheet } from './BottomSheet';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Divider } from '../foundation/Divider';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export interface ActionMenuProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: ActionMenuItem[];
}

export function ActionMenu({
  open,
  onClose,
  title = 'Actions',
  items,
}: ActionMenuProps) {
  const { tokens } = useTheme();

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <View style={styles.list}>
        {items.map((item, idx) => (
          <View key={item.id}>
            <Pressable
              disabled={item.disabled}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              accessibilityRole="menuitem"
              accessibilityState={{ disabled: item.disabled }}
              style={({ pressed }) => [
                styles.row,
                {
                  borderRadius: tokens.radius.md,
                  opacity: item.disabled ? 0.45 : 1,
                  backgroundColor: pressed
                    ? tokens.colors.surfaceSecondary
                    : 'transparent',
                },
              ]}
            >
              {item.icon && (
                <Icon
                  icon={item.icon}
                  size={18}
                  color={item.destructive ? 'danger' : 'textSecondary'}
                />
              )}
              <Text
                variant="BodyPrimary"
                color={item.destructive ? 'danger' : 'textPrimary'}
                style={{ fontWeight: '500' }}
              >
                {item.label}
              </Text>
            </Pressable>
            {idx < items.length - 1 && <Divider />}
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 13,
    minHeight: 46,
  },
});
```

---

FILE PATH: src/components/media/Avatar.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/media/Avatar.tsx
 */

import React from 'react';
import { Image, ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export type AvatarVariant = 'primary' | 'secondary' | 'accent';
export type AvatarStatus = 'online' | 'away';

export interface AvatarProps {
  name?: string;
  source?: ImageSourcePropType;
  size?: number;
  variant?: AvatarVariant;
  status?: AvatarStatus;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({
  name = 'SS',
  source,
  size = 40,
  variant = 'primary',
  status,
  style,
}: AvatarProps) {
  const { tokens } = useTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const bg =
    variant === 'secondary'
      ? tokens.colors.secondaryLight
      : variant === 'accent'
      ? tokens.colors.accentSoft
      : tokens.colors.primaryLight;

  const fg =
    variant === 'secondary'
      ? tokens.colors.secondary
      : variant === 'accent'
      ? tokens.colors.accent
      : tokens.colors.primary;

  const dotSize = Math.max(9, Math.round(size * 0.25));

  return (
    <View style={[{ width: size, height: size, flexShrink: 0 }, style]}>
      {source ? (
        <Image
          source={source}
          style={{
            width: size,
            height: size,
            borderRadius: tokens.radius.full,
            borderWidth: 1,
            borderColor: tokens.colors.borderSubtle,
          }}
        />
      ) : (
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: tokens.radius.full,
              backgroundColor: bg,
              borderColor: tokens.colors.borderSubtle,
            },
          ]}
        >
          <Text
            variant="CardTitle"
            color={fg}
            style={{ fontWeight: '700', fontSize: Math.round(size * 0.36) }}
          >
            {initials}
          </Text>
        </View>
      )}

      {status && (
        <View
          style={[
            styles.statusDot,
            {
              width: dotSize,
              height: dotSize,
              backgroundColor:
                status === 'online' ? tokens.colors.success : tokens.colors.warning,
              borderColor: tokens.colors.surface,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 9999,
    borderWidth: 2,
  },
});
```

---

FILE PATH: src/components/media/Thumbnail.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/media/Thumbnail.tsx
 */

import React, { useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { AlertCircle, BookOpen } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Skeleton } from '../feedback/Skeleton';

export interface ThumbnailProps {
  title?: string;
  subtitle?: string;
  source?: ImageSourcePropType;
  icon?: LucideIcon;
  aspectRatio?: number;
  broken?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Thumbnail({
  title,
  subtitle,
  source,
  icon = BookOpen,
  aspectRatio = 16 / 10,
  broken = false,
  loading = false,
  style,
}: ThumbnailProps) {
  const { tokens } = useTheme();
  const [imgError, setImgError] = useState(false);

  if (loading) {
    return <Skeleton height={110} radius="md" style={style} />;
  }

  const isBroken = broken || imgError;

  if (source && !isBroken) {
    return (
      <Image
        source={source}
        onError={() => setImgError(true)}
        style={[
          {
            width: '100%',
            aspectRatio,
            borderRadius: tokens.radius.md,
            borderWidth: 1,
            borderColor: tokens.colors.border,
          },
          style as never,
        ]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          aspectRatio,
          borderRadius: tokens.radius.md,
          backgroundColor: isBroken
            ? tokens.colors.dangerBackground
            : tokens.colors.surfaceTertiary,
          borderColor: tokens.colors.border,
        },
        style,
      ]}
    >
      <Icon
        icon={isBroken ? AlertCircle : icon}
        size={24}
        color={isBroken ? 'danger' : 'primary'}
      />
      <Text
        variant="Caption"
        color={isBroken ? 'danger' : 'textPrimary'}
        align="center"
        style={{ fontWeight: '600' }}
      >
        {isBroken ? 'Image unavailable' : title}
      </Text>
      {!isBroken && !!subtitle && (
        <Text variant="Caption" align="center">
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
  },
});
```

---

FILE PATH: src/components/media/ImagePlaceholder.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/media/ImagePlaceholder.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../foundation/Icon';
import { Text } from '../foundation/Text';
import { RadiusKey } from '../../theme/tokens/radius';

export interface ImagePlaceholderProps {
  icon?: LucideIcon;
  label?: string;
  height?: number;
  radius?: RadiusKey;
  style?: StyleProp<ViewStyle>;
}

export function ImagePlaceholder({
  icon = ImageIcon,
  label,
  height = 120,
  radius = 'md',
  style,
}: ImagePlaceholderProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          height,
          borderRadius: tokens.radius[radius],
          backgroundColor: tokens.colors.surfaceTertiary,
          borderColor: tokens.colors.border,
        },
        style,
      ]}
    >
      <Icon icon={icon} size={24} color="textTertiary" />
      {!!label && <Text variant="Caption">{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
  },
});
```

> **BATCH 4 COMPLETE (13/13 files)**

---

## BATCH 5 — PATTERNS, SCREEN TEMPLATES, BARREL EXPORTS & INTEGRATION GUIDE (12 FILES)

---

FILE PATH: src/patterns/SearchFilterPattern.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/patterns/SearchFilterPattern.tsx
 */

import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SearchInput } from '../components/forms/SearchInput';
import { Button } from '../components/buttons/Button';

export interface SearchFilterPatternProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  categories?: string[];
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function SearchFilterPattern({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  categories = [],
  activeCategory,
  onCategoryChange,
  style,
}: SearchFilterPatternProps) {
  return (
    <View style={[styles.container, style]}>
      <SearchInput
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder={searchPlaceholder}
      />

      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {categories.map((cat) => (
            <Button
              key={cat}
              size="small"
              variant={activeCategory === cat ? 'primary' : 'outline'}
              onPress={() => onCategoryChange?.(cat)}
            >
              {cat}
            </Button>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
});
```

---

FILE PATH: src/patterns/SectionPattern.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/patterns/SectionPattern.tsx
 */

import React, { useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { SectionContainer } from '../components/layout/SectionContainer';
import { SectionHeader } from '../components/layout/SectionHeader';

export interface SectionPatternProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  accentIndicator?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function SectionPattern({
  title,
  subtitle,
  description,
  icon,
  actionLabel,
  onAction,
  accentIndicator = false,
  collapsible = false,
  defaultCollapsed = false,
  compact = false,
  style,
  children,
}: SectionPatternProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <SectionContainer style={style}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        description={description}
        icon={icon}
        actionLabel={actionLabel}
        onAction={onAction}
        accentIndicator={accentIndicator}
        collapsible={collapsible}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        compact={compact}
      />
      {!collapsed && children}
    </SectionContainer>
  );
}
```

---

FILE PATH: src/patterns/EmptyContentPattern.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/patterns/EmptyContentPattern.tsx
 */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { EmptyState, EmptyStateAction } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';

export interface EmptyContentPatternProps {
  mode?: 'empty' | 'error';
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyContentPattern({
  mode = 'empty',
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  onRetry,
  style,
}: EmptyContentPatternProps) {
  if (mode === 'error') {
    return (
      <ErrorState
        title={title}
        description={description}
        onRetry={onRetry}
        style={style}
      />
    );
  }

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      style={style}
    />
  );
}
```

---

FILE PATH: src/patterns/ConfirmationPattern.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/patterns/ConfirmationPattern.tsx
 */

import React from 'react';
import { Dialog, DialogVariant } from '../components/overlays/Dialog';

export interface ConfirmationPatternProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  loading?: boolean;
}

export function ConfirmationPattern({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmationPatternProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      variant={variant}
      secondaryAction={{ label: cancelLabel, onPress: onCancel }}
      primaryAction={{ label: confirmLabel, onPress: onConfirm, loading }}
    />
  );
}
```

---

FILE PATH: src/templates/StandardScreen.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/templates/StandardScreen.tsx
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PageLayout } from '../components/layout/PageLayout';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Skeleton } from '../components/feedback/Skeleton';
import { ErrorState } from '../components/feedback/ErrorState';
import { EmptyState, EmptyStateAction } from '../components/feedback/EmptyState';

export interface StandardScreenProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  safeTop?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: EmptyStateAction;
  children?: React.ReactNode;
}

export function StandardScreen({
  title,
  subtitle,
  onBackPress,
  headerRight,
  footer,
  safeTop = true,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  children,
}: StandardScreenProps) {
  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.skeletonGroup}>
          <Skeleton height={88} radius="lg" />
          <Skeleton height={88} radius="lg" />
          <Skeleton height={88} radius="lg" />
        </View>
      );
    }
    if (error) {
      return <ErrorState description={error} onRetry={onRetry} />;
    }
    if (empty) {
      return (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          primaryAction={emptyAction}
        />
      );
    }
    return children;
  };

  return (
    <PageLayout
      scrollable
      header={
        <ScreenHeader
          title={title}
          subtitle={subtitle}
          onBackPress={onBackPress}
          rightActions={headerRight}
          safeTop={safeTop}
        />
      }
      footer={footer}
    >
      {renderBody()}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  skeletonGroup: {
    gap: 12,
  },
});
```

---

FILE PATH: src/templates/ListingScreen.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/templates/ListingScreen.tsx
 */

import React from 'react';
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { SearchFilterPattern } from '../patterns/SearchFilterPattern';
import { EmptyState, EmptyStateAction } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { Skeleton } from '../components/feedback/Skeleton';

export interface ListingScreenProps<T> {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  headerRight?: React.ReactNode;
  safeTop?: boolean;
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  categories?: string[];
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: EmptyStateAction;
}

export function ListingScreen<T>({
  title,
  subtitle,
  onBackPress,
  headerRight,
  safeTop = true,
  data,
  keyExtractor,
  renderItem,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  categories,
  activeCategory,
  onCategoryChange,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No items found',
  emptyDescription,
  emptyAction,
}: ListingScreenProps<T>) {
  const { tokens } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: tokens.colors.background }]}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        onBackPress={onBackPress}
        rightActions={headerRight}
        safeTop={safeTop}
      />

      {onSearchChange !== undefined && (
        <View
          style={{
            paddingHorizontal: tokens.spacing.screenPadding,
            paddingTop: 12,
            paddingBottom: 6,
          }}
        >
          <SearchFilterPattern
            searchQuery={searchQuery ?? ''}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={onCategoryChange}
          />
        </View>
      )}

      {loading ? (
        <View style={[styles.stateBox, { padding: tokens.spacing.screenPadding }]}>
          <Skeleton height={76} radius="lg" />
          <Skeleton height={76} radius="lg" />
          <Skeleton height={76} radius="lg" />
        </View>
      ) : error ? (
        <View style={{ padding: tokens.spacing.screenPadding }}>
          <ErrorState description={error} onRetry={onRetry} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: tokens.spacing.screenPadding,
            gap: tokens.spacing.componentGap,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              primaryAction={emptyAction}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stateBox: {
    gap: 12,
  },
});
```

---

FILE PATH: src/templates/DetailScreen.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/templates/DetailScreen.tsx
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PageLayout } from '../components/layout/PageLayout';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Button } from '../components/buttons/Button';
import { Skeleton } from '../components/feedback/Skeleton';
import { ErrorState } from '../components/feedback/ErrorState';

export interface DetailScreenProps {
  title: string;
  subtitle?: string;
  onBackPress: () => void;
  headerRight?: React.ReactNode;
  safeTop?: boolean;
  primaryCtaLabel?: string;
  onPrimaryCtaPress?: () => void;
  primaryCtaLoading?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children?: React.ReactNode;
}

export function DetailScreen({
  title,
  subtitle,
  onBackPress,
  headerRight,
  safeTop = true,
  primaryCtaLabel,
  onPrimaryCtaPress,
  primaryCtaLoading = false,
  loading = false,
  error = null,
  onRetry,
  children,
}: DetailScreenProps) {
  return (
    <PageLayout
      scrollable
      header={
        <ScreenHeader
          title={title}
          subtitle={subtitle}
          onBackPress={onBackPress}
          rightActions={headerRight}
          safeTop={safeTop}
        />
      }
      footer={
        primaryCtaLabel ? (
          <Button
            fullWidth
            size="large"
            loading={primaryCtaLoading}
            onPress={onPrimaryCtaPress}
          >
            {primaryCtaLabel}
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <View style={styles.skeletons}>
          <Skeleton height={160} radius="lg" />
          <Skeleton height={22} width="70%" />
          <Skeleton height={14} width="95%" />
          <Skeleton height={14} width="85%" />
        </View>
      ) : error ? (
        <ErrorState description={error} onRetry={onRetry} />
      ) : (
        children
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  skeletons: {
    gap: 12,
  },
});
```

---

FILE PATH: src/templates/FormScreen.tsx

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/templates/FormScreen.tsx
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PageLayout } from '../components/layout/PageLayout';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Button } from '../components/buttons/Button';

export interface FormScreenProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  safeTop?: boolean;
  submitLabel?: string;
  onSubmit?: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  children?: React.ReactNode;
}

export function FormScreen({
  title,
  subtitle,
  onBackPress,
  safeTop = true,
  submitLabel = 'Save',
  onSubmit,
  submitting = false,
  submitDisabled = false,
  secondaryLabel,
  onSecondaryPress,
  children,
}: FormScreenProps) {
  return (
    <PageLayout
      scrollable
      keyboardAvoiding
      header={
        <ScreenHeader
          title={title}
          subtitle={subtitle}
          onBackPress={onBackPress}
          safeTop={safeTop}
        />
      }
      footer={
        <View style={styles.footerRow}>
          {!!secondaryLabel && (
            <View style={styles.flex}>
              <Button variant="outline" fullWidth onPress={onSecondaryPress}>
                {secondaryLabel}
              </Button>
            </View>
          )}
          <View style={styles.flex}>
            <Button
              fullWidth
              loading={submitting}
              disabled={submitDisabled}
              onPress={onSubmit}
            >
              {submitLabel}
            </Button>
          </View>
        </View>
      }
    >
      <View style={styles.formBody}>{children}</View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  formBody: {
    gap: 16,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
});
```

---

FILE PATH: src/components/index.ts

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/index.ts
 */

// Foundation
export * from './foundation/Text';
export * from './foundation/Icon';
export * from './foundation/Divider';
export * from './foundation/Surface';
export * from './foundation/Spacer';

// Buttons
export * from './buttons/Button';
export * from './buttons/IconButton';
export * from './buttons/FloatingButton';

// Cards
export * from './cards/BaseCard';
export * from './cards/StatisticCard';
export * from './cards/ProgressCard';
export * from './cards/FeatureCard';

// Layout
export * from './layout/ScreenContainer';
export * from './layout/ScreenHeader';
export * from './layout/SectionHeader';
export * from './layout/SectionContainer';
export * from './layout/PageLayout';

// Forms
export * from './forms/TextInput';
export * from './forms/SearchInput';
export * from './forms/Select';
export * from './forms/Checkbox';
export * from './forms/Radio';
export * from './forms/Switch';
export * from './forms/SegmentedControl';
export * from './forms/Slider';

// Feedback
export * from './feedback/Badge';
export * from './feedback/Toast';
export * from './feedback/Snackbar';
export * from './feedback/EmptyState';
export * from './feedback/ErrorState';
export * from './feedback/Skeleton';

// Navigation
export * from './navigation/AppHeader';
export * from './navigation/BottomBar';
export * from './navigation/TabBar';

// Data Display
export * from './data-display/ProgressBar';
export * from './data-display/CircularProgress';
export * from './data-display/ListItem';
export * from './data-display/StatItem';

// Overlays
export * from './overlays/Dialog';
export * from './overlays/BottomSheet';
export * from './overlays/ActionMenu';

// Media
export * from './media/Avatar';
export * from './media/Thumbnail';
export * from './media/ImagePlaceholder';
```

---

FILE PATH: src/patterns/index.ts

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/patterns/index.ts
 */

export * from './SearchFilterPattern';
export * from './SectionPattern';
export * from './EmptyContentPattern';
export * from './ConfirmationPattern';
```

---

FILE PATH: src/templates/index.ts

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/templates/index.ts
 */

export * from './StandardScreen';
export * from './ListingScreen';
export * from './DetailScreen';
export * from './FormScreen';
```

---

FILE PATH: src/index.ts

```typescript
/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/index.ts
 * Root public API barrel for the reusable Expo React Native Design System.
 */

export * from './theme';
export * from './components';
export * from './patterns';
export * from './templates';
```

> **BATCH 5 COMPLETE (12/12 files) — ALL 69 SOURCE FILES PRESENT**

---

## DEPENDENCIES, FOLDER STRUCTURE, INTEGRATION GUIDE & CONVERSION MANIFEST

### 1. Complete Folder Tree (69 Files)

```text
src/
├── index.ts
├── theme/
│   ├── index.ts
│   ├── ThemeProvider.tsx
│   ├── tokens/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── radius.ts
│   │   ├── shadows.ts
│   │   ├── dimensions.ts
│   │   ├── motion.ts
│   │   └── icons.ts
│   └── themes/
│       ├── light.ts
│       ├── dark.ts
│       └── system.ts
├── components/
│   ├── index.ts
│   ├── foundation/
│   │   ├── Text.tsx
│   │   ├── Icon.tsx
│   │   ├── Divider.tsx
│   │   ├── Surface.tsx
│   │   └── Spacer.tsx
│   ├── buttons/
│   │   ├── Button.tsx
│   │   ├── IconButton.tsx
│   │   └── FloatingButton.tsx
│   ├── cards/
│   │   ├── BaseCard.tsx
│   │   ├── StatisticCard.tsx
│   │   ├── ProgressCard.tsx
│   │   └── FeatureCard.tsx
│   ├── layout/
│   │   ├── ScreenContainer.tsx
│   │   ├── ScreenHeader.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── SectionContainer.tsx
│   │   └── PageLayout.tsx
│   ├── forms/
│   │   ├── TextInput.tsx
│   │   ├── SearchInput.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Radio.tsx
│   │   ├── Switch.tsx
│   │   ├── SegmentedControl.tsx
│   │   └── Slider.tsx
│   ├── feedback/
│   │   ├── Badge.tsx
│   │   ├── Toast.tsx
│   │   ├── Snackbar.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   └── Skeleton.tsx
│   ├── navigation/
│   │   ├── AppHeader.tsx
│   │   ├── BottomBar.tsx
│   │   └── TabBar.tsx
│   ├── data-display/
│   │   ├── ProgressBar.tsx
│   │   ├── CircularProgress.tsx
│   │   ├── ListItem.tsx
│   │   └── StatItem.tsx
│   ├── overlays/
│   │   ├── Dialog.tsx
│   │   ├── BottomSheet.tsx
│   │   └── ActionMenu.tsx
│   └── media/
│       ├── Avatar.tsx
│       ├── Thumbnail.tsx
│       └── ImagePlaceholder.tsx
├── patterns/
│   ├── index.ts
│   ├── SearchFilterPattern.tsx
│   ├── SectionPattern.tsx
│   ├── EmptyContentPattern.tsx
│   └── ConfirmationPattern.tsx
└── templates/
    ├── index.ts
    ├── StandardScreen.tsx
    ├── ListingScreen.tsx
    ├── DetailScreen.tsx
    └── FormScreen.tsx
```

### 2. Required Dependencies & Peer Dependencies

| Package | Role in SSDS | Compatibility Notes |
| :--- | :--- | :--- |
| `react` (`19.2.3`) | Core peer dependency | Matches target Study Sakha Expo SDK 57 project |
| `react-native` (`0.86.3`) | Core peer dependency | Uses `View`, `Text`, `Pressable`, `TextInput`, `Modal`, `Animated`, `PanResponder`, `FlatList`, `ScrollView`, `useWindowDimensions`, `useColorScheme`, `AccessibilityInfo` |
| `expo` (`~57.0.0`) | Target runtime | Managed / prebuild compatible |
| `react-native-safe-area-context` | Safe area insets | Required by `ThemeProvider`, `ScreenContainer`, `ScreenHeader`, `PageLayout`, `BottomBar`, `BottomSheet` |
| `@react-native-async-storage/async-storage` | Theme persistence | Required by `ThemeProvider` to persist `ssds_appearance_v1` & `ssds_custom_presets_v1` |
| `lucide-react-native` | Unified icon set | Replaces `lucide-react` across all components |
| `react-native-svg` | SVG primitives | Required by `lucide-react-native` and `CircularProgress` |

Install via Expo CLI inside your Codespace (only for packages not already present in `package.json`):
```bash
npx expo install react-native-safe-area-context @react-native-async-storage/async-storage react-native-svg lucide-react-native
```

Optional Hindi font package (recommended for consistent Android Devanagari rendering):
```bash
npx expo install expo-font @expo-google-fonts/noto-sans-devanagari
```

### 3. Internal Dependency Mapping

- `src/theme/**` → Zero component dependencies (pure token & context layer).
- `src/components/foundation/**` → Depends only on `src/theme`.
- `src/components/buttons/**` → Depends on `src/theme`, `foundation/Icon`.
- `src/components/cards/**` → Depends on `src/theme`, `foundation/*`, `feedback/Badge`, `data-display/ProgressBar`.
- `src/components/layout/**` → Depends on `src/theme`, `foundation/*`, `buttons/*`.
- `src/components/forms/**` → Depends on `src/theme`, `foundation/*`, `buttons/IconButton`.
- `src/components/feedback/**` → Depends on `src/theme`, `foundation/*`, `buttons/Button`.
- `src/components/navigation/**` → Depends on `src/theme`, `foundation/*`, `layout/ScreenHeader`, `feedback/Badge`.
- `src/components/data-display/**` → Depends on `src/theme`, `foundation/*`, `react-native-svg`.
- `src/components/overlays/**` → Depends on `src/theme`, `foundation/*`, `buttons/*`.
- `src/components/media/**` → Depends on `src/theme`, `foundation/*`, `feedback/Skeleton`.
- `src/patterns/**` → Composes `components/*`.
- `src/templates/**` → Composes `components/*` and `patterns/*`.

### 4. Controlled Integration Instructions (Existing Study Sakha Project)

1. Extract all 69 files from this master bundle into your project's `src/` (or `src/design-system/`) directory without overwriting `App.tsx`, existing screens, `StoreProvider`, navigation containers, or backend services.
2. Wrap your existing root tree (inside `SafeAreaProvider`) with `ThemeProvider`:
   ```tsx
   import { SafeAreaProvider } from 'react-native-safe-area-context';
   import { ThemeProvider } from './src/theme';

   // Wrap existing app tree without altering navigation or StoreProvider
   <SafeAreaProvider>
     <ThemeProvider>
       {/* Existing StoreProvider & NavigationContainer */}
     </ThemeProvider>
   </SafeAreaProvider>
   ```
3. Consume tokens and components incrementally in screens via `import { useTheme, Button, BaseCard, Text } from './src'`.
4. Run `npx tsc --noEmit` to verify TypeScript compilation against your repository's `tsconfig.json`.

### 5. Complete Conversion Manifest (69/69 Modules Verified)

| Batch | Module / File | Status | Native Adaptation Notes |
| :--- | :--- | :--- | :--- |
| 1 | `src/theme/tokens/colors.ts` | Converted | 49 semantic tokens, 7 presets, `hexToRgba` |
| 1 | `src/theme/tokens/typography.ts` | Converted with Native Adaptation | Pixel `lineHeight`/`letterSpacing`; Devanagari `>= 1.68` guard |
| 1 | `src/theme/tokens/spacing.ts` | Converted | 4pt scale + 8 density-aware aliases |
| 1 | `src/theme/tokens/radius.ts` | Converted | Sharp / Default / Soft modes |
| 1 | `src/theme/tokens/shadows.ts` | Converted with Native Adaptation | Android `elevation` + iOS `shadow*` |
| 1 | `src/theme/tokens/dimensions.ts` | Converted with Native Adaptation | `useWindowDimensions` responsive hook |
| 1 | `src/theme/tokens/motion.ts` | Converted with Native Adaptation | Numeric ms + `Easing.bezier` |
| 1 | `src/theme/tokens/icons.ts` | Converted | `lucide-react-native` sizing |
| 1 | `src/theme/themes/{light,dark,system}.ts` | Converted | RN `ColorSchemeName` resolution |
| 1 | `src/theme/ThemeProvider.tsx`, `src/theme/index.ts` | Converted with Native Adaptation | `AsyncStorage`, `AccessibilityInfo`, `useSafeAreaInsets` |
| 2 | `src/components/foundation/{Text,Icon,Divider,Surface,Spacer}.tsx` | Converted with Native Adaptation | RN `Text`/`View`, `lucide-react-native` |
| 2 | `src/components/buttons/{Button,IconButton,FloatingButton}.tsx` | Converted with Native Adaptation | `Pressable`, `Animated` scale, 44dp `hitSlop` |
| 2 | `src/components/cards/{BaseCard,StatisticCard,ProgressCard,FeatureCard}.tsx` | Converted | RN Flexbox + `Surface` + `Pressable` |
| 3 | `src/components/layout/{ScreenContainer,ScreenHeader,SectionHeader,SectionContainer,PageLayout}.tsx` | Converted with Native Adaptation | `SafeAreaView`, `KeyboardAvoidingView`, `ScrollView` |
| 3 | `src/components/forms/{TextInput,SearchInput,Select,Checkbox,Radio,Switch,SegmentedControl,Slider}.tsx` | Converted with Native Adaptation | Native `TextInput`, Modal `Select`, Animated `Switch`, `PanResponder` `Slider` |
| 3 | `src/components/feedback/{Badge,Toast,Snackbar,EmptyState,ErrorState,Skeleton}.tsx` | Converted with Native Adaptation | `Animated.loop` `Skeleton` honoring reduced motion |
| 4 | `src/components/navigation/{AppHeader,BottomBar,TabBar}.tsx` | Converted with Native Adaptation | Safe-area bottom bar & horizontal `ScrollView` tab bar |
| 4 | `src/components/data-display/{ProgressBar,CircularProgress,ListItem,StatItem}.tsx` | Converted with Native Adaptation | `react-native-svg` `CircularProgress` |
| 4 | `src/components/overlays/{Dialog,BottomSheet,ActionMenu}.tsx` | Converted with Native Adaptation | Native `Modal` with `onRequestClose` hardware back support |
| 4 | `src/components/media/{Avatar,Thumbnail,ImagePlaceholder}.tsx` | Converted with Native Adaptation | RN `Image` with error fallback & initials |
| 5 | `src/patterns/{SearchFilterPattern,SectionPattern,EmptyContentPattern,ConfirmationPattern}.tsx` | Converted | Composable native UI patterns |
| 5 | `src/templates/{StandardScreen,ListingScreen,DetailScreen,FormScreen}.tsx` | Converted with Native Adaptation | `FlatList` listing, `KeyboardAvoidingView` form, loading/empty/error states |
| 5 | `src/components/index.ts`, `src/patterns/index.ts`, `src/templates/index.ts`, `src/index.ts` | Converted | Complete barrel exports |