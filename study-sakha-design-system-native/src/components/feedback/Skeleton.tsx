/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/feedback/Skeleton.tsx
 */

import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { RadiusKey } from '../../theme/tokens/radius';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: RadiusKey | number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'sm',
  style,
}: SkeletonProps) {
  const { tokens } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (tokens.motion.reducedMotion) {
      opacity.setValue(0.75);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, tokens.motion.reducedMotion]);

  const resolvedRadius =
    typeof radius === 'number'
      ? radius
      : (tokens.radius[radius] ?? tokens.radius.sm);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no"
      style={[
        {
          width,
          height,
          borderRadius: resolvedRadius,
          backgroundColor: tokens.colors.surfaceTertiary,
          opacity,
        },
        style,
      ]}
    />
  );
}
