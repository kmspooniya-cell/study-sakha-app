import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radii, useTheme } from '../../lib/theme';
import { Txt } from '../ui';

type NotificationErrorStateProps = {
  message: string;
  hasCachedData: boolean;
  horizontalPadding?: number;
  onRetry: () => void;
};

export function NotificationErrorState({
  message,
  hasCachedData,
  horizontalPadding = 16,
  onRetry,
}: NotificationErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View
      testID={hasCachedData ? 'notification-error-banner' : 'notification-error-state'}
      style={{
        marginHorizontal: horizontalPadding,
        marginTop: 6,
        marginBottom: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <Ionicons name="cloud-offline-outline" size={15} color={colors.textMuted} />
        <Txt size={12} color={colors.textMuted} style={{ flex: 1 }} numberOfLines={2}>
          Showing local data — live sync unavailable ({message})
        </Txt>
      </View>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry syncing notifications"
        style={({ pressed }) => ({
          minHeight: 30,
          paddingHorizontal: 8,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
        })}
      >
        <Txt size={12} weight="700" color={colors.blue}>
          Retry
        </Txt>
      </Pressable>
    </View>
  );
}
