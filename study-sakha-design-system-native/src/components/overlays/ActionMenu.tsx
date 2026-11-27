/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/overlays/ActionMenu.tsx
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { BottomSheet } from './BottomSheet';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Divider } from '../foundation/Divider';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export interface ActionMenuProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: ActionMenuItem[];
}

export function ActionMenu({
  open,
  onClose,
  title = 'Actions',
  items,
}: ActionMenuProps) {
  const { tokens } = useTheme();

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <View style={styles.list}>
        {items.map((item, idx) => (
          <View key={item.id}>
            <Pressable
              disabled={item.disabled}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              accessibilityRole="menuitem"
              accessibilityState={{ disabled: item.disabled }}
              style={({ pressed }) => [
                styles.row,
                {
                  borderRadius: tokens.radius.md,
                  opacity: item.disabled ? 0.45 : 1,
                  backgroundColor: pressed
                    ? tokens.colors.surfaceSecondary
                    : 'transparent',
                },
              ]}
            >
              {item.icon && (
                <Icon
                  icon={item.icon}
                  size={18}
                  color={item.destructive ? 'danger' : 'textSecondary'}
                />
              )}
              <Text
                variant="BodyPrimary"
                color={item.destructive ? 'danger' : 'textPrimary'}
                style={{ fontWeight: '500' }}
              >
                {item.label}
              </Text>
            </Pressable>
            {idx < items.length - 1 && <Divider />}
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 13,
    minHeight: 46,
  },
});
