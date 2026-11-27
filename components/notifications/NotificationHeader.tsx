import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../../lib/theme';
import { Txt } from '../ui';

type NotificationHeaderProps = {
  unreadCount: number;
  selectionMode: boolean;
  selectedCount: number;
  totalVisibleCount: number;
  onBack: () => void;
  onMarkAllRead: () => void;
  onOpenSettings: () => void;
  onCancelSelection: () => void;
  onSelectAll: () => void;
  onBulkMarkRead: () => void;
  onBulkDelete: () => void;
};

export function NotificationHeader({
  unreadCount,
  selectionMode,
  selectedCount,
  totalVisibleCount,
  onBack,
  onMarkAllRead,
  onOpenSettings,
  onCancelSelection,
  onSelectAll,
  onBulkMarkRead,
  onBulkDelete,
}: NotificationHeaderProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const sidePadding = width >= 768 ? 16 : 10;

  if (selectionMode) {
    return (
      <View
        testID="notification-selection-header"
        style={{
          minHeight: 58,
          paddingHorizontal: sidePadding,
          paddingVertical: 8,
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Pressable
            onPress={onCancelSelection}
            accessibilityRole="button"
            accessibilityLabel="Cancel selection"
            testID="selection-cancel-button"
            style={({ pressed }) => ({
              minWidth: 48,
              minHeight: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Txt size={17} weight="800" display numberOfLines={1}>
            {selectedCount} selected
          </Txt>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          {selectedCount < totalVisibleCount ? (
            <Pressable
              onPress={onSelectAll}
              accessibilityRole="button"
              accessibilityLabel="Select all visible notifications"
              testID="selection-select-all-button"
              style={({ pressed }) => ({
                minWidth: 48,
                minHeight: 48,
                paddingHorizontal: 10,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <Ionicons name="checkbox-outline" size={20} color={colors.blue} />
            </Pressable>
          ) : null}

          <Pressable
            onPress={onBulkMarkRead}
            disabled={selectedCount === 0}
            accessibilityRole="button"
            accessibilityLabel="Mark selected as read"
            testID="selection-mark-read-button"
            style={({ pressed }) => ({
              minWidth: 48,
              minHeight: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: selectedCount === 0 ? 0.4 : 1,
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Ionicons name="checkmark-done-outline" size={21} color={colors.blue} />
          </Pressable>

          <Pressable
            onPress={onBulkDelete}
            disabled={selectedCount === 0}
            accessibilityRole="button"
            accessibilityLabel="Delete selected notifications"
            testID="selection-delete-button"
            style={({ pressed }) => ({
              minWidth: 48,
              minHeight: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: selectedCount === 0 ? 0.4 : 1,
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    );
  }

  const subtitle =
    unreadCount > 0
      ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
      : 'All caught up';

  return (
    <View
      testID="notification-header"
      style={{
        minHeight: 58,
        paddingHorizontal: sidePadding,
        paddingVertical: 8,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          testID="notification-back-button"
          style={({ pressed }) => ({
            minWidth: 48,
            minHeight: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
          })}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={18} weight="800" display numberOfLines={1}>
            Notifications
          </Txt>
          <Txt size={12} color={colors.textMuted} numberOfLines={1}>
            {subtitle}
          </Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {unreadCount > 0 ? (
          <Pressable
            onPress={onMarkAllRead}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            testID="header-mark-all-read-button"
            style={({ pressed }) => ({
              minWidth: 48,
              minHeight: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Ionicons name="checkmark-done-outline" size={21} color={colors.blue} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="Notification settings"
          testID="notification-settings-button"
          style={({ pressed }) => ({
            minWidth: 48,
            minHeight: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
          })}
        >
          <Ionicons name="settings-outline" size={21} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}
