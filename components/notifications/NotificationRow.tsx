import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { getNotificationTypeConfig } from '../../lib/notifications/registry';
import type { AppNotification } from '../../lib/notifications/types';
import { useTheme } from '../../lib/theme';
import { Txt } from '../ui';

const SWIPE_RIGHT_WIDTH = 88;
const SWIPE_LEFT_WIDTH = 144;
const SWIPE_THRESHOLD = 44;

type SwipeDirection = 'none' | 'left' | 'right';

type NotificationRowProps = {
  notif: AppNotification;
  selectionMode: boolean;
  selected: boolean;
  isSwipeOpen: boolean;
  horizontalPadding?: number;
  onPress: (notif: AppNotification) => void;
  onLongPress: (notif: AppNotification) => void;
  onPressMore: (notif: AppNotification) => void;
  onToggleRead: (notif: AppNotification) => void;
  onDelete: (notif: AppNotification) => void;
  onSwipeOpen: (id: string) => void;
  onSwipeClose: (id: string) => void;
};

function formatRelativeTime(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return '';
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export const NotificationRow = memo(function NotificationRow({
  notif,
  selectionMode,
  selected,
  isSwipeOpen,
  horizontalPadding = 16,
  onPress,
  onLongPress,
  onPressMore,
  onToggleRead,
  onDelete,
  onSwipeOpen,
  onSwipeClose,
}: NotificationRowProps) {
  const { colors, scheme, reduceMotion } = useTheme();
  const cfg = getNotificationTypeConfig(notif.kind);
  const toneColor = colors[cfg.toneKey] ?? colors.blue;

  const [swipeDir, setSwipeDir] = useState<SwipeDirection>('none');
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const updateSwipeDir = useCallback((nextDir: SwipeDirection) => {
    setSwipeDir((prev) => (prev === nextDir ? prev : nextDir));
  }, []);

  useEffect(() => {
    if (!isSwipeOpen || selectionMode) {
      translateX.value = reduceMotion ? 0 : withSpring(0, { damping: 22, stiffness: 240 });
      setSwipeDir('none');
    }
  }, [isSwipeOpen, reduceMotion, selectionMode, translateX]);

  const closeRow = useCallback(() => {
    translateX.value = reduceMotion ? 0 : withSpring(0, { damping: 22, stiffness: 240 });
    setSwipeDir('none');
    onSwipeClose(notif.id);
  }, [notif.id, onSwipeClose, reduceMotion, translateX]);

  const panGesture = Gesture.Pan()
    .enabled(!selectionMode)
    .activeOffsetX([-14, 14])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const next = Math.max(-SWIPE_LEFT_WIDTH, Math.min(SWIPE_RIGHT_WIDTH, startX.value + event.translationX));
      translateX.value = next;
      if (next > 4) {
        runOnJS(updateSwipeDir)('right');
      } else if (next < -4) {
        runOnJS(updateSwipeDir)('left');
      } else {
        runOnJS(updateSwipeDir)('none');
      }
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = reduceMotion
          ? SWIPE_RIGHT_WIDTH
          : withSpring(SWIPE_RIGHT_WIDTH, { damping: 22, stiffness: 240 });
        runOnJS(updateSwipeDir)('right');
        runOnJS(onSwipeOpen)(notif.id);
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = reduceMotion
          ? -SWIPE_LEFT_WIDTH
          : withSpring(-SWIPE_LEFT_WIDTH, { damping: 22, stiffness: 240 });
        runOnJS(updateSwipeDir)('left');
        runOnJS(onSwipeOpen)(notif.id);
      } else {
        translateX.value = reduceMotion ? 0 : withSpring(0, { damping: 22, stiffness: 240 });
        runOnJS(updateSwipeDir)('none');
        runOnJS(onSwipeClose)(notif.id);
      }
    });

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Continuous neutral inbox surface (no large blue-filled row blocks)
  const rowBaseBg = colors.bg;
  const subtleStateOverlay = selected
    ? colors.selectedSurface
    : !notif.read
      ? (scheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)')
      : 'transparent';

  const readActionLabel = notif.read ? 'Mark unread' : 'Mark read';
  const readActionBg = scheme === 'dark' ? '#1E3A6E' : '#243B80';
  const deleteActionBg = scheme === 'dark' ? '#7F1D1D' : '#C83E46';

  return (
    <View
      style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.borderSubtle,
        backgroundColor: rowBaseBg,
      }}
    >
      {/* Swipe Right Action (revealed only when swiping right) */}
      {!selectionMode && swipeDir === 'right' ? (
        <View
          testID={`notification-swipe-right-${notif.id}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: SWIPE_RIGHT_WIDTH,
            backgroundColor: readActionBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Pressable
            onPress={() => {
              closeRow();
              onToggleRead(notif);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${readActionLabel} ${notif.title}`}
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              paddingHorizontal: 6,
            }}
          >
            <Ionicons
              name={notif.read ? 'mail-unread-outline' : 'checkmark-done-outline'}
              size={19}
              color="#FFFFFF"
            />
            <Txt size={11} weight="700" color="#FFFFFF" numberOfLines={1}>
              {notif.read ? 'Unread' : 'Read'}
            </Txt>
          </Pressable>
        </View>
      ) : null}

      {/* Swipe Left Actions (revealed only when swiping left) */}
      {!selectionMode && swipeDir === 'left' ? (
        <View
          testID={`notification-swipe-left-${notif.id}`}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: SWIPE_LEFT_WIDTH,
            flexDirection: 'row',
          }}
        >
          <Pressable
            onPress={() => {
              closeRow();
              onToggleRead(notif);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${readActionLabel} ${notif.title}`}
            style={{
              flex: 1,
              backgroundColor: readActionBg,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              paddingHorizontal: 4,
            }}
          >
            <Ionicons
              name={notif.read ? 'mail-unread-outline' : 'checkmark-done-outline'}
              size={18}
              color="#FFFFFF"
            />
            <Txt size={11} weight="700" color="#FFFFFF" numberOfLines={1}>
              {notif.read ? 'Unread' : 'Read'}
            </Txt>
          </Pressable>

          <Pressable
            onPress={() => {
              closeRow();
              onDelete(notif);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${notif.title}`}
            style={{
              flex: 1,
              backgroundColor: deleteActionBg,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              paddingHorizontal: 4,
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Txt size={11} weight="700" color="#FFFFFF" numberOfLines={1}>
              Delete
            </Txt>
          </Pressable>
        </View>
      ) : null}

      {/* Foreground Row Content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[animatedRowStyle, { width: '100%', backgroundColor: rowBaseBg }]}>
          <View style={{ width: '100%', backgroundColor: subtleStateOverlay }}>
            <Pressable
              onPress={() => {
                if (isSwipeOpen) {
                  closeRow();
                  return;
                }
                onPress(notif);
              }}
              onLongPress={() => onLongPress(notif)}
              delayLongPress={320}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${notif.read ? '' : 'Unread. '}${notif.title}. ${notif.body}`}
              testID={`notification-row-${notif.id}`}
              style={({ pressed }) => ({
                width: '100%',
                paddingHorizontal: horizontalPadding,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              {selectionMode ? (
                <View
                  style={{
                    width: 42,
                    height: 42,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: selected ? colors.blue : colors.borderStrong,
                      backgroundColor: selected ? colors.blue : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Ionicons
                    name={cfg.icon as keyof typeof Ionicons.glyphMap}
                    size={19}
                    color={notif.read ? colors.textMuted : toneColor}
                  />
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Txt
                  size={15}
                  weight={notif.read ? '500' : '700'}
                  color={colors.text}
                  numberOfLines={1}
                >
                  {notif.title}
                </Txt>

                <Txt size={13} color={colors.textMuted} numberOfLines={2}>
                  {notif.body}
                </Txt>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Txt size={11.5} weight="600" color={colors.textFaint}>
                    {cfg.label}
                  </Txt>
                  <Txt size={11.5} color={colors.textFaint}>
                    ·
                  </Txt>
                  <Txt size={11.5} color={colors.textFaint}>
                    {formatRelativeTime(notif.at)}
                  </Txt>
                </View>
              </View>

              {/* Right-aligned unread indicator + overflow menu */}
              {!selectionMode ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {!notif.read ? (
                    <View
                      accessibilityLabel="Unread indicator"
                      testID={`notification-unread-dot-${notif.id}`}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.blue,
                      }}
                    />
                  ) : null}

                  <Pressable
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      onPressMore(notif);
                    }}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={`More actions for ${notif.title}`}
                    testID={`notification-more-${notif.id}`}
                    style={({ pressed }) => ({
                      minWidth: 48,
                      minHeight: 48,
                      borderRadius: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                    })}
                  >
                    <Ionicons name="ellipsis-vertical" size={17} color={colors.textFaint} />
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});
