/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/buttons/Button.tsx
 */

import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text as RNText,
  TextStyle,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../foundation/Icon';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'ghost'
  | 'text'
  | 'destructive';

export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  variant = 'primary',
  size = 'medium',
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  loading = false,
  disabled = false,
  onPress,
  children,
  style,
  containerStyle,
  textStyle,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { tokens } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isDisabled = disabled || loading;

  const sizeCfg = {
    small: {
      height: tokens.dimensions.buttonHeightSmall,
      px: 12,
      fontSize: 13,
      iconSize: 15,
      gap: 6,
    },
    medium: {
      height: tokens.dimensions.buttonHeightMedium,
      px: 16,
      fontSize: 14,
      iconSize: 17,
      gap: 8,
    },
    large: {
      height: tokens.dimensions.buttonHeightLarge,
      px: 20,
      fontSize: 15,
      iconSize: 19,
      gap: 8,
    },
  }[size];

  const getVariantColors = (pressed: boolean) => {
    switch (variant) {
      case 'primary':
        return {
          bg: pressed ? tokens.colors.primaryDark : tokens.colors.primary,
          color: tokens.colors.textInverse,
          border: 'transparent',
          px: sizeCfg.px,
        };
      case 'secondary':
        return {
          bg: pressed ? tokens.colors.surfaceSelected : tokens.colors.primaryLight,
          color: tokens.colors.primary,
          border: 'transparent',
          px: sizeCfg.px,
        };
      case 'tertiary':
        return {
          bg: pressed ? tokens.colors.backgroundTertiary : tokens.colors.surfaceTertiary,
          color: tokens.colors.textPrimary,
          border: 'transparent',
          px: sizeCfg.px,
        };
      case 'outline':
        return {
          bg: pressed ? tokens.colors.surfaceSecondary : 'transparent',
          color: tokens.colors.textPrimary,
          border: tokens.colors.borderStrong,
          px: sizeCfg.px,
        };
      case 'ghost':
        return {
          bg: pressed ? tokens.colors.surfaceTertiary : 'transparent',
          color: tokens.colors.textPrimary,
          border: 'transparent',
          px: sizeCfg.px,
        };
      case 'text':
        return {
          bg: 'transparent',
          color: tokens.colors.primary,
          border: 'transparent',
          px: 6,
        };
      case 'destructive':
        return {
          bg: pressed ? '#A82929' : tokens.isDark ? '#C63636' : tokens.colors.danger,
          color: '#FFFFFF',
          border: 'transparent',
          px: sizeCfg.px,
        };
    }
  };

  const handlePressIn = () => {
    if (isDisabled || tokens.motion.reducedMotion) return;
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

  const hitSlop =
    sizeCfg.height < tokens.dimensions.touchTargetSize
      ? {
          top: Math.ceil((tokens.dimensions.touchTargetSize - sizeCfg.height) / 2),
          bottom: Math.ceil((tokens.dimensions.touchTargetSize - sizeCfg.height) / 2),
          left: 4,
          right: 4,
        }
      : undefined;

  const flatStyle = style ? StyleSheet.flatten(style) : undefined;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth ? styles.fullWidth : styles.autoWidth,
        flatStyle?.flex !== undefined ? { flex: flatStyle.flex } : undefined,
        flatStyle?.alignSelf !== undefined ? { alignSelf: flatStyle.alignSelf } : undefined,
        containerStyle,
      ]}
    >
      <Pressable
        testID={testID}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
        }
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => {
          const vc = getVariantColors(pressed);
          return [
            styles.base,
            {
              height: sizeCfg.height,
              paddingHorizontal: vc.px,
              gap: sizeCfg.gap,
              borderRadius: tokens.radius.md,
              backgroundColor: isDisabled ? tokens.colors.surfaceDisabled : vc.bg,
              borderColor: isDisabled ? tokens.colors.borderSubtle : vc.border,
              opacity: isDisabled ? 0.72 : 1,
            },
            fullWidth && styles.fullWidth,
            style,
          ];
        }}
      >
        {({ pressed }) => {
          const vc = getVariantColors(pressed);
          const fgColor = isDisabled ? tokens.colors.textDisabled : vc.color;
          return (
            <>
              {loading ? (
                <ActivityIndicator size="small" color={fgColor} />
              ) : (
                leadingIcon && (
                  <Icon icon={leadingIcon} size={sizeCfg.iconSize} color={fgColor} />
                )
              )}
              {children !== undefined && children !== null && (
                <RNText
                  numberOfLines={1}
                  style={[
                    {
                      color: fgColor,
                      fontFamily: tokens.typography.fontFamilyPrimary,
                      fontSize: Math.round(sizeCfg.fontSize * tokens.typography.scale * 10) / 10,
                      fontWeight: '600',
                      includeFontPadding: false,
                      flexShrink: 1,
                    },
                    textStyle,
                  ]}
                >
                  {children}
                </RNText>
              )}
              {!loading && trailingIcon && (
                <Icon icon={trailingIcon} size={sizeCfg.iconSize} color={fgColor} />
              )}
            </>
          );
        }}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  autoWidth: {
    alignSelf: 'flex-start',
  },
});
