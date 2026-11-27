/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/cards/FeatureCard.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { BaseCard } from './BaseCard';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Badge, BadgeVariant } from '../feedback/Badge';

export interface FeatureCardBadge {
  label: string;
  variant?: BadgeVariant;
}

export interface FeatureCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: FeatureCardBadge;
  actionLabel?: string;
  onPress?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function FeatureCard({
  title,
  description,
  icon,
  badge,
  actionLabel,
  onPress,
  compact = false,
  style,
}: FeatureCardProps) {
  const { tokens } = useTheme();

  return (
    <BaseCard interactive={!!onPress} onPress={onPress} compact={compact} style={style}>
      <View style={styles.row}>
        {icon && (
          <View
            style={[
              styles.iconBox,
              {
                borderRadius: tokens.radius.md,
                backgroundColor: tokens.colors.surfaceTertiary,
                borderColor: tokens.colors.borderSubtle,
              },
            ]}
          >
            <Icon icon={icon} size={20} color="primary" />
          </View>
        )}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text variant="CardTitle">{title}</Text>
            {badge && (
              <Badge variant={badge.variant ?? 'primary'} size="sm">
                {badge.label}
              </Badge>
            )}
          </View>
          {!!description && (
            <Text variant="CardSubtitle" style={styles.description}>
              {description}
            </Text>
          )}
          {!!actionLabel && (
            <View style={styles.actionRow}>
              <Text variant="Caption" color="primary" style={styles.actionText}>
                {actionLabel}
              </Text>
              <ChevronRight size={14} color={tokens.colors.primary} />
            </View>
          )}
        </View>
      </View>
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  description: {
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
