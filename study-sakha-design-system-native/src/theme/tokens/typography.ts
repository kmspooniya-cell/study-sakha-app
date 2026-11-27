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
