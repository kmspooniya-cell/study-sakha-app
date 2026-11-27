/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/media/ImagePlaceholder.tsx
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../foundation/Icon';
import { Text } from '../foundation/Text';
import { RadiusKey } from '../../theme/tokens/radius';

export interface ImagePlaceholderProps {
  icon?: LucideIcon;
  label?: string;
  height?: number;
  radius?: RadiusKey;
  style?: StyleProp<ViewStyle>;
}

export function ImagePlaceholder({
  icon = ImageIcon,
  label,
  height = 120,
  radius = 'md',
  style,
}: ImagePlaceholderProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          height,
          borderRadius: tokens.radius[radius],
          backgroundColor: tokens.colors.surfaceTertiary,
          borderColor: tokens.colors.border,
        },
        style,
      ]}
    >
      <Icon icon={icon} size={24} color="textTertiary" />
      {!!label && <Text variant="Caption">{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
  },
});
