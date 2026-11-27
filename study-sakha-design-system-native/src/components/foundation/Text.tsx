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
