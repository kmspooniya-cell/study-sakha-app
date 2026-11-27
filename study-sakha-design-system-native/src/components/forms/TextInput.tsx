/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/TextInput.tsx
 */

import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';

export type SSDSInputType = 'text' | 'email' | 'password' | 'numeric';

export interface TextInputProps
  extends Omit<RNTextInputProps, 'onChange' | 'onChangeText' | 'style'> {
  label?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  type?: SSDSInputType;
  helperText?: string;
  errorText?: string;
  successText?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  multiline?: boolean;
  rows?: number;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  type = 'text',
  helperText,
  errorText,
  successText,
  required = false,
  disabled = false,
  readOnly = false,
  multiline = false,
  rows = 3,
  leadingIcon,
  trailingIcon,
  style,
  ...rest
}: TextInputProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const editable = !disabled && !readOnly;

  const keyboardType: KeyboardTypeOptions =
    type === 'email'
      ? 'email-address'
      : type === 'numeric'
      ? 'numeric'
      : 'default';

  const borderColor = errorText
    ? tokens.colors.danger
    : successText
    ? tokens.colors.success
    : focused
    ? tokens.colors.borderFocused
    : tokens.colors.border;

  return (
    <View style={[styles.wrapper, style]}>
      {!!label && (
        <View style={styles.labelRow}>
          <Text variant="InputLabel">{label}</Text>
          {required && (
            <Text variant="InputLabel" color="danger">
              *
            </Text>
          )}
        </View>
      )}

      <View
        style={[
          styles.inputBox,
          {
            minHeight: multiline
              ? rows * 22 + 20
              : tokens.dimensions.inputHeight,
            alignItems: multiline ? 'flex-start' : 'center',
            paddingVertical: multiline ? 10 : 0,
            paddingHorizontal: tokens.spacing.inputPadding,
            borderRadius: tokens.radius.md,
            borderColor,
            backgroundColor: disabled
              ? tokens.colors.surfaceDisabled
              : readOnly
              ? tokens.colors.surfaceSecondary
              : tokens.colors.surface,
          },
        ]}
      >
        {leadingIcon && (
          <Icon
            icon={leadingIcon}
            size={17}
            color={focused ? 'primary' : 'textTertiary'}
            style={multiline ? { marginTop: 2 } : undefined}
          />
        )}

        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.colors.textPlaceholder}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? rows : 1}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={type === 'email' || isPassword ? 'none' : 'sentences'}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: disabled
                ? tokens.colors.textDisabled
                : tokens.colors.textPrimary,
              fontFamily: tokens.typography.fontFamilyPrimary,
              fontSize: Math.round(14 * tokens.typography.scale * 10) / 10,
            },
          ]}
          {...rest}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((p) => !p)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon icon={showPassword ? EyeOff : Eye} size={17} color="textTertiary" />
          </Pressable>
        ) : (
          trailingIcon && <Icon icon={trailingIcon} size={17} color="textTertiary" />
        )}
      </View>

      {errorText ? (
        <Text variant="ErrorText">{errorText}</Text>
      ) : successText ? (
        <Text variant="HelperText" color="success">
          {successText}
        </Text>
      ) : helperText ? (
        <Text variant="HelperText">{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputBox: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
  },
});
