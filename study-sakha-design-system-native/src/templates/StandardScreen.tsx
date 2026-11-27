/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/templates/StandardScreen.tsx
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PageLayout } from '../components/layout/PageLayout';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Skeleton } from '../components/feedback/Skeleton';
import { ErrorState } from '../components/feedback/ErrorState';
import { EmptyState, EmptyStateAction } from '../components/feedback/EmptyState';

export interface StandardScreenProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  safeTop?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: EmptyStateAction;
  children?: React.ReactNode;
}

export function StandardScreen({
  title,
  subtitle,
  onBackPress,
  headerRight,
  footer,
  safeTop = true,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  children,
}: StandardScreenProps) {
  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.skeletonGroup}>
          <Skeleton height={88} radius="lg" />
          <Skeleton height={88} radius="lg" />
          <Skeleton height={88} radius="lg" />
        </View>
      );
    }
    if (error) {
      return <ErrorState description={error} onRetry={onRetry} />;
    }
    if (empty) {
      return (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          primaryAction={emptyAction}
        />
      );
    }
    return children;
  };

  return (
    <PageLayout
      scrollable
      header={
        <ScreenHeader
          title={title}
          subtitle={subtitle}
          onBackPress={onBackPress}
          rightActions={headerRight}
          safeTop={safeTop}
        />
      }
      footer={footer}
    >
      {renderBody()}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  skeletonGroup: {
    gap: 12,
  },
});
