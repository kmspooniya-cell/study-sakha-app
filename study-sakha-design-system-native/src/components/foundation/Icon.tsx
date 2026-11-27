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
