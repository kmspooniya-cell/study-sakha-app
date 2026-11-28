import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { FocusSessionSetupModal } from '../components/FocusSessionSetupModal';
import type { FocusSessionSetup } from '../components/FocusSessionSetupModal';
import { Shell, useLayout } from '../components/Shell';
import { focusLockNative, isFocusLockNativeAvailable, subscribeFocusLockEvent } from '../lib/focusLockNative';
import { useOptionalFocusSession } from '../lib/focusSession';
import { translateLabel } from '../lib/i18n';
import type { AppNavigation } from '../lib/navigation';
import { dayKey, getDisplayName, useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { readAlarmSummary, type AlarmSummary } from '../src/modules/alarm/alarmStorage';

/* ============================================================================
 * DESIGN TOKENS (Matched to Redesigned Gemini Homepage Prototype)
 * ============================================================================ */

interface DashboardPalette {
  canvas: string;
  surface: string;
  hairline: string;
  inkPrimary: string;
  inkSecondary: string;
  inkMuted: string;
  sakha: string;
  sakhaDeep: string;
  dialTick: string;
  dialTrack: string;
  studiedIconBg: string;
  studiedIconColor: string;
  streakIconBg: string;
  streakIconColor: string;
  sky: string;
  skySoft: string;
  skyPillText: string;
  rose: string;
  roseSoft: string;
  roseActiveSurface: string;
  roseActiveBorder: string;
  roseStatusText: string;
  violet: string;
  violetSoft: string;
  violetPillText: string;
  amber: string;
  amberSoft: string;
  amberActiveSurface: string;
  amberActiveBorder: string;
  amberStatusText: string;
  neutralPillBg: string;
}

const LIGHT_PALETTE: DashboardPalette = {
  canvas: '#F6F8FB',
  surface: '#FFFFFF',
  hairline: '#E6ECF2',
  inkPrimary: '#1A2233',
  inkSecondary: '#5E6A7D',
  inkMuted: '#7D899C',
  sakha: '#19C5B5',
  sakhaDeep: '#11A89A',
  dialTick: '#CBD5E1',
  dialTrack: '#E3E8F0',
  studiedIconBg: '#EEF2FF',
  studiedIconColor: '#5B6BE1',
  streakIconBg: '#FFF6E5',
  streakIconColor: '#F59E0B',
  sky: '#29A8E8',
  skySoft: '#EBF7FF',
  skyPillText: '#0284C7',
  rose: '#EE5A70',
  roseSoft: '#FFF0F2',
  roseActiveSurface: '#FFF5F6',
  roseActiveBorder: 'rgba(238, 90, 112, 0.55)',
  roseStatusText: '#D93D57',
  violet: '#7C5CFA',
  violetSoft: '#F3EEFF',
  violetPillText: '#6D4AE8',
  amber: '#F59E0B',
  amberSoft: '#FFF6E5',
  amberActiveSurface: '#FFFBF2',
  amberActiveBorder: 'rgba(245, 158, 11, 0.55)',
  amberStatusText: '#C27803',
  neutralPillBg: '#F1F5F9',
};

const DARK_PALETTE: DashboardPalette = {
  canvas: '#12101D',
  surface: '#1C182D',
  hairline: '#2E2845',
  inkPrimary: '#F4F6FA',
  inkSecondary: '#9D97B8',
  inkMuted: '#928CAE',
  sakha: '#19C5B5',
  sakhaDeep: '#19C5B5',
  dialTick: '#3A3257',
  dialTrack: '#2A2342',
  studiedIconBg: 'rgba(99, 102, 241, 0.20)',
  studiedIconColor: '#93A3FF',
  streakIconBg: 'rgba(245, 158, 11, 0.20)',
  streakIconColor: '#F59E0B',
  sky: '#29A8E8',
  skySoft: 'rgba(41, 168, 232, 0.15)',
  skyPillText: '#7DD3FC',
  rose: '#FB7185',
  roseSoft: 'rgba(238, 90, 112, 0.15)',
  roseActiveSurface: 'rgba(238, 90, 112, 0.12)',
  roseActiveBorder: 'rgba(238, 90, 112, 0.55)',
  roseStatusText: '#FDA4AF',
  violet: '#A78BFA',
  violetSoft: 'rgba(124, 92, 250, 0.18)',
  violetPillText: '#C4B5FD',
  amber: '#FBBF24',
  amberSoft: 'rgba(245, 158, 11, 0.18)',
  amberActiveSurface: 'rgba(245, 158, 11, 0.10)',
  amberActiveBorder: 'rgba(245, 158, 11, 0.55)',
  amberStatusText: '#FCD34D',
  neutralPillBg: '#27213E',
};

const MONO_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/* ============================================================================
 * HELPER FORMATTERS
 * ============================================================================ */

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function formatStudiedDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  if (safeMinutes < 60) {
    return `${safeMinutes} min`;
  }
  const hours = Math.floor(safeMinutes / 60);
  const remMinutes = safeMinutes % 60;
  return remMinutes === 0 ? `${hours} hr` : `${hours}h ${remMinutes}m`;
}

function formatStreakLabel(days: number): string {
  const safeDays = Math.max(0, Math.floor(days));
  return `${safeDays} ${safeDays === 1 ? 'day' : 'days'}`;
}

function formatTimerClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDashboardAlarmTime(alarm: AlarmSummary['nextAlarm'], use24h: boolean): string | null {
  if (!alarm) return null;
  if (use24h) return `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`;
  const period = alarm.hour >= 12 ? 'PM' : 'AM';
  const hour = alarm.hour % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')} ${period}`;
}

/* ============================================================================
 * VECTOR ICONS
 * ============================================================================ */

const ClockIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="9" />
    <Path d="M12 7v5l3 2" />
  </Svg>
);

const FlameIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
    <Path d="M12.5 2C12.5 2 18 6.5 18 12.5C18 16.5 15.3 20 11.5 20C7.7 20 5 17 5 13C5 10.2 6.8 7.5 8.5 6C8.3 8 9.2 9.5 10.2 9.8C9.8 7 11.5 4 12.5 2Z" />
  </Svg>
);

const PlusIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

const LockIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="4" y="11" width="16" height="10" rx="2.5" />
    <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);

const TimerIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="13" r="8" />
    <Path d="M12 9v4l2.5 1.5" />
    <Path d="M9 2h6" />
  </Svg>
);

const AlarmIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="13" r="8" />
    <Path d="M12 9v4l2 2" />
    <Path d="M5 3 2 6" />
    <Path d="m22 6-3-3" />
  </Svg>
);

/* ============================================================================
 * PRECISION SWISS GOAL DIAL COMPONENT
 * ============================================================================ */

interface GoalDialProps {
  percent: number;
  isLive: boolean;
  palette: DashboardPalette;
  onPress: () => void;
}

const DIAL_RADIUS = 34;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

const GoalDial: React.FC<GoalDialProps> = ({ percent, isLive, palette, onPress }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const strokeDashoffset = DIAL_CIRCUMFERENCE - (clamped / 100) * DIAL_CIRCUMFERENCE;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Daily study goal ${clamped} percent${isLive ? ', session active' : ''}`}
      style={({ pressed }) => [
        styles.dialContainer,
        pressed && styles.pressedScaleSm,
      ]}
    >
      <Svg width={80} height={80} viewBox="0 0 92 92">
        <Circle
          cx={46}
          cy={46}
          r={42}
          fill="none"
          stroke={palette.dialTick}
          strokeWidth={1}
          strokeDasharray="1.5 6.75"
        />
        <Circle
          cx={46}
          cy={46}
          r={DIAL_RADIUS}
          fill="none"
          stroke={palette.dialTrack}
          strokeWidth={5}
        />
        <Circle
          cx={46}
          cy={46}
          r={DIAL_RADIUS}
          fill="none"
          stroke={palette.sakha}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${DIAL_CIRCUMFERENCE} ${DIAL_CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          origin="46, 46"
          rotation={-90}
        />
      </Svg>

      <View style={styles.dialCenterOverlay} pointerEvents="none">
        <Text style={[styles.dialPercentText, { color: palette.inkPrimary }]}>
          {clamped}%
        </Text>
        <Text
          style={[
            styles.dialSubLabel,
            { color: isLive ? palette.sakhaDeep : palette.inkMuted },
          ]}
        >
          {isLive ? 'LIVE' : 'GOAL'}
        </Text>
      </View>
    </Pressable>
  );
};

/* ============================================================================
 * DASHBOARD SCREEN (Preserves Shell Header/BottomNav + All Existing Workflows)
 * ============================================================================ */

export default function DashboardScreen() {
  const { scheme } = useTheme();
  const nav = useNavigation<AppNavigation>();
  const { state, streak, todayMinutes } = useStore();
  const focusSession = useOptionalFocusSession();
  const { isTablet, isDesktop } = useLayout();
  const isTabletOrLarger = isTablet || isDesktop;
  const { width } = useWindowDimensions();

  const isDark = scheme === 'dark';
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  const isCompactWidth = width < 360;
  const horizontalPad = isCompactWidth ? 16 : 20;

  const dashboardWidgets = state.settings.dashboardWidgets ?? { streakCard: true, dailyGoalRing: true };
  const language = state.settings.language;
  const lastBackPress = useRef(0);

  const [focusSetupVisible, setFocusSetupVisible] = useState(false);
  const [alarmSummary, setAlarmSummary] = useState<AlarmSummary>({ activeCount: 0, nextAlarm: null, use24h: false });
  const [isFocusLockEnabled, setIsFocusLockEnabled] = useState(false);
  const [focusSetup, setFocusSetup] = useState<FocusSessionSetup>({
    mode: 'timer',
    durationMinutes: state.settings.focusDurationMinutes,
    selection: null,
    tag: '',
    task: null,
  });

  useEffect(() => {
    setFocusSetup((current) =>
      current.mode === 'timer'
        ? { ...current, durationMinutes: state.settings.focusDurationMinutes }
        : current
    );
  }, [state.settings.focusDurationMinutes]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        const now = Date.now();
        if (now - lastBackPress.current < 2000) return false;
        lastBackPress.current = now;
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        return true;
      });
      return () => subscription.remove();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      readAlarmSummary().then((summary) => {
        if (mounted) setAlarmSummary(summary);
      });

      if (isFocusLockNativeAvailable() && focusLockNative?.getBlockingStatus) {
        focusLockNative
          .getBlockingStatus()
          .then((status) => {
            if (mounted) {
              setIsFocusLockEnabled(Boolean(status?.activeSession && status.activeSession.status === 'active'));
            }
          })
          .catch(() => {
            if (mounted) setIsFocusLockEnabled(false);
          });
      }

      return () => {
        mounted = false;
      };
    }, [])
  );

  useEffect(() => {
    if (!isFocusLockNativeAvailable()) return undefined;
    const unsubStart = subscribeFocusLockEvent('onBlockingStarted', () => setIsFocusLockEnabled(true));
    const unsubStop = subscribeFocusLockEvent('onBlockingStopped', () => setIsFocusLockEnabled(false));
    const unsubExpire = subscribeFocusLockEvent('onSessionExpired', () => setIsFocusLockEnabled(false));
    return () => {
      unsubStart();
      unsubStop();
      unsubExpire();
    };
  }, []);

  const dailyGoalMinutes = Math.max(1, Number(state.settings.dailyGoalMin) || 1);
  const safeTodayMinutes = Math.max(0, Number(todayMinutes) || 0);
  const goalPercent = useMemo(() => {
    if (dailyGoalMinutes <= 0) return 0;
    return Math.min(100, Math.round((safeTodayMinutes / dailyGoalMinutes) * 100));
  }, [safeTodayMinutes, dailyGoalMinutes]);

  const firstName = getDisplayName(state.user).split(/\s+/)[0] || 'Learner';
  const greetingPrefix = getTimeBasedGreeting();
  const studiedText = useMemo(() => formatStudiedDuration(safeTodayMinutes), [safeTodayMinutes]);
  const streakText = useMemo(() => formatStreakLabel(streak), [streak]);

  const { pendingTaskCount, nextTaskTitle } = useMemo(() => {
    const today = dayKey(new Date());
    const pending = state.plannerTasks
      .filter((task) => !task.completedOn && (!task.targetDate || task.targetDate >= today))
      .sort((a, b) => (a.targetDate || '').localeCompare(b.targetDate || ''));
    return {
      pendingTaskCount: pending.length,
      nextTaskTitle: pending[0]?.label ?? null,
    };
  }, [state.plannerTasks]);

  const isFocusSessionActive = Boolean(focusSession?.session);
  const focusTimerDisplay = useMemo(() => {
    if (focusSession?.session) {
      const secs =
        focusSession.session.mode === 'stopwatch'
          ? focusSession.actualFocusedSeconds
          : focusSession.secondsRemaining;
      return formatTimerClock(secs);
    }
    const mins = Math.max(1, Number(state.settings.focusDurationMinutes) || 25);
    return `${String(mins).padStart(2, '0')}:00`;
  }, [focusSession?.session, focusSession?.actualFocusedSeconds, focusSession?.secondsRemaining, state.settings.focusDurationMinutes]);

  const isAlarmEnabled = alarmSummary.activeCount > 0;
  const nextAlarmLabel = useMemo(
    () => formatDashboardAlarmTime(alarmSummary.nextAlarm, alarmSummary.use24h),
    [alarmSummary.nextAlarm, alarmSummary.use24h]
  );

  const handleOpenGoalDial = useCallback(() => {
    if (focusSession?.session) {
      nav.navigate('FocusCenter');
      return;
    }
    setFocusSetupVisible(true);
  }, [focusSession?.session, nav]);

  return (
    <Shell active="Dashboard" title="" subtitle="" scroll={false} contentPadding={0}>
      <ScrollView
        style={[styles.scrollContainer, { backgroundColor: palette.canvas }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentWidth, !isTabletOrLarger && styles.mobileContentWidth]}>
          {/* ================================================================
              SECTION 1: CARDLESS EDITORIAL GREETING + GOAL DIAL + STATS
          ================================================================ */}
          <View style={styles.focusOverviewSection}>
            <View style={styles.greetingRow}>
              <View style={styles.greetingTextWrap}>
                <Text
                  style={[styles.greetingPrefix, { color: palette.inkSecondary }]}
                  numberOfLines={1}
                >
                  {greetingPrefix}
                </Text>
                <Text
                  style={[styles.greetingName, { color: palette.inkPrimary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {firstName}
                </Text>
              </View>

              {dashboardWidgets.dailyGoalRing ? (
                <GoalDial
                  percent={goalPercent}
                  isLive={isFocusSessionActive}
                  palette={palette}
                  onPress={handleOpenGoalDial}
                />
              ) : null}
            </View>

            <View
              style={[
                styles.statsStrip,
                {
                  borderTopColor: palette.hairline,
                  borderBottomColor: palette.hairline,
                },
              ]}
            >
              <View style={styles.statColumnLeft}>
                <View
                  style={[
                    styles.statIconCircle,
                    { backgroundColor: palette.studiedIconBg },
                  ]}
                >
                  <ClockIcon color={palette.studiedIconColor} />
                </View>
                <View style={styles.statTextGroup}>
                  <Text
                    style={[styles.statValue, { color: palette.inkPrimary }]}
                    numberOfLines={1}
                  >
                    {studiedText}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: palette.inkMuted }]}
                    numberOfLines={1}
                  >
                    {translateLabel('Studied today', language)}
                  </Text>
                </View>
              </View>

              {dashboardWidgets.streakCard ? (
                <>
                  <View style={[styles.statDivider, { backgroundColor: palette.hairline }]} />
                  <View style={styles.statColumnRight}>
                    <View
                      style={[
                        styles.statIconCircle,
                        { backgroundColor: palette.streakIconBg },
                      ]}
                    >
                      <FlameIcon color={palette.streakIconColor} />
                    </View>
                    <View style={styles.statTextGroup}>
                      <Text
                        style={[styles.statValue, { color: palette.inkPrimary }]}
                        numberOfLines={1}
                      >
                        {streakText}
                      </Text>
                      <Text
                        style={[styles.statLabel, { color: palette.inkMuted }]}
                        numberOfLines={1}
                      >
                        {translateLabel('Study streak', language)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          {/* ================================================================
              SECTION 2: STUDY PLANNER (2x2 BENTO GRID)
          ================================================================ */}
          <View style={styles.plannerSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: palette.inkPrimary }]}>
                Study Planner
              </Text>
              <Text style={[styles.sectionSubtitle, { color: palette.inkMuted }]}>
                Quick controls
              </Text>
            </View>

            {/* Row 1: Add Task + Focus Lock */}
            <View style={styles.bentoRow}>
              {/* Card 1: Add Task */}
              <Pressable
                onPress={() => nav.navigate('StudyPlanner')}
                accessibilityRole="button"
                accessibilityLabel={`Add Task, ${pendingTaskCount} pending`}
                style={({ pressed }) => [
                  styles.plannerCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: pressed ? palette.sky : palette.hairline,
                  },
                  pressed && styles.pressedScaleCard,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.cardIconBox, { backgroundColor: palette.skySoft }]}>
                    <PlusIcon color={palette.sky} />
                  </View>
                  <View style={[styles.metricPill, { backgroundColor: palette.skySoft }]}>
                    <Text style={[styles.metricPillText, { color: palette.skyPillText }]}>
                      {pendingTaskCount}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardTextBlock}>
                  <Text style={[styles.cardTitle, { color: palette.inkPrimary }]} numberOfLines={1}>
                    Add Task
                  </Text>
                  <Text
                    style={[styles.cardSubtitle, { color: palette.inkMuted }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {nextTaskTitle?.trim() || 'Plan your next topic'}
                  </Text>
                </View>
              </Pressable>

              {/* Card 2: Focus Lock */}
              <Pressable
                onPress={() => nav.navigate('FocusLock')}
                accessibilityRole="button"
                accessibilityLabel="Focus Lock"
                accessibilityHint="Opens Focus Lock settings and controls"
                style={({ pressed }) => [
                  styles.plannerCard,
                  {
                    backgroundColor: isFocusLockEnabled
                      ? palette.roseActiveSurface
                      : palette.surface,
                    borderColor: isFocusLockEnabled
                      ? palette.roseActiveBorder
                      : pressed
                      ? palette.rose
                      : palette.hairline,
                  },
                  pressed && styles.pressedScaleCard,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.cardIconBox,
                      {
                        backgroundColor: isFocusLockEnabled
                          ? palette.rose
                          : palette.roseSoft,
                      },
                    ]}
                  >
                    <LockIcon color={isFocusLockEnabled ? '#FFFFFF' : palette.rose} />
                  </View>
                  <View
                    style={[
                      styles.stateBadge,
                      {
                        backgroundColor: isFocusLockEnabled
                          ? palette.rose
                          : palette.neutralPillBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stateBadgeText,
                        { color: isFocusLockEnabled ? '#FFFFFF' : palette.inkMuted },
                      ]}
                    >
                      {isFocusLockEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardTextBlock}>
                  <Text style={[styles.cardTitle, { color: palette.inkPrimary }]} numberOfLines={1}>
                    Focus Lock
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: isFocusLockEnabled ? palette.roseStatusText : palette.inkMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {isFocusLockEnabled ? 'ON • Apps shielded' : 'OFF • Tap to shield'}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Row 2: Focus Timer + Alarm */}
            <View style={styles.bentoRow}>
              {/* Card 3: Focus Timer */}
              <Pressable
                onPress={() => setFocusSetupVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={`Focus Timer, ${focusTimerDisplay}`}
                style={({ pressed }) => [
                  styles.plannerCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: pressed ? palette.violet : palette.hairline,
                  },
                  pressed && styles.pressedScaleCard,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.cardIconBox, { backgroundColor: palette.violetSoft }]}>
                    <TimerIcon color={palette.violet} />
                  </View>
                  <View style={[styles.metricPill, { backgroundColor: palette.violetSoft }]}>
                    <Text style={[styles.metricPillText, { color: palette.violetPillText }]} numberOfLines={1}>
                      {focusTimerDisplay}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardTextBlock}>
                  <Text style={[styles.cardTitle, { color: palette.inkPrimary }]} numberOfLines={1}>
                    Focus Timer
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: palette.inkMuted }]} numberOfLines={1}>
                    {isFocusSessionActive ? 'Running now' : 'Tap to open timer'}
                  </Text>
                </View>
              </Pressable>

              {/* Card 4: Alarm */}
              <Pressable
                onPress={() => nav.navigate('Alarm')}
                accessibilityRole="button"
                accessibilityLabel="Study Alarm"
                accessibilityHint="Opens Study Alarm settings and schedule"
                style={({ pressed }) => [
                  styles.plannerCard,
                  {
                    backgroundColor: isAlarmEnabled
                      ? palette.amberActiveSurface
                      : palette.surface,
                    borderColor: isAlarmEnabled
                      ? palette.amberActiveBorder
                      : pressed
                      ? palette.amber
                      : palette.hairline,
                  },
                  pressed && styles.pressedScaleCard,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.cardIconBox, { backgroundColor: palette.amberSoft }]}>
                    <AlarmIcon color={palette.amber} />
                  </View>
                  <View
                    style={[
                      styles.stateBadge,
                      {
                        backgroundColor: isAlarmEnabled
                          ? palette.amber
                          : palette.neutralPillBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stateBadgeText,
                        { color: isAlarmEnabled ? '#FFFFFF' : palette.inkMuted },
                      ]}
                    >
                      {isAlarmEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardTextBlock}>
                  <Text style={[styles.cardTitle, { color: palette.inkPrimary }]} numberOfLines={1}>
                    Alarm
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitleMono,
                      { color: isAlarmEnabled ? palette.amberStatusText : palette.inkMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {nextAlarmLabel
                      ? `${isAlarmEnabled ? 'ON' : 'OFF'} • ${nextAlarmLabel}`
                      : isAlarmEnabled
                      ? 'ON • Scheduled'
                      : 'OFF • Not set'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <FocusSessionSetupModal
        visible={focusSetupVisible}
        value={focusSetup}
        onChange={setFocusSetup}
        onClose={() => setFocusSetupVisible(false)}
        onContinue={(setup) => {
          setFocusSetupVisible(false);
          nav.navigate('FocusCenter', { focusSession: setup });
        }}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 28,
  },
  contentWidth: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    gap: 20,
  },
  mobileContentWidth: {
    maxWidth: 448,
  },

  /* Cardless Focus Overview */
  focusOverviewSection: {
    paddingTop: 2,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 16,
  },
  greetingTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  greetingPrefix: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '400',
    letterSpacing: -0.6,
  },
  greetingName: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.7,
    marginTop: 1,
  },

  /* Precision Goal Dial */
  dialContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCenterOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialPercentText: {
    fontFamily: MONO_FONT,
    fontVariant: ['tabular-nums'],
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  dialSubLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 2,
  },

  /* Compact Study Statistics Strip */
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  statColumnLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 12,
  },
  statColumnRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    fontFamily: MONO_FONT,
    fontVariant: ['tabular-nums'],
    fontSize: 15.5,
    fontWeight: '600',
    lineHeight: 19,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },

  /* Study Planner Grid */
  plannerSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  plannerCard: {
    flex: 1,
    minHeight: 106,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#1A2233',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metricPillText: {
    fontFamily: MONO_FONT,
    fontVariant: ['tabular-nums'],
    fontSize: 11,
    fontWeight: '600',
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  stateBadgeText: {
    fontFamily: MONO_FONT,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTextBlock: {
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  cardSubtitleMono: {
    fontFamily: MONO_FONT,
    fontVariant: ['tabular-nums'],
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  /* Micro-interaction feedback */
  pressedScaleSm: {
    transform: [{ scale: 0.96 }],
  },
  pressedScaleCard: {
    transform: [{ scale: 0.98 }],
  },
});
