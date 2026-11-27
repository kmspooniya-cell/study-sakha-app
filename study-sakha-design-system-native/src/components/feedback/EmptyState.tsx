/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/EmptyState.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Button } from '../buttons/Button';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = BookOpen,
  title,
  description,
  primaryAction,
  secondaryAction,
  style,
}: EmptyStateProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius: tokens.radius.lg,
          borderColor: tokens.colors.borderStrong,
          backgroundColor: tokens.colors.surfaceSecondary,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          {
            borderRadius: tokens.radius.lg,
            backgroundColor: tokens.colors.surfaceTertiary,
          },
        ]}
      >
        <Icon icon={icon} size={24} color="textSecondary" />
      </View>

      <Text variant="CardTitle" align="center">
        {title}
      </Text>

      {!!description && (
        <Text variant="BodySecondary" align="center" style={styles.description}>
          {description}
        </Text>
      )}

      {(primaryAction || secondaryAction) && (
        <View style={styles.actions}>
          {primaryAction && (
            <Button size="small" onPress={primaryAction.onPress}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" size="small" onPress={secondaryAction.onPress}>
              {secondaryAction.label}
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  iconCircle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  description: {
    marginTop: 6,
    maxWidth: 320,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
});
