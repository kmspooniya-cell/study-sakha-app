/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/Snackbar.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text as RNText, View, ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Snackbar({
  message,
  actionLabel,
  onAction,
  onDismiss,
  style,
}: SnackbarProps) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        tokens.shadows.elevation4,
        {
          backgroundColor: tokens.isDark ? tokens.colors.surfaceElevated : '#182230',
          borderRadius: tokens.radius.md,
          borderColor: tokens.isDark ? tokens.colors.borderStrong : 'transparent',
        },
        style,
      ]}
    >
      <RNText style={styles.message} numberOfLines={2}>
        {message}
      </RNText>
      {!!actionLabel && (
        <Pressable onPress={onAction} hitSlop={8} style={styles.actionBtn}>
          <RNText style={styles.actionLabel}>{actionLabel}</RNText>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss">
          <X size={16} color="#94A3B8" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  actionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  actionLabel: {
    color: '#7AA8EE',
    fontWeight: '600',
    fontSize: 13,
  },
});
