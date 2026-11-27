/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/templates/ListingScreen.tsx
 */

import React from 'react';
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { SearchFilterPattern } from '../patterns/SearchFilterPattern';
import { EmptyState, EmptyStateAction } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { Skeleton } from '../components/feedback/Skeleton';

export interface ListingScreenProps<T> {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  headerRight?: React.ReactNode;
  safeTop?: boolean;
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  categories?: string[];
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: EmptyStateAction;
}

export function ListingScreen<T>({
  title,
  subtitle,
  onBackPress,
  headerRight,
  safeTop = true,
  data,
  keyExtractor,
  renderItem,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  categories,
  activeCategory,
  onCategoryChange,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No items found',
  emptyDescription,
  emptyAction,
}: ListingScreenProps<T>) {
  const { tokens } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: tokens.colors.background }]}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        onBackPress={onBackPress}
        rightActions={headerRight}
        safeTop={safeTop}
      />

      {onSearchChange !== undefined && (
        <View
          style={{
            paddingHorizontal: tokens.spacing.screenPadding,
            paddingTop: 12,
            paddingBottom: 6,
          }}
        >
          <SearchFilterPattern
            searchQuery={searchQuery ?? ''}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={onCategoryChange}
          />
        </View>
      )}

      {loading ? (
        <View style={[styles.stateBox, { padding: tokens.spacing.screenPadding }]}>
          <Skeleton height={76} radius="lg" />
          <Skeleton height={76} radius="lg" />
          <Skeleton height={76} radius="lg" />
        </View>
      ) : error ? (
        <View style={{ padding: tokens.spacing.screenPadding }}>
          <ErrorState description={error} onRetry={onRetry} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: tokens.spacing.screenPadding,
            gap: tokens.spacing.componentGap,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              primaryAction={emptyAction}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stateBox: {
    gap: 12,
  },
});
