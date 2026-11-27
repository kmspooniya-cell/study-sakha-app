/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/Switch.tsx
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  style,
}: SwitchProps) {
  const { tokens } = useTheme();
  const translateX = useRef(new Animated.Value(checked ? 20 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: checked ? 20 : 0,
      duration: tokens.motion.durationFast,
      useNativeDriver: true,
    }).start();
  }, [checked, tokens.motion.durationFast, translateX]);

  return (
    <View style={[styles.row, { opacity: disabled ? 0.55 : 1 }, style]}>
      {(!!label || !!description) && (
        <View style={styles.textBlock}>
          {!!label && (
            <Text variant="BodySecondary" color="textPrimary" style={styles.label}>
              {label}
            </Text>
          )}
          {!!description && <Text variant="Caption">{description}</Text>}
        </View>
      )}

      <Pressable
        disabled={disabled}
        onPress={() => !disabled && onChange?.(!checked)}
        hitSlop={8}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked, disabled }}
        style={[
          styles.track,
          {
            backgroundColor: checked
              ? tokens.colors.primary
              : tokens.colors.borderStrong,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX }] },
          ]}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontWeight: '500',
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 9999,
    padding: 3,
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
});
