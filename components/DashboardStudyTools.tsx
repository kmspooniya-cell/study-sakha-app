import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../lib/theme';
import {
  PlannerPriority,
  PlannerScope,
  PlannerTask,
  PlannerTaskType,
  useStore,
} from '../lib/store';
import { getPlannerTasksForDate, updatePlannerTask } from '../lib/planner';

type PlanTask = {
  id: string;
  label: string;
  kind: string;
  refId: string;
  minutes: number;
};

type Props = {
  plan: PlanTask[];
  planDone: Record<string, string[]>;
  tasks: PlannerTask[];
  tasksLoaded: boolean;
  taskLoadError: string | null;
  persistenceError: string | null;
  defaultOverrides: Record<string, Partial<Pick<PlannerTask, 'label' | 'minutes' | 'category' | 'taskType' | 'priority' | 'targetDate'>>>;
  deletedDefaults: string[];
  dispatch: (action: any) => void;
  onOpenItem: (item: PlanTask) => void;
  onOpenFocus: () => void;
  onOpenPlanner?: () => void;
  dashboardMode?: boolean;
  dashboardActions?: PlannerDashboardAction[];
};
export type PlannerDashboardAction = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};
const TASK_TYPES: PlannerTaskType[] = ['Study', 'Revision', 'PYQ', 'Test', 'Current Affairs'];
const PRIORITIES: PlannerPriority[] = ['High', 'Medium', 'Low'];

function currentDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function shiftDateKey(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekStartKey(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

function getPeriodKey(scope: Exclude<PlannerScope, 'daily'>, dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const month = dateValue.slice(0, 7);
  if (scope === 'weekly') return weekStartKey(dateValue);
  if (scope === 'halfMonthly') return `${month}-H${date.getUTCDate() <= 15 ? 1 : 2}`;
  return month;
}

function getPeriodBounds(scope: Exclude<PlannerScope, 'daily'>, key: string) {
  if (scope === 'weekly') return { start: key, end: shiftDateKey(key, 6) };
  if (scope === 'halfMonthly') {
    const [month, half] = key.split('-H');
    const start = `${month}-${half === '1' ? '01' : '16'}`;
    const lastDay = new Date(`${month}-01T00:00:00.000Z`);
    lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
    const end = half === '1'
      ? `${month}-15`
      : lastDay.toISOString().slice(0, 10);
    return { start, end };
  }
  const start = `${key}-01`;
  const lastDay = new Date(`${start}T00:00:00.000Z`);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
  return { start, end: lastDay.toISOString().slice(0, 10) };
}

function shiftPlanningPeriod(value: string, scope: Exclude<PlannerScope, 'daily'>, direction: -1 | 1) {
  if (scope === 'weekly') return shiftDateKey(weekStartKey(value), direction * 7);
  if (scope === 'monthly') {
    const date = new Date(`${value.slice(0, 7)}-01T00:00:00.000Z`);
    date.setUTCMonth(date.getUTCMonth() + direction);
    return date.toISOString().slice(0, 10);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  const isFirstHalf = date.getUTCDate() <= 15;
  if (direction > 0) {
    if (isFirstHalf) date.setUTCDate(16);
    else {
      date.setUTCMonth(date.getUTCMonth() + 1, 1);
    }
  } else if (isFirstHalf) {
    date.setUTCMonth(date.getUTCMonth() - 1, 16);
  } else {
    date.setUTCDate(1);
  }
  return date.toISOString().slice(0, 10);
}

function formatDateKey(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function CustomStudyPlan({
  planDone,
  tasks,
  tasksLoaded,
  taskLoadError,
  persistenceError,
  dispatch,
  onOpenItem,
  onOpenFocus,
  onOpenPlanner,
  dashboardMode = false,
  dashboardActions = [],
}: Props) {
  const { colors } = useTheme();
  const { state: plannerState } = useStore();
  const [selectedDate, setSelectedDate] = useState(plannerState.plannerSelectedDate);
  const [popup, setPopup] = useState<'today' | 'ahead' | 'suggestions' | null>(null);
  const [aheadScope, setAheadScope] = useState<Exclude<PlannerScope, 'daily'> | null>(null);
  const [periodDate, setPeriodDate] = useState(currentDateKey);
  const [modal, setModal] = useState(false);
  const [deleteTask, setDeleteTask] = useState<{ id: string; isDefault: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDefault, setEditingDefault] = useState(false);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('25');
  const [category, setCategory] = useState('');
  const [taskType, setTaskType] = useState<PlannerTaskType>('Revision');
  const [priority, setPriority] = useState<PlannerPriority>('Medium');
  const [taskDate, setTaskDate] = useState(currentDateKey);
  const [taskScope, setTaskScope] = useState<PlannerScope>('daily');
  const [taskPeriodKey, setTaskPeriodKey] = useState(currentDateKey);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const locks = useRef<Record<string, boolean>>({});

  useEffect(() => {
    // Keep the planner's local date selection in sync with updates from other screens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDate(plannerState.plannerSelectedDate);
  }, [plannerState.plannerSelectedDate]);

  function changeSelectedDate(date: string) {
    setSelectedDate(date);
    dispatch({ type: 'plannerSelectedDate', date });
  }

  const updateTasks = (updater: (current: PlannerTask[]) => PlannerTask[]) => {
    dispatch({ type: 'savePlannerTasks', tasks: updater(tasks) });
  };

  const dateDone = planDone[selectedDate] ?? [];
  const currentPeriodKey = aheadScope ? getPeriodKey(aheadScope, periodDate) : selectedDate;
  const periodBounds = aheadScope ? getPeriodBounds(aheadScope, currentPeriodKey) : null;
  const taskBounds = taskScope === 'daily' ? null : getPeriodBounds(taskScope, taskPeriodKey);
  const activePlan = getPlannerTasksForDate(plannerState, selectedDate)
    .filter((item) => item.isDefault)
    .map((item) => ({
      id: item.id,
      label: item.label,
      kind: item.kind,
      refId: item.refId,
      minutes: item.minutes,
      targetDate: item.targetDate,
      category: item.category,
      taskType: item.taskType,
      priority: item.priority,
    }));
  const visiblePlan = popup === 'today'
    ? activePlan.filter((item) => item.targetDate === selectedDate)
    : [];
  const visibleTasks = popup === 'today'
    ? tasks.filter((task) => task.scope === 'daily' && task.targetDate === selectedDate)
    : aheadScope
      ? tasks.filter((task) => task.scope === aheadScope && task.periodKey === currentPeriodKey)
      : [];
  const completedDefaultCount = visiblePlan.filter((item) => dateDone.includes(item.id)).length;
  const completedCustomCount = visibleTasks.filter((task) => task.completedOn === task.targetDate).length;
  const total = visiblePlan.length + visibleTasks.length;
  const doneCount = completedDefaultCount + completedCustomCount;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const suggestionTask = tasks
    .filter((task) => !task.completedOn && isDateKey(task.targetDate))
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];
  const suggestionSubject = plannerState.results[0]?.bySubject
    ? [...plannerState.results[0].bySubject].sort((a, b) => (a.correct / (a.total || 1)) - (b.correct / (b.total || 1)))[0]?.subject
    : undefined;

  function openAdd(scope: PlannerScope = 'daily', periodKey = selectedDate, date = selectedDate) {
    setEditingId(null);
    setEditingDefault(false);
    setTitle('');
    setMinutes('25');
    setCategory('');
    setTaskType('Study');
    setPriority('Medium');
    setTaskScope(scope);
    setTaskPeriodKey(periodKey);
    setTaskDate(date);
    setError('');
    setSuccessMessage('');
    setModal(true);
  }

  function openEdit(task: PlannerTask) {
    setEditingId(task.id);
    setEditingDefault(false);
    setTitle(task.label);
    setMinutes(String(task.minutes));
    setCategory(task.category);
    setTaskType(task.taskType);
    setPriority(task.priority);
    setTaskDate(task.targetDate);
    setTaskScope(task.scope);
    setTaskPeriodKey(task.periodKey);
    setError('');
    setSuccessMessage('');
    setModal(true);
  }

  function openEditDefault(task: PlanTask & { category: string; taskType: PlannerTaskType; priority: PlannerPriority; targetDate: string }) {
    setEditingId(task.id);
    setEditingDefault(true);
    setTitle(task.label);
    setMinutes(String(task.minutes));
    setCategory(task.category);
    setTaskType(task.taskType);
    setPriority(task.priority);
    setTaskDate(task.targetDate);
    setTaskScope('daily');
    setTaskPeriodKey(task.targetDate);
    setError('');
    setSuccessMessage('');
    setModal(true);
  }

  function saveTask() {
    const cleanTitle = title.trim();
    const cleanCategory = category.trim();
    const duration = Number(minutes);

    if (!cleanTitle) {
      setError('Please enter a task title.');
      return;
    }

    if (!cleanCategory) {
      setError('Please enter a subject or category.');
      return;
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
      setError('Duration must be 1–600 minutes.');
      return;
    }

    if (!isDateKey(taskDate) || (taskBounds && (taskDate < taskBounds.start || taskDate > taskBounds.end))) {
      setError('Choose a valid target date.');
      return;
    }

    if (editingDefault && editingId) {
      dispatch({
        type: 'plannerDefaultOverride',
        id: editingId,
        patch: { label: cleanTitle, minutes: duration, category: cleanCategory, taskType, priority },
      });
      setModal(false);
      setError('');
      setSuccessMessage('Task updated.');
      return;
    }

    if (editingId) {
      updateTasks((old) =>
        old.map((task) =>
          task.id === editingId
            ? updatePlannerTask(task, {
                label: cleanTitle,
                minutes: duration,
                category: cleanCategory,
                taskType,
                priority,
                targetDate: taskDate,
                scope: taskScope,
                periodKey: taskScope === 'daily' ? taskDate : getPeriodKey(taskScope, taskDate),
              })
            : task
        )
      );
    } else {
      updateTasks((old) => {
        let id = `planner-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
        while (old.some((task) => task.id === id)) id = `planner-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
        return [
        ...old,
        {
          id,
          label: cleanTitle,
          minutes: duration,
          category: cleanCategory,
          taskType,
          priority,
          targetDate: taskDate,
          scope: taskScope,
          periodKey: taskScope === 'daily' ? taskDate : getPeriodKey(taskScope, taskDate),
          completed: false,
          completedOn: null,
        },
      ];
      });
    }

    setModal(false);
    setError('');
    setSuccessMessage(editingId ? 'Task updated.' : 'Task added.');
  }

  function toggleDefault(item: PlanTask & { category: string; taskType: PlannerTaskType; targetDate: string }) {
    if (locks.current[item.id]) return;
    locks.current[item.id] = true;

    const completionDate = selectedDate;
    const wasDone = (planDone[completionDate] ?? []).includes(item.id);
    dispatch({
      type: 'setPlannerTaskCompletion',
      taskId: item.id,
      date: completionDate,
      completed: !wasDone,
      isDefault: true,
      completion: {
        taskId: item.id,
        label: item.label,
        minutes: item.minutes,
        category: item.category,
        taskType: item.taskType,
      },
    });

    setTimeout(() => {
      delete locks.current[item.id];
    }, 350);
  }

  function toggleCustom(task: PlannerTask) {
    const completed = task.completedOn !== task.targetDate;
    dispatch({
      type: 'setPlannerTaskCompletion',
      taskId: task.id,
      date: task.targetDate,
      completed,
      isDefault: false,
      completion: {
        taskId: task.id,
        label: task.label,
        minutes: task.minutes,
        category: task.category,
        taskType: task.taskType,
      },
    });
  }

  const filteredPlan = visiblePlan.filter((item) => {
    const done = (planDone[item.targetDate] ?? []).includes(item.id);
    return filter === 'All' || (filter === 'Done' && done) || (filter === 'Pending' && !done);
  });
  const filteredTasks = visibleTasks.filter(
    (task) => filter === 'All' ||
      (filter === 'Done' && task.completedOn === task.targetDate) ||
      (filter === 'Pending' && task.completedOn !== task.targetDate)
  );

  const dateLabel = formatDateKey(selectedDate);
  const deleteTaskRecord = deleteTask?.isDefault
    ? activePlan.find((task) => task.id === deleteTask.id)
    : tasks.find((task) => task.id === deleteTask?.id);

  const renderCustomTask = (task: PlannerTask) => {
    const done = task.completedOn === task.targetDate;
    return (
      <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => toggleCustom(task)} accessibilityRole="checkbox" accessibilityState={{ checked: done }} style={{ width: 23, height: 23, borderWidth: 1.5, borderColor: done ? colors.teal : colors.border, backgroundColor: done ? colors.teal : 'transparent', borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}>
          {done ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: done ? colors.textFaint : colors.text, fontWeight: '600', textDecorationLine: done ? 'line-through' : 'none' }}>{task.label}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>
            {task.category} · {task.taskType} · {task.priority} · {formatDateKey(task.targetDate)}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{task.minutes}m</Text>
        <Pressable onPress={() => openEdit(task)} accessibilityLabel={`Edit ${task.label}`} hitSlop={8}>
          <Ionicons name="create-outline" size={19} color={colors.blue} />
        </Pressable>
        <Pressable onPress={() => setDeleteTask({ id: task.id, isDefault: false })} accessibilityLabel={`Delete ${task.label}`} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      </View>
    );
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 20,
        padding: 16,
      }}
    >
      {!dashboardMode ? <View style={{ marginBottom: 14 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
          Study Planner
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>
          Plan your study, track tasks, and focus your sessions.
        </Text>
      </View> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {!dashboardMode ? <>
        {[
          { title: 'Today Plan', icon: 'calendar-outline' as const, color: colors.blue, onPress: () => { setPopup('today'); setFilter('All'); setSuccessMessage(''); } },
          { title: 'Tasks Ahead', icon: 'list-outline' as const, color: colors.teal, onPress: () => { setPopup('ahead'); setAheadScope(null); setFilter('All'); setSuccessMessage(''); } },
        ].map((item) => (
          <Pressable
            key={item.title}
            onPress={item.onPress}
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: '47.5%',
              flexGrow: 1,
              minHeight: 76,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceAlt : colors.bg,
              padding: 13,
            })}
          >
            <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${item.color}1A` }}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', flexShrink: 1 }}>{item.title}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={onOpenFocus}
          accessibilityRole="button"
          style={({ pressed }) => ({
            width: '47.5%',
            flexGrow: 1,
            minHeight: 76,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surfaceAlt : colors.bg,
            padding: 13,
          })}
        >
          <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.violet}1A` }}>
            <Ionicons name="timer-outline" size={20} color={colors.violet} />
          </View>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Focus Mode</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setSuccessMessage('');
            setPopup('suggestions');
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({
            width: '47.5%',
            flexGrow: 1,
            minHeight: 76,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surfaceAlt : colors.bg,
            padding: 13,
          })}
        >
          <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.amber}1A` }}>
            <Ionicons name="sparkles-outline" size={20} color={colors.amber} />
          </View>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', flexShrink: 1 }}>Smart Suggestions</Text>
        </Pressable>
        </> : null}
        {dashboardMode && dashboardActions.length > 0 ? (
          <Text style={{ width: '100%', color: colors.text, fontSize: 16, fontWeight: '800' }}>
            Study Planner
          </Text>
        ) : null}
        {dashboardActions.map((item, index) => (
          <Pressable
            key={item.title}
            onPress={item.onPress}
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: dashboardMode && index === dashboardActions.length - 1 ? '100%' : '47.5%',
              flexGrow: dashboardMode && index === dashboardActions.length - 1 ? 0 : 1,
              minHeight: 76,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceAlt : colors.bg,
              padding: 13,
            })}
          >
            <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${item.color}1A` }}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', flexShrink: 1 }}>{item.title}</Text>
          </Pressable>
        ))}
      </View>

      {!dashboardMode ? (
        <Pressable
          onPress={onOpenPlanner}
          accessibilityRole="button"
          style={{ alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 4 }}
        >
          <Text style={{ color: colors.blue, fontSize: 12, fontWeight: '700' }}>More options ›</Text>
        </Pressable>
      ) : null}
      {persistenceError ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 11, marginBottom: 8 }}>
          Changes could not be saved on this device: {persistenceError}
        </Text>
      ) : null}

      <Modal
        visible={popup !== null && !modal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setPopup(null);
          setAheadScope(null);
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 14, backgroundColor: colors.overlay }}>
          <View style={{ width: '100%', maxWidth: 720, maxHeight: '92%', alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              {popup === 'ahead' && aheadScope ? (
                <Pressable
                  onPress={() => setAheadScope(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Back to planning periods"
                  style={{ padding: 6, marginRight: 8 }}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </Pressable>
              ) : null}
              <Text style={{ flex: 1, color: colors.text, fontSize: 19, fontWeight: '800' }}>
                {popup === 'today' ? 'Today Plan' : popup === 'ahead' ? 'Tasks Ahead' : 'Smart Suggestions'}
              </Text>
              <Pressable
                onPress={() => {
                  setPopup(null);
                  setAheadScope(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Close planner popup"
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            {successMessage ? (
              <Text accessibilityRole="alert" style={{ color: colors.success, fontSize: 12, marginBottom: 10 }}>
                {successMessage}
              </Text>
            ) : null}

            {popup === 'suggestions' ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 }}>
                <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="sparkles-outline" size={30} color={colors.blue} />
                </View>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
                  {!plannerState.plannerSettings.aiSuggestions
                    ? 'Smart suggestions are disabled in Settings.'
                    : suggestionTask
                      ? `Prioritize “${suggestionTask.label}” (${suggestionTask.minutes} min) before adding another task.`
                      : suggestionSubject
                        ? `Your latest test indicates that ${suggestionSubject} needs the next revision block.`
                        : 'There is not enough study data to make a personalized suggestion yet.'}
                </Text>
              </View>
            ) : null}

            {popup === 'ahead' && !aheadScope ? (
              <View style={{ gap: 10 }}>
                {[
                  { scope: 'weekly' as const, title: 'Add Weekly Tasks', detail: 'Plan and track tasks by week.' },
                  { scope: 'halfMonthly' as const, title: 'Add Half-Monthly Tasks', detail: 'Plan for the 1st–15th or 16th–month end.' },
                  { scope: 'monthly' as const, title: 'Add Monthly Tasks', detail: 'Set academic goals and monthly tasks.' },
                ].map((item) => (
                  <Pressable
                    key={item.scope}
                    onPress={() => {
                      setAheadScope(item.scope);
                      setPeriodDate(currentDateKey());
                    }}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.surfaceAlt : colors.bg })}
                  >
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{item.title}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{item.detail}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {popup === 'ahead' && aheadScope ? (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Pressable
                    onPress={() => setPeriodDate((date) => shiftPlanningPeriod(date, aheadScope, -1))}
                    accessibilityRole="button"
                    accessibilityLabel="Previous planning period"
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.blue} />
                  </Pressable>
                  <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'center', flex: 1 }}>
                    {formatDateKey(periodBounds!.start)} – {formatDateKey(periodBounds!.end)}
                  </Text>
                  <Pressable
                    onPress={() => setPeriodDate((date) => shiftPlanningPeriod(date, aheadScope, 1))}
                    accessibilityRole="button"
                    accessibilityLabel="Next planning period"
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="chevron-forward" size={18} color={colors.blue} />
                  </Pressable>
                </View>
                {aheadScope === 'halfMonthly' ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {[
                      { date: `${periodDate.slice(0, 7)}-01`, label: '1st–15th' },
                      { date: `${periodDate.slice(0, 7)}-16`, label: '16th–month end' },
                    ].map((half) => {
                      const selected = currentPeriodKey.endsWith(half.date.endsWith('-01') ? 'H1' : 'H2');
                      return (
                        <Pressable
                          key={half.label}
                          onPress={() => setPeriodDate(half.date)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          style={{ flex: 1, padding: 9, borderRadius: 10, backgroundColor: selected ? colors.tint : colors.surfaceAlt, alignItems: 'center' }}
                        >
                          <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{half.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>
                  {doneCount}/{total} completed · {percent}%
                </Text>
                <View style={{ height: 7, borderRadius: 8, backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginBottom: 12 }}>
                  <View style={{ width: `${percent}%`, height: '100%', backgroundColor: colors.teal }} />
                </View>
                {!tasksLoaded ? <Text style={{ color: colors.textMuted, fontSize: 11 }}>Loading saved tasks…</Text> : null}
                {taskLoadError ? (
                  <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 11, marginBottom: 8 }}>
                    Could not migrate saved planner tasks: {taskLoadError}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => {
                    const startDate = periodBounds!.start;
                    openAdd(aheadScope, currentPeriodKey, startDate);
                  }}
                  disabled={!tasksLoaded || Boolean(taskLoadError)}
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.tint, borderRadius: 10, padding: 11, marginBottom: 8, opacity: !tasksLoaded || taskLoadError ? 0.5 : 1 }}
                >
                  <Ionicons name="add" size={17} color={colors.blue} />
                  <Text style={{ color: colors.blue, fontWeight: '800' }}>Add task to this period</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 7, marginBottom: 8 }}>
                  {['All', 'Pending', 'Done'].map((value) => (
                    <Pressable key={value} onPress={() => setFilter(value)} style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 18, backgroundColor: filter === value ? colors.tint : colors.surfaceAlt }}>
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{value}</Text>
                    </Pressable>
                  ))}
                </View>
                <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                  {filteredTasks.map((task) => renderCustomTask(task))}
                  {!filteredTasks.length ? (
                    <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>
                      No tasks in this planning period yet.
                    </Text>
                  ) : null}
                </ScrollView>
              </View>
            ) : null}

            {popup === 'today' ? (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Pressable onPress={() => changeSelectedDate(shiftDateKey(selectedDate, -1))} accessibilityRole="button" accessibilityLabel="Show previous day" style={{ padding: 8 }}>
                    <Ionicons name="chevron-back" size={18} color={colors.blue} />
                  </Pressable>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{selectedDate === currentDateKey() ? 'Today · ' : ''}{dateLabel}</Text>
                    {selectedDate !== currentDateKey() ? (
                      <Pressable onPress={() => changeSelectedDate(currentDateKey())} accessibilityRole="button">
                        <Text style={{ color: colors.blue, fontSize: 11, marginTop: 2 }}>Go to today</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Pressable onPress={() => changeSelectedDate(shiftDateKey(selectedDate, 1))} accessibilityRole="button" accessibilityLabel="Show next day" style={{ padding: 8 }}>
                    <Ionicons name="chevron-forward" size={18} color={colors.blue} />
                  </Pressable>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>
                  {doneCount}/{total} completed · {percent}%
                </Text>
                <View style={{ height: 7, borderRadius: 8, backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginBottom: 12 }}>
                  <View style={{ width: `${percent}%`, height: '100%', backgroundColor: colors.teal }} />
                </View>
                <Pressable
                  onPress={() => openAdd('daily', selectedDate, selectedDate)}
                  disabled={!tasksLoaded || Boolean(taskLoadError)}
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.tint, borderRadius: 10, padding: 11, marginBottom: 8, opacity: !tasksLoaded || taskLoadError ? 0.5 : 1 }}
                >
                  <Ionicons name="add" size={17} color={colors.blue} />
                  <Text style={{ color: colors.blue, fontWeight: '800' }}>Add More Tasks</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 7, marginBottom: 8 }}>
                  {['All', 'Pending', 'Done'].map((value) => (
                    <Pressable key={value} onPress={() => setFilter(value)} style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 18, backgroundColor: filter === value ? colors.tint : colors.surfaceAlt }}>
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{value}</Text>
                    </Pressable>
                  ))}
                </View>
                {!tasksLoaded ? <Text style={{ color: colors.textMuted, fontSize: 11 }}>Loading saved tasks…</Text> : null}
                {taskLoadError ? (
                  <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 11, marginBottom: 8 }}>
                    Could not migrate saved planner tasks: {taskLoadError}
                  </Text>
                ) : null}
                <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                  {filteredPlan.map((task) => {
                    const done = (planDone[task.targetDate] ?? []).includes(task.id);
                    return (
                      <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Pressable onPress={() => toggleDefault(task)} accessibilityRole="checkbox" accessibilityState={{ checked: done }} style={{ width: 23, height: 23, borderWidth: 1.5, borderColor: done ? colors.teal : colors.border, backgroundColor: done ? colors.teal : 'transparent', borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}>
                          {done ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                        </Pressable>
                        <Pressable style={{ flex: 1 }} onPress={() => onOpenItem(task)}>
                          <Text style={{ color: done ? colors.textFaint : colors.text, fontWeight: '600', textDecorationLine: done ? 'line-through' : 'none' }}>{task.label}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>{task.category} · {task.taskType} · {task.priority}</Text>
                        </Pressable>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{task.minutes}m</Text>
                        <Pressable onPress={() => openEditDefault(task)} accessibilityLabel={`Edit ${task.label}`} hitSlop={8}>
                          <Ionicons name="create-outline" size={19} color={colors.blue} />
                        </Pressable>
                        <Pressable onPress={() => setDeleteTask({ id: task.id, isDefault: true })} accessibilityLabel={`Delete ${task.label}`} hitSlop={8}>
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </Pressable>
                      </View>
                    );
                  })}
                  {filteredTasks.map((task) => renderCustomTask(task))}
                  {!filteredPlan.length && !filteredTasks.length ? (
                    <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>No tasks planned for this day yet.</Text>
                  ) : null}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={modal}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 20,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: 20,
                gap: 12,
                maxHeight: '92%',
              }}
            >
              <Text
                style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}
              >
                {editingId ? 'Edit task' : 'Add study task'}
              </Text>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Task title"
                accessibilityLabel="Task title"
                placeholderTextColor={colors.textFaint}
                maxLength={150}
                style={{
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 12,
                }}
              />

              <Text style={{ color: colors.text, fontWeight: '700' }}>
                Subject or category
              </Text>

              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="For example, Polity"
                placeholderTextColor={colors.textFaint}
                accessibilityLabel="Subject or category"
                maxLength={60}
                style={{
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 12,
                }}
              />

            <Text style={{ color: colors.text, fontWeight: '700' }}>Task type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {TASK_TYPES.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setTaskType(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: taskType === value }}
                  style={{
                    padding: 9,
                    borderRadius: 9,
                    backgroundColor: taskType === value ? colors.tint : colors.surfaceAlt,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 12 }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: colors.text, fontWeight: '700' }}>Priority</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {PRIORITIES.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setPriority(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: priority === value }}
                  style={{
                    padding: 9,
                    borderRadius: 9,
                    backgroundColor: priority === value ? colors.tint : colors.surfaceAlt,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 12 }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            {!editingDefault ? (
              <>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Target date</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Pressable
                    onPress={() => setTaskDate((date) => shiftDateKey(date, -1))}
                    accessibilityRole="button"
                    accessibilityLabel="Previous target date"
                    hitSlop={8}
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.blue} />
                  </Pressable>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{formatDateKey(taskDate)}</Text>
                  <Pressable
                    onPress={() => setTaskDate((date) => shiftDateKey(date, 1))}
                    accessibilityRole="button"
                    accessibilityLabel="Next target date"
                    hitSlop={8}
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="chevron-forward" size={18} color={colors.blue} />
                  </Pressable>
                </View>
              </>
            ) : null}

            <TextInput
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              placeholder="Duration in minutes"
              placeholderTextColor={colors.textFaint}
              accessibilityLabel="Duration in minutes"
              maxLength={3}
              style={{
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                padding: 12,
              }}
            />

            {error ? (
              <Text style={{ color: colors.danger }}>{error}</Text>
            ) : null}

            <Pressable
              onPress={saveTask}
              style={{
                backgroundColor: colors.blue,
                borderRadius: 11,
                padding: 13,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                Save task
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setModal(false);
                setError('');
              }}
              style={{ padding: 10, alignItems: 'center' }}
            >
              <Text style={{ color: colors.text }}>Cancel</Text>
            </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={deleteTask !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTask(null)}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Delete task?</Text>
            <Text style={{ color: colors.textMuted }}>{deleteTaskRecord?.label}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <Pressable
                onPress={() => setDeleteTask(null)}
                style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceAlt }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (deleteTask?.isDefault) {
                    dispatch({ type: 'deletePlannerDefault', id: deleteTask.id });
                  } else if (deleteTask) {
                    updateTasks((old) => old.filter((task) => task.id !== deleteTask.id));
                  }
                  setDeleteTask(null);
                  setSuccessMessage('Task deleted.');
                }}
                style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.danger }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
