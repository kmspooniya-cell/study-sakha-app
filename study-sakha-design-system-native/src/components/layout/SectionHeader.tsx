/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/layout/SectionHeader.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Button } from '../buttons/Button';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  accentIndicator?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  subtitle,
  description,
  icon,
  actionLabel,
  onAction,
  accentIndicator = false,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  compact = false,
  style,
}: SectionHeaderProps) {
  const { tokens } = useTheme();

  const leftContent = (
    <View style={styles.leftRow}>
      {accentIndicator && (
        <View
          style={[
            styles.accentBar,
            { backgroundColor: tokens.colors.primary },
          ]}
        />
      )}
      {icon && <Icon icon={icon} size={18} color="primary" />}
      <View style={styles.titleBlock}>
        <Text
          variant={compact ? 'CardTitle' : 'SectionTitle'}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {!!subtitle && <Text variant="Caption">{subtitle}</Text>}
      </View>
    </View>
  );

  return (
    <View style={[{ marginBottom: compact ? 8 : 12 }, style]}>
      <View style={styles.topRow}>
        {collapsible ? (
          <Pressable
            onPress={onToggleCollapse}
            style={[styles.flex, styles.collapsibleTrigger]}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ expanded: !collapsed }}
          >
            <View style={styles.flex}>{leftContent}</View>
            <Icon
              icon={collapsed ? ChevronRight : ChevronDown}
              size="sm"
              color="textSecondary"
            />
          </Pressable>
        ) : (
          <View style={styles.flex}>{leftContent}</View>
        )}

        {!!actionLabel && (
          <View style={styles.rightRow}>
            <Button
              variant="text"
              size="small"
              trailingIcon={ChevronRight}
              onPress={onAction}
            >
              {actionLabel}
            </Button>
          </View>
        )}
      </View>

      {!!description && (
        <Text variant="SectionDescription" style={styles.description}>
          {description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  collapsibleTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 44,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  accentBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  description: {
    marginTop: 4,
  },
});
