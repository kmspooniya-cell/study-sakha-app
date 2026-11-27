import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AnnouncementRecord } from '../../lib/notifications/types';
import { radii, useTheme } from '../../lib/theme';
import { Txt } from '../ui';

type AnnouncementCardProps = {
  announcement: AnnouncementRecord | null;
  totalActiveCount: number;
  horizontalPadding?: number;
  onPressOpen: (announcement: AnnouncementRecord) => void;
  onPressDismiss: (announcementId: string) => void;
  onPressViewAll: () => void;
};

function isRecentAnnouncement(at: number): boolean {
  return Date.now() - at < 72 * 60 * 60 * 1000;
}

export function AnnouncementCard({
  announcement,
  totalActiveCount,
  horizontalPadding = 16,
  onPressOpen,
  onPressDismiss,
  onPressViewAll,
}: AnnouncementCardProps) {
  const { colors } = useTheme();
  if (!announcement) return null;

  const isNew = isRecentAnnouncement(announcement.at);

  return (
    <View
      testID="announcement-card"
      style={{
        marginHorizontal: horizontalPadding,
        marginTop: 12,
        borderRadius: radii.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 11,
        gap: 5,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Ionicons name="megaphone-outline" size={14} color={colors.blue} />
          <Txt size={11} weight="700" color={colors.textMuted} style={{ letterSpacing: 0.4 }}>
            ANNOUNCEMENT
          </Txt>
          {isNew ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: radii.pill,
                backgroundColor: colors.tint,
              }}
            >
              <Txt size={9.5} weight="700" color={colors.blue}>
                New
              </Txt>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => onPressDismiss(announcement.id)}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss announcement ${announcement.title}`}
          testID="announcement-dismiss-button"
          hitSlop={8}
          style={({ pressed }) => ({
            minWidth: 32,
            minHeight: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
          })}
        >
          <Ionicons name="close" size={16} color={colors.textFaint} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => onPressOpen(announcement)}
        accessibilityRole="button"
        accessibilityLabel={`Open announcement ${announcement.title}. ${announcement.body}`}
        style={{ gap: 2 }}
      >
        <Txt size={14} weight="700" numberOfLines={1}>
          {announcement.title}
        </Txt>
        <Txt size={12.5} color={colors.textMuted} numberOfLines={2}>
          {announcement.body}
        </Txt>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <Pressable
          onPress={() => onPressOpen(announcement)}
          accessibilityRole="button"
          accessibilityLabel={`Read more about ${announcement.title}`}
          style={{ minHeight: 28, justifyContent: 'center' }}
        >
          <Txt size={12} weight="700" color={colors.blue}>
            Read more
          </Txt>
        </Pressable>

        {totalActiveCount > 1 ? (
          <Pressable
            onPress={onPressViewAll}
            accessibilityRole="button"
            accessibilityLabel={`View all ${totalActiveCount} announcements`}
            testID="announcement-view-all-button"
            style={{ minHeight: 28, justifyContent: 'center' }}
          >
            <Txt size={12} weight="600" color={colors.textMuted}>
              View all ({totalActiveCount})
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
