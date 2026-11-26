import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatFocusClock, useOptionalFocusSession } from '../lib/focusSession';
import { shadow, useTheme } from '../lib/theme';

export function FloatingFocusBar({
  visible,
  onPressBackToFocus,
  bottomOffset,
}: {
  visible: boolean;
  onPressBackToFocus: () => void;
  bottomOffset?: number;
}) {
  const focus = useOptionalFocusSession();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!visible || !focus?.session || focus.session.pendingRecord) {
    return null;
  }

  const { session, secondsRemaining, isOnBreak, isRunning, togglePause } = focus;
  const isMobile = width < 768;
  const timeText = formatFocusClock(secondsRemaining);
  const statusLabel = isOnBreak
    ? 'Break'
    : session.phase === 'paused'
      ? 'Paused'
      : 'Focus session active';
  const taskLabel = [session.topic, session.subject].filter(Boolean).join(' · ');
  const accentColor = isOnBreak
    ? colors.warning
    : session.phase === 'paused'
      ? colors.textMuted
      : colors.teal;

  const computedBottom = bottomOffset ?? ((isMobile ? 60 : 16) + insets.bottom);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          bottom: computedBottom,
          left: isMobile ? 12 : undefined,
          right: isMobile ? 12 : 20,
          width: isMobile ? undefined : 400,
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: scheme === 'dark' ? 'rgba(20, 28, 46, 0.96)' : 'rgba(255, 255, 255, 0.97)',
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
          {isRunning ? <View style={[styles.liveDot, { backgroundColor: accentColor }]} /> : null}
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

        <Pressable
          onPress={onPressBackToFocus}
          accessibilityRole="button"
          accessibilityLabel="Back to Focus"
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: colors.blue,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.backBtnText}>Back to Focus</Text>
        </Pressable>
      </View>
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
    gap: 10,
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
  backBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
