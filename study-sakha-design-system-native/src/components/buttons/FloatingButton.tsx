/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/buttons/FloatingButton.tsx
 */

import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text as RNText,
  ViewStyle,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../foundation/Icon';

export interface FloatingButtonProps {
  icon?: LucideIcon;
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function FloatingButton({
  icon = Plus,
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: FloatingButtonProps) {
  const { tokens } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || tokens.motion.reducedMotion) return;
    Animated.timing(scaleAnim, {
      toValue: tokens.motion.pressScale,
      duration: tokens.motion.durationFast,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (tokens.motion.reducedMotion) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: tokens.motion.durationFast,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], alignSelf: 'flex-start' }}>
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? 'Quick action'}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.base,
          tokens.shadows.elevation3,
          {
            paddingHorizontal: label ? 18 : 14,
            borderRadius: tokens.radius.full,
            backgroundColor: disabled
              ? tokens.colors.surfaceDisabled
              : pressed
              ? tokens.colors.primaryDark
              : tokens.colors.primary,
          },
          style,
        ]}
      >
        <Icon
          icon={icon}
          size={20}
          color={disabled ? tokens.colors.textDisabled : tokens.colors.textInverse}
        />
        {!!label && (
          <RNText
            style={{
              color: disabled ? tokens.colors.textDisabled : tokens.colors.textInverse,
              fontFamily: tokens.typography.fontFamilyPrimary,
              fontSize: Math.round(14 * tokens.typography.scale * 10) / 10,
              fontWeight: '600',
              includeFontPadding: false,
            }}
          >
            {label}
          </RNText>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
