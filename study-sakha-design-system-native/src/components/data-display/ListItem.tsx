/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/data-display/ListItem.tsx
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Divider } from '../foundation/Divider';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
  hindi?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  divider = false,
  hindi = false,
  style,
}: ListItemProps) {
  const { tokens } = useTheme();

  const content = (
    <>
      {!!leading && <View style={styles.leading}>{leading}</View>}
      <View style={styles.center}>
        <Text variant="CardTitle" hindi={hindi} truncate>
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="Caption" hindi={hindi} truncate style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      {!!trailing && <View style={styles.trailing}>{trailing}</View>}
    </>
  );

  return (
    <View style={style}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.row,
            {
              paddingVertical: tokens.spacing.listItemSpacing,
              borderRadius: tokens.radius.md,
              backgroundColor: pressed
                ? tokens.colors.surfaceSecondary
                : 'transparent',
            },
          ]}
        >
          {content}
        </Pressable>
      ) : (
        <View
          style={[
            styles.row,
            { paddingVertical: tokens.spacing.listItemSpacing },
          ]}
        >
          {content}
        </View>
      )}
      {divider && <Divider inset />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 12,
  },
  leading: {
    flexShrink: 0,
  },
  center: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
});
