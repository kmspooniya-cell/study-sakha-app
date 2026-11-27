/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/buttons/IconButton.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../foundation/Icon';

export type IconButtonVariant = 'ghost' | 'primary' | 'secondary' | 'outline';
export type IconButtonSize = 'small' | 'medium' | 'large';

export interface IconButtonProps {
  icon: LucideIcon;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'medium',
  label,
  disabled = false,
  active = false,
  onPress,
  style,
  testID,
}: IconButtonProps) {
  const { tokens } = useTheme();

  const dim = size === 'small' ? 32 : size === 'large' ? 46 : 38;
  const iconPx = size === 'small' ? 16 : size === 'large' ? 22 : 18;
  const extraSlop = Math.max(0, Math.ceil((tokens.dimensions.touchTargetSize - dim) / 2));

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      hitSlop={extraSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      style={({ pressed }) => {
        const bg =
          variant === 'primary'
            ? pressed
              ? tokens.colors.primaryDark
              : tokens.colors.primary
            : variant === 'secondary' || active
            ? tokens.colors.primaryLight
            : variant === 'outline'
            ? pressed
              ? tokens.colors.surfaceSecondary
              : tokens.colors.surface
            : pressed
            ? tokens.colors.surfaceTertiary
            : 'transparent';

        return [
          styles.base,
          {
            width: dim,
            height: dim,
            borderRadius: tokens.radius.md,
            backgroundColor: disabled ? tokens.colors.surfaceDisabled : bg,
            borderColor:
              variant === 'outline' ? tokens.colors.border : 'transparent',
            opacity: disabled ? 0.65 : 1,
          },
          style,
        ];
      }}
    >
      <Icon
        icon={icon}
        size={iconPx}
        color={
          disabled
            ? tokens.colors.textDisabled
            : variant === 'primary'
            ? tokens.colors.textInverse
            : active || variant === 'secondary'
            ? tokens.colors.primary
            : tokens.colors.textSecondary
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
});
