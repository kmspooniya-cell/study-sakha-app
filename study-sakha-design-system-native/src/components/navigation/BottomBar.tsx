/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/navigation/BottomBar.tsx
 *
 * Reusable bottom navigation bar compatible with React Navigation custom tabBar
 * or standalone controlled state.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';

export interface BottomBarItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface BottomBarProps {
  items: BottomBarItem[];
  activeId: string;
  onChange?: (id: string) => void;
  safeBottom?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BottomBar({
  items,
  activeId,
  onChange,
  safeBottom = true,
  style,
}: BottomBarProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = safeBottom ? Math.max(insets.bottom, 6) : 6;

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          minHeight: tokens.dimensions.bottomNavigationHeight + (safeBottom ? insets.bottom : 0),
          paddingBottom: bottomPad,
          backgroundColor: tokens.colors.surface,
          borderTopColor: tokens.colors.divider,
        },
        style,
      ]}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange?.(item.id)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            style={[
              styles.tabItem,
              { minHeight: tokens.dimensions.touchTargetSize },
            ]}
          >
            <View
              style={[
                styles.pill,
                {
                  borderRadius: tokens.radius.full,
                  backgroundColor: active
                    ? tokens.colors.primaryLight
                    : 'transparent',
                },
              ]}
            >
              <Icon
                icon={item.icon}
                size={19}
                color={active ? 'primary' : 'textTertiary'}
              />
            </View>
            <Text
              variant="NavigationLabel"
              color={active ? 'primary' : 'textTertiary'}
              style={{ fontWeight: active ? '600' : '500' }}
              truncate
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
