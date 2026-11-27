/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/data-display/CircularProgress.tsx
 * Dependency: react-native-svg
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorTokenKey } from '../../theme/tokens/colors';
import { Text } from '../foundation/Text';

export interface CircularProgressProps {
  value?: number;
  size?: number;
  strokeWidth?: number;
  color?: ColorTokenKey | (string & {});
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function CircularProgress({
  value = 0,
  size = 64,
  strokeWidth = 6,
  color = 'primary',
  label,
  style,
}: CircularProgressProps) {
  const { tokens } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const strokeColor = tokens.colors[color as ColorTokenKey] ?? color;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[styles.wrapper, { width: size, height: size }, style]}
    >
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tokens.colors.surfaceTertiary}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>

      <View style={styles.labelContainer}>
        <Text
          variant="Caption"
          color="textPrimary"
          style={{
            fontWeight: '700',
            fontSize: size > 100 ? 22 : size > 70 ? 15 : 12,
          }}
        >
          {label ?? `${clamped}%`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
