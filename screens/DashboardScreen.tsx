import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { CustomStudyPlan, type PlannerDashboardAction } from '../components/DashboardStudyTools';
import { FocusSessionSetupModal } from '../components/FocusSessionSetupModal';
import type { FocusSessionSetup } from '../components/FocusSessionSetupModal';
import { Shell, useLayout } from '../components/Shell';
import { TODAY_PLAN } from '../lib/data';
import { dayKey, getDisplayName, useStore } from '../lib/store';
import { shadow, useTheme } from '../lib/theme';
import { translateLabel } from '../lib/i18n';
import { readAlarmSummary, type AlarmSummary } from '../src/modules/alarm/alarmStorage';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function formatDashboardAlarmTime(alarm: AlarmSummary['nextAlarm'], use24h: boolean) {
  if (!alarm) return 'No upcoming alarm';
  if (use24h) return `Next ${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`;
  const period = alarm.hour >= 12 ? 'PM' : 'AM';
  const hour = alarm.hour % 12 || 12;
  return `Next ${hour}:${String(alarm.minute).padStart(2, '0')} ${period}`;
}

const stitchLight = {
  bg: '#F2F2F7', surface: '#FFFFFF', surfaceAlt: '#F2F2F7', border: '#E5E5EA', separator: '#C6C6C8',
  text: '#1C1C1E', muted: '#8E8E93', blue: '#007AFF', green: '#34C759', orange: '#FF9500', purple: '#AF52DE', red: '#FF3B30', teal: '#5AC8FA', dark: '#1C1C1E',
};

const stitchDark = {
  bg: '#0C1220', surface: '#141C2E', surfaceAlt: '#1B2439', border: '#253049', separator: '#3A4968',
  text: '#EDF1F8', muted: '#9AA6BC', blue: '#6F95FF', green: '#2BD69B', orange: '#FFB84D', purple: '#9A82FF', red: '#FF6B70', teal: '#5AC8FA', dark: '#EDF1F8',
};

export default function DashboardScreen() {
  const { colors, scheme, reduceMotion } = useTheme();
  const nav = useNavigation<AppNavigation>();
  const { state, streak, todayMinutes, dispatch } = useStore();
  const dashboardWidgets = state.settings.dashboardWidgets ?? { streakCard: true, dailyGoalRing: true };
  const language = state.settings.language;
  const { isTablet, isDesktop } = useLayout();
  const isTabletOrLarger = isTablet || isDesktop;
  const styles = useMemo(() => makeStyles(colors, scheme), [colors, scheme]);
  const lastBackPress = useRef(0);

  const goal = Math.max(1, Number(state.settings.dailyGoalMin) || 1);
  const safeTodayMinutes = Math.max(0, Number(todayMinutes) || 0);
  const target = clamp(safeTodayMinutes / goal, 0, 1);
  const [anim, setAnim] = useState(0);
  const [focusSetupVisible, setFocusSetupVisible] = useState(false);
  const [alarmSummary, setAlarmSummary] = useState<AlarmSummary>({ activeCount: 0, nextAlarm: null, use24h: false });
  const [focusSetup, setFocusSetup] = useState<FocusSessionSetup>({
    mode: 'timer',
    durationMinutes: state.settings.focusDurationMinutes,
    selection: null,
    tag: '',
    task: null,
  });

  useEffect(() => {
    setFocusSetup((current) => current.mode === 'timer'
      ? { ...current, durationMinutes: state.settings.focusDurationMinutes }
      : current);
  }, [state.settings.focusDurationMinutes]);

  useEffect(() => {
    if (reduceMotion) {
      setAnim(1);
      return undefined;
    }
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      setAnim(Math.min(1, frame / 28));
      if (frame >= 28) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [reduceMotion, target]);

  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const now = Date.now();
      if (now - lastBackPress.current < 2000) return false;
      lastBackPress.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    });
    return () => subscription.remove();
  }, []));

  useFocusEffect(useCallback(() => {
    let mounted = true;
    readAlarmSummary().then((summary) => {
      if (mounted) setAlarmSummary(summary);
    });
    return () => {
      mounted = false;
    };
  }, []));

  const first = getDisplayName(state.user).split(/\s+/)[0];

  const openPlanItem = (item: (typeof TODAY_PLAN)[number]) => {
    if (item.kind === 'note') nav.navigate('NoteEditor', { resourceId: item.refId });
    else if (item.kind === 'pyq') nav.navigate('PYQ', { subject: item.refId });
    else if (item.kind === 'ca') nav.navigate('CurrentAffairs');
    else nav.navigate('TestPlayer', { testId: item.refId });
  };

  const quickActionHandlers: Record<string, { title: string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void }> = {
    'Focus Timer': { title: 'Focus Timer', icon: 'timer-outline', color: colors.violet, onPress: () => setFocusSetupVisible(true) },
    'Sakha AI': { title: 'Sakha AI', icon: 'sparkles-outline', color: colors.purple, onPress: () => nav.navigate('SakhaAI') },
    'Daily PYQ': { title: 'Daily PYQ', icon: 'albums-outline', color: colors.blue, onPress: () => nav.navigate('PYQ') },
    'Add Task': { title: 'Add Task', icon: 'add-circle-outline', color: colors.teal, onPress: () => nav.navigate('StudyPlanner') },
  };
  const dashboardActions: PlannerDashboardAction[] = [
    { title: 'Add Task', icon: 'add-circle-outline' as const, color: colors.teal, onPress: () => nav.navigate('StudyPlanner') },
    { title: 'Focus Lock', icon: 'lock-closed-outline' as const, color: colors.rose, onPress: () => nav.navigate('FocusLock') },
    quickActionHandlers['Focus Timer'],
    {
      title: 'Alarm',
      subtitle: 'Manage your alarms',
      badge: `${alarmSummary.activeCount} active`,
      detail: formatDashboardAlarmTime(alarmSummary.nextAlarm, alarmSummary.use24h),
      icon: 'alarm-outline' as const,
      color: colors.amber,
      onPress: () => nav.navigate('Alarm'),
    },
  ];

  const radius = 15.9;
  const circumference = 2 * Math.PI * radius;

  return (
    <Shell active="Dashboard" title="" subtitle="" scroll={false} contentPadding={0}>
      <View style={styles.mainContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.contentWidth, !isTabletOrLarger && styles.mobileContentWidth]}>
            
            <LinearGradient colors={['#1E1B2E', '#2A1D33', '#171224']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
              <View pointerEvents="none" style={styles.heroGlowTop} />
              <View pointerEvents="none" style={styles.heroGlowBottom} />
              <View style={styles.heroTopRow}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroGreetingTitle}>{greeting()}, {first} 👋</Text>
                  <Text style={styles.heroGreetingSub}>Small steps. Consistent progress.</Text>
                  <View style={styles.missionBadge}><Text style={styles.missionBadgeText}>TODAY&apos;S MISSION</Text></View>
                  <Text style={styles.heroTitle}>Make today count.</Text>
                  <Text style={styles.heroSub}>One focused session at a time, Learner.</Text>
                </View>
                {dashboardWidgets.dailyGoalRing ? <View style={styles.progressCircleContainer}>
                  <Svg width={48} height={48} viewBox="0 0 36 36">
                    <Circle cx="18" cy="18" r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none" />
                    <Circle cx="18" cy="18" r={radius} stroke={colors.blue} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - target * anim * circumference} transform="rotate(-90 18 18)" />
                  </Svg>
                  <View style={styles.progressCircleTextWrap}><Text style={styles.progressCircleText}>{Math.round(target * 100)}%</Text></View>
                </View> : null}
              </View>
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatBox}><View style={styles.heroStatLine}><Ionicons name="time" size={14} color={colors.info} /><Text style={styles.heroStatValue}>{safeTodayMinutes} min</Text></View><Text style={styles.heroStatLabel}>{translateLabel('Studied today', language)}</Text></View>
                {dashboardWidgets.streakCard ? <View style={styles.heroStatBox}><View style={styles.heroStatLine}><Ionicons name="flame" size={14} color={colors.warning} /><Text style={styles.heroStatValue}>{streak} day</Text></View><Text style={styles.heroStatLabel}>{translateLabel('Study streak', language)}</Text></View> : null}
              </View>
              <View style={styles.linearTrack}><LinearGradient colors={['#2DD4BF', '#38BDF8']} style={[styles.linearFill, { width: `${target * 100}%` }]} /></View>
              <Pressable accessibilityRole="button" onPress={() => nav.navigate('Library')} style={styles.resumeBtn}><Ionicons name="book-outline" size={16} color="#CBD5E1" /><Text style={styles.resumeBtnText}>{translateLabel('Resume learning', language)}</Text></Pressable>
            </LinearGradient>

            <View style={[styles.layoutFlex, isTabletOrLarger && styles.tabletLayout]}>
              <View style={styles.layoutCol}>
                <View style={styles.plannerWrap}>
                  <CustomStudyPlan 
                    plan={TODAY_PLAN.filter((task) => task.id !== 'tp4')} 
                    planDone={state.planDone} 
                    tasks={state.plannerTasks} 
                    tasksLoaded={state.plannerTasksLoaded} 
                    taskLoadError={state.plannerTaskLoadError} 
                    persistenceError={state.plannerPersistenceError} 
                    defaultOverrides={state.plannerDefaultOverrides} 
                    deletedDefaults={state.plannerDeletedDefaults} 
                    dispatch={dispatch} 
                    onOpenItem={openPlanItem} 
                    onOpenFocus={() => setFocusSetupVisible(true)}
                    onOpenPlanner={() => nav.navigate('StudyPlanner')} 
                    dashboardMode
                    dashboardActions={dashboardActions}
                  />
                </View>

              </View>

            </View>

          </View>
        </ScrollView>
      </View>
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

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], scheme: 'light' | 'dark') {
  const base = scheme === 'light' ? stitchLight : stitchDark;
  const palette = {
    ...base,
    bg: colors.bg,
    surface: colors.surface,
    surfaceAlt: colors.surfaceAlt,
    border: colors.border,
    text: colors.text,
    muted: colors.textMuted,
    blue: colors.blue,
    green: colors.green,
    orange: colors.orange,
    purple: colors.purple,
    red: colors.red,
    teal: colors.teal,
    dark: colors.dark,
  };
  return StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: palette.bg },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
    contentWidth: { width: '100%', maxWidth: 1180, alignSelf: 'center' },
    mobileContentWidth: { maxWidth: 448 },
    card: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 20, ...shadow(colors, 1) },
    heroCard: { borderRadius: 22, padding: 16, marginBottom: 14, borderColor: 'rgba(58,46,76,0.5)', borderWidth: 1, overflow: 'hidden', ...shadow(colors, 3) },
    heroGlowTop: { position: 'absolute', width: 176, height: 176, borderRadius: 88, right: -48, top: -48, backgroundColor: 'rgba(175,82,222,0.16)' },
    heroGlowBottom: { position: 'absolute', width: 144, height: 144, borderRadius: 72, left: -48, bottom: -40, backgroundColor: 'rgba(0,122,255,0.12)' },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 },
    heroCopy: { flex: 1 },
    heroGreetingTitle: { color: '#FFF', fontSize: 18, lineHeight: 22, fontWeight: '800', letterSpacing: -0.3 },
    heroGreetingSub: { color: '#CBD5E1', fontSize: 12, marginTop: 2, marginBottom: 10 },
    missionBadge: { backgroundColor: 'rgba(76, 29, 36, 0.6)', borderColor: '#9F1239', borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 7 },
    missionBadgeText: { color: '#FDA4AF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    heroTitle: { color: '#FFF', fontSize: 21, fontWeight: '800' },
    heroSub: { color: '#CBD5E1', fontSize: 12, marginTop: 3 },
    progressCircleContainer: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    progressCircleTextWrap: { position: 'absolute' },
    progressCircleText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    heroStatsRow: { flexDirection: 'row', gap: 10, marginTop: 14, zIndex: 1 },
    heroStatBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderRadius: 16, padding: 10 },
    heroStatLine: { flexDirection: 'row', alignItems: 'center' },
    heroStatValue: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 4 },
    heroStatLabel: { color: '#94A3B8', fontSize: 11 },
    linearTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, marginTop: 14, overflow: 'hidden', zIndex: 1 },
    linearFill: { height: '100%', borderRadius: 3 },
    resumeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 12, zIndex: 1 },
    resumeBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    layoutFlex: { flexDirection: 'column', gap: 0 },
    tabletLayout: { flexDirection: 'row', alignItems: 'flex-start' },
    layoutCol: { flex: 1, minWidth: 0 },
    plannerWrap: { marginBottom: 14 },
    testsSection: { marginBottom: 0 },
    sectionCard: { padding: 16, marginBottom: 14 },
    listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.border },
    listImage: { width: 44, height: 44, borderRadius: 12, backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    listTextContainer: { flex: 1, gap: 4, minWidth: 0 },
    listTitle: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2, color: palette.text },
    listSub: { fontSize: 11, color: palette.muted, marginTop: 1 },
    emptyText: { color: palette.muted, fontSize: 13, paddingVertical: 6 },
    statsRow: { flexDirection: 'row', marginBottom: 6, paddingTop: 2 },
    averageStat: { marginLeft: 20 },
    statLarge: { fontSize: 24, lineHeight: 27, fontWeight: '800', color: palette.text },
    statSmall: { fontSize: 11, color: palette.muted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
    activityChart: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.border },
    activityBars: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
    activityBarSlot: { width: 24, height: 4, borderRadius: 4, overflow: 'hidden' },
    activityBar: { width: '100%', height: 4, borderRadius: 4 },
    activityLabels: { flexDirection: 'row', justifyContent: 'space-around' },
    activityLabel: { width: 24, textAlign: 'center', fontSize: 12, fontWeight: '600', color: palette.muted },
    testCard: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 10, ...shadow(colors, 1) },
    testHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    testTime: { fontSize: 12, fontWeight: '700', color: palette.red },
    testTitle: { fontSize: 15, fontWeight: '800', color: palette.text },
    testSub: { fontSize: 12, color: palette.muted, marginTop: 3 },
    primaryBtn: { backgroundColor: palette.blue, paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginTop: 12, ...shadow(colors, 1) },
    primaryBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    caItem: { borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: 10 },
    caHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    caDate: { fontSize: 11, color: palette.muted },
    caTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: palette.text },
  });
}
