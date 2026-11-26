import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatFocusClock, useOptionalFocusSession } from '../lib/focusSession';
import { shadow, useTheme } from '../lib/theme';

export type ActiveSessionBarProps = {
  visible?: boolean;
  context?: 'global' | 'hall';
  currentRouteName?: string;
  onPressBackToFocus?: () => void;
  onPressReturnToHall?: () => void;
  bottomOffset?: number;
};

export function ActiveSessionBar({
  visible = true,
  context = 'global',
  currentRouteName,
  onPressBackToFocus,
  onPressReturnToHall,
  bottomOffset,
}: ActiveSessionBarProps) {
  const focus = useOptionalFocusSession();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!visible || !focus) return null;

  const session = focus.session && !focus.session.pendingRecord ? focus.session : null;
  const hall = focus.activeHallContext;
  const route = currentRouteName ?? focus.currentRouteName;

  if (context === 'global') {
    if (route === 'FocusCompletion') return null;
    if (hall?.isInsideHall) return null;
    if (route === 'FocusCenter') return null;
    if (!session && !hall) return null;
  } else if (!session) {
    return null;
  }

  const isMobile = width < 768;
  const showFocusInfo = Boolean(session);
  const showHallOnly = !showFocusInfo && Boolean(hall);

  const { secondsRemaining, isOnBreak, isRunning, togglePause } = focus;
  const timeText = formatFocusClock(secondsRemaining);
  const statusLabel = isOnBreak
    ? 'Break'
    : session?.phase === 'paused'
      ? 'Paused'
      : 'Focus';
  const taskLabel = session ? [session.topic, session.subject].filter(Boolean).join(' · ') : '';
  const accentColor = showHallOnly
    ? colors.teal
    : isOnBreak
      ? colors.warning
      : session?.phase === 'paused'
        ? colors.textMuted
        : colors.teal;

  const handleReturnToHall = onPressReturnToHall ?? focus.openActiveHall;
  const surfaceBg = scheme === 'dark' ? 'rgba(20, 28, 46, 0.96)' : 'rgba(255, 255, 255, 0.97)';

  const barContent = (
    <View
      testID="active-session-bar"
      style={[
        styles.bar,
        {
          backgroundColor: surfaceBg,
          borderColor: showHallOnly ? colors.teal : isOnBreak ? colors.warning : colors.teal,
          ...shadow(colors, 2),
        },
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: `${accentColor}1F` }]}>
        <Ionicons
          name={showHallOnly ? 'people-outline' : isOnBreak ? 'cafe-outline' : 'hourglass-outline'}
          size={18}
          color={accentColor}
        />
        {(showFocusInfo && isRunning) || showHallOnly ? (
          <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
        ) : null}
      </View>

      <View style={styles.copy}>
        {showFocusInfo ? (
          <>
            <Text numberOfLines={1} style={[styles.primaryText, { color: colors.text }]}>
              {statusLabel} · <Text style={styles.clockText}>{timeText}</Text>
            </Text>
            {taskLabel ? (
              <Text numberOfLines={1} style={[styles.secondaryText, { color: colors.textMuted }]}>
                {taskLabel}
              </Text>
            ) : hall ? (
              <Text numberOfLines={1} style={[styles.secondaryText, { color: colors.textMuted }]}>
                {hall.roomName}
              </Text>
            ) : null}
          </>
        ) : hall ? (
          <>
            <Text numberOfLines={1} style={[styles.primaryText, { color: colors.text }]}>
              {hall.roomName}
            </Text>
            <Text numberOfLines={1} style={[styles.secondaryText, { color: colors.textMuted }]}>
              {hall.groupName}
            </Text>
          </>
        ) : null}
      </View>

      {showFocusInfo ? (
        <Pressable
          onPress={togglePause}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? 'Pause active focus session' : 'Resume active focus session'}
          style={({ pressed }) => [
            styles.pauseBtn,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          <Ionicons name={isRunning ? 'pause' : 'play'} size={15} color={colors.text} />
        </Pressable>
      ) : null}

      {context === 'global' && hall && showFocusInfo ? (
        <Pressable
          onPress={handleReturnToHall}
          accessibilityRole="button"
          accessibilityLabel="Return to Hall"
          style={({ pressed }) => [
            styles.hallIconBtn,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="people-outline" size={16} color={colors.teal} />
        </Pressable>
      ) : null}

      {showHallOnly ? (
        <Pressable
          onPress={handleReturnToHall}
          accessibilityRole="button"
          accessibilityLabel="Return to Hall"
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.teal,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.actionBtnText}>Return to Hall</Text>
        </Pressable>
      ) : onPressBackToFocus ? (
        <Pressable
          onPress={onPressBackToFocus}
          accessibilityRole="button"
          accessibilityLabel="Back to Focus"
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.blue,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.actionBtnText}>Back to Focus</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (context === 'hall') {
    return (
      <View
        style={[
          styles.hallDock,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            backgroundColor: scheme === 'dark' ? '#0B0F17' : '#F6F8FB',
          },
        ]}
      >
        {barContent}
      </View>
    );
  }

  const computedBottom = bottomOffset ?? ((isMobile ? 62 : 12) + insets.bottom);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          bottom: computedBottom,
          left: isMobile ? 12 : undefined,
          right: isMobile ? 12 : 20,
          width: isMobile ? undefined : 420,
        },
      ]}
    >
      {barContent}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 40,
  },
  hallDock: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  liveDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  primaryText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  clockText: {
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  secondaryText: {
    fontSize: 11,
    marginTop: 1,
  },
  pauseBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hallIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
