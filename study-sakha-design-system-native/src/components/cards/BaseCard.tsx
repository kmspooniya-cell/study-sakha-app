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
