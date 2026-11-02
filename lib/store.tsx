import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { BADGES, LEARNERS, PENDING_CONTENT, SEED_NOTIFICATIONS } from './data';
import { STUDENT_CONTENT_BUCKET, supabase, supabaseConfigured } from './supabase';
import { ThemeMode } from './theme';
import { AppNotification, ChatMsg, ExamId, Learner, ManagedContent, ManagedContentType, PendingContent, TestQuestion, TestResult, UserNote } from './types';

const KEY = 'sakha-store-v1';

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
};

export type State = {
  hydrated: boolean;
  authReady: boolean;
  user: User | null;
  settings: {
    themeMode: ThemeMode;
    language: 'en' | 'hi';
    dailyGoalMin: number;
    textScale: number;
    notifications: boolean;
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
  plannerCompletions: Record<string, PlannerCompletion[]>;
  plannerMinutesCredited: Record<string, string[]>;
  plannerTaskStudySeconds: Record<string, number>;
  recordedFocusSessionIds: string[];
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

const todayKey = () => new Date().toISOString().slice(0, 10);
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const LEGACY_PLANNER_KEY = 'study-sakha-custom-tasks-v1';

function isPlannerDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
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
  authReady: false,
  user: null,
  settings: { themeMode: 'system', language: 'en', dailyGoalMin: 180, textScale: 1, notifications: true },
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
  },
  plannerCompletions: {},
  plannerMinutesCredited: {},
  plannerTaskStudySeconds: {},
  recordedFocusSessionIds: [],
  studyLog: {},
  results: [],
  chat: [],
  notifications: SEED_NOTIFICATIONS,
  learners: LEARNERS,
  queue: PENDING_CONTENT,
  managedContent: [],
  managedContentError: null,
  announcements: [
    {
      id: 'a1',
      title: 'Prelims Countdown Series begins Monday',
      body: 'A 60-day guided revision plan with daily tests opens for all Pro and Elite learners.',
      audience: 'All learners',
      at: Date.now() - 1000 * 60 * 60 * 72,
    },
  ],
};

type Action =
  | { type: 'hydrate'; payload: Partial<State> }
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
    }
  | { type: 'plannerCompletion'; date: string; completion: PlannerCompletion; completed: boolean }
  | { type: 'study'; minutes: number }
  | { type: 'result'; result: TestResult }
  | { type: 'chat'; msg: ChatMsg }
  | { type: 'clearChat' }
  | { type: 'readNotif'; id?: string }
  | { type: 'notify'; notif: AppNotification }
  | { type: 'learnerStatus'; id: string; status: 'active' | 'suspended' }
  | { type: 'reviewContent'; id: string; status: 'approved' | 'rejected' }
  | { type: 'saveManagedContent'; content: ManagedContent }
  | { type: 'deleteManagedContent'; id: string }
  | { type: 'managedContentLoaded'; content: ManagedContent[]; error: string | null }
  | { type: 'announce'; item: Announcement };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.payload, user: state.user, authReady: state.authReady, hydrated: true };
    case 'authResolved':
      return { ...state, user: action.user, authReady: true };
    case 'authCheckFailed':
      return { ...state, authReady: true };
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
      return {
        ...state,
        recordedFocusSessionIds: [...state.recordedFocusSessionIds, action.id],
        plannerTaskStudySeconds: action.taskId
          ? {
              ...state.plannerTaskStudySeconds,
              [action.taskId]: (state.plannerTaskStudySeconds[action.taskId] ?? 0) + action.seconds,
            }
          : state.plannerTaskStudySeconds,
        studyLog: {
          ...state.studyLog,
          [action.date]: (state.studyLog[action.date] ?? 0) + action.seconds / 60,
        },
      };
    }
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
      return { ...state, chat: [...state.chat, action.msg] };
    case 'clearChat':
      return { ...state, chat: [] };
    case 'readNotif':
      return {
        ...state,
        notifications: state.notifications.map((n) => (!action.id || n.id === action.id ? { ...n, read: true } : n)),
      };
    case 'notify':
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
  streak: number;
  todayMinutes: number;
  todayDone: string[];
  unread: number;
  badges: typeof BADGES;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string, exam: ExamId) => Promise<{ ok: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<{ ok: boolean; error?: string }>;
  saveManagedContent: (
    content: ManagedContent,
    file?: { blob: Blob; name: string; size: number }
  ) => Promise<{ ok: true; warning?: string } | { ok: false; error: string }>;
  deleteManagedContent: (id: string) => Promise<{ ok: true; warning?: string } | { ok: false; error: string }>;
  dispatch: React.Dispatch<Action>;
};

const StoreCtx = createContext<Ctx | null>(null);

const isExamId = (value: unknown): value is ExamId =>
  value === 'upsc' || value === 'ssc' || value === 'banking' || value === 'neet' || value === 'jee';

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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

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

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<State> & { offlineResources?: string[] };
          delete saved.offlineResources;
          delete saved.user;
          const plannerMinutesCredited =
            saved.plannerMinutesCredited ??
            Object.fromEntries(
              Object.entries(saved.planDone ?? {}).map(([date, ids]) => [
                date,
                Array.isArray(ids) ? ids : [],
              ])
            );
          dispatch({
            type: 'hydrate',
            payload: {
              ...saved,
              user: null,
              authReady: false,
              managedContent: [],
              managedContentError: null,
              settings: { ...initialState.settings, ...saved.settings },
              plannerSelectedDate: todayKey(),
              plannerSettings: normalizePlannerSettings(saved.plannerSettings, saved.settings?.dailyGoalMin),
              plannerTasks: Array.isArray(saved.plannerTasks) ? saved.plannerTasks : [],
              plannerTasksLoaded: false,
              plannerLegacyMigrated: saved.plannerLegacyMigrated === true,
              plannerTaskLoadError: null,
              plannerPersistenceError: null,
              plannerDefaultOverrides: saved.plannerDefaultOverrides ?? {},
              plannerDeletedDefaults: saved.plannerDeletedDefaults ?? [],
              plannerCompletions: saved.plannerCompletions ?? {},
              plannerMinutesCredited,
              plannerTaskStudySeconds:
                saved.plannerTaskStudySeconds &&
                typeof saved.plannerTaskStudySeconds === 'object'
                  ? saved.plannerTaskStudySeconds
                  : {},
              recordedFocusSessionIds: Array.isArray(saved.recordedFocusSessionIds)
                ? Array.from(
                    new Set(
                      saved.recordedFocusSessionIds.filter(
                        (id): id is string => typeof id === 'string',
                      ),
                    ),
                  )
                : [],
              hydrated: true,
            },
          });
        } else {
          dispatch({ type: 'hydrate', payload: {} });
        }
      } catch {
        dispatch({ type: 'hydrate', payload: {} });
      }
    })();
  }, []);

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
    if (!state.hydrated || state.plannerTasksLoaded) return;
    let active = true;

    (async () => {
      try {
        const existing = state.plannerTasks;
        const normalizedExisting = existing.map(migratePlannerTask);
        if (normalizedExisting.some((task) => task === null)) {
          throw new Error('Saved planner tasks have an invalid format.');
        }
        const validExisting = normalizedExisting.filter(
          (task): task is PlannerTask => task !== null
        );
        if (state.plannerLegacyMigrated) {
          if (active) {
            dispatch({
              type: 'plannerTasksLoaded',
              tasks: Array.from(new Map(validExisting.map((task) => [task.id, task])).values()),
              migrationSucceeded: true,
            });
          }
          return;
        }

        const raw = await AsyncStorage.getItem(LEGACY_PLANNER_KEY);
        const legacy: unknown = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(legacy)) throw new Error('Legacy planner tasks have an invalid format.');

        const merged = new Map<string, PlannerTask>();
        validExisting.forEach((task) => merged.set(task.id, task));
        legacy.forEach((value) => {
          const task = migratePlannerTask(value);
          if (!task) throw new Error('A saved planner task has an invalid format.');
          if (!merged.has(task.id)) merged.set(task.id, task);
        });

        if (active) {
          dispatch({
            type: 'plannerTasksLoaded',
            tasks: Array.from(merged.values()),
            migrationSucceeded: true,
          });
        }
      } catch (error) {
        if (active) {
          dispatch({
            type: 'plannerTasksLoaded',
            tasks: state.plannerTasks,
            migrationSucceeded: false,
            error: error instanceof Error ? error.message : 'Could not migrate saved planner tasks.',
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [state.hydrated, state.plannerTasksLoaded, state.plannerLegacyMigrated, state.plannerTasks]);

  useEffect(() => {
    if (!state.hydrated || !state.plannerTasksLoaded) return;
    const persistentState: Partial<State> = { ...state };
    delete persistentState.hydrated;
    delete persistentState.authReady;
    delete persistentState.user;
    delete persistentState.managedContent;
    delete persistentState.managedContentError;
    delete persistentState.plannerTasksLoaded;
    delete persistentState.plannerSelectedDate;
    delete persistentState.plannerTaskLoadError;
    delete persistentState.plannerPersistenceError;
    const previousPersistenceError = state.plannerPersistenceError;
    AsyncStorage.setItem(KEY, JSON.stringify(persistentState)).then(
      () => {
        if (previousPersistenceError) {
          dispatch({ type: 'plannerPersistence', error: null });
        }
      },
      (error: unknown) => {
        console.error('Study Sakha data could not be saved:', error);
        const message = error instanceof Error ? error.message : 'Unable to save changes on this device.';
        if (previousPersistenceError !== message) {
          dispatch({ type: 'plannerPersistence', error: message });
        }
      }
    );
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

  const saveManagedContent = useCallback(async (
    content: ManagedContent,
    file?: { blob: Blob; name: string; size: number }
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
    const previousPath = state.managedContent.find((item) => item.id === content.id)?.fileObjectPath;
    let savedContent: ManagedContent;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error('Sign in before saving content.');

      let fileObjectPath = content.fileObjectPath ?? null;
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'document.pdf';
        const uploadPath = `content/${content.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from(STUDENT_CONTENT_BUCKET)
          .upload(uploadPath, file.blob, { contentType: 'application/pdf', upsert: false });
        if (uploadError) throw uploadError;
        uploadedPath = uploadPath;
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
      const result = state.managedContent.some((item) => item.id === content.id)
        ? await supabase.from('managed_content').update(row).eq('id', content.id).select('*').single()
        : await supabase.from('managed_content').insert({ ...row, created_by: userData.user.id }).select('*').single();
      if (result.error) throw result.error;
      databaseWriteSucceeded = true;
      const savedContentResult = managedContentFromRow(result.data);
      if (!savedContentResult) throw new Error('Supabase returned an invalid saved content record.');
      savedContent = savedContentResult;
      dispatch({ type: 'saveManagedContent', content: savedContent });
    } catch (error) {
      let message = errorMessage(error, 'Unable to save managed content.');
      if (uploadedPath && !databaseWriteSucceeded) {
        try {
          const { data: referencedFile, error: referenceError } = await supabase
            .from('managed_content')
            .select('id')
            .eq('id', content.id)
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
    () => ({ state, streak, todayMinutes, todayDone, unread, badges, signIn, signUp, signOut, saveManagedContent, deleteManagedContent, dispatch }),
    [state, streak, todayMinutes, todayDone, unread, badges, signIn, signUp, signOut, saveManagedContent, deleteManagedContent]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
