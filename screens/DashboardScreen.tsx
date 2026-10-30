import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { BarChart } from '../components/Charts';
import { AppBottomNav, AppHeader, useLayout } from '../components/Shell';
import { ProgressBar, Tag } from '../components/ui';
import {
  CURRENT_AFFAIRS,
  EXAMS,
  RESOURCES,
  TESTS,
  TODAY_PLAN,
} from '../lib/data';
import { dayKey, useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import {
  CustomStudyPlan,
} from '../components/DashboardStudyTools';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export default function DashboardScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state, streak, todayMinutes, dispatch } = useStore();
  const { isMobile, isDesktop } = useLayout();

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
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      out.push({
        label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()],
        value: Math.max(0, Number(state.studyLog[dayKey(date)]) || 0),
      });
    }
    return out;
  }, [state.studyLog]);

  const weeklyTotal = week.reduce((total, day) => total + day.value, 0);
  const dailyAverage = Math.round(weeklyTotal / 7);
  const hasWeeklyActivity = weeklyTotal > 0;

  const continueItems = Object.entries(state.progress)
    .sort((a, b) => (Number(b[1].at) || 0) - (Number(a[1].at) || 0))
    .slice(0, 3)
    .map(([id, progress]) => ({
      id,
      ...progress,
      percent: clamp(Number(progress.percent) || 0, 0, 100),
      res: RESOURCES.find((resource) => resource.id === id),
    }))
    .filter((item) => item.res);

  const liveTests = TESTS.filter((test) => Boolean(test.liveAt));
  const recent = exam
    ? RESOURCES.filter((resource) => resource.exam === exam.id).slice(0, isDesktop ? 4 : 3)
    : [];

  const quickActions = [
    {
      label: 'Notes',
      icon: 'document-text' as const,
      background: '#DBEAFE', // blue-100
      iconColor: '#2563EB', // blue-600
      onPress: () => nav.navigate('NoteEditor', {}),
    },
    {
      label: 'Quiz',
      icon: 'help-circle' as const,
      background: '#FEF3C7', // amber-100
      iconColor: '#D97706', // amber-600
      onPress: () => nav.navigate('Tests'),
    },
    {
      label: 'Revision',
      icon: 'refresh-circle' as const,
      background: '#D1FAE5', // emerald-100
      iconColor: '#059669', // emerald-600
      onPress: () => nav.navigate('Library'),
    },
    {
      label: 'Sakha AI',
      icon: 'sparkles' as const,
      background: '#F3E8FF', // purple-100
      iconColor: '#9333EA', // purple-600
      onPress: () => nav.navigate('SakhaAI'),
    },
  ];

  const openPlanItem = (item: (typeof TODAY_PLAN)[number]) => {
    if (item.kind === 'note') {
      nav.navigate('NoteEditor', { resourceId: item.refId });
    } else if (item.kind === 'pyq') {
      nav.navigate('PYQ', { subject: item.refId });
    } else if (item.kind === 'ca') {
      nav.navigate('CurrentAffairs');
    } else {
      nav.navigate('TestPlayer', { testId: item.refId });
    }
  };

  const openResource = (resource: (typeof RESOURCES)[number]) => {
    if (resource.type === 'book') {
      nav.navigate('BookReader', { resourceId: resource.id });
    } else {
      nav.navigate('NoteEditor', { resourceId: resource.id });
    }
  };

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - target * anim * circumference;

  return (
    <View style={styles.mainContainer}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Personalized Greeting */}
        <View style={[styles.pastelCard, styles.greetingCard]}>
          <Text style={styles.greetingTitle}>
            {greeting()}, {first} 👋
          </Text>
          <Text style={styles.greetingSub}>Small steps. Consistent progress.</Text>
        </View>

        {/* Today Mission Hero */}
        <LinearGradient
          colors={['#5B2F3A', '#4A2530', '#3A1C25']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View>
              <View style={styles.missionBadge}>
                <Text style={styles.missionBadgeText}>TODAY'S MISSION</Text>
              </View>
              <Text style={styles.heroTitle}>Make today count.</Text>
              <Text style={styles.heroSub}>One focused session at a time, Learner.</Text>
            </View>
            
            {/* Circular Progress Gauge */}
            <View style={styles.progressCircleContainer}>
              <Svg width={50} height={50} viewBox="0 0 44 44">
                <Circle cx="22" cy="22" r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth="4" fill="none" />
                <Circle
                  cx="22" cy="22" r={radius}
                  stroke="#38BDF8" strokeWidth="4" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  rotation="-90" origin="22, 22"
                />
              </Svg>
              <View style={styles.progressCircleTextWrap}>
                <Text style={styles.progressCircleText}>{Math.round(target * 100)}%</Text>
              </View>
            </View>
          </View>

          {/* Dual Stats */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatBox}>
              <Ionicons name="time" size={16} color="#38BDF8" />
              <Text style={styles.heroStatValue}>{safeTodayMinutes} min</Text>
              <Text style={styles.heroStatLabel}>Studied today</Text>
            </View>
            <View style={styles.heroStatBox}>
              <Ionicons name="flame" size={16} color="#FBBF24" />
              <Text style={styles.heroStatValue}>{streak} day</Text>
              <Text style={styles.heroStatLabel}>Study streak</Text>
            </View>
          </View>

          {/* Linear Progress Bar */}
          <View style={styles.linearTrack}>
            <LinearGradient
              colors={['#2DD4BF', '#38BDF8']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.linearFill, { width: `${target * 100}%` }]}
            />
          </View>

          <View style={styles.heroActions}>
            <Pressable style={styles.resumeBtn} onPress={() => nav.navigate('Library')}>
              <Ionicons name="book-outline" size={16} color="#CBD5E1" />
              <Text style={styles.resumeBtnText}>Resume learning</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="grid" size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>Quick actions</Text>
          </View>
          <Text style={styles.sectionLink} onPress={() => nav.navigate('Library')}>Explore tools ›</Text>
        </View>

        <View style={styles.quickActionsGrid}>
          {quickActions.map((item) => (
            <Pressable key={item.label} onPress={item.onPress} style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: item.background }]}>
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <Text style={[styles.quickActionText, { color: item.iconColor }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.layoutFlex}>
          <View style={styles.layoutCol}>
            {/* Today's Plan */}
            <View style={styles.pastelCardWrap}>
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
                onOpenFocus={() => nav.navigate('FocusCenter')}
                onOpenPlanner={() => nav.navigate('StudyPlanner')}
              />
            </View>

            {/* Continue Learning */}
            <View style={styles.pastelCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="play-circle" size={18} color="#2563EB" />
                  <Text style={styles.sectionTitle}>Continue learning</Text>
                </View>
                <Text style={styles.sectionLink} onPress={() => nav.navigate('Library')}>Library ›</Text>
              </View>
              <View style={styles.listContainer}>
                {continueItems.map((item) => (
                  <Pressable key={item.id} onPress={() => openResource(item.res!)} style={styles.listItem}>
                    <Image source={{ uri: item.res!.cover }} style={styles.listImage} />
                    <View style={styles.listTextContainer}>
                      <Text style={styles.listTitle} numberOfLines={1}>{item.res!.title}</Text>
                      <Text style={styles.listSub}>{item.res!.subject} · {item.percent}% complete</Text>
                      <ProgressBar value={item.percent} height={5} />
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Weekly Activity */}
            <View style={styles.pastelCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="bar-chart" size={18} color="#2563EB" />
                  <Text style={styles.sectionTitle}>Weekly activity</Text>
                </View>
                <Text style={styles.sectionLink} onPress={() => nav.navigate('Statistics')}>Statistics ›</Text>
              </View>
              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.statLarge}>{weeklyTotal}m</Text>
                  <Text style={styles.statSmall}>this week</Text>
                </View>
                <View style={{ marginLeft: 20 }}>
                  <Text style={[styles.statLarge, { color: '#0D9488' }]}>{dailyAverage}m</Text>
                  <Text style={styles.statSmall}>daily average</Text>
                </View>
              </View>
              <BarChart data={week} goal={goal} />
            </View>
          </View>

          <View style={styles.layoutCol}>
            {/* Upcoming live tests */}
            <View style={styles.pastelCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="radio" size={18} color="#2563EB" />
                  <Text style={styles.sectionTitle}>Upcoming live tests</Text>
                </View>
                <Text style={styles.sectionLink} onPress={() => nav.navigate('Tests')}>All tests ›</Text>
              </View>
              <View style={styles.listContainer}>
                {liveTests.map((test) => (
                  <View key={test.id} style={styles.testCard}>
                    <View style={styles.testHeader}>
                      <Text style={styles.testTime}>
                        <View style={styles.liveDot} /> {test.liveAt}
                      </Text>
                      <Tag label={test.kind} color="#2563EB" />
                    </View>
                    <Text style={styles.testTitle}>{test.title}</Text>
                    <Text style={styles.testSub}>{test.questions.length} Qs · {test.durationMin} min</Text>
                    <Pressable style={styles.primaryBtn} onPress={() => nav.navigate('TestPlayer', { testId: test.id })}>
                      <Text style={styles.primaryBtnText}>Enter test</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            {/* Current Affairs */}
            <View style={styles.pastelCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="newspaper" size={18} color="#2563EB" />
                  <Text style={styles.sectionTitle}>Current affairs</Text>
                </View>
                <Text style={styles.sectionLink} onPress={() => nav.navigate('CurrentAffairs')}>Open ›</Text>
              </View>
              <View style={styles.listContainer}>
                {CURRENT_AFFAIRS.slice(0, 3).map((affair) => (
                  <Pressable key={affair.id} onPress={() => nav.navigate('CurrentAffairs')} style={styles.caItem}>
                    <View style={styles.caHeader}>
                      <Tag label={affair.category} color="#0D9488" />
                      <Text style={styles.caDate}>{affair.date}</Text>
                    </View>
                    <Text style={styles.caTitle} numberOfLines={2}>{affair.title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {/* Switch focus */}
            <View style={styles.pastelCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="swap-horizontal" size={18} color="#2563EB" />
                  <Text style={styles.sectionTitle}>Switch focus</Text>
                </View>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {EXAMS.map((item) => {
                  const isActive = item.id === exam?.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => nav.navigate('Library', { exam: item.id })}
                      style={[
                        styles.focusPill,
                        isActive ? styles.focusPillActive : styles.focusPillInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.focusPillText,
                          isActive ? styles.focusPillTextActive : styles.focusPillTextInactive,
                        ]}
                      >
                        {item.short}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Fresh in Library */}
            <View style={styles.pastelCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="library" size={18} color="#2563EB" />
                  <Text style={styles.sectionTitle}>Fresh in library</Text>
                </View>
                <Text style={styles.sectionLink} onPress={() => nav.navigate('Library')}>See all ›</Text>
              </View>
              <View style={styles.listContainer}>
                {recent.map((resource) => (
                  <Pressable key={resource.id} onPress={() => openResource(resource)} style={styles.listItem}>
                    <View style={styles.iconBox}>
                      <Ionicons name="book" size={18} color="#2563EB" />
                    </View>
                    <View style={styles.listTextContainer}>
                      <Text style={styles.listTitle} numberOfLines={1}>{resource.title}</Text>
                      <Text style={styles.listSub}>{resource.subject} · ★ {resource.rating}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      <AppBottomNav active="Dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pastelCard: {
    backgroundColor: '#FFF8F8',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  pastelCardWrap: {
    marginBottom: 16,
  },
  greetingCard: {
    padding: 16,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  greetingSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  heroCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderColor: 'rgba(244, 114, 134, 0.35)',
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  missionBadge: {
    backgroundColor: 'rgba(76, 29, 36, 0.6)',
    borderColor: '#9F1239',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  missionBadgeText: {
    color: '#FDA4AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  heroSub: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
  },
  progressCircleContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleTextWrap: {
    position: 'absolute',
  },
  progressCircleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  heroStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  heroStatValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  heroStatLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  linearTrack: {
    height: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  linearFill: {
    height: '100%',
    borderRadius: 3,
  },
  heroActions: {
    marginTop: 16,
    gap: 10,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(254, 205, 211, 0.25)',
  },
  resumeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFF8F8',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  layoutFlex: {
    flexDirection: 'column', 
    gap: 16,
  },
  layoutCol: {
    flex: 1,
  },
  listContainer: {
    gap: 14,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTextContainer: {
    flex: 1,
    gap: 4,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  listSub: {
    fontSize: 11,
    color: '#64748B',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  statSmall: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: -2,
  },
  testCard: {
    backgroundColor: '#FFFBFC',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  testTime: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  testTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  testSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  caItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  caHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  caDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  caTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  focusPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  focusPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  focusPillInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  focusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  focusPillTextActive: {
    color: '#FFF',
  },
  focusPillTextInactive: {
    color: '#334155',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 10,
    paddingBottom: 25, /* Bottom safe area के लिए */
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
});
