import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';

import { BarChart, LineChart } from '../components/Charts';
import { Shell, useLayout } from '../components/Shell';
import { Button, Card, Chip, EmptyState, SectionHeader, Txt } from '../components/ui';
import {
  deriveStatistics,
  localDateKey,
  normalizeFocusSessions,
  NormalizedFocusSession,
} from '../lib/statistics';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

const HISTORY_KEY = 'study-sakha-focus-history-v1';
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
type FilterMode = '7d' | '30d' | 'month' | 'custom';
function formatDuration(minutes: number): string {
  if (minutes > 0 && minutes < 1) return '<1m';
  const totalMinutes = Math.round(Math.max(0, minutes));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function rangeEndingToday(now: Date, days: number) {
  return {
    startDate: localDateKey(
      shiftDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -(days - 1)),
    ),
    endDate: localDateKey(now),
  };
}

function monthRange(now: Date) {
  return {
    startDate: localDateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: localDateKey(now),
  };
}

function isValidLocalDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function displayDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateKey
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function signedMinutes(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatDuration(Math.abs(value))}`;
}

function goalMinutes(value: unknown): number | null {
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 ? hours * 60 : null;
}

function dayLabel(value: number): string {
  return `${value} day${value === 1 ? '' : 's'}`;
}

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const [sessions, setSessions] = useState<NormalizedFocusSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>('7d');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);

  const percentileTrend = useMemo(
    () => state.results.slice(0, 8).reverse().map((result, index) => ({
      label: `M${index + 1}`,
      value: Math.round(result.percentile),
    })),
    [state.results],
  );

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoaded(false);
    setLoadError(null);

    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        if (!active) return;
        try {
          const parsed: unknown = raw ? JSON.parse(raw) : [];
          setSessions(normalizeFocusSessions(parsed));
        } catch {
          setSessions([]);
          setLoadError('Focus history could not be read.');
        }
      })
      .catch(() => {
        if (!active) return;
        setSessions([]);
        setLoadError('Focus history could not be loaded.');
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []));

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const selectedRange = useMemo(() => {
    if (filterMode === '30d') return rangeEndingToday(now, 30);
    if (filterMode === 'month') return monthRange(now);
    if (filterMode === 'custom' && customRange) return customRange;
    return rangeEndingToday(now, 7);
  }, [customRange, filterMode, now]);

  const statistics = useMemo(() => {
    return deriveStatistics(state, sessions, selectedRange);
  }, [selectedRange, sessions, state]);

  const dailyGoalMinutes = goalMinutes(state.plannerSettings?.dailyTargetHours);
  const weeklyGoalMinutes = goalMinutes(state.plannerSettings?.weeklyTargetHours);
  const hasHistory = statistics.sessions.length > 0;
  const taskStatistics = statistics.tasks;
  const subjects = statistics.subjects;
  const subjectColors = [colors.blue, colors.teal, colors.amber, colors.violet, colors.rose, colors.success];

  const activityData = statistics.dailyActivity.map((day) => ({
    label: DAY_LABELS[new Date(`${day.date}T00:00:00`).getDay()],
    value: day.actualMinutes,
  }));
  const weeklyTrend = statistics.weeklyActivity.map((week) => ({
    label: week.label,
    value: week.actualMinutes,
  }));
  const heatmapData = statistics.dailyActivity.map((day) => ({
    date: day.date,
    minutes: day.actualMinutes,
  }));
  const completionPercentage = statistics.overall.taskCompletionPercentage;
  const dailyGoalProgress = dailyGoalMinutes
    ? Math.min(100, Math.round((statistics.overall.actualMinutes / dailyGoalMinutes) * 100))
    : 0;
  const weeklyGoalProgress = weeklyGoalMinutes
    ? Math.min(100, Math.round((statistics.overall.actualMinutes / weeklyGoalMinutes) * 100))
    : 0;

  const kpis = [
    { label: 'Actual Study Time', value: formatDuration(statistics.overall.actualMinutes), sub: 'selected period', icon: 'time-outline' as const, color: colors.blue },
    { label: 'Focus Sessions', value: String(statistics.overall.focusSessionCount), sub: 'selected period', icon: 'timer-outline' as const, color: colors.teal },
    { label: 'Completed Tasks', value: String(statistics.overall.completedTaskCount), sub: `${statistics.overall.pendingTaskCount} pending`, icon: 'checkmark-circle-outline' as const, color: colors.success },
    { label: 'Completion', value: completionPercentage === null ? '—' : `${Math.round(completionPercentage)}%`, sub: 'explicit planner state', icon: 'pie-chart-outline' as const, color: colors.violet },
  ];

  const selectedRangeLabel = `${displayDate(selectedRange.startDate)} – ${displayDate(selectedRange.endDate)}`;
  const openCustomRange = () => {
    const initial = customRange ?? rangeEndingToday(now, 7);
    setDraftStartDate(initial.startDate);
    setDraftEndDate(initial.endDate);
    setCustomRangeError(null);
    setCustomModalVisible(true);
  };
  const saveCustomRange = () => {
    const today = localDateKey(now);
    if (!isValidLocalDateKey(draftStartDate) || !isValidLocalDateKey(draftEndDate)) {
      setCustomRangeError('Enter valid dates using YYYY-MM-DD.');
      return;
    }
    if (draftStartDate > draftEndDate) {
      setCustomRangeError('Start date cannot be after the end date.');
      return;
    }
    if (draftEndDate > today) {
      setCustomRangeError('Future dates are not available yet.');
      return;
    }
    setCustomRange({ startDate: draftStartDate, endDate: draftEndDate });
    setFilterMode('custom');
    setCustomModalVisible(false);
  };

  return (
    <Shell active="Statistics" title="Statistics" subtitle="Your study performance at a glance">
      <View style={{ gap: 16, paddingBottom: 20 }}>
        <Card style={{ padding: 14 }}>
          <View style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 12 }}>
            <View style={{ flex: isMobile ? undefined : 1, minWidth: isMobile ? undefined : 180 }}>
              <Txt size={18} weight="800" display>Study Analytics</Txt>
              <Txt size={12} color={colors.textMuted} style={{ marginTop: 2 }}>
                Focus, progress, and consistency from your recorded sessions.
              </Txt>
            </View>
            <View style={{ flex: isMobile ? undefined : 2, alignItems: isMobile ? 'flex-start' : 'flex-end' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: 7 }}>
                <Chip label="Last 7 Days" active={filterMode === '7d'} onPress={() => setFilterMode('7d')} />
                <Chip label="Last 30 Days" active={filterMode === '30d'} onPress={() => setFilterMode('30d')} />
                <Chip label="This Month" active={filterMode === 'month'} onPress={() => setFilterMode('month')} />
                <Chip label="Custom Range" active={filterMode === 'custom'} onPress={openCustomRange} />
              </View>
              <Txt size={11} color={colors.textFaint} style={{ marginTop: 6 }}>
                Selected period: {selectedRangeLabel}
              </Txt>
            </View>
          </View>
        </Card>

        {!loaded ? (
          <Card><Txt size={14} color={colors.textMuted} style={{ textAlign: 'center', paddingVertical: 24 }}>Loading study analytics…</Txt></Card>
        ) : loadError ? (
          <EmptyState icon="warning-outline" title="Statistics unavailable" body={loadError} />
        ) : (
          <>
            <Card>
              <SectionHeader title="Performance Overview" icon="analytics-outline" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {kpis.map((kpi) => (
                  <View
                    key={kpi.label}
                    style={{
                      flexBasis: isMobile ? '47%' : isDesktop ? '23.5%' : '31%',
                      flexGrow: 1,
                      minWidth: isMobile ? 130 : 145,
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.borderSubtle,
                      backgroundColor: colors.surfaceAlt,
                      gap: 8,
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: `${kpi.color}18`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={kpi.icon} size={18} color={kpi.color} />
                    </View>
                    <Txt size={21} weight="800" display>{kpi.value}</Txt>
                    <Txt size={12} weight="700" numberOfLines={2}>{kpi.label}</Txt>
                    <Txt size={11} color={colors.textFaint}>{kpi.sub}</Txt>
                  </View>
                ))}
              </View>
            </Card>

            <Card>
              <SectionHeader title="Study Activity" icon="bar-chart-outline" />
              <Txt size={12} color={colors.textMuted}>Actual Focus time over the last 7 days</Txt>
              {hasHistory ? <BarChart data={activityData} height={165} color={colors.blue} /> : <Txt size={13} color={colors.textMuted} style={{ textAlign: 'center', paddingVertical: 24 }}>Complete a Focus session to see your activity trend.</Txt>}
              {weeklyTrend.some((week) => week.value > 0) ? <View style={{ marginTop: 16 }}><Txt size={12} color={colors.textMuted}>Weekly trend in selected period</Txt><LineChart data={weeklyTrend} height={125} color={colors.teal} /></View> : null}
            </Card>

            <Card>
              <SectionHeader title="Planned vs Actual" icon="swap-vertical-outline" />
              <Txt size={12} color={colors.textMuted}>Last 7 days · scheduled planner time compared with measured Focus time.</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                {[
                  ['Planned', formatDuration(statistics.plannedVsActual.plannedMinutes), colors.blue],
                  ['Actual', formatDuration(statistics.plannedVsActual.actualMinutes), colors.teal],
                  ['Actual − Planned', signedMinutes(statistics.plannedVsActual.differenceMinutes), colors.amber],
                ].map(([label, value, color]) => (
                  <View
                    key={String(label)}
                    style={{
                      flex: 1,
                      minWidth: 100,
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.borderSubtle,
                      backgroundColor: colors.surfaceAlt,
                    }}
                  >
                    <Txt size={11.5} color={colors.textMuted}>{label}</Txt>
                    <Txt size={20} weight="800" color={String(color)} display style={{ marginTop: 3 }}>{String(value)}</Txt>
                  </View>
                ))}
              </View>
              {!statistics.plannedVsActual.hasPlannerTasks ? <Txt size={11.5} color={colors.textFaint} style={{ marginTop: 10 }}>No planner tasks are scheduled in this period.</Txt> : null}
            </Card>

            <Card>
              <SectionHeader title="Task Performance" icon="list-outline" action="View All Tasks" onAction={() => nav.navigate('TaskPerformance', selectedRange)} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {[
                  ['Total tasks', taskStatistics.filter((task) => !task.historical).length],
                  ['Completed', statistics.overall.completedTaskCount],
                  ['Pending', statistics.overall.pendingTaskCount],
                  ['Completion', completionPercentage === null ? '—' : `${Math.round(completionPercentage)}%`],
                ].map(([label, value]) => (
                  <View key={String(label)} style={{ flex: 1, minWidth: 110, padding: 10, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }}>
                    <Txt size={11} color={colors.textMuted}>{String(label)}</Txt>
                    <Txt size={17} weight="800" display style={{ marginTop: 2 }}>{String(value)}</Txt>
                  </View>
                ))}
              </View>
              {taskStatistics.length ? <View style={{ gap: 10 }}>{taskStatistics.slice(0, 3).map((task) => {
                const progress = task.plannedMinutes && task.plannedMinutes > 0 ? Math.min(100, Math.round((task.actualMinutes / task.plannedMinutes) * 100)) : 0;
                const status = task.completed === null ? 'Historical' : task.completed ? 'Completed' : 'Pending';
                return (
                  <View key={`${task.historical ? 'historical-' : ''}${task.taskId}-${task.scheduledDate}`} style={{ padding: 12, borderRadius: radii.md, backgroundColor: colors.surfaceAlt, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1 }}><Txt size={13} weight="800" numberOfLines={1}>{task.title}</Txt><Txt size={11.5} color={colors.textMuted}>{task.category}{task.historical ? ' · historical' : ''}</Txt></View>
                      <Txt size={11.5} weight="800" color={task.completed === true ? colors.success : colors.textMuted}>{status}</Txt>
                    </View>
                    <View style={{ height: 6, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}><View style={{ width: `${progress}%`, height: '100%', backgroundColor: task.completed === true ? colors.success : colors.blue }} /></View>
                    <Txt size={11.5} color={colors.textMuted}>{formatDuration(task.actualMinutes)} actual · {task.plannedMinutes === null ? 'planned unavailable' : `${formatDuration(task.plannedMinutes)} planned`} · {task.remainingMinutes === null ? 'remaining unavailable' : `${formatDuration(task.remainingMinutes)} remaining`} · {task.focusSessionCount} session{task.focusSessionCount === 1 ? '' : 's'}</Txt>
                    {task.completed === true && task.completionDate ? <Txt size={10.5} color={colors.textFaint}>Completed on {task.completionDate}</Txt> : null}
                  </View>
                );
              })}</View> : <Txt size={13} color={colors.textMuted}>No planner tasks or task-linked Focus sessions for this date.</Txt>}
              {taskStatistics.length > 3 ? <Txt size={11.5} color={colors.textFaint} style={{ marginTop: 10 }}>Showing 3 of {taskStatistics.length} tasks for {selectedRangeLabel}.</Txt> : null}
            </Card>

            <Card>
              <SectionHeader title="Subject-wise Analysis" icon="book-outline" />
              <Txt size={12} color={colors.textMuted} style={{ marginBottom: 12 }}>Actual Focus time by subject in the selected period.</Txt>
              {subjects.length ? <View style={{ gap: 12 }}>{subjects.map((subject, index) => {
                const maxMinutes = subjects[0].actualMinutes;
                const width = maxMinutes > 0 ? Math.max(2, (subject.actualMinutes / maxMinutes) * 100) : 0;
                return <View key={subject.subject} style={{ gap: 5 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Txt size={13} weight="700" numberOfLines={1}>{subject.subject}</Txt><Txt size={11.5} color={colors.textMuted}>{formatDuration(subject.actualMinutes)} · {Math.round(subject.shareOfActualTime)}%</Txt></View><View style={{ height: 7, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}><View style={{ width: `${width}%`, height: '100%', borderRadius: 4, backgroundColor: subjectColors[index % subjectColors.length] }} /></View></View>;
              })}</View> : <Txt size={13} color={colors.textMuted}>Subject breakdown will appear after a Focus session has a subject.</Txt>}
            </Card>

            <Card>
              <SectionHeader title="Focus Analysis" icon="timer-outline" />
              <Txt size={12} color={colors.textMuted} style={{ marginBottom: 12 }}>Focus sessions recorded over the last 7 days.</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  ['Total Sessions', String(statistics.focus.totalSessions)],
                  ['Average Duration', statistics.focus.averageSessionMinutes === null ? '—' : formatDuration(statistics.focus.averageSessionMinutes)],
                  ['Longest Session', statistics.focus.longestSessionMinutes === null ? '—' : formatDuration(statistics.focus.longestSessionMinutes)],
                  ['Active Days', String(statistics.focus.activeStudyDays)],
                ].map(([label, value]) => <View key={label} style={{ flex: 1, minWidth: 130, padding: 12, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }}><Txt size={11.5} color={colors.textMuted}>{label}</Txt><Txt size={19} weight="800" display style={{ marginTop: 3 }}>{value}</Txt></View>)}
              </View>
            </Card>

            <Card>
              <SectionHeader title="Study Consistency" icon="calendar-outline" />
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1, padding: 11, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }}>
                  <Txt size={20} weight="800" display>{dayLabel(statistics.streak.current)}</Txt>
                  <Txt size={11.5} color={colors.textMuted}>Current Focus streak</Txt>
                </View>
                <View style={{ flex: 1, padding: 11, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }}>
                  <Txt size={20} weight="800" display>{dayLabel(statistics.streak.best)}</Txt>
                  <Txt size={11.5} color={colors.textMuted}>Best in selected period</Txt>
                </View>
              </View>
              {hasHistory ? <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {heatmapData.map((day) => {
                    const intensity = day.minutes <= 0 ? 0 : day.minutes < 25 ? 1 : day.minutes < 60 ? 2 : day.minutes < 120 ? 3 : 4;
                    const backgrounds = [colors.surfaceAlt, `${colors.teal}35`, `${colors.teal}65`, `${colors.teal}A0`, colors.teal];
                    return <View key={day.date} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: backgrounds[intensity] }} />;
                  })}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                  <Txt size={10} color={colors.textFaint}>Less</Txt>
                  {[0, 30, 70, 110, 150].map((value) => <View key={value} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: value === 0 ? colors.surfaceAlt : value < 40 ? `${colors.teal}35` : value < 80 ? `${colors.teal}65` : value < 120 ? `${colors.teal}A0` : colors.teal }} />)}
                  <Txt size={10} color={colors.textFaint}>More</Txt>
                </View>
                <Txt size={10.5} color={colors.textFaint}>Focus activity in the selected period. Streaks reflect retained sessions only.</Txt>
              </View> : <Txt size={13} color={colors.textMuted}>Complete a Focus session to build your consistency history.</Txt>}
              {dailyGoalMinutes || weeklyGoalMinutes ? <View style={{ marginTop: 14, gap: 8 }}>{dailyGoalMinutes ? <Txt size={11.5} color={colors.textMuted}>Daily goal: {formatDuration(dailyGoalMinutes)} · {dailyGoalProgress}% in range</Txt> : null}{weeklyGoalMinutes ? <Txt size={11.5} color={colors.textMuted}>Weekly goal: {formatDuration(weeklyGoalMinutes)} · {weeklyGoalProgress}% in range</Txt> : null}</View> : null}
            </Card>

            <Card>
              <SectionHeader title="Academic Performance" icon="ribbon-outline" action="Tests" onAction={() => nav.navigate('Tests')} />
              {percentileTrend.length >= 2 ? <LineChart data={percentileTrend} color={colors.violet} /> : <Txt size={13} color={colors.textMuted}>Attempt two or more mocks to plot your percentile trajectory.</Txt>}
              <View style={{ gap: 10, marginTop: 16 }}><Txt size={13} weight="800">Recent test results</Txt>{state.results.length ? state.results.slice(0, 6).map((result) => <Pressable key={result.id} onPress={() => nav.navigate('TestResult', { resultId: result.id })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, opacity: pressed ? 0.75 : 1 })}><View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}><Txt size={12} weight="800" color={colors.blue}>{result.percentile.toFixed(0)}</Txt></View><View style={{ flex: 1 }}><Txt size={13} weight="700" numberOfLines={1}>{result.title}</Txt><Txt size={11.5} color={colors.textMuted}>{result.score.toFixed(1)}/{result.maxScore} · {Math.round(result.accuracy)}% accuracy</Txt></View><Ionicons name="chevron-forward" size={16} color={colors.textFaint} /></Pressable>) : <EmptyState icon="ribbon-outline" title="No results yet" body="Your mock results will appear here." action="Take a test" onAction={() => nav.navigate('Tests')} />}</View>
            </Card>
          </>
        )}
      </View>
      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <Card style={{ width: '100%', maxWidth: 460, alignSelf: 'center' }}>
            <SectionHeader title="Custom Date Range" icon="calendar-outline" />
            <Txt size={12} color={colors.textMuted} style={{ marginBottom: 12 }}>
              Use local dates in YYYY-MM-DD format. Future dates are not available.
            </Txt>
            <View style={{ gap: 10 }}>
              <TextInput
                value={draftStartDate}
                onChangeText={setDraftStartDate}
                placeholder="Start date (YYYY-MM-DD)"
                placeholderTextColor={colors.textFaint}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                style={{ borderWidth: 1, borderColor: customRangeError ? colors.danger : colors.border, borderRadius: radii.md, paddingHorizontal: 12, height: 44, color: colors.text, backgroundColor: colors.surfaceAlt }}
              />
              <TextInput
                value={draftEndDate}
                onChangeText={setDraftEndDate}
                placeholder="End date (YYYY-MM-DD)"
                placeholderTextColor={colors.textFaint}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                style={{ borderWidth: 1, borderColor: customRangeError ? colors.danger : colors.border, borderRadius: radii.md, paddingHorizontal: 12, height: 44, color: colors.text, backgroundColor: colors.surfaceAlt }}
              />
              {customRangeError ? <Txt size={11.5} color={colors.danger}>{customRangeError}</Txt> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                <Button label="Cancel" variant="ghost" onPress={() => setCustomModalVisible(false)} />
                <Button label="Last 7 Days" variant="outline" onPress={() => { setFilterMode('7d'); setCustomModalVisible(false); }} />
                <Button label="Apply Range" onPress={saveCustomRange} />
              </View>
            </View>
          </Card>
        </View>
      </Modal>
    </Shell>
  );
}
