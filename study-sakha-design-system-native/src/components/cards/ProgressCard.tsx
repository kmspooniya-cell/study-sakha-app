/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/cards/ProgressCard.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BaseCard } from './BaseCard';
import { Text } from '../foundation/Text';
import { Badge, BadgeVariant } from '../feedback/Badge';
import { ProgressBar } from '../data-display/ProgressBar';

export interface ProgressCardBadge {
  label: string;
  variant?: BadgeVariant;
}

export interface ProgressCardProps {
  title: string;
  subtitle?: string;
  progress?: number;
  meta?: string;
  badge?: ProgressCardBadge;
  hindi?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ProgressCard({
  title,
  subtitle,
  progress = 0,
  meta,
  badge,
  hindi = false,
  onPress,
  style,
}: ProgressCardProps) {
  return (
    <BaseCard interactive={!!onPress} onPress={onPress} style={style}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text variant="CardTitle" hindi={hindi}>
            {title}
          </Text>
          {!!subtitle && (
            <Text variant="CardSubtitle" hindi={hindi} style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
        {badge && (
          <Badge variant={badge.variant ?? 'neutral'} size="sm">
            {badge.label}
          </Badge>
        )}
      </View>

      <ProgressBar value={progress} showLabel={false} />

      <View style={styles.footerRow}>
        <Text variant="Caption">{meta ?? `${progress}% completed`}</Text>
        <Text variant="Caption" color="primary" style={styles.pctText}>
          {progress}%
        </Text>
      </View>
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  pctText: {
    fontWeight: '600',
  },
});
