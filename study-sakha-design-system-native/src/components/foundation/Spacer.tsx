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
