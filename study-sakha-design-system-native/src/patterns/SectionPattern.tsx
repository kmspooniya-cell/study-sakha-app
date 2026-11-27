/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/patterns/SectionPattern.tsx
 */

import React, { useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { SectionContainer } from '../components/layout/SectionContainer';
import { SectionHeader } from '../components/layout/SectionHeader';

export interface SectionPatternProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  accentIndicator?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function SectionPattern({
  title,
  subtitle,
  description,
  icon,
  actionLabel,
  onAction,
  accentIndicator = false,
  collapsible = false,
  defaultCollapsed = false,
  compact = false,
  style,
  children,
}: SectionPatternProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <SectionContainer style={style}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        description={description}
        icon={icon}
        actionLabel={actionLabel}
        onAction={onAction}
        accentIndicator={accentIndicator}
        collapsible={collapsible}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        compact={compact}
      />
      {!collapsed && children}
    </SectionContainer>
  );
}
