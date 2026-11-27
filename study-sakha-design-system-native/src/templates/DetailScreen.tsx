/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/templates/DetailScreen.tsx
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PageLayout } from '../components/layout/PageLayout';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Button } from '../components/buttons/Button';
import { Skeleton } from '../components/feedback/Skeleton';
import { ErrorState } from '../components/feedback/ErrorState';

export interface DetailScreenProps {
  title: string;
  subtitle?: string;
  onBackPress: () => void;
  headerRight?: React.ReactNode;
  safeTop?: boolean;
  primaryCtaLabel?: string;
  onPrimaryCtaPress?: () => void;
  primaryCtaLoading?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children?: React.ReactNode;
}

export function DetailScreen({
  title,
  subtitle,
  onBackPress,
  headerRight,
  safeTop = true,
  primaryCtaLabel,
  onPrimaryCtaPress,
  primaryCtaLoading = false,
  loading = false,
  error = null,
  onRetry,
  children,
}: DetailScreenProps) {
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
      footer={
        primaryCtaLabel ? (
          <Button
            fullWidth
            size="large"
            loading={primaryCtaLoading}
            onPress={onPrimaryCtaPress}
          >
            {primaryCtaLabel}
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <View style={styles.skeletons}>
          <Skeleton height={160} radius="lg" />
          <Skeleton height={22} width="70%" />
          <Skeleton height={14} width="95%" />
          <Skeleton height={14} width="85%" />
        </View>
      ) : error ? (
        <ErrorState description={error} onRetry={onRetry} />
      ) : (
        children
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  skeletons: {
    gap: 12,
  },
});
