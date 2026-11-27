/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/SegmentedControl.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';

export interface SegmentedOption<T extends string | number = string> {
  label: string;
  value: T;
  icon?: LucideIcon;
}

export interface SegmentedControlProps<T extends string | number = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange?: (value: T) => void;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string | number = string>({
  options,
  value,
  onChange,
  fullWidth = false,
  style,
}: SegmentedControlProps<T>) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          borderRadius: tokens.radius.md,
          backgroundColor: tokens.colors.surfaceTertiary,
          borderColor: tokens.colors.borderSubtle,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange?.(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.item,
              fullWidth && styles.flexItem,
              active && tokens.shadows.elevation1,
              {
                borderRadius: Math.max(tokens.radius.sm, 4),
                backgroundColor: active ? tokens.colors.surface : 'transparent',
              },
            ]}
          >
            {opt.icon && (
              <Icon
                icon={opt.icon}
                size={14}
                color={active ? 'primary' : 'textSecondary'}
              />
            )}
            <Text
              variant="Caption"
              color={active ? 'textPrimary' : 'textSecondary'}
              style={{
                fontSize: 13,
                fontWeight: active ? '600' : '500',
              }}
              truncate
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    minHeight: 34,
    gap: 6,
  },
  flexItem: {
    flex: 1,
  },
});
