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
