/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/patterns/EmptyContentPattern.tsx
 */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { EmptyState, EmptyStateAction } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';

export interface EmptyContentPatternProps {
  mode?: 'empty' | 'error';
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyContentPattern({
  mode = 'empty',
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  onRetry,
  style,
}: EmptyContentPatternProps) {
  if (mode === 'error') {
    return (
      <ErrorState
        title={title}
        description={description}
        onRetry={onRetry}
        style={style}
      />
    );
  }

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      style={style}
    />
  );
}
