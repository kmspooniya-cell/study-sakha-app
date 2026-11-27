/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/navigation/TabBar.tsx
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Badge } from '../feedback/Badge';

export interface TabBarItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export interface TabBarProps {
  tabs: TabBarItem[];
  activeId: string;
  onChange?: (id: string) => void;
  variant?: 'underline' | 'pill';
  style?: StyleProp<ViewStyle>;
}

export function TabBar({
  tabs,
  activeId,
  onChange,
  variant = 'underline',
  style,
}: TabBarProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        variant === 'underline' && {
          borderBottomWidth: 1,
          borderBottomColor: tokens.colors.divider,
        },
        style,
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.row,
          { gap: variant === 'pill' ? 6 : 4 },
        ]}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange?.(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                styles.tab,
                variant === 'pill'
                  ? {
                      paddingVertical: 7,
                      paddingHorizontal: 14,
                      borderRadius: tokens.radius.md,
                      backgroundColor: active
                        ? tokens.colors.primaryLight
                        : 'transparent',
                    }
                  : {
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderBottomWidth: 2,
                      borderBottomColor: active
                        ? tokens.colors.primary
                        : 'transparent',
                    },
              ]}
            >
              {tab.icon && (
                <Icon
                  icon={tab.icon}
                  size={15}
                  color={active ? 'primary' : 'textSecondary'}
                />
              )}
              <Text
                variant="BodySecondary"
                color={active ? 'primary' : 'textSecondary'}
                style={{ fontWeight: active ? '600' : '500' }}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined && (
                <Badge variant={active ? 'primary' : 'neutral'} size="sm">
                  {tab.count}
                </Badge>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
  },
});
