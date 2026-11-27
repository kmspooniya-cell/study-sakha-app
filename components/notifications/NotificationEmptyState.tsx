import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { View } from 'react-native';
import type { NotificationFilter } from '../../lib/notifications/types';
import { useTheme } from '../../lib/theme';
import { Button, Txt } from '../ui';

type NotificationEmptyStateProps = {
  filter: NotificationFilter;
  totalCount: number;
  onResetFilter?: () => void;
};

export function NotificationEmptyState({
  filter,
  totalCount,
  onResetFilter,
}: NotificationEmptyStateProps) {
  const { colors } = useTheme();

  let title = "You're all caught up!";
  let body = 'Study reminders, focus milestones, group activity, and updates will appear here.';
  let icon: keyof typeof Ionicons.glyphMap = 'notifications-off-outline';

  if (filter === 'unread' && totalCount > 0) {
    title = "You're up to date.";
    body = 'Every notification in your inbox has been read.';
    icon = 'checkmark-done-circle-outline';
  } else if (filter === 'study') {
    title = 'No study notifications yet';
    body = 'Planner reminders, focus completions, mock test results, and streak updates will show up here.';
    icon = 'book-outline';
  } else if (filter === 'social') {
    title = 'No social notifications yet';
    body = 'Friend requests, study group invitations, and chat mentions will appear here.';
    icon = 'people-outline';
  } else if (filter === 'updates') {
    title = 'No updates yet';
    body = 'Exam announcements, library additions, and system notices will appear here.';
    icon = 'megaphone-outline';
  }

  return (
    <View
      testID="notification-empty-state"
      style={{
        paddingVertical: 56,
        paddingHorizontal: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={28} color={colors.blue} />
      </View>
      <Txt size={17} weight="800" display style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      <Txt size={13.5} color={colors.textMuted} style={{ textAlign: 'center', maxWidth: 320 }}>
        {body}
      </Txt>
      {filter !== 'all' && totalCount > 0 && onResetFilter ? (
        <Button label="Show all notifications" variant="outline" size="sm" onPress={onResetFilter} />
      ) : null}
    </View>
  );
}
