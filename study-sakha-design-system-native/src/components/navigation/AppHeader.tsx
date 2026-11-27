/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/navigation/AppHeader.tsx
 *
 * Reusable design-system header component (independent of navigation router).
 */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { ScreenHeader } from '../layout/ScreenHeader';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppHeader({
  title,
  subtitle,
  onBackPress,
  rightActions,
  safeTop = true,
  style,
}: AppHeaderProps) {
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      onBackPress={onBackPress}
      rightActions={rightActions}
      safeTop={safeTop}
      style={style}
    />
  );
}
