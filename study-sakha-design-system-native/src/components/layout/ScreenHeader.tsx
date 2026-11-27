/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/layout/ScreenHeader.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { IconButton } from '../buttons/IconButton';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  onBackPress,
  rightActions,
  safeTop = false,
  style,
}: ScreenHeaderProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          minHeight: tokens.dimensions.screenHeaderHeight + (safeTop ? insets.top : 0),
          paddingTop: safeTop ? insets.top + 8 : 10,
          paddingBottom: 10,
          paddingHorizontal: tokens.spacing.screenPadding,
          backgroundColor: tokens.colors.surface,
          borderBottomColor: tokens.colors.divider,
        },
        style,
      ]}
    >
      <View style={styles.leftRow}>
        {onBackPress && (
          <IconButton
            icon={ArrowLeft}
            label="Go back"
            size="small"
            onPress={onBackPress}
          />
        )}
        <View style={styles.titleBlock}>
          <Text variant="SectionTitle" truncate accessibilityRole="header">
            {title}
          </Text>
          {!!subtitle && (
            <Text variant="Caption" truncate>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {!!rightActions && <View style={styles.rightRow}>{rightActions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
});
