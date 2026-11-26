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
  bottomOffset,
}: ActiveSessionBarProps) {
  const focus = useOptionalFocusSession();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!visible || !focus) return null;
  if (context === 'hall') return null;

  const session = focus.session && !focus.session.pendingRecord ? focus.session : null;
  const route = currentRouteName ?? focus.currentRouteName;

  if (route === 'FocusCompletion') return null;
  if (route === 'FocusCenter') return null;
  if (!session) return null;

  const isMobile = width < 768;
  const { secondsRemaining, isOnBreak, isRunning, togglePause } = focus;
  const timeText = formatFocusClock(secondsRemaining);
  const statusLabel = isOnBreak
    ? 'Break'
    : session.phase === 'paused'
      ? 'Paused'
      : 'Focus';
  const taskLabel = [session.topic, session.subject].filter(Boolean).join(' · ');
  const accentColor = isOnBreak
    ? colors.warning
    : session.phase === 'paused'
      ? colors.textMuted
      : colors.teal;

  const surfaceBg = scheme === 'dark' ? 'rgba(20, 28, 46, 0.96)' : 'rgba(255, 255, 255, 0.97)';

  const barContent = (
    <View
      testID="active-session-bar"
      style={[
        styles.bar,
        {
          backgroundColor: surfaceBg,
          borderColor: isOnBreak ? colors.warning : colors.teal,
          ...shadow(colors, 2),
        },
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: `${accentColor}1F` }]}>
        <Ionicons
          name={isOnBreak ? 'cafe-outline' : 'hourglass-outline'}
          size={18}
          color={accentColor}
        />
        {isRunning ? (
          <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
        ) : null}
      </View>

      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.primaryText, { color: colors.text }]}>
          {statusLabel} · <Text style={styles.clockText}>{timeText}</Text>
        </Text>
        {taskLabel ? (
          <Text numberOfLines={1} style={[styles.secondaryText, { color: colors.textMuted }]}>
            {taskLabel}
          </Text>
        ) : null}
      </View>

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

      {onPressBackToFocus ? (
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
