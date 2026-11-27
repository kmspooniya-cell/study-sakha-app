/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/ErrorState.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { hexToRgba } from '../../theme/tokens/colors';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Button } from '../buttons/Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title = 'Unable to load content',
  description = 'Please check your connection and try again.',
  retryLabel = 'Retry',
  onRetry,
  style,
}: ErrorStateProps) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          borderRadius: tokens.radius.lg,
          borderColor: hexToRgba(tokens.colors.danger, 0.35),
          backgroundColor: tokens.colors.dangerBackground,
        },
        style,
      ]}
    >
      <Icon icon={AlertCircle} size={28} color="danger" style={styles.icon} />
      <Text variant="CardTitle" color="danger" align="center">
        {title}
      </Text>
      <Text variant="BodySecondary" align="center" style={styles.description}>
        {description}
      </Text>
      {onRetry && (
        <Button
          variant="outline"
          size="small"
          leadingIcon={RefreshCw}
          onPress={onRetry}
          style={styles.retryBtn}
        >
          {retryLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  icon: {
    marginBottom: 10,
  },
  description: {
    marginTop: 6,
    maxWidth: 320,
  },
  retryBtn: {
    marginTop: 14,
  },
});
