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
