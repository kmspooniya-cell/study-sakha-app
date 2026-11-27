/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/patterns/SearchFilterPattern.tsx
 */

import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SearchInput } from '../components/forms/SearchInput';
import { Button } from '../components/buttons/Button';

export interface SearchFilterPatternProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  categories?: string[];
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function SearchFilterPattern({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  categories = [],
  activeCategory,
  onCategoryChange,
  style,
}: SearchFilterPatternProps) {
  return (
    <View style={[styles.container, style]}>
      <SearchInput
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder={searchPlaceholder}
      />

      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {categories.map((cat) => (
            <Button
              key={cat}
              size="small"
              variant={activeCategory === cat ? 'primary' : 'outline'}
              onPress={() => onCategoryChange?.(cat)}
            >
              {cat}
            </Button>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
});
