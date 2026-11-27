import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNotificationTypeConfig } from '../../lib/notifications/registry';
import type { AppNotification } from '../../lib/notifications/types';
import { radii, useTheme } from '../../lib/theme';
import { Txt } from '../ui';

type NotificationActionMenuProps = {
  notif: AppNotification | null;
  onClose: () => void;
  onOpen: (notif: AppNotification) => void;
  onToggleRead: (notif: AppNotification) => void;
  onDelete: (notif: AppNotification) => void;
};

function getContextualOpenLabel(notif: AppNotification): string {
  switch (notif.kind) {
    case 'group':
      return 'Open invitation';
    case 'friend':
      return 'Open friend request';
    case 'planner':
      return 'Open scheduled task';
    case 'test':
      return notif.resultId ? 'Open test result' : 'Open tests';
    case 'focus':
      return 'Open Focus Centre';
    case 'chat':
      return 'Open conversation';
    case 'streak':
      return 'View statistics';
    case 'content':
      return 'Open library';
    default:
      return 'Open';
  }
}

export function NotificationActionMenu({
  notif,
  onClose,
  onOpen,
  onToggleRead,
  onDelete,
}: NotificationActionMenuProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!notif) return null;

  const cfg = getNotificationTypeConfig(notif.kind);
  const openLabel = getContextualOpenLabel(notif);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          testID="notification-action-menu"
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            paddingHorizontal: 16,
            gap: 4,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 38,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.borderStrong,
              marginBottom: 10,
            }}
          />

          <View style={{ paddingHorizontal: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
            <Txt size={12} weight="700" color={colors.textMuted}>
              {cfg.label.toUpperCase()}
            </Txt>
            <Txt size={15} weight="800" numberOfLines={2} style={{ marginTop: 2 }}>
              {notif.title}
            </Txt>
          </View>

          {notif.kind !== 'announcement' ? (
            <Pressable
              onPress={() => {
                onClose();
                onOpen(notif);
              }}
              accessibilityRole="button"
              accessibilityLabel={openLabel}
              testID="action-menu-open"
              style={({ pressed }) => ({
                minHeight: 50,
                paddingHorizontal: 12,
                borderRadius: radii.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <Ionicons name="open-outline" size={20} color={colors.blue} />
              <Txt size={15} weight="600">
                {openLabel}
              </Txt>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => {
              onClose();
              onToggleRead(notif);
            }}
            accessibilityRole="button"
            accessibilityLabel={notif.read ? 'Mark as unread' : 'Mark as read'}
            testID="action-menu-toggle-read"
            style={({ pressed }) => ({
              minHeight: 50,
              paddingHorizontal: 12,
              borderRadius: radii.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Ionicons
              name={notif.read ? 'mail-unread-outline' : 'checkmark-done-outline'}
              size={20}
              color={colors.text}
            />
            <Txt size={15} weight="600">
              {notif.read ? 'Mark as unread' : 'Mark as read'}
            </Txt>
          </Pressable>

          <Pressable
            onPress={() => {
              onClose();
              onDelete(notif);
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete notification"
            testID="action-menu-delete"
            style={({ pressed }) => ({
              minHeight: 50,
              paddingHorizontal: 12,
              borderRadius: radii.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Txt size={15} weight="600" color={colors.danger}>
              Delete
            </Txt>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
