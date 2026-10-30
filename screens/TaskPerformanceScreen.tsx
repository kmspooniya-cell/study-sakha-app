import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Shell, useLayout } from '../components/Shell';
import { Button, Card, Chip, EmptyState, SectionHeader, Txt } from '../components/ui';
import {
  deriveStatistics,
  localDateKey,
  normalizeFocusSessions,
  NormalizedFocusSession,
  StatisticsDateRange,
} from '../lib/statistics';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

const HISTORY_KEY = 'study-sakha-focus-history-v1';
type TaskFilter = 'all' | 'completed' | 'pending';

function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Unavailable';
  if (minutes > 0 && minutes < 1) return '<1m';
  const totalMinutes = Math.round(Math.max(0, minutes));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function rangeEndingToday(now: Date, days: number): StatisticsDateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (days - 1));
  return { startDate: localDateKey(start), endDate: localDateKey(now) };
}

export default function TaskPerformanceScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const { state } = useStore();
  const { isMobile } = useLayout();
  const [sessions, setSessions] = useState<NormalizedFocusSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState('All subjects');
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);

  const dateRange: StatisticsDateRange = useMemo(() => {
    const startDate = route.params?.startDate;
    const endDate = route.params?.endDate;
    return typeof startDate === 'string' && typeof endDate === 'string'
      ? { startDate, endDate }
      : rangeEndingToday(new Date(), 7);
  }, [route.params?.endDate, route.params?.startDate]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoaded(false);
    setLoadError(null);
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        if (!active) return;
        try {
          setSessions(normalizeFocusSessions(raw ? JSON.parse(raw) : []));
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

  const statistics = useMemo(
    () => deriveStatistics(state, sessions, dateRange),
    [dateRange, sessions, state],
  );
  const subjects = useMemo(
    () => Array.from(new Set(statistics.tasks.map((task) => task.category))).sort(),
    [statistics.tasks],
  );
  const visibleTasks = useMemo(() => statistics.tasks.filter((task) => {
    if (filter === 'completed' && task.completed !== true) return false;
    if (filter === 'pending' && task.completed !== false) return false;
    if (subjectFilter !== 'All subjects' && task.category !== subjectFilter) return false;
    return true;
  }), [filter, statistics.tasks, subjectFilter]);
  const selectedTask = statistics.tasks.find(
    (task) => `${task.historical ? 'historical-' : ''}${task.taskId}-${task.scheduledDate}` === selectedTaskKey,
  );
  const selectedSessions = selectedTask
    ? statistics.sessions.filter((session) => session.taskId === selectedTask.taskId && session.dateKey === selectedTask.scheduledDate)
    : [];
  const selectedRangeLabel = `${statistics.dateRange.startDate} – ${statistics.dateRange.endDate}`;

  return (
    <Shell active="Statistics" title="Task Performance" subtitle={`Planner and Focus details · ${selectedRangeLabel}`}>
      <View style={{ gap: 16, paddingBottom: 24 }}>
        {!loaded ? (
          <Card><Txt size={14} color={colors.textMuted} style={{ textAlign: 'center', paddingVertical: 24 }}>Loading task performance…</Txt></Card>
        ) : loadError ? (
          <EmptyState icon="warning-outline" title="Task performance unavailable" body={loadError} />
        ) : (
          <>
            <Card>
              <SectionHeader title="Task Performance" icon="list-outline" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['all', 'completed', 'pending'] as TaskFilter[]).map((item) => (
                  <Chip key={item} label={item === 'all' ? 'All' : item === 'completed' ? 'Completed' : 'Pending'} active={filter === item} onPress={() => setFilter(item)} />
                ))}
              </View>
              {subjects.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <Chip label="All subjects" active={subjectFilter === 'All subjects'} onPress={() => setSubjectFilter('All subjects')} />
                  {subjects.map((subject) => <Chip key={subject} label={subject} active={subjectFilter === subject} onPress={() => setSubjectFilter(subject)} />)}
                </View>
              ) : null}
              <Txt size={11.5} color={colors.textFaint} style={{ marginTop: 10 }}>Selected period: {selectedRangeLabel}</Txt>
            </Card>

            <Card>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  ['Total tasks', statistics.tasks.filter((task) => !task.historical).length],
                  ['Completed', statistics.overall.completedTaskCount],
                  ['Pending', statistics.overall.pendingTaskCount],
                  ['Completion', statistics.overall.taskCompletionPercentage === null ? '—' : `${Math.round(statistics.overall.taskCompletionPercentage)}%`],
                ].map(([label, value]) => (
                  <View key={String(label)} style={{ flex: 1, minWidth: isMobile ? 130 : 150, padding: 12, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }}>
                    <Txt size={11.5} color={colors.textMuted}>{String(label)}</Txt>
                    <Txt size={20} weight="800" display style={{ marginTop: 3 }}>{String(value)}</Txt>
                  </View>
                ))}
              </View>
            </Card>

            {visibleTasks.length ? visibleTasks.map((task) => {
              const key = `${task.historical ? 'historical-' : ''}${task.taskId}-${task.scheduledDate}`;
              const status = task.completed === null ? 'Historical' : task.completed ? 'Completed' : 'Pending';
              return (
                <Pressable key={key} onPress={() => setSelectedTaskKey(key)} accessibilityRole="button" accessibilityLabel={`View details for ${task.title}`}>
                  <Card style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Txt size={14} weight="800" numberOfLines={2}>{task.title}</Txt>
                        <Txt size={12} color={colors.textMuted}>{task.category}{task.historical ? ' · historical' : ''}</Txt>
                      </View>
                      <Txt size={11.5} weight="800" color={task.completed === true ? colors.success : colors.textMuted}>{status}</Txt>
                      <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
                    </View>
                    <Txt size={12} color={colors.textMuted} style={{ marginTop: 9 }}>
                      {formatDuration(task.plannedMinutes)} planned · {formatDuration(task.actualMinutes)} actual · {formatDuration(task.remainingMinutes)} remaining · {task.focusSessionCount} session{task.focusSessionCount === 1 ? '' : 's'}
                    </Txt>
                    {task.completed === true && task.completionDate ? <Txt size={11} color={colors.textFaint} style={{ marginTop: 5 }}>Completed on {task.completionDate}</Txt> : null}
                  </Card>
                </Pressable>
              );
            }) : <Card><Txt size={13} color={colors.textMuted} style={{ textAlign: 'center', paddingVertical: 18 }}>No tasks match the selected filters.</Txt></Card>}
          </>
        )}
      </View>

      <Modal visible={Boolean(selectedTask)} transparent animationType="slide" onRequestClose={() => setSelectedTaskKey(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
          <ScrollView style={{ maxHeight: '82%' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <Card style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 14 }}>
              {selectedTask ? <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Txt size={18} weight="800" display>{selectedTask.title}</Txt>
                  <Txt size={12.5} color={colors.textMuted} style={{ marginTop: 3 }}>{selectedTask.category} · {selectedTask.scheduledDate}</Txt>
                </View>
                <Pressable onPress={() => setSelectedTaskKey(null)} accessibilityRole="button" accessibilityLabel="Close task details">
                  <Ionicons name="close-circle-outline" size={26} color={colors.textMuted} />
                </Pressable>
              </View>
              <View style={{ gap: 7 }}>
                <Txt size={13} color={colors.textMuted}>Planned: {formatDuration(selectedTask.plannedMinutes)}</Txt>
                <Txt size={13} color={colors.textMuted}>Actual: {formatDuration(selectedTask.actualMinutes)}</Txt>
                <Txt size={13} color={colors.textMuted}>Remaining: {formatDuration(selectedTask.remainingMinutes)}</Txt>
                <Txt size={13} color={colors.textMuted}>Focus sessions: {selectedTask.focusSessionCount}</Txt>
              </View>
              <SectionHeader title="Related Focus Sessions" icon="timer-outline" />
              {selectedSessions.length ? selectedSessions.map((session) => (
                <View key={session.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={12.5} weight="700" numberOfLines={1}>{session.topic || 'Focus session'}</Txt>
                    <Txt size={11} color={colors.textMuted}>{session.dateKey} · {session.id}</Txt>
                  </View>
                  <Txt size={12} weight="800" color={colors.teal}>{formatDuration(session.actualSeconds / 60)}</Txt>
                </View>
              )) : <Txt size={13} color={colors.textMuted}>No related Focus sessions in this period.</Txt>}
              <Button label="Close" variant="outline" full onPress={() => setSelectedTaskKey(null)} />
              </> : null}
            </Card>
          </ScrollView>
        </View>
      </Modal>
    </Shell>
  );
}
