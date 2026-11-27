/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/Badge.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'completed'
  | 'warning'
  | 'pending'
  | 'danger'
  | 'live'
  | 'info'
  | 'new'
  | 'premium'
  | 'neutral';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  style,
}: BadgeProps) {
  const { tokens } = useTheme();

  const paletteMap: Record<BadgeVariant, { bg: string; color: string }> = {
    primary: { bg: tokens.colors.primaryLight, color: tokens.colors.primary },
    secondary: { bg: tokens.colors.secondaryLight, color: tokens.colors.secondary },
    success: { bg: tokens.colors.successBackground, color: tokens.colors.success },
    completed: { bg: tokens.colors.successBackground, color: tokens.colors.success },
    warning: { bg: tokens.colors.warningBackground, color: tokens.colors.warning },
    pending: { bg: tokens.colors.warningBackground, color: tokens.colors.warning },
    danger: { bg: tokens.colors.dangerBackground, color: tokens.colors.danger },
    live: { bg: tokens.colors.dangerBackground, color: tokens.colors.danger },
    info: { bg: tokens.colors.infoBackground, color: tokens.colors.info },
    new: { bg: tokens.colors.infoBackground, color: tokens.colors.info },
    premium: { bg: tokens.colors.accentSoft, color: tokens.colors.accent },
    neutral: { bg: tokens.colors.neutralBackground, color: tokens.colors.neutral },
  };

  const palette = paletteMap[variant] ?? paletteMap.neutral;

  return (
    <View
      style={[
        styles.badge,
        {
          paddingVertical: size === 'sm' ? 2 : 4,
          paddingHorizontal: size === 'sm' ? 7 : 10,
          borderRadius: tokens.radius.sm,
          backgroundColor: palette.bg,
        },
        style,
      ]}
    >
      {(dot || variant === 'live') && (
        <View style={[styles.dot, { backgroundColor: palette.color }]} />
      )}
      <Text
        variant="Caption"
        color={palette.color}
        style={{
          fontSize: size === 'sm' ? 11 : 12,
          fontWeight: '600',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 9999,
  },
});
