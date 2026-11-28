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
      hitSlop={12}
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
    minHeight: 44,
    paddingVertical: 4,
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
