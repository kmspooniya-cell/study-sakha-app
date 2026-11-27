/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/layout/SectionContainer.tsx
 */

import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface SectionContainerProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionContainer({ children, style }: SectionContainerProps) {
  const { tokens } = useTheme();
  return (
    <View style={[{ marginBottom: tokens.spacing.sectionSpacing }, style]}>
      {children}
    </View>
  );
}
