/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/Toast.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export type ToastType = 'info' | 'success' | 'warning' | 'danger';

export interface ToastProps {
  type?: ToastType;
  title?: string;
  message?: string;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Toast({
  type = 'info',
  title,
  message,
  onClose,
  style,
}: ToastProps) {
  const { tokens } = useTheme();

  const map = {
    success: { Icon: CheckCircle2, color: tokens.colors.success },
    warning: { Icon: AlertTriangle, color: tokens.colors.warning },
    danger: { Icon: AlertCircle, color: tokens.colors.danger },
    info: { Icon: Info, color: tokens.colors.info },
  };
  const cfg = map[type];
  const IconComp = cfg.Icon;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        tokens.shadows.elevation3,
        {
          backgroundColor: tokens.colors.surfaceElevated,
          borderColor: tokens.colors.border,
          borderLeftColor: cfg.color,
          borderRadius: tokens.radius.md,
        },
        style,
      ]}
    >
      <IconComp size={18} color={cfg.color} style={{ marginTop: 1 }} />
      <View style={styles.content}>
        {!!title && (
          <Text variant="CardTitle" style={{ fontSize: 13.5 }}>
            {title}
          </Text>
        )}
        {!!message && (
          <Text variant="Caption" color="textSecondary" style={{ marginTop: 2 }}>
            {message}
          </Text>
        )}
      </View>
      {onClose && (
        <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close toast">
          <X size={15} color={tokens.colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
