import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { CustomStudyPlan } from '../components/DashboardStudyTools';
import { AppBottomNav, AppHeader } from '../components/Shell';
import { ProgressBar, Tag } from '../components/ui';
import { CURRENT_AFFAIRS, EXAMS, RESOURCES, TESTS, TODAY_PLAN } from '../lib/data';
import { dayKey, useStore } from '../lib/store';
import { shadow, useTheme } from '../lib/theme';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const stitchLight = {
  bg: '#F2F2F7', surface: '#FFFFFF', surfaceAlt: '#F2F2F7', border: '#E5E5EA', separator: '#C6C6C8',
  text: '#1C1C1E', muted: '#8E8E93', blue: '#007AFF', green: '#34C759', orange: '#FF9500', purple: '#AF52DE', red: '#FF3B30', teal: '#5AC8FA', dark: '#1C1C1E',
};

const stitchDark = {
  bg: '#0C1220', surface: '#141C2E', surfaceAlt: '#1B2439', border: '#253049', separator: '#3A4968',
  text: '#EDF1F8', muted: '#9AA6BC', blue: '#6F95FF', green: '#2BD69B', orange: '#FFB84D', purple: '#9A82FF', red: '#FF6B70', teal: '#5AC8FA', dark: '#EDF1F8',
};

export default function DashboardScreen() {
  const { colors, scheme } = useTheme();
  const nav = useNavigation<any>();
  const { state, streak, todayMinutes, dispatch } = useStore();
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const isWide = width >= 1000;
  const stitch = scheme === 'light' ? stitchLight : stitchDark;
  const styles = useMemo(() => makeStyles(colors, scheme), [colors, scheme]);

  const goal = Math.max(1, Number(state.settings.dailyGoalMin) || 1);
  const safeTodayMinutes = Math.max(0, Number(todayMinutes) || 0);
  const target = clamp(safeTodayMinutes / goal, 0, 1);
  const [anim, setAnim] = useState(0);

  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      setAnim(Math.min(1, frame / 28));
      if (frame >= 28) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target]);

  const exam = EXAMS.find((item) => item.id === (state.user?.exam ?? 'upsc')) ?? EXAMS[0];
  const first = (state.user?.name ?? 'Aspirant').trim().split(/\s+/)[0] || 'Aspirant';
  const week = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      out.push({ label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()], value: Math.max(0, Number(state.studyLog[dayKey(date)]) || 0) });
    }
    return out;
  }, [state.studyLog]);
  const weeklyTotal = week.reduce((total, day) => total + day.value, 0);
  const dailyAverage = Math.round(weeklyTotal / 7);
  const continueItems = Object.entries(state.progress)
    .sort((a, b) => (Number(b[1].at) || 0) - (Number(a[1].at) || 0))
    .slice(0, 3)
    .map(([id, progress]) => ({ id, ...progress, percent: clamp(Number(progress.percent) || 0, 0, 100), res: RESOURCES.find((resource) => resource.id === id) }))
    .filter((item) => item.res);
  const liveTests = TESTS.filter((test) => Boolean(test.liveAt));
  const recent = RESOURCES.filter((resource) => resource.exam === exam.id).slice(0, isWide ? 4 : 3);
  const quickActions = [
    { label: 'Notes', icon: 'document-text' as const, tint: stitch.blue, onPress: () => nav.navigate('NoteEditor', {}) },
    { label: 'Quiz', icon: 'help-circle' as const, tint: stitch.orange, onPress: () => nav.navigate('Tests') },
    { label: 'Revision', icon: 'refresh-circle' as const, tint: stitch.green, onPress: () => nav.navigate('Library') },
    { label: 'Sakha AI', icon: 'sparkles' as const, tint: stitch.purple, onPress: () => nav.navigate('SakhaAI') },
  ];
  const openPlanItem = (item: (typeof TODAY_PLAN)[number]) => {
    if (item.kind === 'note') nav.navigate('NoteEditor', { resourceId: item.refId });
    else if (item.kind === 'pyq') nav.navigate('PYQ', { subject: item.refId });
    else if (item.kind === 'ca') nav.navigate('CurrentAffairs');
    else nav.navigate('TestPlayer', { testId: item.refId });
  };
  const openResource = (resource: (typeof RESOURCES)[number]) => nav.navigate(resource.type === 'book' ? 'BookReader' : 'NoteEditor', { resourceId: resource.id });
  const radius = 15.9;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.mainContainer}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.contentWidth, !isTablet && styles.mobileContentWidth]}>
          <View style={[styles.greetingCard, styles.card]}>
            <Text style={styles.greetingTitle}>{greeting()}, {first} 👋</Text>
            <Text style={styles.greetingSub}>Small steps. Consistent progress.</Text>
          </View>

          <LinearGradient colors={['#1E1B2E', '#2A1D33', '#171224']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View pointerEvents="none" style={styles.heroGlowTop} />
            <View pointerEvents="none" style={styles.heroGlowBottom} />
            <View style={styles.heroTopRow}>
              <View style={styles.heroCopy}>
                <View style={styles.missionBadge}><Text style={styles.missionBadgeText}>TODAY'S MISSION</Text></View>
                <Text style={styles.heroTitle}>Make today count.</Text>
                <Text style={styles.heroSub}>One focused session at a time, Learner.</Text>
              </View>
              <View style={styles.progressCircleContainer}>
                <Svg width={48} height={48} viewBox="0 0 36 36">
                  <Circle cx="18" cy="18" r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none" />
                  <Circle cx="18" cy="18" r={radius} stroke="#007AFF" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - target * anim * circumference} transform="rotate(-90 18 18)" />
                </Svg>
                <View style={styles.progressCircleTextWrap}><Text style={styles.progressCircleText}>{Math.round(target * 100)}%</Text></View>
              </View>
            </View>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatBox}><View style={styles.heroStatLine}><Ionicons name="time" size={14} color="#5AC8FA" /><Text style={styles.heroStatValue}>{safeTodayMinutes} min</Text></View><Text style={styles.heroStatLabel}>Studied today</Text></View>
              <View style={styles.heroStatBox}><View style={styles.heroStatLine}><Ionicons name="flame" size={14} color="#FF9500" /><Text style={styles.heroStatValue}>{streak} day</Text></View><Text style={styles.heroStatLabel}>Study streak</Text></View>
            </View>
            <View style={styles.linearTrack}><LinearGradient colors={['#2DD4BF', '#38BDF8']} style={[styles.linearFill, { width: `${target * 100}%` }]} /></View>
            <Pressable accessibilityRole="button" onPress={() => nav.navigate('Library')} style={styles.resumeBtn}><Ionicons name="book-outline" size={16} color="#CBD5E1" /><Text style={styles.resumeBtnText}>Resume learning</Text></Pressable>
          </LinearGradient>

          <SectionHeader icon="grid" title="Quick actions" action="Explore tools" onPress={() => nav.navigate('Library')} styles={styles} />
          <View style={styles.quickActionsGrid}>{quickActions.map((item) => <Pressable accessibilityRole="button" key={item.label} onPress={item.onPress} style={[styles.quickActionCard, styles.card]}><View style={[styles.quickActionIcon, { backgroundColor: item.tint + '22' }]}><Ionicons name={item.icon} size={20} color={item.tint} /></View><Text style={[styles.quickActionText, { color: item.tint }]}>{item.label}</Text></Pressable>)}</View>

          <View style={[styles.layoutFlex, isTablet && styles.tabletLayout]}>
            <View style={styles.layoutCol}>
              <View style={styles.plannerWrap}><CustomStudyPlan plan={TODAY_PLAN.filter((task) => task.id !== 'tp4')} planDone={state.planDone} tasks={state.plannerTasks} tasksLoaded={state.plannerTasksLoaded} taskLoadError={state.plannerTaskLoadError} persistenceError={state.plannerPersistenceError} defaultOverrides={state.plannerDefaultOverrides} deletedDefaults={state.plannerDeletedDefaults} dispatch={dispatch} onOpenItem={openPlanItem} onOpenFocus={() => nav.navigate('FocusCenter')} onOpenPlanner={() => nav.navigate('StudyPlanner')} /></View>

              <View style={[styles.card, styles.sectionCard]}>
                <SectionHeader icon="play-circle" title="Continue learning" action="Library" onPress={() => nav.navigate('Library')} styles={styles} />
                {continueItems.length === 0 ? <Text style={styles.emptyText}>Start a resource to see it here.</Text> : continueItems.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => openResource(item.res!)} style={styles.listItem}><Image source={{ uri: item.res!.cover }} style={styles.listImage} /><View style={styles.listTextContainer}><Text style={styles.listTitle} numberOfLines={1}>{item.res!.title}</Text><Text style={styles.listSub}>{item.res!.subject} · {item.percent}% complete</Text><ProgressBar value={item.percent} height={5} /></View><Ionicons name="chevron-forward" size={16} color={stitch.muted} /></Pressable>)}
              </View>

              <View style={[styles.card, styles.sectionCard]}>
                <SectionHeader icon="bar-chart" title="Weekly activity" action="Statistics" onPress={() => nav.navigate('Statistics')} styles={styles} />
                <View style={styles.statsRow}><View><Text style={styles.statLarge}>{weeklyTotal}m</Text><Text style={styles.statSmall}>this week</Text></View><View style={styles.averageStat}><Text style={[styles.statLarge, { color: stitch.green }]}>{dailyAverage}m</Text><Text style={styles.statSmall}>daily average</Text></View></View>
                <WeeklyActivityStrip data={week} styles={styles} color={stitch.teal} />
              </View>
            </View>

            <View style={styles.layoutCol}>
              <View style={styles.testsSection}>
                <SectionHeader icon="radio" title="Upcoming live tests" action="All tests" onPress={() => nav.navigate('Tests')} styles={styles} />
                {liveTests.length === 0 ? <View style={[styles.card, styles.sectionCard]}><Text style={styles.emptyText}>No live tests scheduled.</Text></View> : liveTests.map((test) => <View key={test.id} style={styles.testCard}><View style={styles.testHeader}><Text style={styles.testTime}>● {test.liveAt}</Text><Tag label={test.kind} color={stitch.blue} /></View><Text style={styles.testTitle}>{test.title}</Text><Text style={styles.testSub}>{test.questions.length} Qs · {test.durationMin} min</Text><Pressable accessibilityRole="button" onPress={() => nav.navigate('TestPlayer', { testId: test.id })} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Enter test</Text></Pressable></View>)}
              </View>

              <View style={[styles.card, styles.sectionCard]}><SectionHeader icon="newspaper" title="Current affairs" action="Open" onPress={() => nav.navigate('CurrentAffairs')} styles={styles} />{CURRENT_AFFAIRS.slice(0, 3).map((affair) => <Pressable accessibilityRole="button" key={affair.id} onPress={() => nav.navigate('CurrentAffairs')} style={styles.caItem}><View style={styles.caHeader}><Tag label={affair.category} color={stitch.green} /><Text style={styles.caDate}>{affair.date}</Text></View><Text style={styles.caTitle} numberOfLines={2}>{affair.title}</Text></Pressable>)}</View>

              <View style={[styles.card, styles.sectionCard]}><SectionHeader icon="swap-horizontal" title="Switch focus" styles={styles} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.focusPills}>{EXAMS.map((item) => { const active = item.id === exam.id; return <Pressable accessibilityRole="button" key={item.id} onPress={() => nav.navigate('Library', { exam: item.id })} style={[styles.focusPill, active ? styles.focusPillActive : styles.focusPillInactive]}><Text style={[styles.focusPillText, active ? styles.focusPillTextActive : styles.focusPillTextInactive]}>{item.short}</Text></Pressable>; })}</ScrollView></View>

              <View style={[styles.card, styles.sectionCard]}><SectionHeader icon="library" title="Fresh in library" action="See all" onPress={() => nav.navigate('Library')} styles={styles} />{recent.map((resource) => <Pressable accessibilityRole="button" key={resource.id} onPress={() => openResource(resource)} style={styles.listItem}><View style={[styles.iconBox, { backgroundColor: `${stitch.blue}18` }]}><Ionicons name="book" size={18} color={stitch.blue} /></View><View style={styles.listTextContainer}><Text style={styles.listTitle} numberOfLines={1}>{resource.title}</Text><Text style={styles.listSub}>{resource.subject} · ★ {resource.rating}</Text></View><Ionicons name="chevron-forward" size={16} color={stitch.muted} /></Pressable>)}</View>
            </View>
          </View>
        </View>
      </ScrollView>
      <AppBottomNav active="Dashboard" />
    </View>
  );
}

function SectionHeader({ icon, title, action, onPress, styles }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; action?: string; onPress?: () => void; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.sectionHeader}><View style={styles.sectionTitleRow}><Ionicons name={icon} size={18} color={styles.iconColor.color} /><Text style={styles.sectionTitle}>{title}</Text></View>{action && onPress ? <Pressable accessibilityRole="button" onPress={onPress}><Text style={styles.sectionLink}>{action} ›</Text></Pressable> : null}</View>;
}

function WeeklyActivityStrip({ data, styles, color }: { data: { label: string; value: number }[]; styles: ReturnType<typeof makeStyles>; color: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return <View style={styles.activityChart}><View style={styles.activityBars}>{data.map((item, index) => <View key={`${item.label}-${index}`} style={styles.activityBarSlot}><View style={[styles.activityBar, { opacity: item.value ? 0.35 + (item.value / max) * 0.65 : 0.3, backgroundColor: color }]} /></View>)}</View><View style={styles.activityLabels}>{data.map((item, index) => <Text key={`${item.label}-label-${index}`} style={styles.activityLabel}>{item.label}</Text>)}</View></View>;
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], scheme: 'light' | 'dark') {
  const palette = scheme === 'light' ? stitchLight : stitchDark;
  return StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: palette.bg },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 112 },
    contentWidth: { width: '100%', maxWidth: 1180, alignSelf: 'center' },
    mobileContentWidth: { maxWidth: 448 },
    card: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 20, ...shadow(colors, 1) },
    greetingCard: { padding: 16, marginBottom: 14 },
    greetingTitle: { fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: -0.4, color: palette.text },
    greetingSub: { fontSize: 13, color: palette.muted, marginTop: 2 },
    heroCard: { borderRadius: 22, padding: 16, marginBottom: 14, borderColor: 'rgba(58,46,76,0.5)', borderWidth: 1, overflow: 'hidden', ...shadow(colors, 3) },
    heroGlowTop: { position: 'absolute', width: 176, height: 176, borderRadius: 88, right: -48, top: -48, backgroundColor: 'rgba(175,82,222,0.16)' },
    heroGlowBottom: { position: 'absolute', width: 144, height: 144, borderRadius: 72, left: -48, bottom: -40, backgroundColor: 'rgba(0,122,255,0.12)' },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 },
    heroCopy: { flex: 1 },
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
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconColor: { color: palette.blue },
    sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: palette.text },
    sectionLink: { fontSize: 13, fontWeight: '500', color: palette.blue },
    quickActionsGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    quickActionCard: { flex: 1, padding: 12, alignItems: 'center', justifyContent: 'center', minHeight: 92, borderRadius: 18 },
    quickActionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    quickActionText: { fontSize: 12, fontWeight: '500', color: palette.text },
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
    focusPills: { gap: 6, paddingVertical: 4 },
    focusPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    focusPillActive: { backgroundColor: palette.dark, borderColor: palette.dark, ...shadow(colors, 1) },
    focusPillInactive: { backgroundColor: palette.surfaceAlt, borderColor: palette.surfaceAlt },
    focusPillText: { fontSize: 13, fontWeight: '600' },
    focusPillTextActive: { color: palette.surface },
    focusPillTextInactive: { color: palette.text },
  });
}
