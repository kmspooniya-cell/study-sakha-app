/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/data-display/ProgressBar.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorTokenKey } from '../../theme/tokens/colors';
import { Text } from '../foundation/Text';

export interface ProgressBarProps {
  value?: number;
  color?: ColorTokenKey | (string & {});
  height?: number;
  label?: string;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value = 0,
  color = 'primary',
  height = 7,
  label,
  showLabel = true,
  style,
}: ProgressBarProps) {
  const { tokens } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  const fill = tokens.colors[color as ColorTokenKey] ?? color;

  return (
    <View style={[styles.wrapper, style]}>
      {(!!label || showLabel) && (
        <View style={styles.headerRow}>
          {!!label ? (
            <Text variant="Caption" color="textSecondary">
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showLabel && (
            <Text variant="Caption" color="textPrimary" style={{ fontWeight: '600' }}>
              {clamped}%
            </Text>
          )}
        </View>
      )}

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clamped }}
        style={[
          styles.track,
          {
            height,
            borderRadius: tokens.radius.full,
            backgroundColor: tokens.colors.surfaceTertiary,
          },
        ]}
      >
        <View
          style={{
            width: `${clamped}%`,
            height: '100%',
            borderRadius: tokens.radius.full,
            backgroundColor: fill,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});
