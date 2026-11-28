import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { FocusSessionSetupModal } from '../components/FocusSessionSetupModal';
import type { FocusSessionSetup } from '../components/FocusSessionSetupModal';
import { Shell, useLayout } from '../components/Shell';
import { useOptionalFocusSession } from '../lib/focusSession';
import { translateLabel } from '../lib/i18n';
import type { AppNavigation } from '../lib/navigation';
import { getDisplayName, useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { SSDSText, useSSDSTheme } from '../lib/ssds';

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

function buildDashboardPalette(colors: ReturnType<typeof useTheme>['colors'], isDark: boolean): DashboardPalette {
  return {
    canvas: colors.bg,
    surface: colors.surface,
    hairline: colors.border,
    inkPrimary: colors.textPrimary,
    inkSecondary: colors.textSecondary,
    inkMuted: colors.textMuted,
    sakha: colors.brandSecondary,
    sakhaDeep: colors.brandPrimary,
    dialTick: colors.borderStrong,
    dialTrack: colors.border,
    studiedIconBg: colors.primaryLight,
    studiedIconColor: colors.brandPrimary,
    streakIconBg: isDark ? 'rgba(224, 159, 62, 0.18)' : '#FDF4E7',
    streakIconColor: colors.brandAccent,
    sky: colors.info,
    skySoft: isDark ? '#142638' : '#EBF4FC',
    skyPillText: colors.info,
    rose: colors.danger,
    roseSoft: isDark ? '#2E1618' : '#FDECEC',
    roseActiveSurface: isDark ? 'rgba(232, 97, 97, 0.12)' : '#FFF5F6',
    roseActiveBorder: isDark ? 'rgba(232, 97, 97, 0.55)' : 'rgba(198, 54, 54, 0.45)',
    roseStatusText: colors.danger,
    violet: colors.brandPrimary,
    violetSoft: colors.primaryLight,
    violetPillText: colors.brandPrimary,
    amber: colors.warning,
    amberSoft: isDark ? '#2D2212' : '#FEF6E7',
    amberActiveSurface: isDark ? 'rgba(229, 161, 62, 0.10)' : '#FFFBF2',
    amberActiveBorder: isDark ? 'rgba(229, 161, 62, 0.55)' : 'rgba(180, 105, 14, 0.45)',
    amberStatusText: colors.warning,
    neutralPillBg: colors.surfaceAlt,
  };
}

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
        <SSDSText style={[styles.dialPercentText, { color: palette.inkPrimary }]}>
          {clamped}%
        </SSDSText>
        <SSDSText
          style={[
            styles.dialSubLabel,
            { color: isLive ? palette.sakhaDeep : palette.inkMuted },
          ]}
        >
          {isLive ? 'LIVE' : 'GOAL'}
        </SSDSText>
      </View>
    </Pressable>
  );
};

/* ============================================================================
 * DASHBOARD SCREEN (Preserves Shell Header/BottomNav + All Existing Workflows)
 * ============================================================================ */

export default function DashboardScreen() {
  const { scheme, colors } = useTheme();
  const { tokens } = useSSDSTheme();
  const nav = useNavigation<AppNavigation>();
  const { state, streak, todayMinutes } = useStore();
  const focusSession = useOptionalFocusSession();
  const { isTablet, isDesktop } = useLayout();
  const isTabletOrLarger = isTablet || isDesktop;
  const { width } = useWindowDimensions();

  const isDark = scheme === 'dark';
  const palette = useMemo(() => ({ ...buildDashboardPalette(colors, isDark), canvas: tokens.colors.background }), [colors, isDark, tokens.colors.background]);
  const isCompactWidth = width < 360;
  const horizontalPad = isCompactWidth ? 16 : 20;

  const dashboardWidgets = state.settings.dashboardWidgets ?? { streakCard: true, dailyGoalRing: true };
  const language = state.settings.language;
  const lastBackPress = useRef(0);

  const [focusSetupVisible, setFocusSetupVisible] = useState(false);
  const [focusSetup, setFocusSetup] = useState<FocusSessionSetup>({
    mode: 'timer',
    durationMinutes: state.settings.focusDurationMinutes,
    selection: null,
    tag: '',
    task: null,
  });

  const displayedFocusSetup = focusSetup.mode === 'timer'
    ? { ...focusSetup, durationMinutes: state.settings.focusDurationMinutes }
    : focusSetup;

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

  const isFocusSessionActive = Boolean(focusSession?.session);

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
                <SSDSText
                  style={[styles.greetingPrefix, { color: palette.inkSecondary }]}
                  numberOfLines={1}
                >
                  {greetingPrefix}
                </SSDSText>
                <SSDSText
                  style={[styles.greetingName, { color: palette.inkPrimary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {firstName}
                </SSDSText>
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
                  <SSDSText
                    style={[styles.statValue, { color: palette.inkPrimary }]}
                    numberOfLines={1}
                  >
                    {studiedText}
                  </SSDSText>
                  <SSDSText
                    style={[styles.statLabel, { color: palette.inkMuted }]}
                    numberOfLines={1}
                  >
                    {translateLabel('Studied today', language)}
                  </SSDSText>
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
                      <SSDSText
                        style={[styles.statValue, { color: palette.inkPrimary }]}
                        numberOfLines={1}
                      >
                        {streakText}
                      </SSDSText>
                      <SSDSText
                        style={[styles.statLabel, { color: palette.inkMuted }]}
                        numberOfLines={1}
                      >
                        {translateLabel('Study streak', language)}
                      </SSDSText>
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
              <SSDSText style={[styles.sectionTitle, { color: palette.inkPrimary }]}>
                Study Planner
              </SSDSText>
              <SSDSText style={[styles.sectionSubtitle, { color: palette.inkMuted }]}>
                Quick controls
              </SSDSText>
            </View>

            {/* Row 1: Add Task + Focus Lock */}
            <View style={styles.bentoRow}>
              {/* Card 1: Add Task */}
              <Pressable
                onPress={() => nav.navigate('StudyPlanner')}
                accessibilityRole="button"
                accessibilityLabel="Add Task"
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
                </View>

                <View style={styles.cardTextBlock}>
                  <SSDSText style={[styles.cardTitle, { color: palette.inkPrimary }]} numberOfLines={1}>
                    Add Task
                  </SSDSText>
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
                    backgroundColor: palette.surface,
                    borderColor: pressed ? palette.rose : palette.hairline,
                  },
                  pressed && styles.pressedScaleCard,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.cardIconBox, { backgroundColor: palette.roseSoft }]}>
                    <LockIcon color={palette.rose} />
                  </View>
                </View>

                <View style={styles.cardTextBlock}>
                  <SSDSText style={[styles.cardTitle, { color: palette.inkPrimary }]} numberOfLines={1}>
                    Focus Lock
                  </SSDSText>
                </View>
              </Pressable>
            </View>

            {/* Row 2: Focus Timer + Alarm */}
            <View style={styles.bentoRow}>
              {/* Card 3: Focus Timer */}
              <Pressable
                onPress={() => setFocusSetupVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Focus Timer"
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
                </View>

                <View style={styles.cardTextBlock}>
                  <SSDSText style={[styles.cardTitle, { color: palette.inkPrimary }]} numberOfLines={1}>
                    Focus Timer
                  </SSDSText>
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
                    backgroundColor: palette.surface,
                    borderColor: pressed ? palette.amber : palette.hairline,
                  },
                  pressed && styles.pressedScaleCard,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.cardIconBox, { backgroundColor: palette.amberSoft }]}>
                    <AlarmIcon color={palette.amber} />
                  </View>
                </View>

                <View style={styles.cardTextBlock}>
                  <SSDSText style={[styles.cardTitle, { color: palette.inkPrimary }]} numberOfLines={1}>
                    Alarm
                  </SSDSText>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <FocusSessionSetupModal
        visible={focusSetupVisible}
        value={displayedFocusSetup}
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
    minHeight: 88,
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
  cardTextBlock: {
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },

  /* Micro-interaction feedback */
  pressedScaleSm: {
    transform: [{ scale: 0.96 }],
  },
  pressedScaleCard: {
    transform: [{ scale: 0.98 }],
  },
});
