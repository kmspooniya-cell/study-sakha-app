/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/data-display/StatItem.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';

export interface StatItemProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function StatItem({ label, value, icon, style }: StatItemProps) {
  const { tokens } = useTheme();

  return (
    <View style={[styles.row, style]}>
      {icon && (
        <View
          style={[
            styles.iconBox,
            {
              borderRadius: tokens.radius.md,
              backgroundColor: tokens.colors.surfaceTertiary,
            },
          ]}
        >
          <Icon icon={icon} size={16} color="primary" />
        </View>
      )}
      <View>
        <Text variant="CardTitle" style={styles.value}>
          {value}
        </Text>
        <Text variant="Caption">{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
});
