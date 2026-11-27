/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/Select.tsx
 *
 * Native Adaptation:
 * Replaces HTML <select> with an accessible Pressable trigger + React Native Modal sheet.
 */

import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { IconButton } from '../buttons/IconButton';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  label?: string;
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  helperText?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Select({
  label,
  value,
  placeholder = 'Select an option',
  options,
  onChange,
  helperText,
  disabled = false,
  style,
}: SelectProps) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={[styles.wrapper, style]}>
      {!!label && <Text variant="InputLabel">{label}</Text>}

      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityState={{ disabled, expanded: open }}
        style={[
          styles.trigger,
          {
            height: tokens.dimensions.inputHeight,
            borderRadius: tokens.radius.md,
            backgroundColor: disabled
              ? tokens.colors.surfaceDisabled
              : tokens.colors.surface,
            borderColor: open ? tokens.colors.borderFocused : tokens.colors.border,
          },
        ]}
      >
        <Text
          variant="BodySecondary"
          color={
            disabled
              ? 'textDisabled'
              : selectedOption
              ? 'textPrimary'
              : 'textPlaceholder'
          }
          truncate
          style={styles.triggerText}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <Icon icon={ChevronDown} size={16} color="textTertiary" />
      </Pressable>

      {!!helperText && <Text variant="HelperText">{helperText}</Text>}

      <Modal
        visible={open}
        transparent
        animationType={tokens.motion.reducedMotion ? 'none' : 'fade'}
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              tokens.shadows.elevation5,
              {
                backgroundColor: tokens.colors.surfaceElevated,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.xl,
                maxWidth: tokens.dimensions.modalMaxWidth,
              },
            ]}
            onPress={() => undefined}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: tokens.colors.divider }]}>
              <Text variant="SectionTitle">{label ?? 'Select Option'}</Text>
              <IconButton
                icon={X}
                size="small"
                label="Close selector"
                onPress={() => setOpen(false)}
              />
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange?.(item.value);
                      setOpen(false);
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        backgroundColor: isSelected
                          ? tokens.colors.surfaceSelected
                          : pressed
                          ? tokens.colors.surfaceSecondary
                          : 'transparent',
                        borderRadius: tokens.radius.md,
                      },
                    ]}
                  >
                    <Text
                      variant="BodyPrimary"
                      color={isSelected ? 'primary' : 'textPrimary'}
                      style={{ flex: 1, fontWeight: isSelected ? '600' : '400' }}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Icon icon={Check} size={18} color="primary" />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  triggerText: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 25, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  list: {
    padding: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    gap: 8,
  },
});
