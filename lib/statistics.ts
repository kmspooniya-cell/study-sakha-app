import { getPlannerTasksForDate, PlannerTaskView } from './planner';
import type { State } from './store';

export const FOCUS_HISTORY_RETENTION_LIMIT = 100;

export type StatisticsDateRange = {
  startDate: string;
  endDate: string;
};

export type StatisticsDateRangeInput = StatisticsDateRange;

export type PersistedFocusSession = {
  id: string;
  subject?: string;
  topic?: string;
  minutes?: number;
  completedAt: string;
  taskId?: string;
  startedAt?: string;
  endedAt?: string;
  actualSeconds?: number;
  plannedMinutes?: number;
};

export type NormalizedFocusSession = PersistedFocusSession & {
  actualSeconds: number;
  dateKey: string;
};

export type DailyStatistics = {
  date: string;
  actualSeconds: number;
  actualMinutes: number;
  focusSessionCount: number;
  uniqueTaskCount: number;
};

export type WeeklyStatistics = {
  label: string;
  actualSeconds: number;
  actualMinutes: number;
  active: boolean;
};

export type PlannedActualStatistics = {
  plannedMinutes: number;
  actualMinutes: number;
  differenceMinutes: number;
  hasPlannerTasks: boolean;
};

export type TaskStatistics = {
  taskId: string;
  title: string;
  category: string;
  plannedMinutes: number | null;
  actualMinutes: number;
  remainingMinutes: number | null;
  completed: boolean | null;
  completionDate: string | null;
  focusSessionCount: number;
  scheduledDate: string;
  historical: boolean;
};

export type SubjectStatistics = {
  subject: string;
  actualMinutes: number;
  focusSessionCount: number;
  shareOfActualTime: number;
};

export type FocusStatistics = {
  totalSessions: number;
  totalActualSeconds: number;
  totalActualMinutes: number;
  averageSessionSeconds: number | null;
  averageSessionMinutes: number | null;
  longestSessionSeconds: number | null;
  longestSessionMinutes: number | null;
  activeStudyDays: number;
};

export type StreakStatistics = {
  current: number;
  best: number;
};

export type UnifiedStatistics = {
  dateRange: StatisticsDateRange & {
    valid: boolean;
    error: string | null;
  };
  historyRetention: {
    limited: true;
    maxSessions: number;
    note: string;
  };
  sessions: NormalizedFocusSession[];
  overall: {
    actualSeconds: number;
    actualMinutes: number;
    focusSessionCount: number;
    completedTaskCount: number;
    pendingTaskCount: number;
    taskCompletionPercentage: number | null;
    activeStudyDays: number;
  };
  dailyActivity: DailyStatistics[];
  weeklyActivity: WeeklyStatistics[];
  plannedVsActual: PlannedActualStatistics;
  tasks: TaskStatistics[];
  subjects: SubjectStatistics[];
  focus: FocusStatistics;
  streak: StreakStatistics;
};

type ScheduledTaskInstance = {
  date: string;
  task: PlannerTaskView;
};

const GENERAL_SUBJECT = 'General Study';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;
  return date;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateKeysBetween(startDate: string, endDate: string): string[] {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  if (!start || !end || start > end) return [];

  const keys: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    keys.push(localDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return keys;
}

export function normalizeStatisticsDateRange(
  range: StatisticsDateRangeInput,
): UnifiedStatistics['dateRange'] {
  const startValid = typeof range?.startDate === 'string' && parseDateKey(range.startDate) !== null;
  const endValid = typeof range?.endDate === 'string' && parseDateKey(range.endDate) !== null;

  if (!startValid || !endValid) {
    return {
      startDate: range?.startDate ?? '',
      endDate: range?.endDate ?? '',
      valid: false,
      error: 'Statistics date range must contain valid local dates.',
    };
  }

  if (range.startDate > range.endDate) {
    return {
      ...range,
      valid: false,
      error: 'Statistics date range start date cannot be after the end date.',
    };
  }

  return { ...range, valid: true, error: null };
}

function actualSecondsForSession(value: Record<string, unknown>): number | null {
  if (isFiniteNonNegative(value.actualSeconds)) return value.actualSeconds;
  if (isFiniteNonNegative(value.minutes)) return value.minutes * 60;
  return null;
}

/**
 * Normalizes valid Focus study records without mutating or rewriting storage.
 * The first occurrence of a session ID wins so duplicate records cannot be
 * counted twice by any derived statistic.
 */
export function normalizeFocusSessions(records: unknown): NormalizedFocusSession[] {
  if (!Array.isArray(records)) return [];

  const seenIds = new Set<string>();
  const normalized: NormalizedFocusSession[] = [];

  records.forEach((value) => {
    if (!isRecord(value)) return;
    if (typeof value.id !== 'string' || !value.id || seenIds.has(value.id)) return;
    if (typeof value.completedAt !== 'string') return;

    const completedAt = new Date(value.completedAt);
    if (Number.isNaN(completedAt.getTime())) return;

    const actualSeconds = actualSecondsForSession(value);
    if (actualSeconds === null || actualSeconds <= 0) return;

    seenIds.add(value.id);
    normalized.push({
      id: value.id,
      subject: typeof value.subject === 'string' ? value.subject : undefined,
      topic: typeof value.topic === 'string' ? value.topic : undefined,
      minutes: isFiniteNonNegative(value.minutes) ? value.minutes : actualSeconds / 60,
      completedAt: value.completedAt,
      taskId: typeof value.taskId === 'string' && value.taskId ? value.taskId : undefined,
      startedAt: typeof value.startedAt === 'string' ? value.startedAt : undefined,
      endedAt: typeof value.endedAt === 'string' ? value.endedAt : undefined,
      actualSeconds,
      plannedMinutes: isFiniteNonNegative(value.plannedMinutes) ? value.plannedMinutes : undefined,
      dateKey: localDateKey(completedAt),
    });
  });

  return normalized;
}

function emptyStatistics(
  dateRange: UnifiedStatistics['dateRange'],
): UnifiedStatistics {
  return {
    dateRange,
    historyRetention: {
      limited: true,
      maxSessions: FOCUS_HISTORY_RETENTION_LIMIT,
      note: `Focus history retains up to ${FOCUS_HISTORY_RETENTION_LIMIT} sessions; statistics cover the available retained history.`,
    },
    sessions: [],
    overall: {
      actualSeconds: 0,
      actualMinutes: 0,
      focusSessionCount: 0,
      completedTaskCount: 0,
      pendingTaskCount: 0,
      taskCompletionPercentage: null,
      activeStudyDays: 0,
    },
    dailyActivity: [],
    weeklyActivity: [],
    plannedVsActual: {
      plannedMinutes: 0,
      actualMinutes: 0,
      differenceMinutes: 0,
      hasPlannerTasks: false,
    },
    tasks: [],
    subjects: [],
    focus: {
      totalSessions: 0,
      totalActualSeconds: 0,
      totalActualMinutes: 0,
      averageSessionSeconds: null,
      averageSessionMinutes: null,
      longestSessionSeconds: null,
      longestSessionMinutes: null,
      activeStudyDays: 0,
    },
    streak: { current: 0, best: 0 },
  };
}

function subjectName(value: string | undefined): string {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized || GENERAL_SUBJECT;
}

function taskInstanceKey(taskId: string, date: string): string {
  return `${taskId}\u0000${date}`;
}

function summarizeStreaks(activeDates: Set<string>, dates: string[]): StreakStatistics {
  if (!dates.length) return { current: 0, best: 0 };

  let best = 0;
  let run = 0;
  dates.forEach((date) => {
    if (activeDates.has(date)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  });

  let current = 0;
  for (let index = dates.length - 1; index >= 0 && activeDates.has(dates[index]); index -= 1) {
    current += 1;
  }

  return { current, best };
}

function taskMetadataFromSession(session: NormalizedFocusSession): Pick<TaskStatistics, 'title' | 'category'> {
  return {
    title: session.topic?.trim() || 'Historical task',
    category: subjectName(session.subject),
  };
}

export function deriveStatistics(
  state: State,
  persistedSessions: unknown,
  range: StatisticsDateRangeInput,
): UnifiedStatistics {
  const dateRange = normalizeStatisticsDateRange(range);
  if (!dateRange.valid) return emptyStatistics(dateRange);

  const dates = dateKeysBetween(dateRange.startDate, dateRange.endDate);
  const allSessions = normalizeFocusSessions(persistedSessions);
  const sessions = allSessions.filter(
    (session) => session.dateKey >= dateRange.startDate && session.dateKey <= dateRange.endDate,
  );
  const sessionsByTaskAndDate = new Map<string, NormalizedFocusSession[]>();

  sessions.forEach((session) => {
    if (!session.taskId) return;
    const key = taskInstanceKey(session.taskId, session.dateKey);
    const existing = sessionsByTaskAndDate.get(key) ?? [];
    existing.push(session);
    sessionsByTaskAndDate.set(key, existing);
  });

  const scheduledInstances = new Map<string, ScheduledTaskInstance>();
  dates.forEach((date) => {
    getPlannerTasksForDate(state, date).forEach((task) => {
      const key = taskInstanceKey(task.id, date);
      if (!scheduledInstances.has(key)) scheduledInstances.set(key, { date, task });
    });
  });

  const dailyActivity = dates.map((date) => {
    const daySessions = sessions.filter((session) => session.dateKey === date);
    const taskIds = new Set(
      daySessions
        .map((session) => session.taskId)
        .filter((taskId): taskId is string => Boolean(taskId)),
    );
    const actualSeconds = daySessions.reduce((sum, session) => sum + session.actualSeconds, 0);
    return {
      date,
      actualSeconds,
      actualMinutes: actualSeconds / 60,
      focusSessionCount: daySessions.length,
      uniqueTaskCount: taskIds.size,
    };
  });

  const actualSeconds = sessions.reduce((sum, session) => sum + session.actualSeconds, 0);
  const activeDates = new Set(
    dailyActivity
      .filter((day) => day.actualSeconds > 0)
      .map((day) => day.date),
  );
  const weeklyActivity = Array.from(
    { length: Math.ceil(dailyActivity.length / 7) },
    (_, index) => {
      const days = dailyActivity.slice(index * 7, index * 7 + 7);
      const weekSeconds = days.reduce((sum, day) => sum + day.actualSeconds, 0);
      return {
        label: `W${index + 1}`,
        actualSeconds: weekSeconds,
        actualMinutes: weekSeconds / 60,
        active: weekSeconds > 0,
      };
    },
  );

  const taskRows: TaskStatistics[] = Array.from(scheduledInstances.values()).map(({ date, task }) => {
    const taskSessions = sessionsByTaskAndDate.get(taskInstanceKey(task.id, date)) ?? [];
    const taskActualSeconds = taskSessions.reduce((sum, session) => sum + session.actualSeconds, 0);
    const plannedMinutes = Math.max(0, Number(task.minutes) || 0);
    return {
      taskId: task.id,
      title: task.label,
      category: subjectName(task.category),
      plannedMinutes,
      actualMinutes: taskActualSeconds / 60,
      remainingMinutes: Math.max(0, plannedMinutes - taskActualSeconds / 60),
      completed: task.completed,
      completionDate: task.completedOn,
      focusSessionCount: taskSessions.length,
      scheduledDate: date,
      historical: false,
    };
  });

  const historicalKeys = new Set<string>();
  sessions.forEach((session) => {
    if (!session.taskId) return;
    const key = taskInstanceKey(session.taskId, session.dateKey);
    if (scheduledInstances.has(key) || historicalKeys.has(key)) return;
    historicalKeys.add(key);
    const historicalSessions = sessionsByTaskAndDate.get(key) ?? [];
    const historicalActualSeconds = historicalSessions.reduce(
      (sum, item) => sum + item.actualSeconds,
      0,
    );
    const metadata = taskMetadataFromSession(session);
    taskRows.push({
      taskId: session.taskId,
      ...metadata,
      plannedMinutes: null,
      actualMinutes: historicalActualSeconds / 60,
      remainingMinutes: null,
      completed: null,
      completionDate: null,
      focusSessionCount: historicalSessions.length,
      scheduledDate: session.dateKey,
      historical: true,
    });
  });

  const completedTaskCount = taskRows
    .filter((task) => !task.historical && task.completed === true)
    .length;
  const plannerTaskCount = taskRows.filter((task) => !task.historical).length;
  const pendingTaskCount = plannerTaskCount - completedTaskCount;
  const plannedMinutes = taskRows.reduce(
    (sum, task) => sum + (task.historical ? 0 : task.plannedMinutes ?? 0),
    0,
  );

  const subjectMap = new Map<string, { seconds: number; sessions: number }>();
  sessions.forEach((session) => {
    const subject = subjectName(session.subject);
    const existing = subjectMap.get(subject) ?? { seconds: 0, sessions: 0 };
    subjectMap.set(subject, {
      seconds: existing.seconds + session.actualSeconds,
      sessions: existing.sessions + 1,
    });
  });
  const subjects = Array.from(subjectMap.entries())
    .map(([subject, value]) => ({
      subject,
      actualMinutes: value.seconds / 60,
      focusSessionCount: value.sessions,
      shareOfActualTime: actualSeconds > 0 ? (value.seconds / actualSeconds) * 100 : 0,
    }))
    .sort((a, b) => b.actualMinutes - a.actualMinutes);

  const longestSessionSeconds = sessions.length
    ? Math.max(...sessions.map((session) => session.actualSeconds))
    : null;
  const streak = summarizeStreaks(activeDates, dates);

  return {
    dateRange,
    historyRetention: {
      limited: true,
      maxSessions: FOCUS_HISTORY_RETENTION_LIMIT,
      note: `Focus history retains up to ${FOCUS_HISTORY_RETENTION_LIMIT} sessions; statistics cover the available retained history.`,
    },
    sessions,
    overall: {
      actualSeconds,
      actualMinutes: actualSeconds / 60,
      focusSessionCount: sessions.length,
      completedTaskCount,
      pendingTaskCount,
      taskCompletionPercentage: plannerTaskCount > 0
        ? (completedTaskCount / plannerTaskCount) * 100
        : null,
      activeStudyDays: activeDates.size,
    },
    dailyActivity,
    weeklyActivity,
    plannedVsActual: {
      plannedMinutes,
      actualMinutes: actualSeconds / 60,
      differenceMinutes: actualSeconds / 60 - plannedMinutes,
      hasPlannerTasks: plannerTaskCount > 0,
    },
    tasks: taskRows,
    subjects,
    focus: {
      totalSessions: sessions.length,
      totalActualSeconds: actualSeconds,
      totalActualMinutes: actualSeconds / 60,
      averageSessionSeconds: sessions.length ? actualSeconds / sessions.length : null,
      averageSessionMinutes: sessions.length ? actualSeconds / sessions.length / 60 : null,
      longestSessionSeconds,
      longestSessionMinutes: longestSessionSeconds === null ? null : longestSessionSeconds / 60,
      activeStudyDays: activeDates.size,
    },
    streak,
  };
}
