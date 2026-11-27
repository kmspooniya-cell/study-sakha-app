/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/cards/StatisticCard.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { BaseCard } from './BaseCard';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Badge } from '../feedback/Badge';

export interface StatisticCardProps {
  label: string;
  value: string | number;
  delta?: string;
  positive?: boolean;
  icon?: LucideIcon;
  subtitle?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StatisticCard({
  label,
  value,
  delta,
  positive = true,
  icon,
  subtitle,
  compact = false,
  style,
}: StatisticCardProps) {
  const { tokens } = useTheme();

  return (
    <BaseCard compact={compact} style={style}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Text variant="StatisticLabel">{label}</Text>
          <View style={styles.valueRow}>
            <Text
              variant="StatisticValue"
              style={compact ? { fontSize: Math.round(22 * tokens.typography.scale) } : undefined}
            >
              {value}
            </Text>
            {!!delta && (
              <Badge variant={positive ? 'success' : 'danger'} size="sm">
                {delta}
              </Badge>
            )}
          </View>
          {!!subtitle && (
            <Text variant="Caption" style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
        {icon && (
          <View
            style={[
              styles.iconBox,
              {
                borderRadius: tokens.radius.md,
                backgroundColor: tokens.colors.primaryLight,
              },
            ]}
          >
            <Icon icon={icon} size={18} color="primary" />
          </View>
        )}
      </View>
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  subtitle: {
    marginTop: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
