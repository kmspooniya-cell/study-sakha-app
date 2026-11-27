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
