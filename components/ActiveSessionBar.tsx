/* eslint-disable react-hooks/refs, react-hooks/immutability -- Reanimated shared values and timer refs coordinate drag and auto-collapse without re-renders. */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AUTO_COLLAPSE_MS,
  BUBBLE_SIZE,
  type BubblePosition,
  EXPANDED_HEIGHT,
  clampBubblePosition,
  getAnchoredExpandedPosition,
  getBubbleBounds,
  getDefaultBubblePosition,
  getExpandedBubbleWidth,
  loadBubblePosition,
  saveBubblePosition,
} from '../lib/focusBubblePosition';
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
  const { colors, scheme, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [expanded, setExpanded] = useState(false);
  const autoCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedPosRef = useRef<BubblePosition | null>(null);

  const session = focus?.session && !focus.session.pendingRecord ? focus.session : null;
  const route = currentRouteName ?? focus?.currentRouteName;
  const shouldHide =
    !visible ||
    !focus ||
    context === 'hall' ||
    route === 'FocusCompletion' ||
    route === 'FocusCenter' ||
    !session;
  const isExpanded = expanded && !shouldHide;
  const wasHiddenRef = useRef(shouldHide);
  const [prevShouldHide, setPrevShouldHide] = useState(shouldHide);
  if (prevShouldHide !== shouldHide) {
    setPrevShouldHide(shouldHide);
    if (shouldHide && expanded) {
      setExpanded(false);
    }
  }

  const isMobile = width < 768;
  const expandedWidth = getExpandedBubbleWidth(width, insets);
  const defaultPos = useMemo(
    () => getDefaultBubblePosition(width, height, insets, isMobile, bottomOffset),
    [bottomOffset, height, insets, isMobile, width],
  );
  const collapsedBounds = useMemo(
    () => getBubbleBounds(width, height, insets, BUBBLE_SIZE, BUBBLE_SIZE),
    [height, insets, width],
  );
  const expandedBounds = useMemo(
    () => getBubbleBounds(width, height, insets, expandedWidth, EXPANDED_HEIGHT),
    [expandedWidth, height, insets, width],
  );

  const posX = useSharedValue(defaultPos.x);
  const posY = useSharedValue(defaultPos.y);
  const dragStartX = useSharedValue(defaultPos.x);
  const dragStartY = useSharedValue(defaultPos.y);
  const expandProgress = useSharedValue(0);
  const isExpandedSv = useSharedValue(false);

  const clearAutoCollapseTimer = useCallback(() => {
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
  }, []);

  const scheduleAutoCollapse = useCallback(() => {
    clearAutoCollapseTimer();
    autoCollapseTimerRef.current = setTimeout(() => {
      autoCollapseTimerRef.current = null;
      setExpanded(false);
    }, AUTO_COLLAPSE_MS);
  }, [clearAutoCollapseTimer]);

  // Restore persisted position once on mount, clamped to current safe bounds.
  useEffect(() => {
    let active = true;
    void loadBubblePosition().then((stored) => {
      if (!active || !stored) return;
      const clamped = clampBubblePosition(stored, collapsedBounds);
      savedPosRef.current = clamped;
      if (!isExpandedSv.value) {
        posX.value = clamped.x;
        posY.value = clamped.y;
      }
    });
    return () => {
      active = false;
    };
  // Only restore once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep shared position synchronized with viewport/insets, immediate on reveal, and animated on expand/collapse.
  useEffect(() => {
    const baseCollapsed = clampBubblePosition(savedPosRef.current ?? defaultPos, collapsedBounds);
    if (savedPosRef.current) {
      savedPosRef.current = baseCollapsed;
    }

    if (shouldHide) {
      wasHiddenRef.current = true;
      isExpandedSv.value = false;
      expandProgress.value = 0;
      posX.value = baseCollapsed.x;
      posY.value = baseCollapsed.y;
      return;
    }

    const justRevealed = wasHiddenRef.current;
    wasHiddenRef.current = false;
    isExpandedSv.value = expanded;

    if (justRevealed) {
      expandProgress.value = expanded ? 1 : 0;
      if (expanded) {
        const anchored = getAnchoredExpandedPosition(baseCollapsed, expandedWidth, width, height, insets);
        posX.value = anchored.x;
        posY.value = anchored.y;
      } else {
        posX.value = baseCollapsed.x;
        posY.value = baseCollapsed.y;
      }
      return;
    }

    const animate = (toValue: number) =>
      reduceMotion
        ? withTiming(toValue, { duration: 120 })
        : withSpring(toValue, { damping: 20, stiffness: 240, mass: 0.85 });

    expandProgress.value = animate(expanded ? 1 : 0);

    if (expanded) {
      const anchored = getAnchoredExpandedPosition(baseCollapsed, expandedWidth, width, height, insets);
      posX.value = animate(anchored.x);
      posY.value = animate(anchored.y);
    } else {
      posX.value = animate(baseCollapsed.x);
      posY.value = animate(baseCollapsed.y);
    }
  }, [
    collapsedBounds,
    defaultPos,
    expandProgress,
    expanded,
    expandedWidth,
    height,
    insets,
    isExpandedSv,
    posX,
    posY,
    reduceMotion,
    shouldHide,
    width,
  ]);

  // Manage the 3-second auto-collapse timer strictly on expanded state changes (never on clock ticks).
  useEffect(() => {
    if (expanded) {
      scheduleAutoCollapse();
    } else {
      clearAutoCollapseTimer();
    }
    return clearAutoCollapseTimer;
  }, [clearAutoCollapseTimer, expanded, scheduleAutoCollapse]);

  const commitDraggedPosition = useCallback(
    (releasedPos: BubblePosition) => {
      let nextCollapsed = releasedPos;
      if (expanded) {
        const center = releasedPos.x + expandedWidth / 2;
        const isRightHalf = center >= width / 2;
        nextCollapsed = {
          x: isRightHalf ? releasedPos.x + expandedWidth - BUBBLE_SIZE : releasedPos.x,
          y: releasedPos.y,
        };
      }
      const clampedCollapsed = clampBubblePosition(nextCollapsed, collapsedBounds);
      savedPosRef.current = clampedCollapsed;
      void saveBubblePosition(clampedCollapsed);
    },
    [collapsedBounds, expanded, expandedWidth, width],
  );

  const activeBounds = expanded ? expandedBounds : collapsedBounds;

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(6)
        .onStart(() => {
          'worklet';
          dragStartX.value = posX.value;
          dragStartY.value = posY.value;
          runOnJS(clearAutoCollapseTimer)();
        })
        .onUpdate((event) => {
          'worklet';
          const clamped = clampBubblePosition(
            {
              x: dragStartX.value + event.translationX,
              y: dragStartY.value + event.translationY,
            },
            activeBounds,
          );
          posX.value = clamped.x;
          posY.value = clamped.y;
        })
        .onEnd(() => {
          'worklet';
          runOnJS(commitDraggedPosition)({ x: posX.value, y: posY.value });
        })
        .onFinalize(() => {
          'worklet';
          if (isExpandedSv.value) {
            runOnJS(scheduleAutoCollapse)();
          }
        }),
    [
      activeBounds,
      clearAutoCollapseTimer,
      commitDraggedPosition,
      dragStartX,
      dragStartY,
      isExpandedSv,
      posX,
      posY,
      scheduleAutoCollapse,
    ],
  );

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: posX.value }, { translateY: posY.value }],
    width: interpolate(expandProgress.value, [0, 1], [BUBBLE_SIZE, expandedWidth]),
    height: BUBBLE_SIZE,
  }));

  if (shouldHide || !focus || !session) {
    return null;
  }

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

  return (
    <View pointerEvents="box-none" collapsable={false} style={styles.overlayRoot}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          testID="active-session-bar"
          collapsable={false}
          style={[
            {
              backgroundColor: surfaceBg,
              borderColor: isOnBreak ? colors.warning : colors.teal,
              ...shadow(colors, 2),
            },
            styles.bubbleShell,
            animatedContainerStyle,
          ]}
        >
          {isExpanded ? (
            <View style={styles.expandedRow} testID="focus-bubble-expanded">
              <Pressable
                onPress={() => setExpanded(false)}
                accessibilityRole="button"
                accessibilityLabel="Collapse focus timer bubble"
                style={styles.expandedInfoTouch}
              >
                <View style={[styles.iconBadge, { backgroundColor: `${accentColor}1F` }]}>
                  <Ionicons
                    name={isOnBreak ? 'cafe-outline' : 'hourglass-outline'}
                    size={18}
                    color={accentColor}
                  />
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: isRunning ? accentColor : colors.textMuted },
                    ]}
                  />
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
              </Pressable>

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
                  onPress={() => {
                    setExpanded(false);
                    onPressBackToFocus();
                  }}
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
          ) : (
            <Pressable
              testID="focus-bubble-collapsed"
              onPress={() => setExpanded(true)}
              accessibilityRole="button"
              accessibilityLabel="Expand active focus timer bubble"
              style={({ pressed }) => [
                styles.collapsedButton,
                { opacity: pressed ? 0.84 : 1 },
              ]}
            >
              <Ionicons
                name={isOnBreak ? 'cafe-outline' : 'hourglass-outline'}
                size={22}
                color={accentColor}
              />
              <View
                testID="focus-bubble-status-dot"
                style={[
                  styles.collapsedStatusDot,
                  {
                    backgroundColor: isRunning ? accentColor : colors.textMuted,
                    borderColor: surfaceBg,
                  },
                ]}
              />
            </Pressable>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
  },
  bubbleShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 1,
    elevation: 10,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  collapsedButton: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  collapsedStatusDot: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  expandedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  expandedInfoTouch: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 12,
    fontWeight: '700',
  },
  clockText: {
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  secondaryText: {
    fontSize: 10.5,
    marginTop: 1,
  },
  pauseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
});
