import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { NOTIFICATION_FILTERS } from '../../lib/notifications/registry';
import type { NotificationFilter } from '../../lib/notifications/types';
import { radii, useTheme } from '../../lib/theme';
import { Txt } from '../ui';

type NotificationFiltersProps = {
  selectedFilter: NotificationFilter;
  counts: Record<NotificationFilter, number>;
  horizontalPadding?: number;
  onSelectFilter: (filter: NotificationFilter) => void;
};

export function NotificationFilters({
  selectedFilter,
  counts,
  horizontalPadding = 16,
  onSelectFilter,
}: NotificationFiltersProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: horizontalPadding,
        paddingVertical: 10,
        gap: 8,
        alignItems: 'center',
      }}
    >
      {NOTIFICATION_FILTERS.map((filter) => {
        const active = selectedFilter === filter.key;
        const count = counts[filter.key] ?? 0;
        return (
          <Pressable
            key={filter.key}
            onPress={() => onSelectFilter(filter.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${filter.label} notifications, ${count}`}
            testID={`notification-filter-${filter.key}`}
            style={({ pressed }) => ({
              minHeight: 34,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radii.pill,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: active ? colors.blue : colors.border,
              backgroundColor: active
                ? colors.blue
                : pressed
                  ? colors.surfaceAlt
                  : colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            })}
          >
            <Txt
              size={12.5}
              weight={active ? '700' : '600'}
              color={active ? '#FFFFFF' : colors.text}
            >
              {filter.label}
            </Txt>
            {count > 0 ? (
              <View
                style={{
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  paddingHorizontal: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? 'rgba(255,255,255,0.22)' : colors.surfaceAlt,
                }}
              >
                <Txt
                  size={10}
                  weight="700"
                  color={active ? '#FFFFFF' : colors.textMuted}
                >
                  {count > 99 ? '99+' : count}
                </Txt>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
