import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { BarChart } from '../components/Charts';
import { Shell, useLayout } from '../components/Shell';
import {
  Button,
  Card,
  Chip,
  ProgressBar,
  ProgressRing,
  SectionHeader,
  Tag,
  Txt,
} from '../components/ui';
import {
  CURRENT_AFFAIRS,
  EXAMS,
  RESOURCES,
  TESTS,
  TODAY_PLAN,
} from '../lib/data';
import { dayKey, useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import {
  FocusTimerButton,
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
  const { state, streak, todayMinutes, todayDone, dispatch } = useStore();
  const { isMobile, isDesktop } = useLayout();

  // Prevent division by zero if a saved setting is invalid.
  const goal = Math.max(1, Number(state.settings.dailyGoalMin) || 1);

  const safeTodayMinutes = Math.max(0, Number(todayMinutes) || 0);
  const target = clamp(safeTodayMinutes / goal, 0, 1);

  const [anim, setAnim] = useState(0);

  // Avoid repeated study-minute increments from rapid taps on one plan item.
  const planTapLocks = useRef<Record<string, boolean>>({});

  useEffect(() => {
    let frame = 0;

    const id = setInterval(() => {
      frame += 1;
      setAnim(Math.min(1, frame / 28));

      if (frame >= 28) clearInterval(id);
    }, 16);

    return () => clearInterval(id);
  }, [target]);

  const exam =
    EXAMS.find((item) => item.id === (state.user?.exam ?? 'upsc')) ?? EXAMS[0];

  const first =
    (state.user?.name ?? 'Aspirant').trim().split(/\s+/)[0] || 'Aspirant';

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
    ? RESOURCES.filter((resource) => resource.exam === exam.id).slice(
        0,
        isDesktop ? 4 : 3
      )
    : [];

  const planPct =
    TODAY_PLAN.length > 0
      ? Math.round((todayDone.length / TODAY_PLAN.length) * 100)
      : 0;

  const quickActions: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
  }[] = [
    {
      label: 'Ask Sakha AI',
      icon: 'sparkles',
      color: colors.teal,
      onPress: () => nav.navigate('SakhaAI'),
    },
    {
      label: 'Daily Quiz',
      icon: 'flash',
      color: colors.amber,
      onPress: () => nav.navigate('TestPlayer', { testId: 't4' }),
    },
    {
      label: 'PYQ Bank',
      icon: 'albums',
      color: colors.blue,
      onPress: () => nav.navigate('PYQ'),
    },
    {
      label: 'New Note',
      icon: 'create',
      color: colors.violet,
      onPress: () => nav.navigate('NoteEditor', {}),
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

  const renderEmptyState = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    description: string,
    actionLabel?: string,
    onAction?: () => void
  ) => (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 18,
        paddingVertical: 22,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        backgroundColor: colors.surfaceAlt,
        gap: 8,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={21} color={colors.blue} />
      </View>

      <Txt size={13.5} weight="800" style={{ textAlign: 'center' }}>
        {title}
      </Txt>

      <Txt
        size={12}
        color={colors.textMuted}
        style={{ textAlign: 'center', lineHeight: 18 }}
      >
        {description}
      </Txt>

      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          icon="arrow-forward"
          size="sm"
          variant="soft"
          onPress={onAction}
          style={{ marginTop: 3 }}
        />
      ) : null}
    </View>
  );

  return (
    <Shell
      active="Dashboard"
      title="Dashboard"
      subtitle={
        exam
          ? `${exam.name} · ${exam.aspirants} aspirants preparing`
          : 'Your personal learning space'
      }
    >
      {/* Hero / daily study goal */}
      <LinearGradient
        colors={[colors.navy, colors.blue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radii.xl,
          padding: isMobile ? 18 : 24,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 18 : 24,
          }}
        >
          <View style={{ flex: 1, width: '100%' }}>
            <Txt
              size={12.5}
              weight="700"
              color="rgba(255,255,255,0.72)"
              style={{ letterSpacing: 1 }}
            >
              {greeting().toUpperCase()}
            </Txt>

            <Txt
              size={isMobile ? 24 : 30}
              weight="800"
              display
              color="#fff"
              style={{ marginTop: 4, letterSpacing: -0.8 }}
            >
              {first}, let us close today&apos;s ring.
            </Txt>

            <Txt
              size={13.5}
              color="rgba(255,255,255,0.8)"
              style={{ marginTop: 8, maxWidth: 520, lineHeight: 20 }}
            >
              You have studied {safeTodayMinutes} of {goal} minutes today.{' '}
              {todayDone.length} of {TODAY_PLAN.length} planned tasks are done.
            </Txt>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                marginTop: 16,
                flexWrap: 'wrap',
              }}
            >
              <Button
                label="Continue studying"
                icon="play"
                variant="soft"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                onPress={() => nav.navigate('Library')}
              />

              <FocusTimerButton />
            </View>
          </View>

          <View
            style={{
              alignItems: 'center',
              gap: 12,
              alignSelf: isMobile ? 'center' : 'auto',
            }}
          >
            <ProgressRing
              size={isMobile ? 130 : 150}
              stroke={13}
              progress={target * anim}
            >
              <Txt size={isMobile ? 26 : 30} weight="800" display color="#fff">
                {Math.round(target * anim * 100)}%
              </Txt>
              <Txt size={11.5} color="rgba(255,255,255,0.75)" weight="600">
                daily goal
              </Txt>
            </ProgressRing>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                backgroundColor: 'rgba(255,255,255,0.16)',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: radii.pill,
              }}
            >
              <Ionicons name="flame" size={16} color="#FFB84D" />
              <Txt size={13} weight="800" color="#fff">
                {Math.max(0, Number(streak) || 0)}-day streak
              </Txt>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Quick actions */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          marginTop: 16,
          flexWrap: 'wrap',
        }}
      >
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: isMobile ? '45%' : 150,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: 14,
              gap: 10,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                backgroundColor: `${action.color}22`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={action.icon} size={18} color={action.color} />
            </View>

            <Txt size={13.5} weight="700">
              {action.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      {/* Main dashboard columns */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          gap: 16,
          marginTop: 20,
        }}
      >
        <View style={{ flex: 1.15, gap: 20 }}>
          {/* Today's plan */}
          <CustomStudyPlan
            plan={TODAY_PLAN}
            todayDone={todayDone}
            dispatch={dispatch}
            onOpenItem={openPlanItem}
          />

          {/* Continue learning */}
          <Card>
            <SectionHeader
              title="Continue learning"
              icon="play-circle-outline"
              action="Library"
              onAction={() => nav.navigate('Library')}
            />

            {continueItems.length > 0 ? (
              <View style={{ gap: 14 }}>
                {continueItems.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() =>
                      item.res!.type === 'book'
                        ? nav.navigate('BookReader', { resourceId: item.id })
                        : nav.navigate('NoteEditor', { resourceId: item.id })
                    }
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      gap: 12,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <Image
                      source={{ uri: item.res!.cover }}
                      style={{
                        width: 52,
                        height: 68,
                        borderRadius: 10,
                        backgroundColor: colors.surfaceAlt,
                      }}
                      resizeMode="cover"
                    />

                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        gap: 7,
                      }}
                    >
                      <Txt size={13.5} weight="700" numberOfLines={2}>
                        {item.res!.title}
                      </Txt>

                      <Txt size={11.5} color={colors.textMuted}>
                        {item.res!.subject} ·{' '}
                        {item.res!.type === 'book' ? 'Book' : 'Note'} ·{' '}
                        {item.percent}% complete
                      </Txt>

                      <ProgressBar value={item.percent} height={6} />
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={colors.textFaint}
                    />
                  </Pressable>
                ))}
              </View>
            ) : (
              renderEmptyState(
                'book-outline',
                'Ready for your next lesson?',
                'Resources you open and make progress on will appear here for quick access.',
                'Explore library',
                () => nav.navigate('Library')
              )
            )}
          </Card>

          {/* Weekly activity */}
          <Card>
            <SectionHeader
              title="Weekly activity"
              icon="bar-chart-outline"
              action="Profile"
              onAction={() => nav.navigate('Profile')}
            />

            <View
              style={{
                flexDirection: 'row',
                gap: 24,
                marginBottom: 14,
                flexWrap: 'wrap',
              }}
            >
              <View>
                <Txt size={22} weight="800" display>
                  {weeklyTotal}m
                </Txt>
                <Txt size={11.5} color={colors.textMuted}>
                  this week
                </Txt>
              </View>

              <View>
                <Txt size={22} weight="800" display color={colors.teal}>
                  {dailyAverage}m
                </Txt>
                <Txt size={11.5} color={colors.textMuted}>
                  daily average
                </Txt>
              </View>
            </View>

            {hasWeeklyActivity ? (
              <BarChart data={week} goal={goal} />
            ) : (
              <View style={{ marginTop: 2 }}>
                {renderEmptyState(
                  'analytics-outline',
                  'Your progress starts here',
                  'Your weekly activity will appear as you record study time. Start with one focused session today.',
                  'Start studying',
                  () => nav.navigate('Library')
                )}
              </View>
            )}
          </Card>
        </View>

        <View style={{ flex: 1, gap: 20 }}>
          {/* Upcoming tests */}
          <Card>
            <SectionHeader
              title="Upcoming live tests"
              icon="radio-outline"
              action="All tests"
              onAction={() => nav.navigate('Tests')}
            />

            {liveTests.length > 0 ? (
              <View style={{ gap: 12 }}>
                {liveTests.map((test) => (
                  <View
                    key={test.id}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radii.md,
                      padding: 13,
                      gap: 9,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.danger,
                        }}
                      />

                      <Txt size={11.5} weight="800" color={colors.danger}>
                        {test.liveAt}
                      </Txt>

                      <Tag label={test.kind} color={colors.blue} />
                    </View>

                    <Txt size={14} weight="700" numberOfLines={2}>
                      {test.title}
                    </Txt>

                    <Txt size={11.5} color={colors.textMuted}>
                      {test.questions.length} questions · {test.durationMin} min
                      {' · '}
                      {test.attempts.toLocaleString('en-IN')} enrolled
                    </Txt>

                    <Button
                      label="Enter test"
                      icon="arrow-forward"
                      size="sm"
                      onPress={() =>
                        nav.navigate('TestPlayer', { testId: test.id })
                      }
                    />
                  </View>
                ))}
              </View>
            ) : (
              renderEmptyState(
                'clipboard-outline',
                'No live tests scheduled',
                'There are no upcoming live tests at the moment. You can still practise with available tests.',
                'Browse tests',
                () => nav.navigate('Tests')
              )
            )}
          </Card>

          {/* Fresh library resources */}
          <Card>
            <SectionHeader
              title="Fresh in your library"
              icon="library-outline"
              action="See all"
              onAction={() => nav.navigate('Library')}
            />

            {recent.length > 0 ? (
              <View style={{ gap: 14 }}>
                {recent.map((resource) => (
                  <Pressable
                    key={resource.id}
                    accessibilityRole="button"
                    onPress={() =>
                      resource.type === 'book'
                        ? nav.navigate('BookReader', {
                            resourceId: resource.id,
                          })
                        : nav.navigate('NoteEditor', {
                            resourceId: resource.id,
                          })
                    }
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'center',
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        backgroundColor: colors.tint,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name={
                          resource.type === 'book'
                            ? 'book-outline'
                            : resource.type === 'pyq-set'
                            ? 'albums-outline'
                            : 'document-text-outline'
                        }
                        size={18}
                        color={colors.blue}
                      />
                    </View>

                    <View style={{ flex: 1, gap: 3 }}>
                      <Txt size={13} weight="700" numberOfLines={2}>
                        {resource.title}
                      </Txt>

                      <Txt size={11.5} color={colors.textMuted}>
                        {resource.subject} · {resource.minutes} min · ★{' '}
                        {resource.rating}
                      </Txt>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textFaint}
                    />
                  </Pressable>
                ))}
              </View>
            ) : (
              renderEmptyState(
                'library-outline',
                'Your library is ready to explore',
                'There are no featured resources for this exam yet. Open the library to browse available material.',
                'Open library',
                () => nav.navigate('Library', exam ? { exam: exam.id } : {})
              )
            )}
          </Card>

          {/* Current affairs */}
          <Card>
            <SectionHeader
              title="Current affairs"
              icon="newspaper-outline"
              action="Open"
              onAction={() => nav.navigate('CurrentAffairs')}
            />

            {CURRENT_AFFAIRS.length > 0 ? (
              <View style={{ gap: 12 }}>
                {CURRENT_AFFAIRS.slice(0, 3).map((affair) => (
                  <Pressable
                    key={affair.id}
                    accessibilityRole="button"
                    onPress={() => nav.navigate('CurrentAffairs')}
                    style={({ pressed }) => ({
                      gap: 5,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Tag label={affair.category} color={colors.teal} />

                      <Txt size={11} color={colors.textFaint}>
                        {affair.date}
                      </Txt>
                    </View>

                    <Txt size={13} weight="700" numberOfLines={2}>
                      {affair.title}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            ) : (
              renderEmptyState(
                'newspaper-outline',
                'No current affairs available',
                'There are no current affairs items to show right now. Check back later or explore other study material.',
                'Open section',
                () => nav.navigate('CurrentAffairs')
              )
            )}
          </Card>

          {/* Switch exam focus */}
          <Card>
            <SectionHeader
              title="Switch focus"
              icon="swap-horizontal-outline"
            />

            {EXAMS.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {EXAMS.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.short}
                    tone={item.color}
                    active={item.id === exam?.id}
                    onPress={() => nav.navigate('Library', { exam: item.id })}
                  />
                ))}
              </View>
            ) : (
              <Txt size={12} color={colors.textMuted}>
                Exam options are not available right now.
              </Txt>
            )}
          </Card>
        </View>
      </View>
    </Shell>
  );
}
