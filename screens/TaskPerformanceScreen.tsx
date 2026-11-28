import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { AlertTriangle, ChevronRight, List, Timer, XCircle } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Shell, useLayout } from '../components/Shell';
import {
  SSDSButton,
  SSDSEmptyState,
  SSDSIcon,
  SSDSRow,
  SSDSSectionHeader,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  useSSDSTheme,
} from '../lib/ssds';
import {
  deriveStatistics,
  localDateKey,
  normalizeFocusSessions,
  NormalizedFocusSession,
  StatisticsDateRange,
} from '../lib/statistics';
import { getUserScopedStorageKey, useStore } from '../lib/store';
import type { AppRoute } from '../lib/navigation';

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
  const { tokens } = useSSDSTheme();
  const route = useRoute<AppRoute<'TaskPerformance'>>();
  const { state } = useStore();
  const historyKey = getUserScopedStorageKey(HISTORY_KEY, state.user?.id);
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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoaded(false);
      setLoadError(null);
      AsyncStorage.getItem(historyKey)
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
    }, [historyKey]),
  );

  const statistics = useMemo(
    () => deriveStatistics(state, sessions, dateRange),
    [dateRange, sessions, state],
  );
  const subjects = useMemo(
    () => Array.from(new Set(statistics.tasks.map((task) => task.category))).sort(),
    [statistics.tasks],
  );
  const visibleTasks = useMemo(
    () =>
      statistics.tasks.filter((task) => {
        if (filter === 'completed' && task.completed !== true) return false;
        if (filter === 'pending' && task.completed !== false) return false;
        if (subjectFilter !== 'All subjects' && task.category !== subjectFilter) return false;
        return true;
      }),
    [filter, statistics.tasks, subjectFilter],
  );
  const selectedTask = statistics.tasks.find(
    (task) =>
      `${task.historical ? 'historical-' : ''}${task.taskId}-${task.scheduledDate}` ===
      selectedTaskKey,
  );
  const selectedSessions = selectedTask
    ? statistics.sessions.filter(
        (session) =>
          session.taskId === selectedTask.taskId &&
          session.dateKey === selectedTask.scheduledDate,
      )
    : [];
  const selectedRangeLabel = `${statistics.dateRange.startDate} – ${statistics.dateRange.endDate}`;

  return (
    <Shell
      active="Statistics"
      title="Task Performance"
      subtitle={`Planner and Focus details · ${selectedRangeLabel}`}
    >
      <SSDSStack gap={16} style={{ paddingBottom: 24 }}>
        {!loaded ? (
          <SSDSSurface variant="outlined" padding={16}>
            <SSDSText
              variant="BodySecondary"
              align="center"
              style={{ paddingVertical: 24 }}
            >
              Loading task performance…
            </SSDSText>
          </SSDSSurface>
        ) : loadError ? (
          <SSDSEmptyState
            icon={AlertTriangle}
            title="Task performance unavailable"
            description={loadError}
          />
        ) : (
          <>
            <SSDSSurface variant="outlined" padding={16}>
              <SSDSSectionHeader title="Task Performance" icon={List} compact />
              <SSDSRow wrap="wrap" gap={8}>
                {(['all', 'completed', 'pending'] as TaskFilter[]).map((item) => (
                  <SSDSButton
                    key={item}
                    size="small"
                    variant={filter === item ? 'primary' : 'outline'}
                    onPress={() => setFilter(item)}
                  >
                    {item === 'all' ? 'All' : item === 'completed' ? 'Completed' : 'Pending'}
                  </SSDSButton>
                ))}
              </SSDSRow>
              {subjects.length > 0 ? (
                <SSDSRow wrap="wrap" gap={8} style={{ marginTop: 10 }}>
                  <SSDSButton
                    size="small"
                    variant={subjectFilter === 'All subjects' ? 'primary' : 'outline'}
                    onPress={() => setSubjectFilter('All subjects')}
                  >
                    All subjects
                  </SSDSButton>
                  {subjects.map((subject) => (
                    <SSDSButton
                      key={subject}
                      size="small"
                      variant={subjectFilter === subject ? 'primary' : 'outline'}
                      onPress={() => setSubjectFilter(subject)}
                    >
                      {subject}
                    </SSDSButton>
                  ))}
                </SSDSRow>
              ) : null}
              <SSDSText
                variant="Caption"
                color="textTertiary"
                style={{ marginTop: 10 }}
              >
                Selected period: {selectedRangeLabel}
              </SSDSText>
            </SSDSSurface>

            <SSDSSurface variant="outlined" padding={16}>
              <SSDSRow wrap="wrap" gap={10}>
                {[
                  ['Total tasks', statistics.tasks.filter((task) => !task.historical).length],
                  ['Completed', statistics.overall.completedTaskCount],
                  ['Pending', statistics.overall.pendingTaskCount],
                  [
                    'Completion',
                    statistics.overall.taskCompletionPercentage === null
                      ? '—'
                      : `${Math.round(statistics.overall.taskCompletionPercentage)}%`,
                  ],
                ].map(([label, value]) => (
                  <View
                    key={String(label)}
                    style={{
                      flex: 1,
                      minWidth: isMobile ? 130 : 150,
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: tokens.colors.borderSubtle,
                      backgroundColor: tokens.colors.surfaceSecondary,
                    }}
                  >
                    <SSDSText variant="StatisticLabel">{String(label)}</SSDSText>
                    <SSDSText variant="StatisticValue" style={{ marginTop: 3 }}>
                      {String(value)}
                    </SSDSText>
                  </View>
                ))}
              </SSDSRow>
            </SSDSSurface>

            {visibleTasks.length ? (
              visibleTasks.map((task) => {
                const key = `${task.historical ? 'historical-' : ''}${task.taskId}-${task.scheduledDate}`;
                const status =
                  task.completed === null
                    ? 'Historical'
                    : task.completed
                      ? 'Completed'
                      : 'Pending';
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedTaskKey(key)}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${task.title}`}
                  >
                    <SSDSSurface variant="outlined" padding={14}>
                      <SSDSRow align="flex-start" gap={10}>
                        <View style={{ flex: 1, gap: 3 }}>
                          <SSDSText variant="CardTitle" maxLines={2}>
                            {task.title}
                          </SSDSText>
                          <SSDSText variant="Caption">
                            {task.category}
                            {task.historical ? ' · historical' : ''}
                          </SSDSText>
                        </View>
                        <SSDSText
                          variant="Caption"
                          color={task.completed === true ? 'success' : 'textSecondary'}
                        >
                          {status}
                        </SSDSText>
                        <SSDSIcon icon={ChevronRight} size={17} color="textTertiary" />
                      </SSDSRow>
                      <SSDSText variant="Caption" style={{ marginTop: 9 }}>
                        {formatDuration(task.plannedMinutes)} planned ·{' '}
                        {formatDuration(task.actualMinutes)} actual ·{' '}
                        {formatDuration(task.remainingMinutes)} remaining ·{' '}
                        {task.focusSessionCount} session
                        {task.focusSessionCount === 1 ? '' : 's'}
                      </SSDSText>
                      {task.completed === true && task.completionDate ? (
                        <SSDSText
                          variant="Caption"
                          color="textTertiary"
                          style={{ marginTop: 5 }}
                        >
                          Completed on {task.completionDate}
                        </SSDSText>
                      ) : null}
                    </SSDSSurface>
                  </Pressable>
                );
              })
            ) : (
              <SSDSSurface variant="outlined" padding={16}>
                <SSDSText
                  variant="BodySecondary"
                  align="center"
                  style={{ paddingVertical: 18 }}
                >
                  No tasks match the selected filters.
                </SSDSText>
              </SSDSSurface>
            )}
          </>
        )}
      </SSDSStack>

      <Modal
        visible={Boolean(selectedTask)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTaskKey(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
          }}
        >
          <ScrollView
            style={{ maxHeight: '82%' }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          >
            <SSDSSurface
              variant="elevated"
              padding={20}
              style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
            >
              {selectedTask ? (
                <SSDSStack gap={14}>
                  <SSDSRow align="flex-start" gap={10}>
                    <View style={{ flex: 1 }}>
                      <SSDSText variant="SectionTitle">{selectedTask.title}</SSDSText>
                      <SSDSText variant="Caption" style={{ marginTop: 3 }}>
                        {selectedTask.category} · {selectedTask.scheduledDate}
                      </SSDSText>
                    </View>
                    <Pressable
                      onPress={() => setSelectedTaskKey(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Close task details"
                    >
                      <SSDSIcon icon={XCircle} size={26} color="textSecondary" />
                    </Pressable>
                  </SSDSRow>
                  <SSDSStack gap={7}>
                    <SSDSText variant="BodySecondary">
                      Planned: {formatDuration(selectedTask.plannedMinutes)}
                    </SSDSText>
                    <SSDSText variant="BodySecondary">
                      Actual: {formatDuration(selectedTask.actualMinutes)}
                    </SSDSText>
                    <SSDSText variant="BodySecondary">
                      Remaining: {formatDuration(selectedTask.remainingMinutes)}
                    </SSDSText>
                    <SSDSText variant="BodySecondary">
                      Focus sessions: {selectedTask.focusSessionCount}
                    </SSDSText>
                  </SSDSStack>
                  <SSDSSectionHeader title="Related Focus Sessions" icon={Timer} compact />
                  {selectedSessions.length ? (
                    selectedSessions.map((session) => (
                      <SSDSRow
                        key={session.id}
                        justify="space-between"
                        gap={10}
                        style={{
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: tokens.colors.border,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <SSDSText variant="CardTitle" truncate>
                            {session.topic || 'Focus session'}
                          </SSDSText>
                          <SSDSText variant="Caption">
                            {session.dateKey} · {session.id}
                          </SSDSText>
                        </View>
                        <SSDSText variant="ButtonLabel" color="secondary">
                          {formatDuration(session.actualSeconds / 60)}
                        </SSDSText>
                      </SSDSRow>
                    ))
                  ) : (
                    <SSDSText variant="BodySecondary">
                      No related Focus sessions in this period.
                    </SSDSText>
                  )}
                  <SSDSButton
                    variant="outline"
                    fullWidth
                    onPress={() => setSelectedTaskKey(null)}
                  >
                    Close
                  </SSDSButton>
                </SSDSStack>
              ) : null}
            </SSDSSurface>
          </ScrollView>
        </View>
      </Modal>
    </Shell>
  );
}
