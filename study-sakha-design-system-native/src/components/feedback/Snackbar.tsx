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

  const messageColor = tokens.isDark ? tokens.colors.textPrimary : tokens.colors.textInverse;
  const actionColor = tokens.isDark ? tokens.colors.textLink : '#7AA8EE';

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
      <RNText
        style={[
          styles.message,
          {
            color: messageColor,
            fontFamily: tokens.typography.fontFamilyPrimary,
            fontSize: Math.round(13.5 * tokens.typography.scale * 10) / 10,
          },
        ]}
        numberOfLines={2}
      >
        {message}
      </RNText>
      {!!actionLabel && (
        <Pressable onPress={onAction} hitSlop={10} style={styles.actionBtn}>
          <RNText
            style={[
              styles.actionLabel,
              {
                color: actionColor,
                fontFamily: tokens.typography.fontFamilyPrimary,
                fontSize: Math.round(13 * tokens.typography.scale * 10) / 10,
              },
            ]}
          >
            {actionLabel}
          </RNText>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={14} accessibilityLabel="Dismiss notification">
          <X size={16} color={tokens.colors.textTertiary} />
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
