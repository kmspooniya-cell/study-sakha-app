import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../lib/theme';

export function NotificationSkeleton({ count = 6 }: { count?: number }) {
  const { colors } = useTheme();
  return (
    <View testID="notification-skeleton" style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: colors.surfaceInteractive,
            }}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <View
              style={{
                width: '58%',
                height: 14,
                borderRadius: 7,
                backgroundColor: colors.surfaceInteractive,
              }}
            />
            <View
              style={{
                width: '90%',
                height: 12,
                borderRadius: 6,
                backgroundColor: colors.surfaceAlt,
              }}
            />
            <View
              style={{
                width: '32%',
                height: 10,
                borderRadius: 5,
                backgroundColor: colors.surfaceAlt,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
