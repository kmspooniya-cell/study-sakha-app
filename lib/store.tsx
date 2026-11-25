import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BADGES, LEARNERS, PENDING_CONTENT } from './data';
import { STUDENT_CONTENT_BUCKET, supabase, supabaseConfigured } from './supabase';
import { AccountSyncEngine } from './sync/syncEngine';
import type { AccountSyncDocument, SyncStatus } from './sync/syncTypes';
import type { FocusHistoryRecord } from './focusHistory';
import { ThemeMode } from './theme';
import { AppNotification, ChatMsg, ExamId, Learner, ManagedContent, ManagedContentType, PendingContent, TestQuestion, TestResult, UserNote } from './types';

const KEY = 'sakha-store-v1';
const PLANNER_DATA_VERSION = 2;
const PLANNER_QUARANTINE_KEY = 'sakha-planner-quarantine-v2';
const LEGACY_IMPORT_KEY = 'study-sakha-legacy-import-v1';
export const getUserScopedStorageKey = (key: string, userId: string | null | undefined) =>
  userId ? `${key}:user:${encodeURIComponent(userId)}` : key;

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'learner' | 'admin';
  exam: ExamId;
  joined: string;
  photoUri?: string;
  birthday?: string;
  phoneNumber?: string;
  currentCity?: string;
  examFocus?: string;
};

export function getDisplayName(user: User | null) {
  const name = user?.name?.trim();
  return name || 'Aspirant';
}

export type Announcement = { id: string; title: string; body: string; audience: string; at: number };

export type PlannerCompletion = {
  taskId: string;
  label: string;
  minutes: number;
  category: string;
  taskType: string;
};

export type PlannerTaskType = 'Study' | 'Revision' | 'PYQ' | 'Test' | 'Current Affairs';
export type PlannerPriority = 'High' | 'Medium' | 'Low';
export type PlannerScope = 'daily' | 'weekly' | 'halfMonthly' | 'monthly';

export type PlannerTask = {
  id: string;
  label: string;
  minutes: number;
  category: string;
  completed: boolean;
  completedOn: string | null;
  targetDate: string;
  taskType: PlannerTaskType;
  priority: PlannerPriority;
  scope: PlannerScope;
  periodKey: string;
};

export type PlannerSettings = {
  dailyTargetHours: number;
  weeklyTargetHours: number;
  preferredStudyTimes: string[];
  autoScheduling: boolean;
  aiSuggestions: boolean;
  defaultTaskDurationMinutes: number;
  autoCarryForward: boolean;
  recurringTasksEnabled: boolean;
  breakIntervalMinutes: number;
};

export type PlannerScheduleCategory = 'Tasks' | 'Classes' | 'Exams' | 'Vacations' | 'Activities';

export type PlannerScheduleItem = {
  id: string;
  category: PlannerScheduleCategory;
  title: string;
  subject?: string;
  type?: string;
  teacher?: string;
  date?: string;
  time?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  occurs?: 'Once' | 'Repeating';
  days?: string[];
  dateRange?: 'None' | 'Term' | 'Manual';
  whereType?: 'In Person' | 'Online';
  room?: string;
  building?: string;
  seat?: string;
  notes?: string;
  daysCount?: number;
  hasCoverPhoto?: boolean;
  completed?: boolean;
  timeSlots?: {
    id: string;
    days: string[];
    startTime: string;
    endTime: string;
  }[];
  fromDate?: string;
  untilDate?: string;
  taskType?: string;
  instructor?: string;
  whereMode?: 'in_person' | 'online';
  seatNumber?: string;
  onlineLink?: string;
  location?: string;
  examType?: string;
  durationMinutes?: number;
  durationLabel?: string;
  vacationPreset?: string;
  coverPhotoName?: string;
  dateRangeMode?: 'none' | 'term' | 'manual';
  termName?: string;
  rangeFrom?: string;
  rangeUntil?: string;
  activityType?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeatDays?: number[];
  repeatUntil?: string;
};

export type State = {
  plannerDataVersion?: number;
  hydrated: boolean;
  storageReady: boolean;
  authReady: boolean;
  user: User | null;
  settings: {
    themeMode: ThemeMode;
    language: 'en' | 'hi';
    dailyGoalMin: number;
    textScale: number;
    notifications: boolean;
    accentColor: string;
    customAccentHex: string | null;
    highContrast: boolean;
    reduceMotion: boolean;
    animationIntensity: 'minimal' | 'balanced' | 'rich';
    displayScaling: number;
    layoutDensity: 'compact' | 'comfortable';
    backgroundId: string;
    backgroundOpacity: number;
    overlayIntensity: number;
    dashboardWidgets: {
      streakCard: boolean;
      dailyGoalRing: boolean;
      quickRevision: boolean;
      sakhaAiPrompt: boolean;
      upcomingTests: boolean;
    };
    dashboardQuickActions: string[];
    focusDurationMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    meditationDurationMinutes: number;
    focusAutoStartNextSession: boolean;
    focusThemeId: string;
    focusAnimationIntensity: 'minimal' | 'balanced' | 'rich';
    reduceFocusMotion: boolean;
    focusMusicId: string;
    focusMusicVolume: number;
    aiResponseLanguage: string;
    aiResponseLength: 'Concise' | 'Balanced' | 'Detailed';
    aiDetailLevel: string;
    aiLearningMode: string;
    aiSaveChatHistory: boolean;
  };
  notes: UserNote[];
  starred: string[];
  bookmarks: string[];
  progress: Record<string, { percent: number; at: number; title: string }>;
  planDone: Record<string, string[]>;
  plannerSelectedDate: string;
  plannerTasks: PlannerTask[];
  plannerTasksLoaded: boolean;
  plannerLegacyMigrated: boolean;
  plannerTaskLoadError: string | null;
  plannerPersistenceError: string | null;
  plannerDefaultOverrides: Record<string, Partial<Pick<PlannerTask, 'label' | 'minutes' | 'category' | 'taskType' | 'priority' | 'targetDate'>>>;
  plannerDeletedDefaults: string[];
  plannerSettings: PlannerSettings;
  plannerScheduleItems: PlannerScheduleItem[];
  plannerScheduleCompletions: Record<string, string>;
  plannerCompletions: Record<string, PlannerCompletion[]>;
  plannerMinutesCredited: Record<string, string[]>;
  plannerTaskStudySeconds: Record<string, number>;
  recordedFocusSessionIds: string[];
  focusHistory: FocusHistoryRecord[];
  studyLog: Record<string, number>;
  results: TestResult[];
  chat: ChatMsg[];
  notifications: AppNotification[];
  learners: Learner[];
  queue: PendingContent[];
  managedContent: ManagedContent[];
  managedContentError: string | null;
  announcements: Announcement[];
};

type LegacyLearningData = Pick<
  State,
  | 'notes'
  | 'starred'
  | 'bookmarks'
  | 'progress'
  | 'planDone'
  | 'plannerTasks'
  | 'plannerDefaultOverrides'
  | 'plannerDeletedDefaults'
  | 'plannerScheduleItems'
  | 'plannerScheduleCompletions'
  | 'plannerCompletions'
  | 'plannerMinutesCredited'
  | 'plannerTaskStudySeconds'
  | 'recordedFocusSessionIds'
  | 'studyLog'
  | 'results'
>;

export const dayKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const todayKey = () => dayKey(new Date());
const LEGACY_PLANNER_KEY = 'study-sakha-custom-tasks-v1';
const LEGACY_SCOPED_STORAGE_KEYS = [
  'study-sakha-focus-history-v1',
  'study-sakha-meditation-history-v1',
  'study-sakha-break-history-v1',
  'study-sakha-hobby-history-v1',
  'study-sakha-focus-lock-session-v1',
] as const;
const LEGACY_HISTORY_STORAGE_KEYS = new Set([
  'study-sakha-focus-history-v1',
  'study-sakha-meditation-history-v1',
  'study-sakha-break-history-v1',
  'study-sakha-hobby-history-v1',
]);
const LEGACY_TEST_ATTEMPT_PREFIX = 'study-sakha-test-attempt-v1-';

function isPlannerDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isPlannerScheduleCategory(value: unknown): value is PlannerScheduleCategory {
  return value === 'Tasks' || value === 'Classes' || value === 'Exams' || value === 'Vacations' || value === 'Activities';
}

function migratePlannerScheduleItem(value: unknown): PlannerScheduleItem | null {
  if (!isRecord(value)) return null;
  const normalized = { ...value };
  for (const field of ['date', 'endDate', 'fromDate', 'untilDate', 'rangeFrom', 'rangeUntil', 'repeatUntil']) {
    const candidate = normalized[field];
    if (typeof candidate === 'string') {
      const isoDate = candidate.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/)?.[1];
      if (isoDate && isPlannerDate(isoDate)) normalized[field] = isoDate;
    }
  }
  for (const field of ['time', 'startTime', 'endTime']) {
    const candidate = normalized[field];
    if (typeof candidate === 'string') {
      const twelveHour = candidate.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (twelveHour) {
        const hour = Number(twelveHour[1]);
        const minute = Number(twelveHour[2]);
        if (hour >= 1 && hour <= 12 && minute <= 59) {
          const normalizedHour = (hour % 12) + (twelveHour[3].toUpperCase() === 'PM' ? 12 : 0);
          normalized[field] = `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }
      }
    }
  }
  if (typeof normalized.id !== 'string' || !normalized.id.trim() ||
    (!isPlannerScheduleCategory(normalized.category) && !['Task', 'Class', 'Exam', 'Vacation', 'Activity'].includes(String(normalized.category))) || typeof normalized.title !== 'string') return null;
  const category = isPlannerScheduleCategory(normalized.category) ? normalized.category : ({ Task: 'Tasks', Class: 'Classes', Exam: 'Exams', Vacation: 'Vacations', Activity: 'Activities' } as const)[normalized.category as 'Task' | 'Class' | 'Exam' | 'Vacation' | 'Activity'];

  const optionalStrings = [
    normalized.subject,
    normalized.type,
    normalized.teacher,
    normalized.date,
    normalized.time,
    normalized.endDate,
    normalized.startTime,
    normalized.endTime,
    normalized.fromDate,
    normalized.untilDate,
    normalized.room,
    normalized.building,
    normalized.seat,
    normalized.notes,
    normalized.taskType,
    normalized.instructor,
    normalized.seatNumber,
    normalized.onlineLink,
    normalized.location,
    normalized.examType,
    normalized.durationLabel,
    normalized.vacationPreset,
    normalized.coverPhotoName,
    normalized.termName,
    normalized.rangeFrom,
    normalized.rangeUntil,
    normalized.activityType,
    normalized.repeatUntil,
  ];
  if (optionalStrings.some((field) => field !== undefined && typeof field !== 'string')) return null;
  if (
    (normalized.date !== undefined && !isPlannerDate(normalized.date)) ||
    (normalized.endDate !== undefined && !isPlannerDate(normalized.endDate)) ||
    (normalized.fromDate !== undefined && !isPlannerDate(normalized.fromDate)) ||
    (normalized.untilDate !== undefined && !isPlannerDate(normalized.untilDate)) ||
    (normalized.rangeFrom !== undefined && !isPlannerDate(normalized.rangeFrom)) ||
    (normalized.rangeUntil !== undefined && !isPlannerDate(normalized.rangeUntil)) ||
    (normalized.repeatUntil !== undefined && !isPlannerDate(normalized.repeatUntil)) ||
    ([normalized.time, normalized.startTime, normalized.endTime].some((time) => time !== undefined && (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)))) ||
    (normalized.duration !== undefined &&
      (typeof normalized.duration !== 'number' || !Number.isFinite(normalized.duration) || normalized.duration <= 0)) ||
    (normalized.daysCount !== undefined &&
      (typeof normalized.daysCount !== 'number' || !Number.isInteger(normalized.daysCount) || normalized.daysCount < 1)) ||
    (normalized.occurs !== undefined && normalized.occurs !== 'Once' && normalized.occurs !== 'Repeating') ||
    (normalized.dateRange !== undefined && normalized.dateRange !== 'None' && normalized.dateRange !== 'Term' && normalized.dateRange !== 'Manual') ||
    (normalized.whereType !== undefined && normalized.whereType !== 'In Person' && normalized.whereType !== 'Online') ||
    (normalized.hasCoverPhoto !== undefined && typeof normalized.hasCoverPhoto !== 'boolean') ||
    (normalized.completed !== undefined && typeof normalized.completed !== 'boolean') ||
    (normalized.durationMinutes !== undefined &&
      (typeof normalized.durationMinutes !== 'number' || !Number.isFinite(normalized.durationMinutes) || normalized.durationMinutes < 0)) ||
    (normalized.whereMode !== undefined && normalized.whereMode !== 'in_person' && normalized.whereMode !== 'online') ||
    (normalized.dateRangeMode !== undefined && normalized.dateRangeMode !== 'none' && normalized.dateRangeMode !== 'term' && normalized.dateRangeMode !== 'manual') ||
    (normalized.recurrence !== undefined && !['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(String(normalized.recurrence))) ||
    (normalized.repeatDays !== undefined && (!Array.isArray(normalized.repeatDays) || !normalized.repeatDays.every((day) => typeof day === 'number' && day >= 0 && day <= 6))) ||
    (normalized.days !== undefined &&
      (!Array.isArray(normalized.days) || !normalized.days.every((day) => typeof day === 'string'))) ||
    (normalized.timeSlots !== undefined &&
      (!Array.isArray(normalized.timeSlots) ||
        !normalized.timeSlots.every((slot) =>
          isRecord(slot) &&
          typeof slot.id === 'string' &&
          Array.isArray(slot.days) &&
          slot.days.every((day) => typeof day === 'string') &&
          typeof slot.startTime === 'string' &&
          typeof slot.endTime === 'string'
        )))
  ) return null;

  return {
    id: normalized.id,
    category,
    title: normalized.title,
    ...(typeof normalized.subject === 'string' ? { subject: normalized.subject } : {}),
    ...(typeof normalized.type === 'string' ? { type: normalized.type } : {}),
    ...(typeof normalized.teacher === 'string' ? { teacher: normalized.teacher } : {}),
    ...(typeof normalized.date === 'string' ? { date: normalized.date } : {}),
    ...(typeof normalized.time === 'string' ? { time: normalized.time } : {}),
    ...(typeof normalized.endDate === 'string' ? { endDate: normalized.endDate } : {}),
    ...(typeof normalized.startTime === 'string' ? { startTime: normalized.startTime } : {}),
    ...(typeof normalized.endTime === 'string' ? { endTime: normalized.endTime } : {}),
    ...(typeof normalized.duration === 'number' ? { duration: normalized.duration } : {}),
    ...(normalized.occurs === 'Once' || normalized.occurs === 'Repeating' ? { occurs: normalized.occurs } : {}),
    ...(Array.isArray(normalized.days) ? { days: normalized.days } : {}),
    ...(Array.isArray(normalized.timeSlots)
      ? {
          timeSlots: normalized.timeSlots.map((slot) => ({
            id: slot.id,
            days: slot.days,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        }
      : {}),
    ...(normalized.dateRange === 'None' || normalized.dateRange === 'Term' || normalized.dateRange === 'Manual'
      ? { dateRange: normalized.dateRange }
      : {}),
    ...(typeof normalized.fromDate === 'string' ? { fromDate: normalized.fromDate } : {}),
    ...(typeof normalized.untilDate === 'string' ? { untilDate: normalized.untilDate } : {}),
    ...(normalized.whereType === 'In Person' || normalized.whereType === 'Online' ? { whereType: normalized.whereType } : {}),
    ...(typeof normalized.room === 'string' ? { room: normalized.room } : {}),
    ...(typeof normalized.building === 'string' ? { building: normalized.building } : {}),
    ...(typeof normalized.seat === 'string' ? { seat: normalized.seat } : {}),
    ...(typeof normalized.notes === 'string' ? { notes: normalized.notes } : {}),
    ...(typeof normalized.daysCount === 'number' ? { daysCount: normalized.daysCount } : {}),
    ...(typeof normalized.hasCoverPhoto === 'boolean' ? { hasCoverPhoto: normalized.hasCoverPhoto } : {}),
    ...(typeof normalized.completed === 'boolean' ? { completed: normalized.completed } : {}),
    ...(typeof normalized.taskType === 'string' ? { taskType: normalized.taskType } : {}),
    ...(typeof normalized.instructor === 'string' ? { instructor: normalized.instructor } : {}),
    ...(normalized.whereMode === 'in_person' || normalized.whereMode === 'online' ? { whereMode: normalized.whereMode } : {}),
    ...(typeof normalized.seatNumber === 'string' ? { seatNumber: normalized.seatNumber } : {}),
    ...(typeof normalized.onlineLink === 'string' ? { onlineLink: normalized.onlineLink } : {}),
    ...(typeof normalized.location === 'string' ? { location: normalized.location } : {}),
    ...(typeof normalized.examType === 'string' ? { examType: normalized.examType } : {}),
    ...(typeof normalized.durationMinutes === 'number' ? { durationMinutes: normalized.durationMinutes } : {}),
    ...(typeof normalized.durationLabel === 'string' ? { durationLabel: normalized.durationLabel } : {}),
    ...(typeof normalized.vacationPreset === 'string' ? { vacationPreset: normalized.vacationPreset } : {}),
    ...(typeof normalized.coverPhotoName === 'string' ? { coverPhotoName: normalized.coverPhotoName } : {}),
    ...(normalized.dateRangeMode === 'none' || normalized.dateRangeMode === 'term' || normalized.dateRangeMode === 'manual' ? { dateRangeMode: normalized.dateRangeMode } : {}),
    ...(typeof normalized.termName === 'string' ? { termName: normalized.termName } : {}),
    ...(typeof normalized.rangeFrom === 'string' ? { rangeFrom: normalized.rangeFrom } : {}),
    ...(typeof normalized.rangeUntil === 'string' ? { rangeUntil: normalized.rangeUntil } : {}),
    ...(typeof normalized.activityType === 'string' ? { activityType: normalized.activityType } : {}),
    ...(typeof normalized.recurrence === 'string' && ['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(normalized.recurrence)
      ? { recurrence: normalized.recurrence as PlannerScheduleItem['recurrence'] }
      : {}),
    ...(Array.isArray(normalized.repeatDays) ? { repeatDays: normalized.repeatDays } : {}),
    ...(typeof normalized.repeatUntil === 'string' ? { repeatUntil: normalized.repeatUntil } : {}),
  };
}

function plannerScheduleIssue(value: unknown): string {
  if (!isRecord(value)) return 'record must be an object';
  if (typeof value.id !== 'string' || !value.id.trim()) return 'id is missing or invalid';
  if (!isPlannerScheduleCategory(value.category) && !['Task', 'Class', 'Exam', 'Vacation', 'Activity'].includes(String(value.category))) return 'category is unsupported or invalid';
  if (typeof value.title !== 'string') return 'title is missing or invalid';
  const optionalStrings = ['subject', 'type', 'teacher', 'date', 'time', 'endDate', 'startTime', 'endTime', 'fromDate', 'untilDate', 'room', 'building', 'seat', 'notes', 'taskType', 'instructor', 'seatNumber', 'onlineLink', 'location', 'examType', 'durationLabel', 'vacationPreset', 'coverPhotoName', 'termName', 'rangeFrom', 'rangeUntil', 'activityType', 'repeatUntil'];
  for (const field of optionalStrings) {
    if (value[field] !== undefined && typeof value[field] !== 'string') return `${field} must be text`;
    if (['date', 'endDate', 'fromDate', 'untilDate', 'repeatUntil', 'rangeFrom', 'rangeUntil'].includes(field) && typeof value[field] === 'string' && !isPlannerDate(value[field])) return `${field} is not a valid YYYY-MM-DD date`;
    if (['time', 'startTime', 'endTime'].includes(field) && typeof value[field] === 'string' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value[field] as string)) return `${field} is not a valid 24-hour time`;
  }
  if (value.timeSlots !== undefined && (!Array.isArray(value.timeSlots) || value.timeSlots.some((slot) => !isRecord(slot) || typeof slot.id !== 'string' || !Array.isArray(slot.days) || typeof slot.startTime !== 'string' || typeof slot.endTime !== 'string'))) return 'timeSlots contains an invalid entry';
  for (const field of ['duration', 'daysCount', 'occurs', 'dateRange', 'whereType', 'hasCoverPhoto', 'completed', 'durationMinutes', 'whereMode', 'dateRangeMode', 'recurrence', 'repeatDays', 'days']) {
    if (value[field] === undefined) continue;
    const candidate = { ...value };
    delete candidate[field];
    if (!migratePlannerScheduleItem(candidate)) return `${field} has an invalid value`;
  }
  return 'schedule record has an invalid value';
}

function migratePlannerTask(value: unknown): PlannerTask | null {
  if (!value || typeof value !== 'object') return null;
  const task = value as Record<string, unknown>;
  if (
    typeof task.id !== 'string' ||
    !task.id ||
    typeof task.label !== 'string' ||
    typeof task.minutes !== 'number' ||
    !Number.isInteger(task.minutes) ||
    task.minutes < 1 ||
    task.minutes > 600
  ) return null;

  const category = typeof task.category === 'string' && task.category.trim()
    ? task.category.trim()
    : 'Other';
  const targetDate = isPlannerDate(task.targetDate) ? task.targetDate : todayKey();
  const completedOn = isPlannerDate(task.completedOn)
    ? task.completedOn
    : task.completed
      ? targetDate
      : null;
  const taskTypes: PlannerTaskType[] = ['Study', 'Revision', 'PYQ', 'Test', 'Current Affairs'];
  const taskType = taskTypes.includes(task.taskType as PlannerTaskType)
    ? task.taskType as PlannerTaskType
    : category === 'PYQ'
      ? 'PYQ'
      : category === 'Current Affairs'
        ? 'Current Affairs'
        : category === 'Mock Test'
          ? 'Test'
          : category === 'Note'
            ? 'Revision'
            : 'Study';
  const priorities: PlannerPriority[] = ['High', 'Medium', 'Low'];
  const priority = priorities.includes(task.priority as PlannerPriority)
    ? task.priority as PlannerPriority
    : 'Medium';
  const scopes: PlannerScope[] = ['daily', 'weekly', 'halfMonthly', 'monthly'];
  const scope = scopes.includes(task.scope as PlannerScope)
    ? task.scope as PlannerScope
    : 'daily';

  return {
    ...task,
    id: task.id,
    label: task.label.trim() || 'Study task',
    minutes: task.minutes,
    category,
    completed: completedOn === targetDate,
    completedOn,
    targetDate,
    taskType,
    priority,
    scope,
    periodKey: typeof task.periodKey === 'string' ? task.periodKey : targetDate,
  };
}

function normalizePlannerSettings(value: unknown, existingDailyGoal?: unknown): PlannerSettings {
  const saved = value && typeof value === 'object'
    ? value as Partial<PlannerSettings>
    : {};
  const preferred = Array.isArray(saved.preferredStudyTimes)
    ? saved.preferredStudyTimes.filter((item): item is string => {
        if (item === 'Morning' || item === 'Afternoon' || item === 'Evening') return true;
        if (typeof item !== 'string') return false;
        const match = item.match(/^Custom (\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
        if (!match) return false;
        const [, startHour, startMinute, endHour, endMinute] = match.map(Number);
        const start = startHour * 60 + startMinute;
        const end = endHour * 60 + endMinute;
        return startHour < 24 && startMinute < 60 && endHour < 24 && endMinute < 60 && end > start;
      })
    : initialState.plannerSettings.preferredStudyTimes;
  const dailyTargetHours = Number(saved.dailyTargetHours);
  const weeklyTargetHours = Number(saved.weeklyTargetHours);
  const legacyDailyTarget = Number(existingDailyGoal) / 60;
  return {
    dailyTargetHours: Number.isFinite(dailyTargetHours)
      ? Math.min(12, Math.max(0.5, dailyTargetHours))
      : Number.isFinite(legacyDailyTarget)
        ? Math.min(12, Math.max(0.5, legacyDailyTarget))
        : initialState.plannerSettings.dailyTargetHours,
    weeklyTargetHours: Number.isFinite(weeklyTargetHours)
      ? Math.min(84, Math.max(1, weeklyTargetHours))
      : initialState.plannerSettings.weeklyTargetHours,
    preferredStudyTimes: [...new Set(preferred)],
    autoScheduling: saved.autoScheduling === true,
    aiSuggestions: saved.aiSuggestions === true,
    defaultTaskDurationMinutes: Number.isFinite(Number(saved.defaultTaskDurationMinutes))
      ? Math.min(240, Math.max(5, Number(saved.defaultTaskDurationMinutes)))
      : initialState.plannerSettings.defaultTaskDurationMinutes,
    autoCarryForward: saved.autoCarryForward === true,
    recurringTasksEnabled: saved.recurringTasksEnabled !== false,
    breakIntervalMinutes: Number.isFinite(Number(saved.breakIntervalMinutes))
      ? Math.min(60, Math.max(0, Number(saved.breakIntervalMinutes)))
      : initialState.plannerSettings.breakIntervalMinutes,
  };
}

function normalizeSettings(value: unknown): State['settings'] {
  const saved = value && typeof value === 'object' ? value as Partial<State['settings']> : {};
  const themeMode = saved.themeMode === 'light' || saved.themeMode === 'dark' || saved.themeMode === 'system'
    ? saved.themeMode
    : initialState.settings.themeMode;
  const language = saved.language === 'hi' ? 'hi' : 'en';
  const bounded = (candidate: unknown, fallback: number, min: number, max: number) => {
    const numeric = Number(candidate);
    return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
  };
  const intensity = saved.focusAnimationIntensity === 'minimal' || saved.focusAnimationIntensity === 'rich'
    ? saved.focusAnimationIntensity
    : 'balanced';
  const length = saved.aiResponseLength === 'Concise' || saved.aiResponseLength === 'Detailed'
    ? saved.aiResponseLength
    : 'Balanced';
  return {
    ...initialState.settings,
    ...saved,
    themeMode,
    language,
    dailyGoalMin: bounded(saved.dailyGoalMin, initialState.settings.dailyGoalMin, 1, 1440),
    textScale: bounded(saved.textScale, initialState.settings.textScale, 0.8, 1.4),
    notifications: saved.notifications !== false,
    accentColor: typeof saved.accentColor === 'string' ? saved.accentColor : initialState.settings.accentColor,
    customAccentHex: typeof saved.customAccentHex === 'string' && /^#[0-9a-f]{6}$/i.test(saved.customAccentHex)
      ? saved.customAccentHex
      : null,
    highContrast: saved.highContrast === true,
    reduceMotion: saved.reduceMotion === true,
    animationIntensity: saved.animationIntensity === 'minimal' || saved.animationIntensity === 'rich'
      ? saved.animationIntensity
      : 'balanced',
    displayScaling: bounded(saved.displayScaling, initialState.settings.displayScaling, 90, 115),
    layoutDensity: saved.layoutDensity === 'compact' ? 'compact' : 'comfortable',
    backgroundId: typeof saved.backgroundId === 'string' ? saved.backgroundId : initialState.settings.backgroundId,
    backgroundOpacity: bounded(saved.backgroundOpacity, initialState.settings.backgroundOpacity, 10, 100),
    overlayIntensity: bounded(saved.overlayIntensity, initialState.settings.overlayIntensity, 0, 85),
    dashboardWidgets: {
      ...initialState.settings.dashboardWidgets,
      ...(saved.dashboardWidgets && typeof saved.dashboardWidgets === 'object' ? saved.dashboardWidgets : {}),
    },
    dashboardQuickActions: Array.isArray(saved.dashboardQuickActions)
      ? saved.dashboardQuickActions.filter((value): value is string => typeof value === 'string').slice(0, 8)
      : initialState.settings.dashboardQuickActions,
    focusDurationMinutes: bounded(saved.focusDurationMinutes, initialState.settings.focusDurationMinutes, 1, 240),
    shortBreakMinutes: bounded(saved.shortBreakMinutes, initialState.settings.shortBreakMinutes, 0, 120),
    longBreakMinutes: bounded(saved.longBreakMinutes, initialState.settings.longBreakMinutes, 0, 240),
    meditationDurationMinutes: bounded(saved.meditationDurationMinutes, initialState.settings.meditationDurationMinutes, 1, 240),
    focusAutoStartNextSession: saved.focusAutoStartNextSession === true,
    focusThemeId: typeof saved.focusThemeId === 'string' ? saved.focusThemeId : initialState.settings.focusThemeId,
    focusAnimationIntensity: intensity,
    reduceFocusMotion: saved.reduceFocusMotion === true,
    focusMusicId: typeof saved.focusMusicId === 'string' ? saved.focusMusicId : initialState.settings.focusMusicId,
    focusMusicVolume: bounded(saved.focusMusicVolume, initialState.settings.focusMusicVolume, 0, 1),
    aiResponseLanguage: typeof saved.aiResponseLanguage === 'string' ? saved.aiResponseLanguage : initialState.settings.aiResponseLanguage,
    aiResponseLength: length,
    aiDetailLevel: typeof saved.aiDetailLevel === 'string' ? saved.aiDetailLevel : initialState.settings.aiDetailLevel,
    aiLearningMode: typeof saved.aiLearningMode === 'string' ? saved.aiLearningMode : initialState.settings.aiLearningMode,
    aiSaveChatHistory: saved.aiSaveChatHistory !== false,
  };
}

function seedStudyLog(): Record<string, number> {
  const log: Record<string, number> = {};
  const base = [55, 90, 40, 120, 75, 20, 95, 110, 60, 0, 85, 130, 45, 70, 100, 35, 80, 115, 50, 65, 90, 25, 105, 75, 60, 95, 40, 85, 70, 110];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    log[dayKey(d)] = base[i] ?? 0;
  }
  log[todayKey()] = 42;
  return log;
}

const initialState: State = {
  hydrated: false,
  storageReady: false,
  authReady: false,
  user: null,
  settings: {
    themeMode: 'system', language: 'en', dailyGoalMin: 180, textScale: 1, notifications: true,
    accentColor: 'indigo', customAccentHex: null, highContrast: false, reduceMotion: false,
    animationIntensity: 'balanced', displayScaling: 100, layoutDensity: 'comfortable',
    backgroundId: 'none', backgroundOpacity: 100, overlayIntensity: 0,
    dashboardWidgets: { streakCard: true, dailyGoalRing: true, quickRevision: true, sakhaAiPrompt: true, upcomingTests: true },
    dashboardQuickActions: ['Focus Timer', 'Sakha AI', 'Daily PYQ', 'Add Task'],
    focusDurationMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, meditationDurationMinutes: 10,
    focusAutoStartNextSession: false,
    focusThemeId: 'obsidian', focusAnimationIntensity: 'balanced', reduceFocusMotion: false,
    focusMusicId: 'pure_cosmic_waves', focusMusicVolume: 0.65,
    aiResponseLanguage: 'Bilingual (Hinglish)', aiResponseLength: 'Balanced', aiDetailLevel: 'Exam-Ready',
    aiLearningMode: 'Teacher Mode', aiSaveChatHistory: true,
  },
  notes: [
    {
      id: 'un1',
      title: 'Polity revision — Writs cheat sheet',
      folder: 'My Revision',
      tags: ['Polity', 'Article 32', 'Quick Recall'],
      exam: 'upsc',
      subject: 'Polity',
      updatedAt: Date.now() - 1000 * 60 * 60 * 20,
      body:
        'Habeas Corpus — to produce the body; issued against both public authorities and private individuals.\n\nMandamus — command to a public official to perform a duty; not available against private persons.\n\nCertiorari — quash an order passed without jurisdiction.\n\nProhibition — prevent a lower court from exceeding jurisdiction.\n\nArticle 32 is the protector of rights and the Supreme Court is the guardian of the Constitution.',
    },
    {
      id: 'un2',
      title: 'Mistakes log — Mock #13',
      folder: 'Error Log',
      tags: ['Mistakes', 'Economy'],
      exam: 'upsc',
      subject: 'Economy',
      updatedAt: Date.now() - 1000 * 60 * 60 * 54,
      body:
        'Confused SDF with reverse repo — SDF is now the floor of the corridor and needs no collateral.\n\nMarked moral suasion as quantitative. It is qualitative.\n\nMisread the question on GNP vs development; read the stem twice when the word "not" appears.',
    },
  ],
  starred: ['r1', 'r5'],
  bookmarks: ['p2', 'p13'],
  progress: {
    r5: { percent: 46, at: Date.now() - 1000 * 60 * 90, title: 'Modern Indian History — Spectrum Companion' },
    r1: { percent: 78, at: Date.now() - 1000 * 60 * 60 * 6, title: 'Fundamental Rights — Articles 12 to 35' },
    r3: { percent: 22, at: Date.now() - 1000 * 60 * 60 * 30, title: 'Monetary Policy & Inflation Targeting' },
  },
  planDone: {},
  plannerSelectedDate: todayKey(),
  plannerTasks: [],
  plannerTasksLoaded: false,
  plannerLegacyMigrated: false,
  plannerTaskLoadError: null,
  plannerPersistenceError: null,
  plannerDefaultOverrides: {},
  plannerDeletedDefaults: [],
  plannerSettings: {
    dailyTargetHours: 3,
    weeklyTargetHours: 10,
    preferredStudyTimes: ['Morning'],
    autoScheduling: false,
    aiSuggestions: false,
    defaultTaskDurationMinutes: 25,
    autoCarryForward: false,
    recurringTasksEnabled: true,
    breakIntervalMinutes: 10,
  },
  plannerScheduleItems: [],
  plannerScheduleCompletions: {},
  plannerCompletions: {},
  plannerMinutesCredited: {},
  plannerTaskStudySeconds: {},
  recordedFocusSessionIds: [],
  focusHistory: [],
  studyLog: {},
  results: [],
  chat: [],
  notifications: [],
  learners: LEARNERS,
  queue: PENDING_CONTENT,
  managedContent: [],
  managedContentError: null,
  announcements: [],
};

export type Action =
  | { type: 'hydrate'; payload: Partial<State> }
  | { type: 'restore'; payload: Partial<State>; tasks: PlannerTask[]; pendingActions: Action[]; profile?: Partial<User> }
  | { type: 'importLegacyLearningData'; payload: LegacyLearningData }
  | { type: 'recoveryStar'; id: string; starred: boolean }
  | { type: 'recoveryBookmark'; id: string; bookmarked: boolean }
  | { type: 'recoveryPlan'; id: string; date: string; completed: boolean }
  | { type: 'reconcilePlannerTasks'; tasks: PlannerTask[]; deletedIds: string[] }
  | { type: 'authResolved'; user: User | null }
  | { type: 'authCheckFailed' }
  | { type: 'signIn'; user: User }
  | { type: 'updateProfile'; patch: Partial<Pick<User, 'name' | 'email' | 'exam' | 'photoUri' | 'birthday' | 'phoneNumber' | 'currentCity' | 'examFocus'>> }
  | { type: 'signOut' }
  | { type: 'settings'; patch: Partial<State['settings']> }
  | { type: 'saveNote'; note: UserNote }
  | { type: 'deleteNote'; id: string }
  | { type: 'toggleStar'; id: string }
  | { type: 'toggleBookmark'; id: string }
  | { type: 'progress'; id: string; percent: number; title: string }
  | { type: 'togglePlan'; id: string; date?: string }
  | {
      type: 'setPlannerTaskCompletion';
      taskId: string;
      date: string;
      completed: boolean;
      isDefault: boolean;
      completion: PlannerCompletion;
    }
  | { type: 'plannerSelectedDate'; date: string }
  | { type: 'plannerTasksLoaded'; tasks: PlannerTask[]; migrationSucceeded: boolean; error?: string }
  | { type: 'plannerPersistence'; error: string | null }
  | { type: 'savePlannerTasks'; tasks: PlannerTask[] }
  | { type: 'plannerDefaultOverride'; id: string; patch: Partial<Pick<PlannerTask, 'label' | 'minutes' | 'category' | 'taskType' | 'priority' | 'targetDate'>> }
  | { type: 'deletePlannerDefault'; id: string }
  | { type: 'plannerSettings'; patch: Partial<PlannerSettings> }
  | { type: 'addPlannerScheduleItem'; item: PlannerScheduleItem }
  | { type: 'updatePlannerScheduleItem'; item: PlannerScheduleItem }
  | { type: 'deletePlannerScheduleItem'; id: string }
  | { type: 'setPlannerScheduleCompletion'; occurrenceId: string; date: string; completed: boolean }
  | { type: 'creditPlanMinutes'; id: string; date: string; minutes: number }
  | {
      type: 'recordFocusStudy';
      id: string;
      date: string;
      taskId: string | null;
      seconds: number;
      taskTitle?: string;
      category?: string;
      plannedMinutes?: number;
      scheduleOccurrenceId?: string;
      schedulePlannedSeconds?: number;
      status?: 'completed' | 'interrupted' | 'abandoned';
    }
  | { type: 'upsertFocusHistory'; record: FocusHistoryRecord }
  | { type: 'updateFocusHistory'; id: string; patch: Partial<Pick<FocusHistoryRecord, 'subject' | 'focusQuality'>> }
  | { type: 'plannerCompletion'; date: string; completion: PlannerCompletion; completed: boolean }
  | { type: 'study'; minutes: number }
  | { type: 'result'; result: TestResult }
  | { type: 'chat'; msg: ChatMsg }
  | { type: 'chatEphemeral'; msg: ChatMsg }
  | { type: 'clearChat' }
  | { type: 'readNotif'; id?: string }
  | { type: 'notify'; notif: AppNotification }
  | { type: 'learnerStatus'; id: string; status: 'active' | 'suspended' }
  | { type: 'reviewContent'; id: string; status: 'pending' | 'approved' | 'rejected' }
  | { type: 'saveManagedContent'; content: ManagedContent }
  | { type: 'deleteManagedContent'; id: string }
  | { type: 'managedContentLoaded'; content: ManagedContent[]; error: string | null }
  | { type: 'announce'; item: Announcement };

const PERSISTED_ACTION_TYPES: ReadonlySet<Action['type']> = new Set([
  'updateProfile',
  'settings',
  'saveNote',
  'deleteNote',
  'toggleStar',
  'toggleBookmark',
  'progress',
  'togglePlan',
  'setPlannerTaskCompletion',
  'savePlannerTasks',
  'plannerDefaultOverride',
  'deletePlannerDefault',
  'plannerSettings',
  'addPlannerScheduleItem',
  'updatePlannerScheduleItem',
  'deletePlannerScheduleItem',
  'setPlannerScheduleCompletion',
  'creditPlanMinutes',
  'recordFocusStudy',
  'upsertFocusHistory',
  'updateFocusHistory',
  'plannerCompletion',
  'study',
  'result',
  'chat',
  'clearChat',
  'importLegacyLearningData',
  'readNotif',
  'notify',
  'learnerStatus',
  'reviewContent',
  'announce',
]);

const THEME_MODE_STORAGE_KEY = 'sakha-theme-mode-v1';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isPersistedAction(action: Action) {
  return PERSISTED_ACTION_TYPES.has(action.type);
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.payload, user: state.user, authReady: state.authReady, hydrated: true };
    case 'restore': {
      let restored = reducer(state, {
        type: 'hydrate',
        payload: { ...action.payload, plannerTasksLoaded: false, storageReady: false },
      });
      restored = reducer(restored, {
        type: 'plannerTasksLoaded',
        tasks: action.tasks,
        migrationSucceeded: true,
      });
      restored = { ...restored, storageReady: true };
      const currentUser = restored.user;
      if (action.profile && currentUser && currentUser.id === action.profile.id) {
        restored = {
          ...restored,
          user: {
            ...currentUser,
            ...action.profile,
            id: currentUser.id,
            name: action.profile.name ?? currentUser.name,
            email: action.profile.email ?? currentUser.email,
            role: action.profile.role ?? currentUser.role,
            exam: action.profile.exam ?? currentUser.exam,
            joined: action.profile.joined ?? currentUser.joined,
          },
        };
      }
      return action.pendingActions.reduce((current, pendingAction) => reducer(current, pendingAction), restored);
    }
    case 'importLegacyLearningData': {
      const imported = action.payload;
      const mergeById = <T extends { id: string }>(current: T[], legacy: T[]) => {
        const currentIds = new Set(current.map((item) => item.id));
        return [...current, ...legacy.filter((item) => !currentIds.has(item.id))];
      };
      const completionDates = new Set([
        ...Object.keys(imported.plannerCompletions),
        ...Object.keys(state.plannerCompletions),
      ]);
      const plannerCompletions = Object.fromEntries(
        [...completionDates].map((date) => {
          const current = state.plannerCompletions[date] ?? [];
          const existingIds = new Set(current.map((item) => item.taskId));
          const legacy = imported.plannerCompletions[date] ?? [];
          return [date, [...current, ...legacy.filter((item) => !existingIds.has(item.taskId))]];
        })
      );
      const planDates = new Set([...Object.keys(imported.planDone), ...Object.keys(state.planDone)]);
      const creditedDates = new Set([
        ...Object.keys(imported.plannerMinutesCredited),
        ...Object.keys(state.plannerMinutesCredited),
      ]);
      return {
        ...state,
        notes: mergeById(state.notes, imported.notes),
        starred: Array.from(new Set([...state.starred, ...imported.starred])),
        bookmarks: Array.from(new Set([...state.bookmarks, ...imported.bookmarks])),
        progress: { ...imported.progress, ...state.progress },
        planDone: Object.fromEntries(
          [...planDates].map((date) => [
            date,
            Array.from(new Set([...(state.planDone[date] ?? []), ...(imported.planDone[date] ?? [])])),
          ])
        ),
        plannerTasks: mergeById(state.plannerTasks, imported.plannerTasks),
        plannerScheduleItems: mergeById(state.plannerScheduleItems, imported.plannerScheduleItems),
        plannerScheduleCompletions: { ...imported.plannerScheduleCompletions, ...state.plannerScheduleCompletions },
        plannerDefaultOverrides: { ...imported.plannerDefaultOverrides, ...state.plannerDefaultOverrides },
        plannerDeletedDefaults: Array.from(new Set([...state.plannerDeletedDefaults, ...imported.plannerDeletedDefaults])),
        plannerCompletions,
        plannerMinutesCredited: Object.fromEntries(
          [...creditedDates].map((date) => [
            date,
            Array.from(new Set([...(state.plannerMinutesCredited[date] ?? []), ...(imported.plannerMinutesCredited[date] ?? [])])),
          ])
        ),
        plannerTaskStudySeconds: { ...imported.plannerTaskStudySeconds, ...state.plannerTaskStudySeconds },
        recordedFocusSessionIds: Array.from(new Set([...state.recordedFocusSessionIds, ...imported.recordedFocusSessionIds])),
        studyLog: { ...imported.studyLog, ...state.studyLog },
        results: mergeById(state.results, imported.results),
      };
    }
    case 'recoveryStar':
      return {
        ...state,
        starred: action.starred
          ? state.starred.includes(action.id) ? state.starred : [action.id, ...state.starred]
          : state.starred.filter((id) => id !== action.id),
      };
    case 'recoveryBookmark':
      return {
        ...state,
        bookmarks: action.bookmarked
          ? state.bookmarks.includes(action.id) ? state.bookmarks : [action.id, ...state.bookmarks]
          : state.bookmarks.filter((id) => id !== action.id),
      };
    case 'recoveryPlan': {
      const current = state.planDone[action.date] ?? [];
      const completed = action.completed
        ? current.includes(action.id) ? current : [...current, action.id]
        : current.filter((id) => id !== action.id);
      return { ...state, planDone: { ...state.planDone, [action.date]: completed } };
    }
    case 'reconcilePlannerTasks': {
      const tasks = new Map(state.plannerTasks.map((task) => [task.id, task]));
      action.deletedIds.forEach((id) => tasks.delete(id));
      action.tasks.forEach((task) => tasks.set(task.id, task));
      return { ...state, plannerTasks: Array.from(tasks.values()) };
    }
    case 'authResolved': {
      if (state.user?.id === action.user?.id) {
        const user = action.user && state.user
          ? {
              ...action.user,
              birthday: state.user.birthday,
              phoneNumber: state.user.phoneNumber,
              currentCity: state.user.currentCity,
              examFocus: state.user.examFocus,
              photoUri: state.user.photoUri,
            }
          : action.user;
        return { ...state, user, authReady: true };
      }
      return {
        ...state,
        user: action.user,
        authReady: true,
        hydrated: false,
        storageReady: false,
        settings: {
          ...state.settings,
          dailyGoalMin: initialState.settings.dailyGoalMin,
          notifications: initialState.settings.notifications,
        },
        notes: initialState.notes,
        starred: initialState.starred,
        bookmarks: initialState.bookmarks,
        progress: initialState.progress,
        planDone: initialState.planDone,
        plannerTasks: [],
        plannerTasksLoaded: false,
        plannerLegacyMigrated: false,
        plannerTaskLoadError: null,
        plannerPersistenceError: null,
        plannerDefaultOverrides: {},
        plannerDeletedDefaults: [],
        plannerSettings: initialState.plannerSettings,
        plannerScheduleItems: [],
        plannerScheduleCompletions: {},
        plannerCompletions: {},
        plannerMinutesCredited: {},
        plannerTaskStudySeconds: {},
        recordedFocusSessionIds: [],
        focusHistory: [],
        studyLog: {},
        results: [],
        chat: [],
        notifications: initialState.notifications,
        managedContent: [],
        managedContentError: null,
      };
    }
    case 'authCheckFailed':
      // A failed verification must not leave the previous account authenticated
      // while a new or refreshed session is unresolved.
      return reducer(state, { type: 'authResolved', user: null });
    case 'signIn':
      return { ...state, user: action.user };
    case 'updateProfile':
      return state.user ? { ...state, user: { ...state.user, ...action.patch } } : state;
    case 'signOut':
      return { ...state, user: null };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'saveNote': {
      const exists = state.notes.some((n) => n.id === action.note.id);
      return {
        ...state,
        notes: exists ? state.notes.map((n) => (n.id === action.note.id ? action.note : n)) : [action.note, ...state.notes],
      };
    }
    case 'deleteNote':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };
    case 'toggleStar':
      return {
        ...state,
        starred: state.starred.includes(action.id) ? state.starred.filter((s) => s !== action.id) : [action.id, ...state.starred],
      };
    case 'toggleBookmark':
      return {
        ...state,
        bookmarks: state.bookmarks.includes(action.id)
          ? state.bookmarks.filter((s) => s !== action.id)
          : [action.id, ...state.bookmarks],
      };
    case 'progress':
      return {
        ...state,
        progress: { ...state.progress, [action.id]: { percent: action.percent, at: Date.now(), title: action.title } },
      };
    case 'togglePlan': {
      const k = action.date ?? todayKey();
      const list = state.planDone[k] ?? [];
      return {
        ...state,
        planDone: {
          ...state.planDone,
          [k]: list.includes(action.id) ? list.filter((x) => x !== action.id) : [...list, action.id],
        },
      };
    }
    case 'setPlannerTaskCompletion': {
      if (!action.taskId || !isPlannerDate(action.date)) return state;

      const existingCompletions = state.plannerCompletions[action.date] ?? [];
      const plannerCompletions = {
        ...state.plannerCompletions,
        [action.date]: action.completed
          ? [
              ...existingCompletions.filter((item) => item.taskId !== action.taskId),
              action.completion,
            ]
          : existingCompletions.filter((item) => item.taskId !== action.taskId),
      };

      if (action.isDefault) {
        const existingDone = state.planDone[action.date] ?? [];
        const planDone = {
          ...state.planDone,
          [action.date]: action.completed
            ? Array.from(new Set([...existingDone, action.taskId]))
            : existingDone.filter((id) => id !== action.taskId),
        };

        return { ...state, planDone, plannerCompletions };
      }

      const plannerTasks = state.plannerTasks.map((task) =>
        task.id === action.taskId
          ? {
              ...task,
              completed: action.completed,
              completedOn: action.completed ? action.date : null,
            }
          : task
      );

      return { ...state, plannerTasks, plannerCompletions };
    }
    case 'plannerSelectedDate':
      return isPlannerDate(action.date)
        ? { ...state, plannerSelectedDate: action.date }
        : state;
    case 'plannerTasksLoaded': {
      const plannerCompletions = { ...state.plannerCompletions };
      action.tasks.forEach((task) => {
        if (task.completedOn !== task.targetDate) return;
        const existing = plannerCompletions[task.targetDate] ?? [];
        if (existing.some((completion) => completion.taskId === task.id)) return;
        plannerCompletions[task.targetDate] = [
          ...existing,
          {
            taskId: task.id,
            label: task.label,
            minutes: task.minutes,
            category: task.category,
            taskType: task.taskType,
          },
        ];
      });
      return {
        ...state,
        plannerTasks: action.tasks,
        plannerCompletions,
        plannerTasksLoaded: true,
        plannerLegacyMigrated: action.migrationSucceeded,
        plannerTaskLoadError: action.error ?? null,
      };
    }
    case 'plannerPersistence':
      return state.plannerPersistenceError === action.error
        ? state
        : { ...state, plannerPersistenceError: action.error };
    case 'savePlannerTasks':
      return { ...state, plannerTasks: action.tasks };
    case 'plannerDefaultOverride':
      return {
        ...state,
        plannerDefaultOverrides: {
          ...state.plannerDefaultOverrides,
          [action.id]: { ...state.plannerDefaultOverrides[action.id], ...action.patch },
        },
      };
    case 'deletePlannerDefault':
      return state.plannerDeletedDefaults.includes(action.id)
        ? state
        : { ...state, plannerDeletedDefaults: [...state.plannerDeletedDefaults, action.id] };
    case 'plannerSettings': {
      const plannerSettings = { ...state.plannerSettings, ...action.patch };
      return {
        ...state,
        plannerSettings,
        settings: action.patch.dailyTargetHours === undefined
          ? state.settings
          : { ...state.settings, dailyGoalMin: Math.round(plannerSettings.dailyTargetHours * 60) },
      };
    }
    case 'addPlannerScheduleItem':
      return state.plannerScheduleItems.some((item) => item.id === action.item.id)
        ? state
        : { ...state, plannerScheduleItems: [action.item, ...state.plannerScheduleItems] };
    case 'updatePlannerScheduleItem':
      return {
        ...state,
        plannerScheduleItems: state.plannerScheduleItems.map((item) =>
          item.id === action.item.id ? action.item : item
        ),
      };
    case 'deletePlannerScheduleItem':
      return {
        ...state,
        plannerScheduleItems: state.plannerScheduleItems.filter((item) => item.id !== action.id),
      };
    case 'setPlannerScheduleCompletion':
      if (!action.occurrenceId || !isPlannerDate(action.date)) return state;
      return {
        ...state,
        plannerScheduleCompletions: action.completed
          ? { ...state.plannerScheduleCompletions, [action.occurrenceId]: action.date }
          : Object.fromEntries(
              Object.entries(state.plannerScheduleCompletions)
                .filter(([id]) => id !== action.occurrenceId)
            ),
      };
    case 'creditPlanMinutes': {
      const credited = state.plannerMinutesCredited[action.date] ?? [];
      if (credited.includes(action.id)) return state;
      return {
        ...state,
        plannerMinutesCredited: {
          ...state.plannerMinutesCredited,
          [action.date]: [...credited, action.id],
        },
        studyLog: {
          ...state.studyLog,
          [action.date]: (state.studyLog[action.date] ?? 0) + action.minutes,
        },
      };
    }
    case 'recordFocusStudy': {
      if (
        !action.id ||
        !isPlannerDate(action.date) ||
        !Number.isFinite(action.seconds) ||
        action.seconds <= 0 ||
        state.recordedFocusSessionIds.includes(action.id)
      ) return state;
      const studySeconds = { ...state.plannerTaskStudySeconds };
      if (action.taskId) {
        studySeconds[action.taskId] = (studySeconds[action.taskId] ?? 0) + action.seconds;
      }
      if (action.scheduleOccurrenceId && action.scheduleOccurrenceId !== action.taskId) {
        studySeconds[action.scheduleOccurrenceId] =
          (studySeconds[action.scheduleOccurrenceId] ?? 0) + action.seconds;
      }
      const occurrenceSeconds = action.scheduleOccurrenceId
        ? studySeconds[action.scheduleOccurrenceId] ?? 0
        : 0;

      return {
        ...state,
        recordedFocusSessionIds: [...state.recordedFocusSessionIds, action.id],
        plannerTaskStudySeconds: studySeconds,
        plannerScheduleCompletions: action.scheduleOccurrenceId &&
          action.schedulePlannedSeconds !== undefined &&
          action.schedulePlannedSeconds > 0 &&
          occurrenceSeconds >= action.schedulePlannedSeconds
          ? {
              ...state.plannerScheduleCompletions,
              [action.scheduleOccurrenceId]: action.date,
            }
          : state.plannerScheduleCompletions,
        studyLog: {
          ...state.studyLog,
          [action.date]: (state.studyLog[action.date] ?? 0) + action.seconds / 60,
        },
      };
    }
    case 'upsertFocusHistory': {
      const exists = state.focusHistory.some((record) => record.id === action.record.id);
      return {
        ...state,
        focusHistory: exists
          ? state.focusHistory.map((record) => record.id === action.record.id ? { ...record, ...action.record } : record)
          : [action.record, ...state.focusHistory],
      };
    }
    case 'updateFocusHistory':
      return {
        ...state,
        focusHistory: state.focusHistory.map((record) => record.id === action.id ? { ...record, ...action.patch } : record),
      };
    case 'plannerCompletion': {
      const completions = state.plannerCompletions[action.date] ?? [];
      const next = action.completed
        ? [
            ...completions.filter((item) => item.taskId !== action.completion.taskId),
            action.completion,
          ]
        : completions.filter((item) => item.taskId !== action.completion.taskId);
      return {
        ...state,
        plannerCompletions: {
          ...state.plannerCompletions,
          [action.date]: next,
        },
      };
    }
    case 'study': {
      const k = todayKey();
      return { ...state, studyLog: { ...state.studyLog, [k]: (state.studyLog[k] ?? 0) + action.minutes } };
    }
    case 'result':
      return { ...state, results: [action.result, ...state.results] };
    case 'chat':
    case 'chatEphemeral':
      return {
        ...state,
        chat: state.chat.some((item) => item.id === action.msg.id)
          ? state.chat.map((item) => item.id === action.msg.id ? action.msg : item)
          : [...state.chat, action.msg],
      };
    case 'clearChat':
      return { ...state, chat: [] };
    case 'readNotif':
      return {
        ...state,
        notifications: state.notifications.map((n) => (!action.id || n.id === action.id ? { ...n, read: true } : n)),
      };
    case 'notify':
      if (!state.settings.notifications) return state;
      return { ...state, notifications: [action.notif, ...state.notifications] };
    case 'learnerStatus':
      return { ...state, learners: state.learners.map((l) => (l.id === action.id ? { ...l, status: action.status } : l)) };
    case 'reviewContent':
      return { ...state, queue: state.queue.map((c) => (c.id === action.id ? { ...c, status: action.status } : c)) };
    case 'saveManagedContent': {
      const exists = state.managedContent.some((item) => item.id === action.content.id);
      return {
        ...state,
        managedContentError: null,
        managedContent: exists
          ? state.managedContent.map((item) => item.id === action.content.id ? action.content : item)
          : [action.content, ...state.managedContent],
      };
    }
    case 'deleteManagedContent':
      return {
        ...state,
        managedContent: state.managedContent.filter((item) => item.id !== action.id),
        managedContentError: null,
      };
    case 'managedContentLoaded':
      return { ...state, managedContent: action.content, managedContentError: action.error };
    case 'announce':
      return { ...state, announcements: [action.item, ...state.announcements] };
    default:
      return state;
  }
}

type Ctx = {
  state: State;
  syncStatus: SyncStatus;
  hydrationError: string | null;
  retryHydration: () => void;
  plannerRecoveryCount: number;
  plannerRecoveryIssues: string[];
  retryPlannerRecovery: () => void;
  legacyMigrationAvailable: boolean;
  legacyMigrationError: string | null;
  importingLegacyData: boolean;
  importLegacyData: () => Promise<{ ok: boolean; error?: string }>;
  keepLegacyDataSeparate: () => Promise<{ ok: boolean; error?: string }>;
  retryLegacyScan: () => void;
  streak: number;
  todayMinutes: number;
  todayDone: string[];
  unread: number;
  badges: typeof BADGES;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string, exam: ExamId) => Promise<{ ok: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<{ ok: boolean; error?: string }>;
  saveProfile: (
    patch: Partial<Pick<User, 'name' | 'email' | 'exam' | 'photoUri' | 'birthday' | 'phoneNumber' | 'currentCity' | 'examFocus'>>
  ) => Promise<{ ok: true; emailChangePending?: boolean } | { ok: false; error: string }>;
  saveManagedContent: (
    content: ManagedContent,
    file?: { blob: Blob | ArrayBuffer; name: string; size: number }
  ) => Promise<{ ok: true; warning?: string } | { ok: false; error: string }>;
  deleteManagedContent: (id: string) => Promise<{ ok: true; warning?: string } | { ok: false; error: string }>;
  dispatch: React.Dispatch<Action>;
};

const StoreCtx = createContext<Ctx | null>(null);

const isExamId = (value: unknown): value is ExamId =>
  value === 'upsc' || value === 'ras' || value === 'rpsc_rssb' || value === 'ssc' || value === 'banking' || value === 'neet' || value === 'jee';

const isManagedContentType = (value: unknown): value is ManagedContentType =>
  value === 'note' || value === 'book' || value === 'pyq-set' || value === 'test' || value === 'current-affairs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTestQuestion(value: unknown): value is TestQuestion {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.section === 'string'
    && typeof value.subject === 'string'
    && typeof value.question === 'string'
    && Array.isArray(value.options)
    && value.options.every((option) => typeof option === 'string')
    && typeof value.answer === 'number'
    && Number.isInteger(value.answer)
    && value.answer >= 0
    && value.answer < value.options.length
    && typeof value.explanation === 'string';
}

function managedContentFromRow(value: unknown): ManagedContent | null {
  if (!isRecord(value) || !isRecord(value.payload)) return null;
  const { id, content_type, title, description, exam_id, subject, topic, source_url, file_object_path, status, payload, updated_at } = value;
  if (
    typeof id !== 'string' ||
    !isManagedContentType(content_type) ||
    typeof title !== 'string' ||
    typeof description !== 'string' ||
    !isExamId(exam_id) ||
    typeof subject !== 'string' ||
    typeof topic !== 'string' ||
    (source_url !== null && typeof source_url !== 'string') ||
    (file_object_path !== null && typeof file_object_path !== 'string') ||
    (status !== 'draft' && status !== 'published') ||
    typeof updated_at !== 'string'
  ) return null;

  const updatedAt = new Date(updated_at).getTime();
  if (!Number.isFinite(updatedAt)) return null;
  const questions = Array.isArray(payload.questions) && payload.questions.every(isTestQuestion)
    ? payload.questions
    : undefined;
  const points = Array.isArray(payload.points) && payload.points.every((point) => typeof point === 'string')
    ? payload.points
    : undefined;

  return {
    id,
    type: content_type,
    title,
    description,
    exam: exam_id,
    subject,
    topic,
    sourceUrl: typeof source_url === 'string' ? source_url : undefined,
    fileObjectPath: typeof file_object_path === 'string' ? file_object_path : undefined,
    published: status === 'published',
    updatedAt,
    body: typeof payload.body === 'string' ? payload.body : undefined,
    questions,
    durationMin: typeof payload.durationMin === 'number' ? payload.durationMin : undefined,
    points,
    eventDate: typeof payload.eventDate === 'string' ? payload.eventDate : undefined,
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (!isRecord(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const message = typeof error.message === 'string'
    ? error.message
    : error instanceof Error
      ? error.message
      : null;
  if (!message) return fallback;

  const code = typeof error.code === 'string' ? ` (${error.code})` : '';
  const details = typeof error.details === 'string' ? ` Details: ${error.details}` : '';
  const hint = typeof error.hint === 'string' ? ` Hint: ${error.hint}` : '';
  const statusCode = typeof error.statusCode === 'string' || typeof error.statusCode === 'number'
    ? ` (HTTP ${error.statusCode})`
    : '';
  return `${message}${code}${statusCode}${details}${hint}`;
}

type RecoverySnapshot = {
  payload: Partial<State>;
  tasks: PlannerTask[];
  profile?: Partial<User>;
  plannerRecoveryCount: number;
  plannerRecoveryIssues: string[];
};

async function readRecoverySnapshot(userId: string | null): Promise<RecoverySnapshot> {
  const raw = await AsyncStorage.getItem(getUserScopedStorageKey(KEY, userId));
  const savedThemeMode = await AsyncStorage.getItem(getUserScopedStorageKey(THEME_MODE_STORAGE_KEY, userId));
  let saved: Partial<State> & { offlineResources?: string[] } = {};
  if (raw) {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error('Saved Study Sakha data has an invalid format.');
    saved = parsed as Partial<State> & { offlineResources?: string[] };
    delete saved.offlineResources;
  }
  const savedUser = isRecord(saved.user) && userId && saved.user.id === userId
    ? saved.user
    : null;
  const profile: Partial<User> | undefined = savedUser
    ? {
        id: userId!,
        ...(typeof savedUser.name === 'string' ? { name: savedUser.name } : {}),
        ...(typeof savedUser.email === 'string' ? { email: savedUser.email } : {}),
        ...(isExamId(savedUser.exam) ? { exam: savedUser.exam } : {}),
        ...(typeof savedUser.joined === 'string' ? { joined: savedUser.joined } : {}),
        ...(typeof savedUser.photoUri === 'string' ? { photoUri: savedUser.photoUri } : {}),
        ...(typeof savedUser.birthday === 'string' ? { birthday: savedUser.birthday } : {}),
        ...(typeof savedUser.phoneNumber === 'string' ? { phoneNumber: savedUser.phoneNumber } : {}),
        ...(typeof savedUser.currentCity === 'string' ? { currentCity: savedUser.currentCity } : {}),
        ...(typeof savedUser.examFocus === 'string' ? { examFocus: savedUser.examFocus } : {}),
      }
    : undefined;
  delete saved.user;

  const existing = Array.isArray(saved.plannerTasks) ? saved.plannerTasks : [];
  const normalizedExisting = existing.map(migratePlannerTask);
  if (normalizedExisting.some((task) => task === null)) {
    throw new Error('Saved planner tasks have an invalid format.');
  }
  const validExisting = normalizedExisting.filter((task): task is PlannerTask => task !== null);
  let tasks: PlannerTask[];

  if (saved.plannerLegacyMigrated === true || userId !== null) {
    tasks = Array.from(new Map(validExisting.map((task) => [task.id, task])).values());
  } else {
    const legacyRaw = await AsyncStorage.getItem(LEGACY_PLANNER_KEY);
    const legacy: unknown = legacyRaw ? JSON.parse(legacyRaw) : [];
    if (!Array.isArray(legacy)) throw new Error('Legacy planner tasks have an invalid format.');

    const merged = new Map<string, PlannerTask>();
    validExisting.forEach((task) => merged.set(task.id, task));
    legacy.forEach((value) => {
      const task = migratePlannerTask(value);
      if (!task) throw new Error('A saved planner task has an invalid format.');
      if (!merged.has(task.id)) merged.set(task.id, task);
    });
    tasks = Array.from(merged.values());
  }

  const plannerSettings = normalizePlannerSettings(saved.plannerSettings, saved.settings?.dailyGoalMin);
  const carryForwardDate = todayKey();
  if (plannerSettings.autoCarryForward) {
    tasks = tasks.map((task) => task.scope === 'daily' && !task.completedOn && task.targetDate < carryForwardDate
      ? { ...task, targetDate: carryForwardDate, periodKey: carryForwardDate, completed: false }
      : task);
  }

  const plannerMinutesCredited =
    saved.plannerMinutesCredited ??
    Object.fromEntries(
      Object.entries(saved.planDone ?? {}).map(([date, ids]) => [
        date,
        Array.isArray(ids) ? ids : [],
      ])
    );
  const rawSchedule = saved.plannerScheduleItems;
  const archiveKey = getUserScopedStorageKey(PLANNER_QUARANTINE_KEY, userId);
  const previousRaw = await AsyncStorage.getItem(archiveKey);
  const previousParsed: unknown = previousRaw ? JSON.parse(previousRaw) : [];
  const previousArchive = Array.isArray(previousParsed) ? previousParsed.filter(isRecord) : [];
  const rawRecords = Array.isArray(rawSchedule) ? rawSchedule : rawSchedule === undefined ? [] : [rawSchedule];
  const retryRecords = previousArchive.map((entry) => entry.record);
  const candidates = [...rawRecords, ...retryRecords];
  const validCandidates: PlannerScheduleItem[] = [];
  const acceptedById = new Map<string, string>();
  const conflictingDuplicateIndexes = new Set<number>();
  candidates.forEach((record, index) => {
    const migrated = migratePlannerScheduleItem(record);
    if (!migrated) return;
    const normalizedFingerprint = JSON.stringify(migrated);
    const existing = acceptedById.get(migrated.id);
    if (existing !== undefined) {
      if (existing !== normalizedFingerprint) conflictingDuplicateIndexes.add(index);
      return;
    }
    acceptedById.set(migrated.id, normalizedFingerprint);
    validCandidates.push(migrated);
  });
  const plannerScheduleItems = validCandidates;
  const validFingerprints = new Set(validCandidates.map((item) => JSON.stringify(item)));
  const invalidCandidates = candidates.flatMap((record, index) => {
    const migrated = migratePlannerScheduleItem(record);
    if (migrated && validFingerprints.has(JSON.stringify(migrated)) && !conflictingDuplicateIndexes.has(index)) return [];
    const reason = conflictingDuplicateIndexes.has(index) ? 'id conflicts with another valid schedule item' : plannerScheduleIssue(record);
    return [{ index, reason, record, fingerprint: JSON.stringify(record), archivedAt: Date.now() }];
  });
  const uniqueQuarantine = Array.from(new Map(invalidCandidates.map((entry) => [entry.fingerprint, entry])).values());
  if (uniqueQuarantine.length || previousArchive.length) {
    await AsyncStorage.setItem(archiveKey, JSON.stringify(uniqueQuarantine));
  }

  return {
    tasks,
    profile,
    plannerRecoveryCount: uniqueQuarantine.length,
    plannerRecoveryIssues: uniqueQuarantine.map((entry) => `Saved item ${entry.index + 1}: ${entry.reason}`),
    payload: {
      ...saved,
      plannerDataVersion: PLANNER_DATA_VERSION,
      user: null,
      authReady: false,
      managedContent: [],
      managedContentError: null,
      settings: normalizeSettings({
        ...saved.settings,
        ...(isThemeMode(savedThemeMode) ? { themeMode: savedThemeMode } : {}),
      }),
      plannerSelectedDate: todayKey(),
      plannerTasks: tasks,
      plannerTasksLoaded: false,
      plannerLegacyMigrated: true,
      plannerTaskLoadError: null,
      plannerPersistenceError: null,
      plannerDefaultOverrides: saved.plannerDefaultOverrides ?? {},
      plannerDeletedDefaults: saved.plannerDeletedDefaults ?? [],
      plannerScheduleItems,
      plannerScheduleCompletions: isRecord(saved.plannerScheduleCompletions)
        ? Object.fromEntries(
            Object.entries(saved.plannerScheduleCompletions)
              .filter((entry): entry is [string, string] =>
                typeof entry[1] === 'string' && isPlannerDate(entry[1])
              )
          )
        : {},
      plannerCompletions: saved.plannerCompletions ?? {},
      plannerSettings,
      plannerMinutesCredited,
      plannerTaskStudySeconds: isRecord(saved.plannerTaskStudySeconds)
        ? saved.plannerTaskStudySeconds as Record<string, number>
        : {},
      recordedFocusSessionIds: Array.isArray(saved.recordedFocusSessionIds)
        ? Array.from(new Set(saved.recordedFocusSessionIds.filter((id): id is string => typeof id === 'string')))
        : [],
      focusHistory: Array.isArray(saved.focusHistory) ? saved.focusHistory : [],
      storageReady: false,
    },
  };
}

function legacyLearningDataFrom(snapshot: RecoverySnapshot): LegacyLearningData {
  const saved = snapshot.payload;
  const requireStringArray = (value: unknown, label: string) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new Error(`Legacy ${label} have an invalid format.`);
    }
    return value;
  };
  const notes = saved.notes ?? [];
  if (!Array.isArray(notes) || notes.some((note) =>
    !isRecord(note) ||
    typeof note.id !== 'string' ||
    typeof note.title !== 'string' ||
    typeof note.folder !== 'string' ||
    !Array.isArray(note.tags) ||
    !note.tags.every((tag) => typeof tag === 'string') ||
    typeof note.body !== 'string' ||
    !isExamId(note.exam) ||
    typeof note.subject !== 'string' ||
    typeof note.updatedAt !== 'number' ||
    !Number.isFinite(note.updatedAt) ||
    (note.aiSummary !== undefined && typeof note.aiSummary !== 'string') ||
    (note.flashcards !== undefined && (!Array.isArray(note.flashcards) || note.flashcards.some((card) =>
      !isRecord(card) || typeof card.front !== 'string' || typeof card.back !== 'string'
    ))) ||
    (note.quiz !== undefined && (!Array.isArray(note.quiz) || note.quiz.some((question) =>
      !isRecord(question) ||
      typeof question.q !== 'string' ||
      !Array.isArray(question.options) ||
      !question.options.every((option) => typeof option === 'string') ||
      typeof question.answer !== 'number' ||
      !Number.isInteger(question.answer) ||
      question.answer < 0 ||
      question.answer >= question.options.length
    )))
  )) throw new Error('Legacy notes have an invalid format.');

  const progress = saved.progress ?? {};
  if (!isRecord(progress)) throw new Error('Legacy reading progress has an invalid format.');
  const normalizedProgress: State['progress'] = {};
  Object.entries(progress).forEach(([id, value]) => {
    if (
      !isRecord(value) ||
      typeof value.percent !== 'number' ||
      !Number.isFinite(value.percent) ||
      value.percent < 0 ||
      value.percent > 100 ||
      typeof value.at !== 'number' ||
      !Number.isFinite(value.at) ||
      typeof value.title !== 'string'
    ) throw new Error('Legacy reading progress has an invalid format.');
    normalizedProgress[id] = { percent: value.percent, at: value.at, title: value.title };
  });

  const planDoneValue = saved.planDone ?? {};
  if (!isRecord(planDoneValue)) throw new Error('Legacy planner completion data has an invalid format.');
  const planDone: State['planDone'] = {};
  Object.entries(planDoneValue).forEach(([date, ids]) => {
    if (!isPlannerDate(date) || !Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
      throw new Error('Legacy planner completion data has an invalid format.');
    }
    planDone[date] = ids;
  });

  const results = saved.results ?? [];
  if (!Array.isArray(results) || results.some((result) =>
    !isRecord(result) ||
    typeof result.id !== 'string' ||
    typeof result.testId !== 'string' ||
    typeof result.title !== 'string' ||
    !isExamId(result.exam) ||
    typeof result.takenAt !== 'number' ||
    !Number.isFinite(result.takenAt) ||
    !(['score', 'maxScore', 'correct', 'wrong', 'skipped', 'accuracy', 'percentile', 'rank', 'totalAspirants', 'timeTakenSec'] as const)
      .every((key) => typeof result[key] === 'number' && Number.isFinite(result[key])) ||
    !Array.isArray(result.bySubject) ||
    result.bySubject.some((subject) =>
      !isRecord(subject) ||
      typeof subject.subject !== 'string' ||
      typeof subject.correct !== 'number' ||
      !Number.isFinite(subject.correct) ||
      typeof subject.total !== 'number' ||
      !Number.isFinite(subject.total)
    ) ||
    (result.comparisonStatus !== undefined &&
      !['unavailable', 'estimated', 'measured'].includes(result.comparisonStatus)) ||
    !isRecord(result.answers) ||
    Object.values(result.answers).some((answer) =>
      answer !== null && (typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0)
    )
  )) throw new Error('Legacy test history has an invalid format.');

  const stringMap = (value: unknown, label: string): Record<string, string[]> => {
    if (value === undefined) return {};
    if (!isRecord(value)) throw new Error(`Legacy ${label} have an invalid format.`);
    const result: Record<string, string[]> = {};
    Object.entries(value).forEach(([key, entries]) => {
      if (!Array.isArray(entries) || !entries.every((entry) => typeof entry === 'string')) {
        throw new Error(`Legacy ${label} have an invalid format.`);
      }
      result[key] = entries;
    });
    return result;
  };
  const overridesValue = saved.plannerDefaultOverrides ?? {};
  if (!isRecord(overridesValue)) throw new Error('Legacy planner defaults have an invalid format.');
  const plannerDefaultOverrides: State['plannerDefaultOverrides'] = {};
  Object.entries(overridesValue).forEach(([id, value]) => {
    if (!isRecord(value)) throw new Error('Legacy planner defaults have an invalid format.');
    const patch: State['plannerDefaultOverrides'][string] = {};
    if (value.label !== undefined) {
      if (typeof value.label !== 'string') throw new Error('Legacy planner defaults have an invalid format.');
      patch.label = value.label;
    }
    if (value.minutes !== undefined) {
      if (typeof value.minutes !== 'number' || !Number.isInteger(value.minutes) || value.minutes < 1 || value.minutes > 600) {
        throw new Error('Legacy planner defaults have an invalid format.');
      }
      patch.minutes = value.minutes;
    }
    if (value.category !== undefined) {
      if (typeof value.category !== 'string') throw new Error('Legacy planner defaults have an invalid format.');
      patch.category = value.category;
    }
    if (value.taskType !== undefined) {
      if (!['Study', 'Revision', 'PYQ', 'Test', 'Current Affairs'].includes(value.taskType as PlannerTaskType)) {
        throw new Error('Legacy planner defaults have an invalid format.');
      }
      patch.taskType = value.taskType as PlannerTaskType;
    }
    if (value.priority !== undefined) {
      if (!['High', 'Medium', 'Low'].includes(value.priority as PlannerPriority)) {
        throw new Error('Legacy planner defaults have an invalid format.');
      }
      patch.priority = value.priority as PlannerPriority;
    }
    if (value.targetDate !== undefined) {
      if (!isPlannerDate(value.targetDate)) throw new Error('Legacy planner defaults have an invalid format.');
      patch.targetDate = value.targetDate;
    }
    plannerDefaultOverrides[id] = patch;
  });

  const completionsValue = saved.plannerCompletions ?? {};
  if (!isRecord(completionsValue)) throw new Error('Legacy planner completion details have an invalid format.');
  const plannerCompletions: State['plannerCompletions'] = {};
  Object.entries(completionsValue).forEach(([date, completions]) => {
    if (!isPlannerDate(date) || !Array.isArray(completions)) {
      throw new Error('Legacy planner completion details have an invalid format.');
    }
    const parsed: PlannerCompletion[] = [];
    for (const item of completions) {
      if (
        !isRecord(item) ||
        typeof item.taskId !== 'string' ||
        typeof item.label !== 'string' ||
        typeof item.minutes !== 'number' ||
        !Number.isFinite(item.minutes) ||
        typeof item.category !== 'string' ||
        typeof item.taskType !== 'string'
      ) throw new Error('Legacy planner completion details have an invalid format.');
      parsed.push({
        taskId: item.taskId,
        label: item.label,
        minutes: item.minutes,
        category: item.category,
        taskType: item.taskType,
      });
    }
    plannerCompletions[date] = parsed;
  });
  const secondsMap = (value: unknown): Record<string, number> => {
    if (value === undefined) return {};
    if (!isRecord(value)) throw new Error('Legacy focus time has an invalid format.');
    const result: Record<string, number> = {};
    Object.entries(value).forEach(([key, seconds]) => {
      if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
        throw new Error('Legacy focus time has an invalid format.');
      }
      result[key] = seconds;
    });
    return result;
  };

  return {
    notes,
    starred: requireStringArray(saved.starred, 'starred resources'),
    bookmarks: requireStringArray(saved.bookmarks, 'bookmarks'),
    progress: normalizedProgress,
    planDone,
    plannerTasks: snapshot.tasks,
    plannerDefaultOverrides,
    plannerDeletedDefaults: requireStringArray(saved.plannerDeletedDefaults, 'planner defaults'),
    plannerScheduleItems: saved.plannerScheduleItems ?? [],
    plannerScheduleCompletions: saved.plannerScheduleCompletions ?? {},
    plannerCompletions,
    plannerMinutesCredited: stringMap(saved.plannerMinutesCredited, 'credited planner minutes'),
    plannerTaskStudySeconds: secondsMap(saved.plannerTaskStudySeconds),
    recordedFocusSessionIds: requireStringArray(saved.recordedFocusSessionIds, 'focus history'),
    studyLog: secondsMap(saved.studyLog),
    results,
  };
}

function serializePersistentState(state: State) {
  const persistentState: Partial<State> = { ...state };
  delete persistentState.hydrated;
  delete persistentState.authReady;
  delete persistentState.managedContent;
  delete persistentState.managedContentError;
  delete persistentState.plannerTasksLoaded;
  delete persistentState.plannerSelectedDate;
  delete persistentState.plannerTaskLoadError;
  delete persistentState.plannerPersistenceError;
  delete persistentState.storageReady;
  return JSON.stringify({ ...persistentState, plannerDataVersion: PLANNER_DATA_VERSION });
}

export function accountSyncDocumentFromState(state: State): AccountSyncDocument {
  const persistent = JSON.parse(serializePersistentState(state)) as Record<string, unknown>;
  delete persistent.user;
  delete persistent.learners;
  delete persistent.queue;
  delete persistent.announcements;
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    deviceId: 'pending',
    tombstones: {},
    ...persistent,
    profile: state.user
      ? {
          name: state.user.name,
          exam: state.user.exam,
          birthday: state.user.birthday,
          phoneNumber: state.user.phoneNumber,
          currentCity: state.user.currentCity,
          examFocus: state.user.examFocus,
        }
      : undefined,
  };
}

export function accountSyncStateFromDocument(document: AccountSyncDocument): Partial<State> {
  const state: Partial<State> = {};
  const accountKeys: Array<keyof State> = [
    'settings', 'notes', 'starred', 'bookmarks', 'progress', 'planDone', 'plannerTasks',
    'plannerDefaultOverrides', 'plannerDeletedDefaults', 'plannerSettings', 'plannerScheduleItems',
    'plannerScheduleCompletions', 'plannerCompletions', 'plannerMinutesCredited', 'plannerTaskStudySeconds',
    'recordedFocusSessionIds', 'focusHistory', 'studyLog', 'results', 'chat', 'notifications',
  ];
  for (const key of accountKeys) {
    if (document[key] !== undefined) (state as Record<string, unknown>)[key] = document[key];
  }
  return state;
}

async function findLegacyScopedStorageKeys() {
  const keys = await AsyncStorage.getAllKeys();
  const legacyKeys = new Set<string>(LEGACY_SCOPED_STORAGE_KEYS);
  return keys.filter((key) =>
    legacyKeys.has(key) ||
    (key.startsWith(LEGACY_TEST_ATTEMPT_PREFIX) && !key.includes(':user:'))
  );
}

async function importLegacyScopedStorage(userId: string, legacyKeys: string[]) {
  for (const legacyKey of legacyKeys) {
    const scopedKey = getUserScopedStorageKey(legacyKey, userId);
    const [legacyRaw, scopedRaw] = await Promise.all([
      AsyncStorage.getItem(legacyKey),
      AsyncStorage.getItem(scopedKey),
    ]);
    if (legacyRaw === null) continue;
    if (!LEGACY_HISTORY_STORAGE_KEYS.has(legacyKey)) {
      if (scopedRaw === null) await AsyncStorage.setItem(scopedKey, legacyRaw);
      continue;
    }

    const parseHistory = (raw: string | null) => {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed) || parsed.some((record) =>
        !isRecord(record) ||
        typeof record.id !== 'string' ||
        typeof record.completedAt !== 'string'
      )) throw new Error('Previous focus history has an invalid format.');
      return parsed as Record<string, unknown>[];
    };
    const current = parseHistory(scopedRaw);
    const currentIds = new Set(current.map((record) => record.id));
    const legacy = parseHistory(legacyRaw);
    const merged = [...current, ...legacy.filter((record) => !currentIds.has(record.id as string))];
    if (merged.length !== current.length) await AsyncStorage.setItem(scopedKey, JSON.stringify(merged));
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrationStatus, setHydrationStatus] = useState<'loading' | 'ready' | 'failed' | 'recovering'>('loading');
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [plannerRecoveryCount, setPlannerRecoveryCount] = useState(0);
  const [plannerRecoveryIssues, setPlannerRecoveryIssues] = useState<string[]>([]);
  const [legacyMigrationUserId, setLegacyMigrationUserId] = useState<string | null>(null);
  const [legacyMigrationError, setLegacyMigrationError] = useState<string | null>(null);
  const [importingLegacyData, setImportingLegacyData] = useState(false);
  const [legacyScanRetry, setLegacyScanRetry] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const hydrationStatusRef = React.useRef(hydrationStatus);
  const hydrationAttempted = React.useRef(false);
  const recoveryInFlight = React.useRef(false);
  const activeRecoveryScope = React.useRef<string | null>(null);
  const recoveryGeneration = React.useRef(0);
  const pendingActions = React.useRef(new Map<string, Action[]>());
  const pendingPlannerTasks = React.useRef(new Map<string, PlannerTask[]>());
  const writeQueue = React.useRef<Promise<void>>(Promise.resolve());
  const lastEnqueuedSnapshot = React.useRef<string | null>(null);
  const themeWriteQueue = React.useRef<Promise<void>>(Promise.resolve());
  const stateRef = React.useRef(state);
  const syncEngineRef = React.useRef<AccountSyncEngine | null>(null);
  const syncUserRef = React.useRef<string | null>(null);
  stateRef.current = state;
  const dispatchAction = useCallback((action: Action) => {
    if (hydrationStatusRef.current !== 'ready' && isPersistedAction(action)) {
      const currentState = stateRef.current;
      const scope = currentState.user?.id ?? '__local__';
      const actions = pendingActions.current.get(scope) ?? [];
      pendingActions.current.set(scope, actions);
      let replayAction = action;
      if (action.type === 'toggleStar') {
        const previous = [...actions].reverse().find(
          (pending): pending is Extract<Action, { type: 'recoveryStar' }> =>
            pending.type === 'recoveryStar' && pending.id === action.id
        );
        replayAction = {
          type: 'recoveryStar',
          id: action.id,
          starred: !(previous?.starred ?? currentState.starred.includes(action.id)),
        };
      } else if (action.type === 'toggleBookmark') {
        const previous = [...actions].reverse().find(
          (pending): pending is Extract<Action, { type: 'recoveryBookmark' }> =>
            pending.type === 'recoveryBookmark' && pending.id === action.id
        );
        replayAction = {
          type: 'recoveryBookmark',
          id: action.id,
          bookmarked: !(previous?.bookmarked ?? currentState.bookmarks.includes(action.id)),
        };
      } else if (action.type === 'togglePlan') {
        const date = action.date ?? todayKey();
        const previous = [...actions].reverse().find(
          (pending): pending is Extract<Action, { type: 'recoveryPlan' }> =>
            pending.type === 'recoveryPlan' && pending.id === action.id && pending.date === date
        );
        replayAction = {
          type: 'recoveryPlan',
          id: action.id,
          date,
          completed: !(previous?.completed ?? (currentState.planDone[date] ?? []).includes(action.id)),
        };
      } else if (action.type === 'savePlannerTasks') {
        const before = pendingPlannerTasks.current.get(scope) ?? currentState.plannerTasks;
        const beforeById = new Map(before.map((task) => [task.id, task]));
        const afterById = new Map(action.tasks.map((task) => [task.id, task]));
        const changedTasks = action.tasks.filter(
          (task) => JSON.stringify(beforeById.get(task.id)) !== JSON.stringify(task)
        );
        replayAction = {
          type: 'reconcilePlannerTasks',
          tasks: changedTasks,
          deletedIds: before.filter((task) => !afterById.has(task.id)).map((task) => task.id),
        };
        pendingPlannerTasks.current.set(scope, action.tasks);
      }
      actions.push(replayAction);
    }
    if (action.type === 'settings' && isThemeMode(action.patch.themeMode)) {
      const storageKey = getUserScopedStorageKey(THEME_MODE_STORAGE_KEY, stateRef.current.user?.id ?? null);
      themeWriteQueue.current = themeWriteQueue.current
        .catch(() => undefined)
        .then(() => AsyncStorage.setItem(storageKey, action.patch.themeMode!))
        .catch((error: unknown) => {
          console.error('Theme preference could not be saved:', error);
        });
    }
    dispatch(action);
  }, []);

  useEffect(() => {
    const userId = state.user?.id;
    if (!userId || !state.authReady || !state.hydrated || !state.storageReady || !supabaseConfigured) {
      if (syncEngineRef.current) {
        void syncEngineRef.current.stop();
        syncEngineRef.current = null;
      }
      syncUserRef.current = null;
      setSyncStatus(supabaseConfigured ? 'idle' : 'offline');
      return;
    }
    if (syncUserRef.current === userId) return;

    const engine = new AccountSyncEngine();
    syncEngineRef.current = engine;
    syncUserRef.current = userId;
    let active = true;
    const applyRemoteDocument = (document: AccountSyncDocument) => {
      if (!active || syncUserRef.current !== userId) return;
      dispatch({ type: 'hydrate', payload: accountSyncStateFromDocument(document) });
      if (Array.isArray(document.focusHistory)) {
        void AsyncStorage.setItem(
          getUserScopedStorageKey('study-sakha-focus-history-v1', userId),
          JSON.stringify(document.focusHistory),
        ).catch(() => undefined);
      }
      const profile = document.profile;
      if (profile && typeof profile === 'object') {
        const profileRecord = profile as Record<string, unknown>;
        dispatch({
          type: 'updateProfile',
          patch: {
            ...(typeof profileRecord.name === 'string' ? { name: profileRecord.name } : {}),
            ...(isExamId(profileRecord.exam) ? { exam: profileRecord.exam } : {}),
            ...(typeof profileRecord.birthday === 'string' ? { birthday: profileRecord.birthday } : {}),
            ...(typeof profileRecord.phoneNumber === 'string' ? { phoneNumber: profileRecord.phoneNumber } : {}),
            ...(typeof profileRecord.currentCity === 'string' ? { currentCity: profileRecord.currentCity } : {}),
            ...(typeof profileRecord.examFocus === 'string' ? { examFocus: profileRecord.examFocus } : {}),
          },
        });
      }
    };

    void engine.start(
      userId,
      accountSyncDocumentFromState(state),
      applyRemoteDocument,
      (status) => { if (active) setSyncStatus(status); },
    );
    return () => {
      active = false;
      if (syncEngineRef.current === engine) syncEngineRef.current = null;
      if (syncUserRef.current === userId) syncUserRef.current = null;
      void engine.stop();
    };
  }, [state.authReady, state.hydrated, state.storageReady, state.user?.id]);

  useEffect(() => {
    const userId = state.user?.id;
    const engine = syncEngineRef.current;
    if (!userId || syncUserRef.current !== userId || !engine || !state.hydrated || !state.storageReady) return;
    void engine.submit(accountSyncDocumentFromState(state));
  }, [state]);

  useEffect(() => {
    if (!supabaseConfigured) {
      dispatch({ type: 'authResolved', user: null });
      return;
    }

    let active = true;
    let requestId = 0;
    const resolveSession = async (session: SupabaseSession | null, currentRequestId: number) => {
      if (!session) {
        if (active && currentRequestId === requestId) dispatch({ type: 'authResolved', user: null });
        return;
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser(session.access_token);
        if (authError || !authData.user) throw authError ?? new Error('Unable to verify the current account.');

        const [profileResult, adminResult] = await Promise.all([
          supabase.from('profiles').select('display_name, exam_id, joined_at').eq('id', authData.user.id).maybeSingle(),
          supabase.rpc('is_admin'),
        ]);
        if (profileResult.error) console.error('Supabase profile lookup failed:', profileResult.error);
        if (adminResult.error) console.error('Supabase administrator role lookup failed:', adminResult.error);
        const profile = profileResult.data;
        const metadata = authData.user.user_metadata ?? {};
        const examValue = profile?.exam_id ?? metadata.exam_id;
        const exam: ExamId = isExamId(examValue) ? examValue : 'upsc';
        const user: User = {
          id: authData.user.id,
          name: profile?.display_name || metadata.display_name || authData.user.email || 'Aspirant',
          email: authData.user.email ?? '',
          role: !adminResult.error && adminResult.data === true ? 'admin' : 'learner',
          exam,
          joined: profile?.joined_at?.slice(0, 10) ?? authData.user.created_at.slice(0, 10),
          birthday: typeof metadata.birthday === 'string' ? metadata.birthday : undefined,
          phoneNumber: typeof metadata.phone_number === 'string' ? metadata.phone_number : undefined,
          currentCity: typeof metadata.current_city === 'string' ? metadata.current_city : undefined,
          examFocus: typeof metadata.exam_focus === 'string' ? metadata.exam_focus : undefined,
        };
        if (active && currentRequestId === requestId) dispatch({ type: 'authResolved', user });
      } catch (error) {
        console.error('Supabase session verification failed:', error);
        if (active && currentRequestId === requestId) dispatch({ type: 'authCheckFailed' });
      }
    };

    const initialRequestId = ++requestId;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const currentRequestId = ++requestId;
      if (!session) {
        if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          dispatch({ type: 'authResolved', user: null });
        }
        return;
      }
      setTimeout(() => {
        if (active && currentRequestId === requestId) void resolveSession(session, currentRequestId);
      }, 0);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (initialRequestId !== requestId) return;
      if (error) {
        console.error('Supabase session restore failed:', error);
        dispatch({ type: 'authCheckFailed' });
        return;
      }
      void resolveSession(data.session, initialRequestId);
    }).catch((error: unknown) => {
      if (!active || initialRequestId !== requestId) return;
      console.error('Supabase session restore failed:', error);
      dispatch({ type: 'authCheckFailed' });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const recoverSnapshot = useCallback(async (userId: string | null) => {
    const scope = userId ?? '__local__';
    if (recoveryInFlight.current && activeRecoveryScope.current === scope) return;
    const generation = ++recoveryGeneration.current;
    recoveryInFlight.current = true;
    activeRecoveryScope.current = scope;
    setPlannerRecoveryCount(0);
    setPlannerRecoveryIssues([]);
    hydrationStatusRef.current = hydrationAttempted.current ? 'recovering' : 'loading';
    setHydrationStatus(hydrationStatusRef.current);
    try {
      const snapshot = await readRecoverySnapshot(userId);
      if (generation !== recoveryGeneration.current) return;
      const actions = [...(pendingActions.current.get(scope) ?? [])];
      hydrationStatusRef.current = 'ready';
      dispatch({
        type: 'restore',
        payload: snapshot.payload,
        tasks: snapshot.tasks,
        pendingActions: actions,
        profile: snapshot.profile,
      });
      pendingActions.current.delete(scope);
      pendingPlannerTasks.current.delete(scope);
      setHydrationError(null);
      setPlannerRecoveryCount(snapshot.plannerRecoveryCount);
      setPlannerRecoveryIssues(snapshot.plannerRecoveryIssues);
      setHydrationStatus('ready');
    } catch (error) {
      if (generation !== recoveryGeneration.current) return;
      console.error('Study Sakha data could not be loaded; persistence is disabled to protect saved data:', error);
      dispatch({ type: 'hydrate', payload: {} });
      setHydrationError(errorMessage(error, 'Saved data could not be loaded. Your changes are being held until recovery succeeds.'));
      setPlannerRecoveryCount(0);
      setPlannerRecoveryIssues([]);
      hydrationStatusRef.current = 'failed';
      setHydrationStatus('failed');
    } finally {
      if (generation === recoveryGeneration.current) {
        hydrationAttempted.current = true;
        recoveryInFlight.current = false;
        activeRecoveryScope.current = null;
      }
    }
  }, []);

  const retryHydration = useCallback(() => {
    void recoverSnapshot(state.user?.id ?? null);
  }, [recoverSnapshot, state.user?.id]);
  const retryPlannerRecovery = useCallback(() => {
    void recoverSnapshot(state.user?.id ?? null);
  }, [recoverSnapshot, state.user?.id]);

  useEffect(() => {
    if (state.authReady) void recoverSnapshot(state.user?.id ?? null);
  }, [recoverSnapshot, state.authReady, state.user?.id]);

  useEffect(() => {
    const userId = state.user?.id;
    if (!userId || hydrationStatus !== 'ready' || !state.storageReady) {
      setLegacyMigrationUserId(null);
      setLegacyMigrationError(null);
      return;
    }

    let active = true;
    setLegacyMigrationUserId(null);
    setLegacyMigrationError(null);
    const statusKey = getUserScopedStorageKey(LEGACY_IMPORT_KEY, userId);
    Promise.all([
      AsyncStorage.getItem(statusKey),
      AsyncStorage.getItem(KEY),
      AsyncStorage.getItem(LEGACY_PLANNER_KEY),
      findLegacyScopedStorageKeys(),
    ]).then(([status, legacySnapshot, legacyPlanner, legacyScopedKeys]) => {
      if (!active) return;
      if (status === 'imported' || status === 'kept-separate') return;
      if (status !== null) throw new Error('The previous-data migration choice has an invalid format.');
      if (legacySnapshot !== null || legacyPlanner !== null || legacyScopedKeys.length > 0) {
        setLegacyMigrationUserId(userId);
      }
    }).catch((error: unknown) => {
      if (!active) return;
      console.error('Previous local Study Sakha data could not be checked:', error);
      setLegacyMigrationUserId(userId);
      setLegacyMigrationError(errorMessage(error, 'Previous local data could not be checked.'));
    });
    return () => {
      active = false;
    };
  }, [hydrationStatus, legacyScanRetry, state.storageReady, state.user?.id]);

  const importLegacyData = useCallback(async () => {
    const userId = stateRef.current.user?.id;
    if (!userId || hydrationStatusRef.current !== 'ready' || !stateRef.current.storageReady) {
      return { ok: false, error: 'Wait until saved data has finished loading before importing.' };
    }
    setImportingLegacyData(true);
    setLegacyMigrationError(null);
    try {
      const [legacySnapshot, legacyPlanner, legacyScopedKeys] = await Promise.all([
        AsyncStorage.getItem(KEY),
        AsyncStorage.getItem(LEGACY_PLANNER_KEY),
        findLegacyScopedStorageKeys(),
      ]);
      if (legacySnapshot === null && legacyPlanner === null && legacyScopedKeys.length === 0) {
        throw new Error('No previous local Study Sakha data was found.');
      }
      const snapshot = await readRecoverySnapshot(null);
      if (stateRef.current.user?.id !== userId || hydrationStatusRef.current !== 'ready') {
        throw new Error('Your account changed before previous data could be imported. Try again on the current account.');
      }
      const action: Action = {
        type: 'importLegacyLearningData',
        payload: legacyLearningDataFrom(snapshot),
      };
      const nextState = reducer(stateRef.current, action);
      const storageKey = getUserScopedStorageKey(KEY, userId);
      const serialized = serializePersistentState(nextState);
      const keyedSnapshot = `${storageKey}:${serialized}`;
      const write = writeQueue.current.catch(() => {}).then(() => AsyncStorage.setItem(storageKey, serialized));
      writeQueue.current = write.then(() => undefined, () => undefined);
      lastEnqueuedSnapshot.current = keyedSnapshot;
      dispatchAction(action);
      await write;
      await importLegacyScopedStorage(userId, legacyScopedKeys);
      await AsyncStorage.setItem(getUserScopedStorageKey(LEGACY_IMPORT_KEY, userId), 'imported');
      setLegacyMigrationUserId(null);
      return { ok: true };
    } catch (error) {
      lastEnqueuedSnapshot.current = null;
      const message = errorMessage(error, 'Previous local data could not be imported.');
      setLegacyMigrationError(message);
      return { ok: false, error: message };
    } finally {
      setImportingLegacyData(false);
    }
  }, [dispatchAction]);

  const keepLegacyDataSeparate = useCallback(async () => {
    const userId = stateRef.current.user?.id;
    if (!userId) return { ok: false, error: 'Sign in before choosing how to handle previous local data.' };
    try {
      await AsyncStorage.setItem(getUserScopedStorageKey(LEGACY_IMPORT_KEY, userId), 'kept-separate');
      setLegacyMigrationUserId(null);
      setLegacyMigrationError(null);
      return { ok: true };
    } catch (error) {
      const message = errorMessage(error, 'Your choice could not be saved.');
      setLegacyMigrationError(message);
      return { ok: false, error: message };
    }
  }, []);

  const retryLegacyScan = useCallback(() => {
    setLegacyScanRetry((retry) => retry + 1);
  }, []);

  const legacyMigrationAvailable = Boolean(
    state.user?.id && legacyMigrationUserId === state.user.id
  );

  const authenticatedUserId = state.user?.id;

  useEffect(() => {
    if (!state.hydrated || !state.authReady) return;
    let active = true;

    if (!authenticatedUserId) {
      dispatch({ type: 'managedContentLoaded', content: [], error: null });
      return () => { active = false; };
    }

    if (!supabaseConfigured) {
      dispatch({
        type: 'managedContentLoaded',
        content: [],
        error: 'Supabase is not configured for loading published content.',
      });
      return () => { active = false; };
    }

    dispatch({ type: 'managedContentLoaded', content: [], error: null });
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('managed_content')
          .select('id, content_type, title, description, exam_id, subject, topic, source_url, file_object_path, status, payload, updated_at')
          .order('updated_at', { ascending: false });
        if (error) throw error;
        const content = (data ?? []).map((row: unknown) => managedContentFromRow(row));
        if (content.some((item) => item === null)) {
          throw new Error('Supabase returned a managed content record with an invalid format.');
        }
        if (active) {
          dispatch({
            type: 'managedContentLoaded',
            content: content.filter((item): item is ManagedContent => item !== null),
            error: null,
          });
        }
      } catch (error) {
        console.error('Managed content could not be loaded from Supabase:', error);
        if (active) {
          dispatch({
            type: 'managedContentLoaded',
            content: [],
            error: errorMessage(error, 'Unable to load published content from Supabase.'),
          });
        }
      }
    })();

    return () => { active = false; };
  }, [state.authReady, state.hydrated, authenticatedUserId]);

  useEffect(() => {
    if (
      !state.storageReady ||
      !state.hydrated ||
      !state.plannerTasksLoaded ||
      state.plannerTaskLoadError
    ) return;
    const previousPersistenceError = state.plannerPersistenceError;
    const serialized = serializePersistentState(state);
    const storageKey = getUserScopedStorageKey(KEY, state.user?.id);
    const keyedSnapshot = `${storageKey}:${serialized}`;
    if (keyedSnapshot === lastEnqueuedSnapshot.current) return;
    lastEnqueuedSnapshot.current = keyedSnapshot;
    writeQueue.current = writeQueue.current.then(async () => {
      try {
        await AsyncStorage.setItem(storageKey, serialized);
        if (previousPersistenceError) dispatch({ type: 'plannerPersistence', error: null });
      } catch (error) {
        if (lastEnqueuedSnapshot.current === keyedSnapshot) lastEnqueuedSnapshot.current = null;
        console.error('Study Sakha data could not be saved:', error);
        const message = errorMessage(error, 'Unable to save changes on this device.');
        if (previousPersistenceError !== message) dispatch({ type: 'plannerPersistence', error: message });
      }
    });
  }, [state]);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 400; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const mins = state.studyLog[dayKey(d)] ?? 0;
      if (mins > 0) count++;
      else if (i > 0) break;
    }
    return count;
  }, [state.studyLog]);

  const todayMinutes = state.studyLog[todayKey()] ?? 0;
  const todayDone = state.planDone[todayKey()] ?? [];
  const unread = state.notifications.filter((n) => !n.read).length;

  const badges = useMemo(() => {
    return BADGES.map((b) => {
      if (b.id === 'b4') return { ...b, earned: streak >= 30 };
      if (b.id === 'b5') return { ...b, earned: state.results.some((r) => r.percentile >= 90) };
      if (b.id === 'b6') return { ...b, earned: state.notes.length >= 25 };
      return b;
    });
  }, [streak, state.results, state.notes.length]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) return { ok: false, error: 'Authentication is not configured for this app.' };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string, exam: ExamId) => {
    if (!supabaseConfigured) return { ok: false, error: 'Authentication is not configured for this app.' };
    if (name.trim().length < 2) return { ok: false, error: 'Please enter your full name.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { ok: false, error: 'Enter a valid email address.' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim(), exam_id: exam } },
    });
    return error
      ? { ok: false, error: error.message }
      : { ok: true, needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return { ok: false, error: 'Authentication is not configured for this app.' };
    const { error } = await supabase.auth.signOut();
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);

  const saveProfile = useCallback(async (
    patch: Partial<Pick<User, 'name' | 'email' | 'exam' | 'photoUri' | 'birthday' | 'phoneNumber' | 'currentCity' | 'examFocus'>>
  ): Promise<{ ok: true; emailChangePending?: boolean } | { ok: false; error: string }> => {
    if (!state.user || !supabaseConfigured) {
      return { ok: false, error: 'Sign in to save profile changes.' };
    }

    let profileRowSaved = false;
    try {
      const { data: current, error: currentError } = await supabase.auth.getUser();
      if (currentError) throw currentError;
      if (!current.user || current.user.id !== state.user.id) {
        throw new Error('Your account changed. Reload your profile and try again.');
      }

      const nextName = patch.name ?? state.user.name;
      const nextExam = patch.exam ?? state.user.exam;
      if (!isExamId(nextExam)) {
        return { ok: false, error: 'Choose a supported exam before saving your profile.' };
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: current.user.id, display_name: nextName, exam_id: nextExam },
          { onConflict: 'id' }
        );
      if (profileError) throw profileError;
        profileRowSaved = true;

      const metadata = {
        display_name: nextName,
        exam_id: nextExam,
        birthday: patch.birthday ?? state.user.birthday ?? '',
        phone_number: patch.phoneNumber ?? state.user.phoneNumber ?? '',
        current_city: patch.currentCity ?? state.user.currentCity ?? '',
        exam_focus: patch.examFocus ?? state.user.examFocus ?? '',
      };
      const emailChanged = Boolean(patch.email && patch.email !== state.user.email);
      const { data, error } = await supabase.auth.updateUser({
        data: metadata,
        ...(emailChanged ? { email: patch.email } : {}),
      });
      if (error) throw error;

      dispatch({
        type: 'updateProfile',
        patch: {
          ...patch,
          email: data.user.email ?? state.user.email,
        },
      });
      return { ok: true, emailChangePending: emailChanged };
    } catch (error) {
      const message = errorMessage(error, 'Unable to save profile changes.');
      const databaseError = error as { code?: string };
      const actionableMessage = databaseError.code === '23503'
        ? 'The selected exam is not available in the exam catalog yet. Choose another exam or deploy the latest Supabase catalog migration.'
        : message;
      return {
        ok: false,
        error: profileRowSaved
          ? `Your name and exam were saved, but the remaining profile changes could not be saved: ${actionableMessage} Try saving again to finish the update.`
          : actionableMessage,
      };
    }
  }, [dispatch, state.user]);

  const saveManagedContent = useCallback(async (
    content: ManagedContent,
    file?: { blob: Blob | ArrayBuffer; name: string; size: number }
  ): Promise<{ ok: true; warning?: string } | { ok: false; error: string }> => {
    if (!supabaseConfigured) return { ok: false, error: 'Supabase is not configured for content management.' };
    if (file && (file.size < 1 || file.size > 50 * 1024 * 1024)) {
      return { ok: false, error: 'PDF files must be smaller than 50 MB.' };
    }
    if (file && !file.name.toLowerCase().endsWith('.pdf')) {
      return { ok: false, error: 'Only PDF files can be uploaded.' };
    }

    let uploadedPath: string | undefined;
    let databaseWriteSucceeded = false;
    let operation = 'Verifying the signed-in Supabase user';
    const previousPath = state.managedContent.find((item) => item.id === content.id)?.fileObjectPath;
    let savedContent: ManagedContent;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error('Sign in before saving content.');

      let fileObjectPath = content.fileObjectPath ?? null;
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'document.pdf';
        const uploadPath = `content/${content.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
        uploadedPath = uploadPath;
        operation = `Uploading PDF to the ${STUDENT_CONTENT_BUCKET} Storage bucket`;
        const { error: uploadError } = await supabase.storage
          .from(STUDENT_CONTENT_BUCKET)
          .upload(uploadPath, file.blob, { contentType: 'application/pdf', upsert: false });
        if (uploadError) {
          const statusCode = Number(uploadError.statusCode);
          if (Number.isFinite(statusCode) && statusCode < 500) uploadedPath = undefined;
          throw uploadError;
        }
        fileObjectPath = uploadPath;
      }

      const row = {
        id: content.id,
        content_type: content.type,
        title: content.title,
        description: content.description,
        exam_id: content.exam,
        subject: content.subject,
        topic: content.topic,
        source_url: content.sourceUrl ?? null,
        file_object_path: fileObjectPath,
        status: content.published ? 'published' : 'draft',
        payload: {
          body: content.body ?? null,
          questions: content.questions ?? null,
          durationMin: content.durationMin ?? null,
          points: content.points ?? null,
          eventDate: content.eventDate ?? null,
        },
        updated_by: userData.user.id,
      };
      const updating = state.managedContent.some((item) => item.id === content.id);
      operation = updating
        ? 'Updating the managed_content database record'
        : 'Inserting the managed_content database record';
      const result = updating
        ? await supabase.from('managed_content').update(row).eq('id', content.id).select('*').single()
        : await supabase.from('managed_content').insert({ ...row, created_by: userData.user.id }).select('*').single();
      if (result.error) throw result.error;
      databaseWriteSucceeded = true;
      operation = 'Reading the saved managed_content record';
      const savedContentResult = managedContentFromRow(result.data);
      if (!savedContentResult) throw new Error('Supabase returned an invalid saved content record.');
      savedContent = savedContentResult;
      dispatch({ type: 'saveManagedContent', content: savedContent });
    } catch (error) {
      let message = `${operation} failed: ${errorMessage(error, 'Unable to save managed content.')}`;
      if (uploadedPath && !databaseWriteSucceeded) {
        try {
          const { data: referencedFile, error: referenceError } = await supabase
            .from('managed_content')
            .select('id')
            .eq('file_object_path', uploadedPath)
            .maybeSingle();
          if (referenceError) {
            console.error('The uploaded PDF could not be checked for a managed content reference:', referenceError);
            message += ' Cleanup was skipped because the file reference could not be verified.';
          } else if (!referencedFile) {
            const { error: cleanupError } = await supabase.storage.from(STUDENT_CONTENT_BUCKET).remove([uploadedPath]);
            if (cleanupError) {
              console.error('An uploaded PDF could not be removed after the content save failed:', cleanupError);
              message += ' The uploaded file also could not be cleaned up.';
            }
          }
        } catch (cleanupError) {
          console.error('An uploaded PDF cleanup request failed after the content save failed:', cleanupError);
          message += ' The uploaded file could not be safely checked or cleaned up.';
        }
      }
      return { ok: false, error: message };
    }

    if (previousPath && previousPath !== savedContent.fileObjectPath) {
      try {
        const { error: removeError } = await supabase.storage.from(STUDENT_CONTENT_BUCKET).remove([previousPath]);
        if (removeError) throw removeError;
      } catch (error) {
        console.error('The previous PDF could not be removed from Supabase Storage:', error);
        return {
          ok: true,
          warning: 'Content was saved, but the previous PDF could not be removed from Storage.',
        };
      }
    }
    return { ok: true };
  }, [state.managedContent]);

  const deleteManagedContent = useCallback(async (
    id: string
  ): Promise<{ ok: true; warning?: string } | { ok: false; error: string }> => {
    if (!supabaseConfigured) return { ok: false, error: 'Supabase is not configured for content management.' };
    const content = state.managedContent.find((item) => item.id === id);
    if (!content) return { ok: false, error: 'This content is no longer available. Reload the page and try again.' };
    try {
      const { data, error } = await supabase.from('managed_content').delete().eq('id', id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Supabase did not delete the selected content record.');
      dispatch({ type: 'deleteManagedContent', id });
    } catch (error) {
      return { ok: false, error: errorMessage(error, 'Unable to delete managed content.') };
    }

    if (content.fileObjectPath) {
      try {
        const { error: removeError } = await supabase.storage.from(STUDENT_CONTENT_BUCKET).remove([content.fileObjectPath]);
        if (removeError) throw removeError;
      } catch (error) {
        console.error('The deleted content PDF could not be removed from Supabase Storage:', error);
        return { ok: true, warning: 'Content was deleted, but its PDF could not be removed from Storage.' };
      }
    }
    return { ok: true };
  }, [state.managedContent]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      syncStatus,
      hydrationError,
      retryHydration,
      plannerRecoveryCount,
      plannerRecoveryIssues,
      retryPlannerRecovery,
      legacyMigrationAvailable,
      legacyMigrationError,
      importingLegacyData,
      importLegacyData,
      keepLegacyDataSeparate,
      retryLegacyScan,
      streak,
      todayMinutes,
      todayDone,
      unread,
      badges,
      signIn,
      signUp,
      signOut,
      saveManagedContent,
      deleteManagedContent,
      saveProfile,
      dispatch: dispatchAction,
    }),
    [
      state,
      syncStatus,
      hydrationError,
      retryHydration,
      plannerRecoveryCount,
      plannerRecoveryIssues,
      retryPlannerRecovery,
      legacyMigrationAvailable,
      legacyMigrationError,
      importingLegacyData,
      importLegacyData,
      keepLegacyDataSeparate,
      retryLegacyScan,
      streak,
      todayMinutes,
      todayDone,
      unread,
      badges,
      signIn,
      signUp,
      signOut,
      saveManagedContent,
      deleteManagedContent,
      saveProfile,
      dispatchAction,
    ]
  );

  return (
    <StoreCtx.Provider value={value}>
      {hydrationStatus === 'failed' && (
        <View accessibilityRole="alert" style={{ backgroundColor: '#7f1d1d', padding: 12 }}>
          <Text style={{ color: '#ffffff', marginBottom: 8 }}>
            {hydrationError ?? 'Saved data could not be loaded. Your changes are being held until recovery succeeds.'}
          </Text>
          <Pressable accessibilityRole="button" onPress={retryHydration}>
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>Retry data recovery</Text>
          </Pressable>
        </View>
      )}
      {legacyMigrationAvailable && (
        <View accessibilityRole="alert" style={{ backgroundColor: '#17335f', padding: 14, gap: 8 }}>
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>
            Previous local study data is available on this device.
          </Text>
          <Text style={{ color: '#e5e7eb' }}>
            Import notes, bookmarks, planner tasks, focus history, study time, and test attempts into this account, or keep it separate. Profile details, sign-in data, chat history, and notifications are not imported. The original local data is never deleted.
          </Text>
          {legacyMigrationError ? (
            <Text style={{ color: '#fecaca' }}>{legacyMigrationError}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: importingLegacyData, busy: importingLegacyData }}
              disabled={importingLegacyData}
              onPress={() => void importLegacyData()}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                {importingLegacyData ? 'Importing…' : 'Import into this account'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={importingLegacyData}
              onPress={() => void keepLegacyDataSeparate()}
            >
              <Text style={{ color: '#dbeafe', fontWeight: '700' }}>Keep separate</Text>
            </Pressable>
            {legacyMigrationError ? (
              <Pressable accessibilityRole="button" onPress={retryLegacyScan}>
                <Text style={{ color: '#dbeafe', fontWeight: '700' }}>Retry check</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
