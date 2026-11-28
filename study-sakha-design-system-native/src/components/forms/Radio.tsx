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
      hitSlop={12}
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
    minHeight: 44,
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
