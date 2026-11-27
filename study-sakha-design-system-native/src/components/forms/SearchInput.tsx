/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/SearchInput.tsx
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../foundation/Icon';

export interface SearchInputProps {
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search notes, tests, PYQs...',
  onClear,
  style,
}: SearchInputProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius: tokens.radius.md,
          backgroundColor: tokens.colors.surfaceSecondary,
          borderColor: focused ? tokens.colors.borderFocused : tokens.colors.border,
        },
        style,
      ]}
    >
      <Icon icon={Search} size={16} color={focused ? 'primary' : 'textTertiary'} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.textPlaceholder}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.fontFamilyPrimary,
            fontSize: Math.round(13.5 * tokens.typography.scale * 10) / 10,
          },
        ]}
      />
      {!!value && (
        <Pressable
          onPress={() => {
            onChangeText?.('');
            onClear?.();
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Icon icon={X} size={15} color="textTertiary" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 6,
  },
});
