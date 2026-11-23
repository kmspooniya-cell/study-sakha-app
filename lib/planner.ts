import { TODAY_PLAN } from './data';
import type { PlannerTask, State } from './store';

export type PlannerTaskView = {
  id: string;
  label: string;
  category: string;
  minutes: number;
  taskType: PlannerTask['taskType'];
  priority: PlannerTask['priority'];
  completed: boolean;
  completedOn: string | null;
  targetDate: string;
  actualStudySeconds: number;
  isDefault: boolean;
  kind: string;
  refId: string;
};

export type PlannerTaskEdit = Pick<
  PlannerTask,
  'label' | 'minutes' | 'category' | 'taskType' | 'priority' | 'targetDate' | 'scope' | 'periodKey'
>;

export type SchedulePlanStatus = 'completed' | 'missed' | 'upcoming';

export type PlannerScheduleOccurrence = {
  id: string;
  item: State['plannerScheduleItems'][number];
  date: string;
  status: SchedulePlanStatus;
  plannedSeconds: number | null;
  actualSeconds: number;
  progressPercent: number;
};

export function getScheduleOccurrenceId(scheduleId: string, date: string) {
  return `${scheduleId}::${date}`;
}

export function getSchedulePlanDurationSeconds(
  item: State['plannerScheduleItems'][number],
): number | null {
  const numericDuration = item.durationMinutes ??
    (typeof item.duration === 'number' ? item.duration : null);
  if (typeof numericDuration === 'number' && Number.isFinite(numericDuration) && numericDuration > 0) {
    return Math.round(numericDuration * 60);
  }

  const durationLabel = item.durationLabel;
  const labeledDuration = durationLabel?.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)/i);
  if (labeledDuration) {
    const amount = Number(labeledDuration[1]);
    return Math.round(amount * (/^h/i.test(labeledDuration[2]) ? 3600 : 60));
  }

  const start = item.startTime || item.time;
  if (!start || !item.endTime) return null;
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(item.endTime);
  if (startMinutes === null || endMinutes === null) return null;
  const durationMinutes = (endMinutes - startMinutes + 1440) % 1440;
  return durationMinutes > 0 ? durationMinutes * 60 : null;
}

function timeToMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function scheduleItemOccursOnDate(
  item: State['plannerScheduleItems'][number],
  date: string,
) {
  const start = item.date || item.fromDate || '';
  if (!start || date < start) return false;

  if (item.category === 'Vacations' && (!item.recurrence || item.recurrence === 'none')) {
    const end = item.endDate || item.untilDate || item.rangeUntil || start;
    return date <= end;
  }

  if (!item.recurrence || item.recurrence === 'none') {
    if (item.dateRangeMode === 'manual' && item.rangeFrom && item.rangeUntil) {
      return date >= item.rangeFrom && date <= item.rangeUntil;
    }
    return date === start;
  }

  const end = item.repeatUntil || (item.dateRangeMode === 'manual' ? item.rangeUntil : '') || '';
  if (end && date > end) return false;
  const startDate = new Date(`${start}T00:00:00`);
  const targetDate = new Date(`${date}T00:00:00`);
  if (item.recurrence === 'daily') return true;
  if (item.recurrence === 'weekly') {
    const days = item.repeatDays?.length ? item.repeatDays : [startDate.getDay()];
    return days.includes(targetDate.getDay());
  }
  if (item.recurrence === 'monthly') {
    const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    return targetDate.getDate() === Math.min(startDate.getDate(), lastDay);
  }
  if (item.recurrence === 'yearly') {
    return targetDate.getMonth() === startDate.getMonth() && targetDate.getDate() === startDate.getDate();
  }
  return false;
}

export function getPlannerScheduleOccurrence(
  state: State,
  item: State['plannerScheduleItems'][number],
  date: string,
  today: string,
): PlannerScheduleOccurrence {
  const id = getScheduleOccurrenceId(item.id, date);
  const actualSeconds = state.plannerTaskStudySeconds[id] ??
    (!item.recurrence || item.recurrence === 'none'
      ? state.plannerTaskStudySeconds[item.id] ?? 0
      : 0);
  const plannedSeconds = getSchedulePlanDurationSeconds(item);
  const progressPercent = plannedSeconds
    ? Math.min(100, Math.round((actualSeconds / plannedSeconds) * 100))
    : 0;
  const completed = Boolean(state.plannerScheduleCompletions[id]) ||
    (item.completed === true && (!item.recurrence || item.recurrence === 'none')) ||
    (plannedSeconds !== null && actualSeconds >= plannedSeconds);

  return {
    id,
    item,
    date,
    status: completed ? 'completed' : date < today ? 'missed' : 'upcoming',
    plannedSeconds,
    actualSeconds,
    progressPercent,
  };
}

export function getPlannerScheduleOccurrences(
  state: State,
  startDate: string,
  endDate: string,
  today: string,
): PlannerScheduleOccurrence[] {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const occurrences: PlannerScheduleOccurrence[] = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    state.plannerScheduleItems.forEach((item) => {
      if (scheduleItemOccursOnDate(item, dateKey)) {
        occurrences.push(getPlannerScheduleOccurrence(state, item, dateKey, today));
      }
    });
  }
  return occurrences;
}

/**
 * Applies an edit to an existing custom planner task without changing its ID
 * or any supporting data stored outside the task record, such as accumulated
 * focus seconds.
 */
export function updatePlannerTask(task: PlannerTask, edit: Partial<PlannerTaskEdit>): PlannerTask {
  const nextTargetDate = edit.targetDate ?? task.targetDate;
  const nextScope = edit.scope ?? task.scope;
  const sameDate = nextTargetDate === task.targetDate;
  const nextPeriodKey = edit.periodKey ?? (
    nextScope === 'daily' ? nextTargetDate : task.periodKey
  );

  return {
    ...task,
    ...edit,
    targetDate: nextTargetDate,
    scope: nextScope,
    periodKey: nextPeriodKey,
    completed: sameDate ? task.completedOn === nextTargetDate : false,
    completedOn: sameDate ? task.completedOn : null,
  };
}

function defaultCategory(kind: string) {
  if (kind === 'pyq') return 'Polity';
  if (kind === 'ca') return 'Current Affairs';
  if (kind === 'test') return 'Mock Test';
  return 'Polity';
}

function defaultTaskType(kind: string): PlannerTask['taskType'] {
  if (kind === 'pyq') return 'PYQ';
  if (kind === 'ca') return 'Current Affairs';
  if (kind === 'test') return 'Test';
  return 'Revision';
}

/**
 * Returns the visible daily planner tasks for a date.
 *
 * Built-in task IDs and custom task IDs are preserved. Built-in overrides,
 * deleted defaults, completion state, and accumulated focus time are resolved
 * from the existing store fields without mutating them.
 */
export function getPlannerTasksForDate(state: State, date: string): PlannerTaskView[] {
  const completedDefaults = new Set(state.planDone[date] ?? []);

  const defaults: PlannerTaskView[] = TODAY_PLAN
    .filter((task) => task.id !== 'tp4')
    .filter((task) => !state.plannerDeletedDefaults.includes(task.id))
    .map((task) => {
      const override = state.plannerDefaultOverrides[task.id];
      const completed = completedDefaults.has(task.id);
      return {
        id: task.id,
        label: override?.label ?? task.label,
        category: override?.category ?? defaultCategory(task.kind),
        minutes: override?.minutes ?? task.minutes,
        taskType: override?.taskType ?? defaultTaskType(task.kind),
        priority: override?.priority ?? 'Medium',
        completed,
        completedOn: completed ? date : null,
        targetDate: date,
        actualStudySeconds: state.plannerTaskStudySeconds[task.id] ?? 0,
        isDefault: true,
        kind: task.kind,
        refId: task.refId,
      };
    });

  const customTasks: PlannerTaskView[] = state.plannerTasks
    .filter((task) => task.scope === 'daily' && task.targetDate === date)
    .map((task) => ({
      id: task.id,
      label: task.label,
      category: task.category,
      minutes: task.minutes,
      taskType: task.taskType,
      priority: task.priority,
      completed: task.completedOn === date,
      completedOn: task.completedOn,
      targetDate: task.targetDate,
      actualStudySeconds: state.plannerTaskStudySeconds[task.id] ?? 0,
      isDefault: false,
      kind: 'custom',
      refId: task.id,
    }));

  return [...defaults, ...customTasks];
}
