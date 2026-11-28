// @ts-nocheck - Generated Gemini UI: React Native/JSX types are intentionally retained at the integration boundary.
import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  Easing,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect, Ellipse } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { PlannerScheduleItem, useStore } from '../lib/store';
import { getPreferredSubjectOptions } from '../lib/subjectRegistry';
import { submitStudyMemberActivityToJoinedGroups } from '../lib/groupRooms';
import { useTheme as useAppTheme } from '../lib/theme';
import { Shell } from '../components/Shell';
import { FocusSessionSetupModal } from '../components/FocusSessionSetupModal';
import type { FocusSessionSetup } from '../components/FocusSessionSetupModal';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import { getPlannerScheduleOccurrence } from '../lib/planner';
import { calculateScheduleFocusDuration } from '../lib/focusSetup';
import { useOptionalFocusSession } from '../lib/focusSession';
import {
  isPlannerDate,
  migratePlannerScheduleItem,
  normalizePlannerCategory,
  normalizePlannerTime,
  stripInvalidTimeFromRecord,
  type PlannerRecoveryEntry,
} from '../lib/plannerSchedule';

/* ========================================================================= */
/* DESIGN TOKENS & CATEGORY CONFIGURATION (1:1 FROM HTML TAILWIND THEME)     */
/* ========================================================================= */

const LIGHT_THEME = {
  isDark: false,
  bgBody: '#F8FAFC', // slate-50
  bgSurface: '#FFFFFF', // white
  bgSurfaceTranslucent: 'rgba(255, 255, 255, 0.95)',
  bgMuted: 'rgba(248, 250, 252, 0.8)', // slate-50/80
  bgSubtle: '#F1F5F9', // slate-100
  bgInput: 'rgba(241, 245, 249, 0.9)', // slate-100/90
  bgSwitcher: 'rgba(226, 232, 240, 0.75)', // slate-200/75
  bgSwitcherBorder: 'rgba(226, 232, 240, 0.6)',
  bgHover: '#F1F5F9',
  bgSelectedCell: 'rgba(239, 246, 255, 0.8)', // blue-50/80
  bgTodayCell: '#F8FAFC', // slate-50
  bgOtherMonthCell: 'rgba(248, 250, 252, 0.5)',
  bgDetailRows: 'rgba(248, 250, 252, 0.5)',
  bgNotesBox: 'rgba(241, 245, 249, 0.8)',
  bgToast: '#0F172A',
  textToast: '#FFFFFF',
  toastDot: '#2DD4BF',

  borderDefault: 'rgba(226, 232, 240, 0.8)', // slate-200/80
  borderStrong: '#E2E8F0', // slate-200
  borderSubtle: '#F1F5F9', // slate-100
  borderTodayCell: '#BFDBFE', // blue-200
  borderSelectedCell: '#3B82F6', // blue-500

  textPrimary: '#0F172A', // slate-900
  textSecondary: '#475569', // slate-600
  textBody: '#334155', // slate-700
  textMuted: '#64748B', // slate-500
  textFaint: '#94A3B8', // slate-400
  textSundayHeader: 'rgba(244, 63, 94, 0.8)', // rose-500/80
  textSundayNum: '#F43F5E', // rose-500

  blue600: '#2563EB',
  blue500: '#3B82F6',
  blue400: '#60A5FA',
  blue700: '#1D4ED8',
  blueSoftBg: '#EFF6FF', // blue-50
  blueSoftText: '#2563EB',
  blueSelectedNumBg: '#DBEAFE', // blue-100
  blueSelectedNumText: '#1D4ED8', // blue-700
  bluePillBorder: '#BFDBFE',
  blueActiveBorder: '#60A5FA',

  teal500: '#14B8A6',
  rose500: '#F43F5E',
  rose600: '#E11D48',
  roseSoftBg: '#FFF1F2',
  roseSoftBorder: '#FECDD3',
  roseSoftText: '#E11D48',
  amber400: '#FBBF24',
  amber600: '#D97706',

  backdrop: 'rgba(15, 23, 42, 0.45)',
  modalBackdrop: 'rgba(15, 23, 42, 0.5)',
  dragHandle: '#E2E8F0',

  outlinedPillBorder: '#334155',
  stepperMinusBg: '#0F172A',
  stepperMinusText: '#FFFFFF',
  chipActiveBg: '#0F172A',
  chipActiveText: '#FFFFFF',
};

const DARK_THEME = {
  isDark: true,
  bgBody: '#020617', // slate-950
  bgSurface: '#0F172A', // slate-900
  bgSurfaceTranslucent: 'rgba(15, 23, 42, 0.95)',
  bgMuted: 'rgba(15, 23, 42, 0.6)',
  bgSubtle: '#1E293B', // slate-800
  bgInput: 'rgba(30, 41, 59, 0.9)', // slate-800/90
  bgSwitcher: 'rgba(30, 41, 59, 0.9)',
  bgSwitcherBorder: 'rgba(51, 65, 85, 0.6)',
  bgHover: '#1E293B',
  bgSelectedCell: 'rgba(23, 37, 84, 0.4)', // blue-950/40
  bgTodayCell: 'rgba(30, 41, 59, 0.5)', // slate-800/50
  bgOtherMonthCell: 'rgba(15, 23, 42, 0.3)',
  bgDetailRows: 'rgba(30, 41, 59, 0.3)',
  bgNotesBox: 'rgba(30, 41, 59, 0.7)',
  bgToast: '#F1F5F9',
  textToast: '#0F172A',
  toastDot: '#0D9488',

  borderDefault: '#1E293B', // slate-800
  borderStrong: '#334155', // slate-700
  borderSubtle: 'rgba(30, 41, 59, 0.8)',
  borderTodayCell: 'rgba(30, 64, 175, 0.8)', // blue-800/80
  borderSelectedCell: '#60A5FA', // blue-400

  textPrimary: '#FFFFFF',
  textSecondary: '#CBD5E1', // slate-300
  textBody: '#E2E8F0', // slate-200
  textMuted: '#94A3B8', // slate-400
  textFaint: '#64748B', // slate-500
  textSundayHeader: 'rgba(251, 113, 133, 0.8)', // rose-400/80
  textSundayNum: '#FB7185', // rose-400

  blue600: '#2563EB',
  blue500: '#3B82F6',
  blue400: '#60A5FA',
  blue700: '#93C5FD',
  blueSoftBg: 'rgba(23, 37, 84, 0.7)', // blue-950/70
  blueSoftText: '#93C5FD', // blue-300
  blueSelectedNumBg: 'rgba(30, 58, 138, 0.8)', // blue-900/80
  blueSelectedNumText: '#BFDBFE', // blue-200
  bluePillBorder: '#334155',
  blueActiveBorder: '#3B82F6',

  teal500: '#14B8A6',
  rose500: '#F43F5E',
  rose600: '#E11D48',
  roseSoftBg: 'rgba(76, 5, 25, 0.6)',
  roseSoftBorder: '#9F1239',
  roseSoftText: '#FB7185',
  amber400: '#FBBF24',
  amber600: '#F59E0B',

  backdrop: 'rgba(0, 0, 0, 0.65)',
  modalBackdrop: 'rgba(0, 0, 0, 0.7)',
  dragHandle: '#334155',

  outlinedPillBorder: '#94A3B8',
  stepperMinusBg: '#F1F5F9',
  stepperMinusText: '#0F172A',
  chipActiveBg: '#FFFFFF',
  chipActiveText: '#0F172A',
};

const CATEGORIES = {
  task: {
    id: 'task',
    label: 'Tasks',
    singular: 'Task',
    dotBg: '#3B82F6',
    bar: '#3B82F6',
    pillBgLight: '#EFF6FF',
    pillBgDark: 'rgba(23, 37, 84, 0.7)',
    pillTextLight: '#1D4ED8',
    pillTextDark: '#93C5FD',
  },
  class: {
    id: 'class',
    label: 'Classes',
    singular: 'Class',
    dotBg: '#10B981',
    bar: '#10B981',
    pillBgLight: '#ECFDF5',
    pillBgDark: 'rgba(2, 44, 34, 0.7)',
    pillTextLight: '#047857',
    pillTextDark: '#6EE7B7',
  },
  exam: {
    id: 'exam',
    label: 'Exams',
    singular: 'Exam',
    dotBg: '#F97316',
    bar: '#F97316',
    pillBgLight: '#FFF7ED',
    pillBgDark: 'rgba(67, 20, 7, 0.7)',
    pillTextLight: '#C2410C',
    pillTextDark: '#FDBA74',
  },
  vacation: {
    id: 'vacation',
    label: 'Vacations',
    singular: 'Vacation',
    dotBg: '#A855F7',
    bar: '#A855F7',
    pillBgLight: '#FAF5FF',
    pillBgDark: 'rgba(59, 7, 100, 0.7)',
    pillTextLight: '#7E22CE',
    pillTextDark: '#D8B4FE',
  },
  activity: {
    id: 'activity',
    label: 'Activities',
    singular: 'Activity',
    dotBg: '#14B8A6',
    bar: '#14B8A6',
    pillBgLight: '#F0FDFA',
    pillBgDark: 'rgba(4, 47, 46, 0.7)',
    pillTextLight: '#0F766E',
    pillTextDark: '#5EEAD4',
  },
};

const CATEGORY_ORDER = ['task', 'class', 'exam', 'vacation', 'activity'];

const TASK_TYPES = ['Assignment', 'Revision', 'Practice Set', 'Reading', 'Project', 'Lab Work'];
const EXAM_TYPES = ['Exam', 'Quiz', 'Unit Test', 'Midterm Exam', 'Final Exam', 'Practical', 'Mock Test'];
const ACTIVITY_TYPES = [
  'Sports & Fitness',
  'Study Group',
  'Club',
  'Workshop',
  'Competition',
  'Music & Arts',
  'Wellness & Break',
];
const TERM_OPTIONS = ['Term 1 (2026)', 'Term 2 (2026)', 'Semester 1', 'Semester 2', 'Annual Session'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const STORAGE_KEY = 'study_sakha_planner_plans_v2';

type PlanCategory = 'task' | 'class' | 'exam' | 'vacation' | 'activity';
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
type DateRangeMode = 'none' | 'term' | 'manual';

interface StudyPlan {
  id: string;
  category: PlanCategory;
  title: string;
  subject?: string;
  taskType?: string;
  teacher?: string;
  instructor?: string;
  whereMode?: 'in_person' | 'online';
  room?: string;
  building?: string;
  seatNumber?: string;
  onlineLink?: string;
  location?: string;
  examType?: string;
  durationMinutes?: number | null;
  duration?: string;
  vacationPreset?: string;
  coverPhotoName?: string;
  dateRangeMode?: DateRangeMode;
  termName?: string;
  rangeFrom?: string;
  rangeUntil?: string;
  endDate?: string;
  activityType?: string;
  date: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  recurrence?: Recurrence;
  repeatDays?: number[];
  repeatUntil?: string;
  notes?: string;
  completed?: boolean;
}

function categoryToStore(category: PlanCategory): PlannerScheduleItem['category'] {
  const categories: Record<PlanCategory, PlannerScheduleItem['category']> = {
    task: 'Tasks', class: 'Classes', exam: 'Exams', vacation: 'Vacations', activity: 'Activities',
  };
  return categories[category];
}

function categoryFromStore(category: PlannerScheduleItem['category']): PlanCategory {
  const categories: Record<PlannerScheduleItem['category'], PlanCategory> = {
    Tasks: 'task', Classes: 'class', Exams: 'exam', Vacations: 'vacation', Activities: 'activity',
  };
  return categories[category];
}

export function scheduleItemToPlan(item: PlannerScheduleItem): StudyPlan {
  return {
    id: item.id,
    category: categoryFromStore(item.category),
    title: item.title,
    subject: item.subject,
    taskType: item.taskType,
    teacher: item.teacher,
    instructor: item.instructor,
    whereMode: item.whereMode,
    room: item.room,
    building: item.building,
    seatNumber: item.seatNumber,
    onlineLink: item.onlineLink,
    location: item.location,
    examType: item.examType,
    durationMinutes: item.durationMinutes ?? (typeof item.duration === 'number' ? item.duration : undefined),
    duration: item.durationLabel ?? (typeof item.duration === 'number' ? `${item.duration} min` : undefined),
    vacationPreset: item.vacationPreset,
    coverPhotoName: item.coverPhotoName,
    dateRangeMode: item.dateRangeMode,
    termName: item.termName,
    rangeFrom: item.rangeFrom || item.fromDate,
    rangeUntil: item.rangeUntil || item.untilDate,
    endDate: item.endDate,
    activityType: item.activityType,
    date: item.date || item.fromDate || '',
    time: item.time,
    startTime: item.startTime,
    endTime: item.endTime,
    recurrence: item.recurrence,
    repeatDays: item.repeatDays,
    repeatUntil: item.repeatUntil,
    notes: item.notes,
    completed: item.completed,
  };
}

export function planToScheduleItem(plan: StudyPlan): PlannerScheduleItem {
  const occurrence = plan.recurrence && plan.recurrence !== 'none' ? 'Repeating' : 'Once';
  const nonEmpty = (val?: string) => (typeof val === 'string' && val.trim() ? val.trim() : undefined);
  const normalizedDate = nonEmpty(plan.date);
  const normalizedTime = nonEmpty(plan.time);
  const normalizedStart = nonEmpty(plan.startTime);
  const normalizedEnd = nonEmpty(plan.endTime);
  const normalizedFrom = nonEmpty(plan.rangeFrom);
  const normalizedUntil = nonEmpty(plan.repeatUntil) || nonEmpty(plan.rangeUntil);
  const normalizedEndDate = nonEmpty(plan.endDate);
  const normalizedRepeatUntil = nonEmpty(plan.repeatUntil);
  const normalizedRangeFrom = nonEmpty(plan.rangeFrom);
  const normalizedRangeUntil = nonEmpty(plan.rangeUntil);
  const rawItem: PlannerScheduleItem = {
    id: plan.id,
    category: categoryToStore(plan.category),
    title: plan.title,
    subject: nonEmpty(plan.subject),
    taskType: nonEmpty(plan.taskType),
    type: nonEmpty(plan.examType) || nonEmpty(plan.taskType) || nonEmpty(plan.activityType),
    teacher: nonEmpty(plan.teacher) || nonEmpty(plan.instructor),
    date: normalizedDate,
    time: normalizedTime,
    endDate: normalizedEndDate,
    startTime: normalizedStart,
    endTime: normalizedEnd,
    duration: typeof plan.durationMinutes === 'number' && plan.durationMinutes > 0 ? plan.durationMinutes : undefined,
    occurs: occurrence,
    days: plan.repeatDays?.length ? plan.repeatDays.map((day) => WEEKDAY_SHORT[day]).filter(Boolean) : undefined,
    dateRange: plan.dateRangeMode === 'manual' ? 'Manual' : plan.dateRangeMode === 'term' ? 'Term' : 'None',
    whereType: plan.whereMode === 'online' ? 'Online' : plan.whereMode === 'in_person' ? 'In Person' : undefined,
    room: nonEmpty(plan.room),
    building: nonEmpty(plan.building),
    seat: nonEmpty(plan.seatNumber),
    notes: nonEmpty(plan.notes),
    hasCoverPhoto: Boolean(nonEmpty(plan.coverPhotoName)),
    completed: plan.completed,
    fromDate: normalizedFrom,
    untilDate: normalizedUntil,
    instructor: nonEmpty(plan.instructor),
    whereMode: plan.whereMode === 'online' || plan.whereMode === 'in_person' ? plan.whereMode : undefined,
    seatNumber: nonEmpty(plan.seatNumber),
    onlineLink: nonEmpty(plan.onlineLink),
    location: nonEmpty(plan.location),
    examType: nonEmpty(plan.examType),
    durationMinutes: typeof plan.durationMinutes === 'number' && plan.durationMinutes >= 0 ? plan.durationMinutes : undefined,
    durationLabel: nonEmpty(plan.duration),
    vacationPreset: nonEmpty(plan.vacationPreset),
    coverPhotoName: nonEmpty(plan.coverPhotoName),
    dateRangeMode: plan.dateRangeMode,
    termName: nonEmpty(plan.termName),
    rangeFrom: normalizedRangeFrom,
    rangeUntil: normalizedRangeUntil,
    activityType: nonEmpty(plan.activityType),
    recurrence: plan.recurrence,
    repeatDays: plan.repeatDays,
    repeatUntil: normalizedRepeatUntil,
  };
  return migratePlannerScheduleItem(rawItem) ?? rawItem;
}

/* ========================================================================= */
/* DATE, TIME, RECURRENCE & SEED DATA UTILITIES (EXACT 1:1 PORT)             */
/* ========================================================================= */

function toISODate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISODate(iso) {
  if (!iso || typeof iso !== 'string') return new Date();
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function addDaysISO(iso, deltaDays) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + deltaDays);
  return toISODate(d);
}

function formatFullDate(iso) {
  const d = parseISODate(iso);
  return `${WEEKDAY_NAMES[d.getDay()]}, ${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatCompactDate(iso) {
  const d = parseISODate(iso);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function formatPillDate(iso) {
  const d = parseISODate(iso);
  return `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

function getDaySpanLabel(fromISO, untilISO) {
  if (!fromISO || !untilISO) return '1 day';
  const a = parseISODate(fromISO);
  const b = parseISODate(untilISO);
  const diff = Math.round((b - a) / 86400000) + 1;
  const days = Math.max(1, diff);
  return days === 1 ? '1 day' : `${days} days`;
}

function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const normalized = normalizePlannerTime(timeStr);
  const canonical = normalized.ok && normalized.value ? normalized.value : timeStr;
  const parts = canonical.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function formatFocusedTime(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes === 60) return '60m';
  return minutes > 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
    : `${minutes}m`;
}

function computeMinutesBetween(startTime?: string, endTime?: string): number | null {
  if (!startTime || !endTime) return null;
  const s = normalizePlannerTime(startTime);
  const e = normalizePlannerTime(endTime);
  if (!s.ok || !s.value || !e.ok || !e.value) return null;
  const [sh, sm] = s.value.split(':').map(Number);
  const [eh, em] = e.value.split(':').map(Number);
  const diff = (eh * 60 + em - (sh * 60 + sm) + 1440) % 1440;
  return diff > 0 ? diff : null;
}

type PlannerFormDraft = {
  title: string;
  subject: string;
  taskType: string;
  teacher: string;
  room: string;
  building: string;
  seatNumber: string;
  onlineLink: string;
  examType: string;
  activityType: string;
  date: string;
  startTime: string;
  endTime: string;
  termName: string;
  rangeFrom: string;
  rangeUntil: string;
  notes: string;
};

type CategoryFormState = {
  recurrenceMode: string;
  recurrence: string;
  repeatDays: number[];
  dateRangeMode: string;
  whereMode: string;
  examDuration: number;
  plannedDuration: number | null;
  durationText: string;
  durationTouched: boolean;
  vacationPreset: string;
  coverPhotoName: string;
  showActivityTimeEditor: boolean;
  draft: PlannerFormDraft;
};

function createInitialCategoryFormState(category: string, isoDate: string): CategoryFormState {
  const defaultStart = category === 'exam' ? '10:00' : category === 'activity' ? '16:00' : '09:00';
  const defaultEnd = category === 'activity' ? '17:00' : '10:00';
  const initialDuration = category === 'vacation'
    ? null
    : category === 'exam'
      ? 60
      : computeMinutesBetween(defaultStart, defaultEnd) ?? 60;

  return {
    recurrenceMode: 'once',
    recurrence: 'none',
    repeatDays: [parseISODate(isoDate).getDay()],
    dateRangeMode: category === 'vacation' ? 'manual' : 'none',
    whereMode: 'in_person',
    examDuration: 60,
    plannedDuration: initialDuration,
    durationText: initialDuration !== null ? String(initialDuration) : '',
    durationTouched: false,
    vacationPreset: '1d',
    coverPhotoName: '',
    showActivityTimeEditor: false,
    draft: {
      title: '',
      subject: '',
      taskType: '',
      teacher: '',
      room: '',
      building: '',
      seatNumber: '',
      onlineLink: '',
      examType: 'Exam',
      activityType: 'Sports & Fitness',
      date: isoDate,
      startTime: defaultStart,
      endTime: defaultEnd,
      termName: TERM_OPTIONS[0],
      rangeFrom: isoDate,
      rangeUntil: isoDate,
      notes: '',
    },
  };
}

function createAllCategoryFormStates(isoDate: string): Record<string, CategoryFormState> {
  return {
    task: createInitialCategoryFormState('task', isoDate),
    class: createInitialCategoryFormState('class', isoDate),
    exam: createInitialCategoryFormState('exam', isoDate),
    vacation: createInitialCategoryFormState('vacation', isoDate),
    activity: createInitialCategoryFormState('activity', isoDate),
  };
}

function getTimeRangeDisplay(plan) {
  if (plan.startTime && plan.endTime) {
    return `${formatTime12h(plan.startTime)} – ${formatTime12h(plan.endTime)}`;
  }
  if (plan.startTime) {
    if (plan.category === 'exam' && plan.duration) {
      return `${formatTime12h(plan.startTime)} (${plan.duration})`;
    }
    return formatTime12h(plan.startTime);
  }
  if (plan.time) {
    return formatTime12h(plan.time);
  }
  return 'All day';
}

function getRecurrenceSummary(plan) {
  if (!plan.recurrence || plan.recurrence === 'none') {
    if (plan.category === 'vacation' && plan.endDate && plan.endDate !== plan.date) {
      return `${getDaySpanLabel(plan.date, plan.endDate)} (${formatCompactDate(plan.date)} – ${formatCompactDate(plan.endDate)})`;
    }
    return 'One-time';
  }
  if (plan.recurrence === 'daily') return 'Repeats Daily';
  if (plan.recurrence === 'weekly') {
    const days =
      plan.repeatDays && plan.repeatDays.length
        ? plan.repeatDays
            .slice()
            .sort((a, b) => a - b)
            .map((i) => WEEKDAY_SHORT[i])
            .join(', ')
        : WEEKDAY_SHORT[parseISODate(plan.date).getDay()];
    return `Weekly (${days})`;
  }
  if (plan.recurrence === 'monthly') {
    return `Monthly (Day ${parseISODate(plan.date).getDate()})`;
  }
  if (plan.recurrence === 'yearly') {
    const d = parseISODate(plan.date);
    return `Yearly (${SHORT_MONTHS[d.getMonth()]} ${d.getDate()})`;
  }
  return 'One-time';
}

function occursOnDate(plan, targetISO) {
  if (!plan || !plan.date || !targetISO) return false;
  if (targetISO < plan.date) return false;

  if (plan.category === 'vacation' && (!plan.recurrence || plan.recurrence === 'none')) {
    const endISO = plan.endDate || plan.rangeUntil || plan.date;
    return targetISO >= plan.date && targetISO <= endISO;
  }

  if (!plan.recurrence || plan.recurrence === 'none') {
    if (plan.dateRangeMode === 'manual' && plan.rangeFrom && plan.rangeUntil) {
      return targetISO >= plan.rangeFrom && targetISO <= plan.rangeUntil;
    }
    return plan.date === targetISO;
  }

  const untilBound = plan.repeatUntil || (plan.dateRangeMode === 'manual' ? plan.rangeUntil : '');
  if (untilBound && targetISO > untilBound) return false;

  const startD = parseISODate(plan.date);
  const targetD = parseISODate(targetISO);

  if (plan.recurrence === 'daily') return true;

  if (plan.recurrence === 'weekly') {
    const days = plan.repeatDays && plan.repeatDays.length ? plan.repeatDays : [startD.getDay()];
    return days.includes(targetD.getDay());
  }

  if (plan.recurrence === 'monthly') {
    const startDay = startD.getDate();
    const lastDayOfTargetMonth = new Date(targetD.getFullYear(), targetD.getMonth() + 1, 0).getDate();
    return targetD.getDate() === Math.min(startDay, lastDayOfTargetMonth);
  }

  if (plan.recurrence === 'yearly') {
    return targetD.getMonth() === startD.getMonth() && targetD.getDate() === startD.getDate();
  }

  return false;
}

/* ========================================================================= */
/* SAFE ASYNC STORAGE HELPERS                                                */
/* ========================================================================= */

async function safeGetStorage(key: string) {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

/* ========================================================================= */
/* SVG ICONS (EXACT 1:1 PATHS FROM HTML VERSION)                             */
/* ========================================================================= */

const MascotSvg = () => (
  <Svg width={32} height={32} viewBox="0 0 40 40">
    <Circle cx="9" cy="18" r="5" fill="#92400E" />
    <Circle cx="31" cy="18" r="5" fill="#92400E" />
    <Circle cx="9" cy="18" r="3" fill="#FDE68A" />
    <Circle cx="31" cy="18" r="3" fill="#FDE68A" />
    <Ellipse cx="20" cy="18" rx="11" ry="10" fill="#78350F" />
    <Ellipse cx="20" cy="20" rx="8.5" ry="7" fill="#FDE68A" />
    <Circle cx="16.5" cy="17.5" r="1.6" fill="#1E293B" />
    <Circle cx="23.5" cy="17.5" r="1.6" fill="#1E293B" />
    <Circle cx="17" cy="17" r="0.5" fill="#FFFFFF" />
    <Circle cx="24" cy="17" r="0.5" fill="#FFFFFF" />
    <Path d="M17.5 22.5 Q20 25 22.5 22.5" stroke="#78350F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <Path d="M9 36 C10 28 30 28 31 36 Z" fill="#1D4ED8" />
    <Path d="M16 29 L20 34 L24 29" fill="#93C5FD" />
  </Svg>
);

const MenuIcon = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M4 6h16M4 12h16M4 18h16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MoonIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SunIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={1.9} />
    <Path
      d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
    />
  </Svg>
);

const BellIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HelpIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.9} />
    <Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CalendarIcon = ({ color, size = 16, strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

const ListIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ChevronDownIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 9l-7 7-7-7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronLeftIcon = ({ color, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 19l-7-7 7-7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronRightIcon = ({ color, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlusIcon = ({ color, size = 16, strokeWidth = 2.4 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

const CloseIcon = ({ color, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 18L18 6M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EditIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CrownIcon = ({ color = '#3B82F6', size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z" />
  </Svg>
);

const ClockIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    <Path d="M12 7v5l3 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const PhotoIcon = ({ color, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth={1.8} />
    <Circle cx="8.5" cy="10" r="1.5" stroke={color} strokeWidth={1.8} />
    <Path d="M21 15l-5-5L5 19" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const HomeNavIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LibraryNavIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4h16v16H4V4zm4 0v13m4-13v13" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const GroupsNavIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SparkleNavIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ProfileNavIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

/* ========================================================================= */
/* NATIVE PICKER MODALS (TRANSLATING HTML <select>, date, time, file)        */
/* ========================================================================= */

function SelectPickerModal({ visible, title, options, selectedValue, onSelect, onClose, theme }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.centerModalBackdrop, { backgroundColor: theme.modalBackdrop }]} onPress={onClose}>
        <Pressable
          style={[
            styles.pickerModalCard,
            { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.pickerHeader, { borderBottomColor: theme.borderSubtle }]}>
            <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.iconBtnSmall, { backgroundColor: theme.bgSubtle }]}>
              <CloseIcon color={theme.textMuted} size={18} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 320 }}>
            {options.map((opt) => {
              const value = typeof opt === 'string' ? opt : opt.value;
              const label = typeof opt === 'string' ? opt : opt.label;
              const active = selectedValue === value;
              return (
                <TouchableOpacity
                  key={label}
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelect(value);
                    onClose();
                  }}
                  style={[
                    styles.selectOptionRow,
                    {
                      backgroundColor: active ? theme.blueSoftBg : 'transparent',
                      borderBottomColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: active ? '700' : '500',
                      color: active ? theme.blue600 : theme.textPrimary,
                    }}
                  >
                    {label}
                  </Text>
                  {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.blue600 }} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DatePickerModal({ visible, valueISO, onSelect, onClose, theme }) {
  const initialDate = parseISODate(valueISO);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (visible) {
      const d = parseISODate(valueISO);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [visible, valueISO]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const stepMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.centerModalBackdrop, { backgroundColor: theme.modalBackdrop }]} onPress={onClose}>
        <Pressable
          style={[
            styles.pickerModalCard,
            { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault, padding: 16 },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.datePickerNav}>
            <TouchableOpacity
              onPress={() => stepMonth(-1)}
              style={[styles.smallSquareBtn, { borderColor: theme.borderStrong }]}
            >
              <ChevronLeftIcon color={theme.textSecondary} size={18} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity
              onPress={() => stepMonth(1)}
              style={[styles.smallSquareBtn, { borderColor: theme.borderStrong }]}
            >
              <ChevronRightIcon color={theme.textSecondary} size={18} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekHeaderRow}>
            {WEEKDAY_INITIALS.map((w, idx) => (
              <Text
                key={idx}
                style={{
                  width: '14.285%',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: '700',
                  color: idx === 0 ? theme.textSundayHeader : theme.textFaint,
                  marginBottom: 6,
                }}
              >
                {w}
              </Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, idx) => {
              if (!day) {
                return <View key={`empty_${idx}`} style={{ width: '14.285%', height: 38 }} />;
              }
              const iso = toISODate(new Date(viewYear, viewMonth, day));
              const isSelected = iso === valueISO;
              return (
                <TouchableOpacity
                  key={iso}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(iso);
                    onClose();
                  }}
                  style={{
                    width: '14.285%',
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? theme.blue600 : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? '#FFFFFF' : theme.textPrimary,
                      }}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.modalCancelBtnFull,
              { backgroundColor: theme.bgSubtle, marginTop: 12 },
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textBody }}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TimePickerModal({ visible, valueTime, title, onSelect, onClose, theme }) {
  const parseParts = (t) => {
    const normalized = normalizePlannerTime(t);
    const canonical = normalized.ok && normalized.value ? normalized.value : '09:00';
    const [hStr, mStr] = canonical.split(':');
    const parsedHour = parseInt(hStr, 10);
    const parsedMinute = parseInt(mStr, 10);
    const h24 = Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23 ? parsedHour : 9;
    const min = Number.isInteger(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59 ? parsedMinute : 0;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { h12, min, ampm };
  };

  const initial = parseParts(valueTime);
  const [hour12, setHour12] = useState(initial.h12);
  const [minute, setMinute] = useState(initial.min);
  const [ampm, setAmpm] = useState(initial.ampm);

  useEffect(() => {
    if (visible) {
      const p = parseParts(valueTime);
      setHour12(p.h12);
      setMinute(p.min);
      setAmpm(p.ampm);
    }
  }, [visible, valueTime]);

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const handleApply = () => {
    let h24 = hour12 % 12;
    if (ampm === 'PM') h24 += 12;
    const formatted = `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onSelect(formatted);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.centerModalBackdrop, { backgroundColor: theme.modalBackdrop }]} onPress={onClose}>
        <Pressable
          style={[
            styles.pickerModalCard,
            { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault, padding: 16 },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.pickerHeader, { borderBottomColor: theme.borderSubtle, paddingHorizontal: 0, paddingTop: 0 }]}>
            <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>{title || 'Select Time'}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['AM', 'PM'].map((period) => {
                const active = ampm === period;
                return (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setAmpm(period)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                      backgroundColor: active ? theme.blue600 : theme.bgSubtle,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : theme.textBody }}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={[styles.formLabel, { color: theme.textMuted, marginTop: 12 }]}>HOUR</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {hours.map((h) => {
              const active = hour12 === h;
              return (
                <TouchableOpacity
                  key={h}
                  onPress={() => setHour12(h)}
                  style={{
                    width: '14.5%',
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: active ? theme.blue600 : theme.bgSubtle,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFFFFF' : theme.textPrimary }}>
                    {h}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.formLabel, { color: theme.textMuted, marginTop: 14 }]}>MINUTE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {minutes.map((m) => {
              const active = minute === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMinute(m)}
                  style={{
                    width: '14.5%',
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: active ? theme.blue600 : theme.bgSubtle,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFFFFF' : theme.textPrimary }}>
                    {String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: 14,
                alignItems: 'center',
                backgroundColor: theme.bgSubtle,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textBody }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: 14,
                alignItems: 'center',
                backgroundColor: theme.blue600,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                Set {hour12}:{String(minute).padStart(2, '0')} {ampm}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CoverPhotoModal({ visible, currentName, onSelect, onClose, theme }) {
  const [customName, setCustomName] = useState(currentName || '');
  const presets = ['autumn_break_cover.jpg', 'mountain_retreat.jpg', 'beach_holiday.png', 'study_break_banner.jpg'];

  useEffect(() => {
    if (visible) setCustomName(currentName || '');
  }, [visible, currentName]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.centerModalBackdrop, { backgroundColor: theme.modalBackdrop }]} onPress={onClose}>
        <Pressable
          style={[
            styles.pickerModalCard,
            { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault, padding: 16 },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.pickerHeader, { borderBottomColor: theme.borderSubtle, paddingHorizontal: 0, paddingTop: 0 }]}>
            <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>Select Cover Photo</Text>
            <TouchableOpacity onPress={onClose} style={[styles.iconBtnSmall, { backgroundColor: theme.bgSubtle }]}>
              <CloseIcon color={theme.textMuted} size={18} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.formLabel, { color: theme.textMuted, marginTop: 12 }]}>PHOTO FILENAME</Text>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="e.g. vacation_cover.jpg"
            placeholderTextColor={theme.textFaint}
            style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary, marginBottom: 12 }]}
          />

          <Text style={[styles.formLabel, { color: theme.textMuted }]}>QUICK SELECT</Text>
          <View style={{ gap: 6, marginBottom: 14 }}>
            {presets.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => {
                  onSelect(p);
                  onClose();
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: theme.bgSubtle,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <PhotoIcon color={theme.textMuted} size={16} />
                <Text style={{ fontSize: 13, fontWeight: '500', color: theme.textPrimary }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center', backgroundColor: theme.bgSubtle }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textBody }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (customName.trim()) onSelect(customName.trim());
                onClose();
              }}
              style={{ flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center', backgroundColor: theme.blue600 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ========================================================================= */
/* MAIN REACT NATIVE APPLICATION COMPONENT                                   */
/* ========================================================================= */

export default function StudyPlannerScreen({ route }: { route?: AppRoute<'StudyPlanner'> } = {}) {
  const {
    state,
    dispatch,
    plannerRecoveryCount = 0,
    plannerRecoveredCount = 0,
    plannerRecoveryEntries = [],
    retryPlannerRecovery,
    dismissPlannerRecoveredNotice,
    resolvePlannerRecoveryEntry,
    discardPlannerRecoveryEntry,
  } = useStore();
  const subjectOptions = useMemo(
    () => getPreferredSubjectOptions(state.settings?.preferredSubjects ?? []),
    [state.settings?.preferredSubjects]
  );
  const navigation = useNavigation<AppNavigation>();
  const { width, height } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const isSm = width >= 640;
  const isMd = width >= 768;

  const todayObj = useMemo(() => new Date(), []);
  const TODAY_ISO = useMemo(() => toISODate(todayObj), [todayObj]);

  /* ----------------------------------------------------------------------- */
  /* CORE STATE (EXACT 1:1 PARITY WITH HTML state OBJECT)                    */
  /* ----------------------------------------------------------------------- */
  const { scheme: appScheme } = useAppTheme();
  const activeFocus = useOptionalFocusSession();
  const isDark = appScheme === 'dark';
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [currentYear, setCurrentYear] = useState(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayObj.getMonth());
  const [pickerYear, setPickerYear] = useState(todayObj.getFullYear());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(TODAY_ISO);
  const [listFilter, setListFilter] = useState('all');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('upcoming');

  const plans = useMemo<StudyPlan[]>(
    () => state.plannerScheduleItems.map(scheduleItemToPlan),
    [state.plannerScheduleItems]
  );
  const plannerMigrationChecked = useRef(false);

  // Bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetMode, setSheetMode] = useState('plans'); // 'plans' | 'form' | 'detail'
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [viewingPlanId, setViewingPlanId] = useState(null);
  const [viewingPlanDate, setViewingPlanDate] = useState(TODAY_ISO);
  const [focusSetupVisible, setFocusSetupVisible] = useState(false);
  const [focusSetup, setFocusSetup] = useState<FocusSessionSetup>({
    mode: 'timer',
    durationMinutes: state.settings?.focusDurationMinutes ?? 25,
    selection: null,
    tag: '',
    task: null,
  });

  useEffect(() => {
    setFocusSetup((current) => current.mode === 'timer'
      ? { ...current, durationMinutes: state.settings?.focusDurationMinutes ?? 25 }
      : current);
  }, [state.settings?.focusDurationMinutes]);

  // Form interactive state (independent per category)
  const [formCategory, setFormCategory] = useState('task');
  const formCategoryRef = useRef(formCategory);
  useEffect(() => {
    formCategoryRef.current = formCategory;
  }, [formCategory]);
  const [formStatesByCategory, setFormStatesByCategory] = useState<Record<string, CategoryFormState>>(
    () => createAllCategoryFormStates(TODAY_ISO)
  );
  const [formError, setFormError] = useState('');

  const activeFormState = formStatesByCategory[formCategory] ?? createInitialCategoryFormState(formCategory, TODAY_ISO);
  const formRecurrenceMode = activeFormState.recurrenceMode;
  const formRecurrence = activeFormState.recurrence;
  const formRepeatDays = activeFormState.repeatDays;
  const formDateRangeMode = activeFormState.dateRangeMode;
  const formWhereMode = activeFormState.whereMode;
  const formExamDuration = activeFormState.examDuration;
  const formPlannedDuration = activeFormState.plannedDuration;
  const formDurationText = activeFormState.durationText;
  const formDurationTouched = activeFormState.durationTouched;
  const formVacationPreset = activeFormState.vacationPreset;
  const formCoverPhotoName = activeFormState.coverPhotoName;
  const formShowActivityTimeEditor = activeFormState.showActivityTimeEditor;
  const formDraft = activeFormState.draft;

  const updateActiveFormField = useCallback(<K extends keyof CategoryFormState>(
    key: K,
    valueOrUpdater: CategoryFormState[K] | ((prev: CategoryFormState[K]) => CategoryFormState[K])
  ) => {
    const cat = formCategoryRef.current;
    setFormStatesByCategory((prev) => {
      const current = prev[cat] ?? createInitialCategoryFormState(cat, TODAY_ISO);
      const nextVal = typeof valueOrUpdater === 'function'
        ? (valueOrUpdater as (p: CategoryFormState[K]) => CategoryFormState[K])(current[key])
        : valueOrUpdater;
      return { ...prev, [cat]: { ...current, [key]: nextVal } };
    });
  }, [TODAY_ISO]);

  const setFormRecurrenceMode = useCallback((v: string | ((p: string) => string)) => updateActiveFormField('recurrenceMode', v), [updateActiveFormField]);
  const setFormRecurrence = useCallback((v: string | ((p: string) => string)) => updateActiveFormField('recurrence', v), [updateActiveFormField]);
  const setFormRepeatDays = useCallback((v: number[] | ((p: number[]) => number[])) => updateActiveFormField('repeatDays', v), [updateActiveFormField]);
  const setFormDateRangeMode = useCallback((v: string | ((p: string) => string)) => updateActiveFormField('dateRangeMode', v), [updateActiveFormField]);
  const setFormWhereMode = useCallback((v: string | ((p: string) => string)) => updateActiveFormField('whereMode', v), [updateActiveFormField]);
  const setFormExamDuration = useCallback((v: number | ((p: number) => number)) => updateActiveFormField('examDuration', v), [updateActiveFormField]);
  const setFormPlannedDuration = useCallback((v: number | null | ((p: number | null) => number | null)) => updateActiveFormField('plannedDuration', v), [updateActiveFormField]);
  const setFormDurationText = useCallback((v: string | ((p: string) => string)) => updateActiveFormField('durationText', v), [updateActiveFormField]);
  const setFormDurationTouched = useCallback((v: boolean | ((p: boolean) => boolean)) => updateActiveFormField('durationTouched', v), [updateActiveFormField]);
  const setFormVacationPreset = useCallback((v: string | ((p: string) => string)) => updateActiveFormField('vacationPreset', v), [updateActiveFormField]);
  const setFormCoverPhotoName = useCallback((v: string | ((p: string) => string)) => updateActiveFormField('coverPhotoName', v), [updateActiveFormField]);
  const setFormShowActivityTimeEditor = useCallback((v: boolean | ((p: boolean) => boolean)) => updateActiveFormField('showActivityTimeEditor', v), [updateActiveFormField]);
  const setFormDraft = useCallback((v: PlannerFormDraft | ((p: PlannerFormDraft) => PlannerFormDraft)) => updateActiveFormField('draft', v), [updateActiveFormField]);

  // Modals & native picker overlays
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectPicker, setSelectPicker] = useState(null); // { title, options, field }
  const [datePickerTarget, setDatePickerTarget] = useState(null); // 'date' | 'rangeFrom' | 'rangeUntil'
  const [timePickerTarget, setTimePickerTarget] = useState(null); // { field, title }
  const [coverPhotoModalOpen, setCoverPhotoModalOpen] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [editingRecoveryEntry, setEditingRecoveryEntry] = useState<PlannerRecoveryEntry | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState({
    title: '',
    category: 'Tasks',
    date: TODAY_ISO,
    startTime: '',
    endTime: '',
    notes: '',
  });
  const [recoveryDraftError, setRecoveryDraftError] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  // Toast state & animations
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(16)).current;
  const toastScale = useRef(new Animated.Value(0.96)).current;

  // Bottom sheet animations (exact 240ms backdrop / 300ms sheet cubic-bezier(0.22, 1, 0.36, 1))
  const sheetBackdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(height)).current;

  /* ----------------------------------------------------------------------- */
  /* HYDRATE LEGACY V2 PLANS FROM ASYNC STORAGE (NO AUTOMATIC DEMO SEEDING)  */
  /* ----------------------------------------------------------------------- */
  useEffect(() => {
    if (!state.storageReady || plannerMigrationChecked.current) return;
    plannerMigrationChecked.current = true;

    (async () => {
      const rawPlans = await safeGetStorage(STORAGE_KEY);
      if (!rawPlans) return;
      try {
        const parsed: unknown = JSON.parse(rawPlans);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(state.plannerScheduleItems.map((item) => item.id));
          parsed.forEach((value) => {
            if (!value || typeof value !== 'object') return;
            const plan = value as StudyPlan;
            if (!plan.id || !plan.title || !plan.date) return;
            if (!existingIds.has(plan.id)) {
              const candidate = migratePlannerScheduleItem(planToScheduleItem(plan));
              if (candidate) {
                dispatch({ type: 'addPlannerScheduleItem', item: candidate });
                existingIds.add(candidate.id);
              }
            }
          });
          await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
        }
      } catch {
        // Ignore malformed legacy storage and preserve existing empty/user planner state.
      }
    })();
  }, [dispatch, state.plannerScheduleItems, state.storageReady]);

  /* ----------------------------------------------------------------------- */
  /* TOAST NOTIFICATION                                                      */
  /* ----------------------------------------------------------------------- */
  const showToast = useCallback(
    (msg) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToastMessage(msg);
      toastOpacity.setValue(0);
      toastTranslateY.setValue(16);
      toastScale.setValue(0.96);

      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(toastScale, {
          toValue: 1,
          duration: 220,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]).start();

      toastTimerRef.current = setTimeout(() => {
        setToastMessage('');
      }, 2600);
    },
    [toastOpacity, toastScale, toastTranslateY]
  );

  /* ----------------------------------------------------------------------- */
  /* BOTTOM SHEET OPEN / CLOSE ANIMATION                                     */
  /* ----------------------------------------------------------------------- */
  const openBottomSheet = useCallback(() => {
    setSheetMounted(true);
    setSheetOpen(true);
    sheetBackdropOpacity.setValue(0);
    sheetTranslateY.setValue(height);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(sheetBackdropOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [height, sheetBackdropOpacity, sheetTranslateY]);

  const closeBottomSheet = useCallback(() => {
    setSheetOpen(false);
    Animated.parallel([
      Animated.timing(sheetBackdropOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: height,
        duration: 260,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setSheetMounted(false);
    });
  }, [height, sheetBackdropOpacity, sheetTranslateY]);

  /* ----------------------------------------------------------------------- */
  /* PLAN QUERY HELPERS                                                      */
  /* ----------------------------------------------------------------------- */
  const getAllPlansForDate = useCallback(
    (isoDate) => plans
      .filter((plan) => occursOnDate(plan, isoDate))
      .sort((a, b) => {
        const timeA = a.startTime || a.time || '23:59';
        const timeB = b.startTime || b.time || '23:59';
        return timeA.localeCompare(timeB);
      }),
    [plans]
  );

  const getPlansForDate = useCallback(
    (isoDate) => getAllPlansForDate(isoDate),
    [getAllPlansForDate]
  );

  /* ----------------------------------------------------------------------- */
  /* NAVIGATION & SHEET FLOW HANDLERS (1:1 WITH HTML)                        */
  /* ----------------------------------------------------------------------- */
  const stepMonth = useCallback(
    (delta) => {
      const next = new Date(currentYear, currentMonth + delta, 1);
      setCurrentYear(next.getFullYear());
      setCurrentMonth(next.getMonth());
    },
    [currentYear, currentMonth]
  );

  const openNewPlanFormForDate = useCallback(
    (isoDate, category = 'task') => {
      setSelectedDate(isoDate);
      setSheetMode('form');
      setEditingPlanId(null);
      setViewingPlanId(null);
      formCategoryRef.current = category;
      setFormCategory(category);
      setFormStatesByCategory(createAllCategoryFormStates(isoDate));
      setFormError('');
      openBottomSheet();
    },
    [openBottomSheet]
  );

  const handleDateSelected = useCallback(
    (isoDate) => {
      setMonthPickerOpen(false);
      setSelectedDate(isoDate);
      const dObj = parseISODate(isoDate);
      if (dObj.getFullYear() !== currentYear || dObj.getMonth() !== currentMonth) {
        setCurrentYear(dObj.getFullYear());
        setCurrentMonth(dObj.getMonth());
      }

      const dayPlans = getAllPlansForDate(isoDate);
      if (dayPlans.length > 0) {
        setSheetMode('plans');
        setEditingPlanId(null);
        setViewingPlanId(null);
        openBottomSheet();
      } else {
        openNewPlanFormForDate(isoDate, 'task');
      }
    },
    [currentMonth, currentYear, getAllPlansForDate, openBottomSheet, openNewPlanFormForDate]
  );

  const openEditPlanForm = useCallback(
    (planId, occurrenceDate = selectedDate) => {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return;
      const defaultStart = plan.category === 'exam' ? '10:00' : plan.category === 'activity' ? '16:00' : '09:00';
      const defaultEnd = plan.category === 'activity' ? '17:00' : '10:00';
      const isRep = plan.recurrence && plan.recurrence !== 'none';
      const existingDuration = typeof plan.durationMinutes === 'number' && Number.isFinite(plan.durationMinutes)
        ? plan.durationMinutes
        : computeMinutesBetween(plan.startTime || plan.time, plan.endTime);

      setEditingPlanId(plan.id);
      setViewingPlanId(null);
      setSheetMode('form');
      formCategoryRef.current = plan.category;
      setFormCategory(plan.category);
      const nextStates = createAllCategoryFormStates(plan.date || occurrenceDate);
      nextStates[plan.category] = {
        recurrenceMode: isRep ? 'repeating' : 'once',
        recurrence: isRep ? plan.recurrence : 'none',
        repeatDays: plan.repeatDays && plan.repeatDays.length ? [...plan.repeatDays] : [parseISODate(plan.date).getDay()],
        dateRangeMode: plan.dateRangeMode || (plan.category === 'vacation' ? 'manual' : 'none'),
        whereMode: plan.whereMode || 'in_person',
        examDuration: plan.durationMinutes || 60,
        plannedDuration: plan.category === 'vacation' ? null : (existingDuration ?? null),
        durationText: plan.category === 'vacation' || existingDuration == null ? '' : String(existingDuration),
        durationTouched: true,
        vacationPreset: plan.vacationPreset || (plan.endDate && plan.endDate !== plan.date ? 'custom' : '1d'),
        coverPhotoName: plan.coverPhotoName || '',
        showActivityTimeEditor: false,
        draft: {
          title: plan.title || '',
          subject: plan.subject || '',
          taskType: plan.taskType || '',
          teacher: plan.teacher || plan.instructor || '',
          room: plan.room || plan.location || '',
          building: plan.building || '',
          seatNumber: plan.seatNumber || '',
          onlineLink: plan.onlineLink || '',
          examType: plan.examType || 'Exam',
          activityType: plan.activityType || 'Sports & Fitness',
          date: plan.date || selectedDate,
          startTime: plan.startTime || plan.time || defaultStart,
          endTime: plan.endTime || defaultEnd,
          termName: plan.termName || TERM_OPTIONS[0],
          rangeFrom: plan.rangeFrom || plan.date || selectedDate,
          rangeUntil: plan.rangeUntil || plan.endDate || plan.repeatUntil || plan.date || selectedDate,
          notes: plan.notes || '',
        },
      };
      setFormStatesByCategory(nextStates);
      setFormError('');
      if (!sheetOpen) {
        openBottomSheet();
      }
    },
    [openBottomSheet, plans, selectedDate, sheetOpen, state, TODAY_ISO, showToast]
  );

  const openPlanDetail = useCallback(
    (planId, contextDate) => {
      if (contextDate) {
        setSelectedDate(contextDate);
        setViewingPlanDate(contextDate);
      }
      setViewingPlanId(planId);
      setEditingPlanId(null);
      setSheetMode('detail');
      if (!sheetOpen) {
        openBottomSheet();
      }
    },
    [openBottomSheet, sheetOpen]
  );

  useEffect(() => {
    const targetPlanId = route?.params?.openPlanId;
    if (!targetPlanId || !state.storageReady) return;
    const matched = plans.find((plan) => plan.id === targetPlanId);
    if (!matched) return;
    openPlanDetail(matched.id, route.params?.openDate || matched.date);
    navigation.setParams?.({ openPlanId: undefined, openDate: undefined });
  }, [navigation, openPlanDetail, plans, route?.params?.openDate, route?.params?.openPlanId, state.storageReady]);

  const handleSwitchFormTab = useCallback(
    (nextCat) => {
      formCategoryRef.current = nextCat;
      setFormCategory(nextCat);
      setFormError('');
    },
    []
  );

  const handleFormSubmit = useCallback(() => {
    const v = formDraft;
    if (!v.title.trim()) {
      setFormError('Please enter a title before saving.');
      return;
    }
    if (!v.date || !isPlannerDate(v.date)) {
      setFormError('Please select a valid date.');
      return;
    }

    const normalizedStart = normalizePlannerTime(v.startTime);
    if (!normalizedStart.ok) {
      setFormError('Please select a valid start time.');
      return;
    }
    const normalizedEnd = formCategory === 'exam'
      ? { ok: true as const, value: undefined }
      : normalizePlannerTime(v.endTime);
    if (!normalizedEnd.ok) {
      setFormError('Please select a valid end time.');
      return;
    }

    const isManualRange = ['task', 'class', 'vacation'].includes(formCategory) && formDateRangeMode === 'manual';
    const effectiveFrom = isManualRange ? v.rangeFrom || v.date : v.date;
    const effectiveUntil = isManualRange ? v.rangeUntil || effectiveFrom : '';

    if (isManualRange && (!isPlannerDate(effectiveFrom) || !isPlannerDate(effectiveUntil) || effectiveUntil < effectiveFrom)) {
      setFormError('"Until" date cannot be earlier than the "From" date.');
      return;
    }

    const supportsRepeat = (state.plannerSettings?.recurringTasksEnabled ?? true) && ['task', 'class', 'vacation'].includes(formCategory);
    const finalRecurrence = supportsRepeat && formRecurrenceMode === 'repeating' ? formRecurrence : 'none';
    let finalRepeatDays = [];
    if (finalRecurrence === 'weekly') {
      finalRepeatDays = formRepeatDays.length > 0 ? [...formRepeatDays] : [parseISODate(v.date).getDay()];
    }

    let composedLocation = '';
    if (formCategory === 'class' || formCategory === 'exam') {
      if (formWhereMode === 'online') {
        composedLocation = v.onlineLink.trim() || 'Online';
      } else {
        const locParts = [v.room.trim(), v.building.trim()].filter(Boolean);
        if (formCategory === 'exam' && v.seatNumber.trim()) {
          locParts.push(`Seat ${v.seatNumber.trim()}`);
        }
        composedLocation = locParts.join(', ');
      }
    }

    const usesRangeDuration = formCategory === 'task' || formCategory === 'class';
    const parsedDurationInput = !usesRangeDuration && formDurationText.trim()
      ? Number(formDurationText.trim())
      : null;
    if (
      !usesRangeDuration &&
      formCategory !== 'exam' &&
      formCategory !== 'vacation' &&
      parsedDurationInput !== null &&
      (!Number.isFinite(parsedDurationInput) || parsedDurationInput < 0 || parsedDurationInput > 600)
    ) {
      setFormError('Please enter a planned duration between 0 and 600 minutes.');
      return;
    }

    const computedFromRange = computeMinutesBetween(normalizedStart.value, normalizedEnd.value);
    const resolvedDurationMinutes = formCategory === 'exam'
      ? formExamDuration
      : formCategory === 'vacation'
        ? null
        : usesRangeDuration
          ? computedFromRange
          : parsedDurationInput !== null
            ? Math.round(parsedDurationInput)
            : formPlannedDuration !== null
              ? Math.round(formPlannedDuration)
              : computedFromRange;
    const plannedDurationLabel = resolvedDurationMinutes !== null && resolvedDurationMinutes >= 0
      ? `${resolvedDurationMinutes} min`
      : undefined;
    const planPayload = {
      id: editingPlanId || `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: formCategory,
      title: v.title.trim(),
      subject: v.subject || undefined,
      taskType: v.taskType || undefined,
      teacher: v.teacher.trim() || undefined,
      instructor: v.teacher.trim() || undefined,
      whereMode: formCategory === 'class' || formCategory === 'exam' ? formWhereMode : undefined,
      room: v.room.trim() || undefined,
      building: v.building.trim() || undefined,
      seatNumber: v.seatNumber.trim() || undefined,
      onlineLink: v.onlineLink.trim() || undefined,
      location: composedLocation || undefined,
      examType: formCategory === 'exam' ? v.examType : undefined,
      durationMinutes: resolvedDurationMinutes,
      duration: formCategory === 'vacation' ? undefined : plannedDurationLabel,
      vacationPreset: formCategory === 'vacation' ? formVacationPreset : undefined,
      coverPhotoName: formCategory === 'vacation' && formCoverPhotoName ? formCoverPhotoName : undefined,
      dateRangeMode: supportsRepeat ? formDateRangeMode : 'none',
      termName: supportsRepeat && formDateRangeMode === 'term' ? v.termName : undefined,
      rangeFrom: isManualRange ? effectiveFrom : undefined,
      rangeUntil: isManualRange ? effectiveUntil : undefined,
      endDate: formCategory === 'vacation' && isManualRange ? effectiveUntil : undefined,
      activityType: formCategory === 'activity' ? v.activityType : undefined,
      date: formCategory === 'vacation' && isManualRange ? effectiveFrom : v.date,
      time: undefined,
      startTime: normalizedStart.value,
      endTime: formCategory === 'exam' ? undefined : normalizedEnd.value,
      recurrence: finalRecurrence,
      repeatDays: finalRepeatDays,
      repeatUntil: finalRecurrence !== 'none' && isManualRange ? effectiveUntil : undefined,
      notes: v.notes.trim() || undefined,
    };

    const wasEditing = Boolean(editingPlanId);
    const scheduleItem = migratePlannerScheduleItem(planToScheduleItem(planPayload as StudyPlan));
    if (!scheduleItem) {
      setFormError('Please check the date and time fields before saving.');
      return;
    }
    dispatch({
      type: wasEditing ? 'updatePlannerScheduleItem' : 'addPlannerScheduleItem',
      item: scheduleItem,
    });

    setSelectedDate(planPayload.date);
    const savedDateObj = parseISODate(planPayload.date);
    setCurrentYear(savedDateObj.getFullYear());
    setCurrentMonth(savedDateObj.getMonth());

    setFormError('');
    closeBottomSheet();

    const catName = (CATEGORIES[planPayload.category] || CATEGORIES.task).singular;
    showToast(wasEditing ? `${catName} updated` : `${catName} saved to calendar`);
  }, [
    closeBottomSheet,
    editingPlanId,
    formCategory,
    formCoverPhotoName,
    formDateRangeMode,
    formDraft,
    formDurationText,
    formExamDuration,
    formPlannedDuration,
    formRecurrence,
    formRecurrenceMode,
    formRepeatDays,
    formVacationPreset,
    formWhereMode,
    showToast,
  ]);

  const confirmDeletePlan = useCallback(() => {
    if (!pendingDeleteId) return;
    const targetId = pendingDeleteId;
    dispatch({ type: 'deletePlannerScheduleItem', id: targetId });
    const nextPlans = plans.filter((p) => p.id !== targetId);
    setPendingDeleteId(null);

    if (sheetOpen) {
      const remaining = nextPlans.filter((p) => occursOnDate(p, selectedDate));
      if (remaining.length > 0) {
        setSheetMode('plans');
        setViewingPlanId(null);
      } else {
        closeBottomSheet();
      }
    }
    showToast('Plan deleted');
  }, [closeBottomSheet, pendingDeleteId, plans, selectedDate, sheetOpen, showToast]);

  /* ----------------------------------------------------------------------- */
  /* COMPUTED CALENDAR CELLS & LIST VIEW GROUPS                              */
  /* ----------------------------------------------------------------------- */
  const calendarCells = useMemo(() => {
    const y = currentYear;
    const m = currentMonth;
    const firstDayWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthDays = new Date(y, m, 0).getDate();
    const totalCells = Math.ceil((firstDayWeekday + daysInMonth) / 7) * 7;

    const list = [];
    for (let i = 0; i < totalCells; i++) {
      let cellDateObj;
      let isCurrentMonth = true;
      if (i < firstDayWeekday) {
        cellDateObj = new Date(y, m - 1, prevMonthDays - firstDayWeekday + 1 + i);
        isCurrentMonth = false;
      } else if (i >= firstDayWeekday + daysInMonth) {
        cellDateObj = new Date(y, m + 1, i - (firstDayWeekday + daysInMonth) + 1);
        isCurrentMonth = false;
      } else {
        cellDateObj = new Date(y, m, i - firstDayWeekday + 1);
      }
      const iso = toISODate(cellDateObj);
      list.push({
        iso,
        dayNumber: cellDateObj.getDate(),
        isCurrentMonth,
        isToday: iso === TODAY_ISO,
        isSelected: iso === selectedDate,
        isSunday: cellDateObj.getDay() === 0,
        dayPlans: getPlansForDate(iso),
      });
    }
    return list;
  }, [TODAY_ISO, currentMonth, currentYear, getPlansForDate, selectedDate]);

  const listMonthData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const groupedDays = [];
    let totalOccurrences = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toISODate(new Date(currentYear, currentMonth, day));
      let dayPlans = getPlansForDate(iso).filter((plan) =>
        getPlannerScheduleOccurrence(state, planToScheduleItem(plan), iso, TODAY_ISO).status === scheduleStatusFilter
      );
      if (listFilter !== 'all') {
        dayPlans = dayPlans.filter((p) => p.category === listFilter);
      }
      if (dayPlans.length > 0) {
        groupedDays.push({ iso, plans: dayPlans });
        totalOccurrences += dayPlans.length;
      }
    }
    return { groupedDays, totalOccurrences };
  }, [currentMonth, currentYear, getPlansForDate, listFilter, scheduleStatusFilter, state, TODAY_ISO]);

  const openFocusForPlan = useCallback((plan, date) => {
    const item = planToScheduleItem(plan);
    const occurrence = getPlannerScheduleOccurrence(state, item, date, TODAY_ISO);
    if (occurrence.status === 'completed') return;
    if (
      activeFocus?.session &&
      !activeFocus.session.pendingRecord &&
      (activeFocus.session.scheduleOccurrenceId === occurrence.id ||
        activeFocus.session.scheduleId === plan.id ||
        activeFocus.session.taskId === plan.id)
    ) {
      navigation.navigate('FocusCenter');
      return;
    }
    const summary = calculateScheduleFocusDuration(occurrence);
    const resolvedMinutes = summary.remainingMinutes ?? (state.settings?.focusDurationMinutes ?? 25);
    if (resolvedMinutes <= 0) return;
    setFocusSetup({
      mode: 'timer',
      durationMinutes: resolvedMinutes,
      selection: 'schedule',
      tag: item.subject || item.category || 'Study',
      task: item,
      scheduleOccurrenceId: occurrence.id,
    });
    setFocusSetupVisible(true);
  }, [activeFocus?.session, navigation, state, TODAY_ISO]);

  const markPlanCompleted = useCallback(async (plan, date) => {
    const occurrence = getPlannerScheduleOccurrence(state, planToScheduleItem(plan), date, TODAY_ISO);
    if (occurrence.status !== 'completed') {
      dispatch({
        type: 'setPlannerScheduleCompletion',
        occurrenceId: occurrence.id,
        date,
        completed: true,
      });
    }
    showToast('Plan marked as completed');

    const userId = state.user?.id;
    if (userId) {
      void submitStudyMemberActivityToJoinedGroups({
        userId,
        eventId: `planner-task-completed:${occurrence.id}`,
        activityType: 'planner_task_completed',
        taskId: occurrence.id,
        subject: plan.subject || plan.category || 'Study',
        actualSeconds: 0,
        status: 'completed',
        occurredAt: new Date().toISOString(),
        scheduleId: plan.id,
        scheduleOccurrenceId: occurrence.id,
      }).catch((error) => {
        console.warn('Planner completion could not be synchronized to study groups:', error);
      });
    }
  }, [dispatch, showToast, state, TODAY_ISO]);

  /* ----------------------------------------------------------------------- */
  /* REUSABLE PLAN CARD RENDERER (IDENTICAL IN SHEET & LIST VIEW)            */
  /* ----------------------------------------------------------------------- */
  const renderPlanCard = (plan, contextDate) => {
    const cat = CATEGORIES[plan.category] || CATEGORIES.task;
    const occurrenceDate = contextDate || plan.date;
    const occurrence = getPlannerScheduleOccurrence(state, planToScheduleItem(plan), occurrenceDate, TODAY_ISO);
    const pillBg = isDark ? cat.pillBgDark : cat.pillBgLight;
    const pillText = isDark ? cat.pillTextDark : cat.pillTextLight;
    const timeText = getTimeRangeDisplay(plan);
    const recText = plan.recurrence && plan.recurrence !== 'none' ? getRecurrenceSummary(plan) : '';
    const metaParts = [];
    if (plan.subject) metaParts.push(plan.subject);
    if (plan.activityType) metaParts.push(plan.activityType);
    if (plan.location) metaParts.push(plan.location);

    return (
      <View
        key={`${plan.id}_${contextDate || plan.date}`}
        style={[
          styles.planCard,
          {
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderDefault,
          },
        ]}
      >
        <View style={{ width: 6, backgroundColor: cat.bar }} />
        <View style={{ flex: 1, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => openPlanDetail(plan.id, contextDate || plan.date)}
              style={{ flex: 1 }}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={[styles.catBadgePill, { backgroundColor: pillBg }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cat.dotBg }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: pillText }}>{cat.singular}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '500', color: theme.textMuted }}>{timeText}</Text>
                {!!recText && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: theme.bgSubtle,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textMuted }}>{recText}</Text>
                  </View>
                )}
              </View>
              <Text
                numberOfLines={1}
                style={{ fontSize: isSm ? 16 : 14, fontWeight: '700', color: theme.textPrimary }}
              >
                {plan.title}
              </Text>
              {metaParts.length > 0 && (
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}
                >
                  {metaParts.join(' • ')}
                </Text>
              )}
              {occurrence.plannedSeconds !== null && (
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
                  Focused {formatFocusedTime(occurrence.actualSeconds)} / planned {formatFocusedTime(occurrence.plannedSeconds)} · {occurrence.progressPercent}%
                </Text>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                onPress={() => openPlanDetail(plan.id, contextDate || plan.date)}
                accessibilityLabel="View details"
                style={styles.cardActionBtn}
              >
                <EyeIcon color={theme.textFaint} size={16} />
              </TouchableOpacity>
              {occurrence.status !== 'completed' && (
                <TouchableOpacity
                  onPress={() => openEditPlanForm(plan.id, occurrenceDate)}
                  accessibilityLabel="Edit plan"
                  style={styles.cardActionBtn}
                >
                  <EditIcon color={theme.textFaint} size={16} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setPendingDeleteId(plan.id)}
                accessibilityLabel="Delete plan"
                style={styles.cardActionBtn}
              >
                <TrashIcon color={theme.textFaint} size={16} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  /* ----------------------------------------------------------------------- */
  /* BOTTOM SHEET FORM SUB-BUILDERS (EXACT 5 STUDY SAKHA FORMS)              */
  /* ----------------------------------------------------------------------- */
  const renderRecurrenceSubBlock = () => {
    if (formRecurrenceMode !== 'repeating') return null;

    const recOptions = [
      { id: 'none', label: 'No Repeat' },
      { id: 'daily', label: 'Daily' },
      { id: 'weekly', label: 'Weekly' },
      { id: 'monthly', label: 'Monthly' },
      { id: 'yearly', label: 'Yearly' },
    ];

    const dObj = parseISODate(formDraft.date);

    return (
      <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.borderSubtle }}>
        <Text style={[styles.formLabel, { color: theme.textMuted }]}>REPEAT FREQUENCY</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {recOptions.map((opt) => {
            const active = formRecurrence === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.8}
                onPress={() => {
                  setFormRecurrence(opt.id);
                  if (opt.id === 'weekly' && formRepeatDays.length === 0) {
                    setFormRepeatDays([parseISODate(formDraft.date).getDay()]);
                  }
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 12,
                  borderWidth: 1,
                  backgroundColor: active ? theme.blue600 : theme.bgSubtle,
                  borderColor: active ? theme.blue600 : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFFFFF' : theme.textSecondary }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {formRecurrence === 'weekly' && (
          <View style={{ marginTop: 10 }}>
            <Text style={[styles.formLabel, { color: theme.textMuted }]}>REPEAT ON WEEKDAYS</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {WEEKDAY_INITIALS.map((letter, idx) => {
                const checked = formRepeatDays.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => {
                      setFormRepeatDays((prev) => {
                        if (prev.includes(idx)) {
                          return prev.length > 1 ? prev.filter((d) => d !== idx) : prev;
                        }
                        return [...prev, idx];
                      });
                    }}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      backgroundColor: checked ? theme.blue600 : theme.bgSubtle,
                      borderColor: checked ? theme.blue600 : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: checked ? '#FFFFFF' : theme.textSecondary }}>
                      {letter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {formRecurrence === 'monthly' && (
          <View style={[styles.recHintBox, { backgroundColor: theme.blueSoftBg }]}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.blueSoftText }}>
              Repeats every month on day {dObj.getDate()}.
            </Text>
          </View>
        )}

        {formRecurrence === 'yearly' && (
          <View style={[styles.recHintBox, { backgroundColor: theme.blueSoftBg }]}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.blueSoftText }}>
              Repeats every year on {MONTH_NAMES[dObj.getMonth()]} {dObj.getDate()}.
            </Text>
          </View>
        )}

        {formRecurrence === 'daily' && (
          <View style={[styles.recHintBox, { backgroundColor: theme.blueSoftBg }]}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.blueSoftText }}>
              Repeats every day starting from the selected date.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderDurationControl = () => (
    <View>
      <Text style={[styles.formLabel, { color: theme.textMuted }]}>DURATION</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            const current = formPlannedDuration ?? 60;
            const next = Math.max(5, Math.min(600, current - 15));
            setFormDurationTouched(true);
            setFormPlannedDuration(next);
            setFormDurationText(String(next));
          }}
          accessibilityLabel="Decrease duration"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.stepperMinusBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.stepperMinusText, lineHeight: 22 }}>−</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={formDurationText}
            onChangeText={(txt) => {
              const cleaned = txt.replace(/[^0-9]/g, '');
              setFormDurationTouched(true);
              setFormDurationText(cleaned);
              if (cleaned === '') {
                setFormPlannedDuration(null);
              } else {
                const parsed = Number(cleaned);
                if (Number.isFinite(parsed)) {
                  setFormPlannedDuration(Math.min(600, Math.max(0, parsed)));
                }
              }
            }}
            placeholder="60"
            placeholderTextColor={theme.textFaint}
            keyboardType="number-pad"
            accessibilityLabel="Planned duration minutes"
            style={[styles.inputField, { flex: 1, backgroundColor: theme.bgInput, color: theme.textPrimary, textAlign: 'center', fontWeight: '700' }]}
          />
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textMuted }}>min</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            const current = formPlannedDuration ?? 0;
            const next = Math.max(5, Math.min(600, current + 15));
            setFormDurationTouched(true);
            setFormPlannedDuration(next);
            setFormDurationText(String(next));
          }}
          accessibilityLabel="Increase duration"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.bgSubtle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.textSecondary, lineHeight: 22 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStandardWhenSection = (includeVacationPresets = false) => {
    const isRepeating = formRecurrenceMode === 'repeating';
    const presets = [
      { id: '1d', label: '1 day' },
      { id: '1w', label: '1 week' },
      { id: '2w', label: '2 weeks' },
      { id: 'custom', label: 'Custom' },
    ];

    return (
      <View style={[styles.formCard, { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault }]}>
        {includeVacationPresets && (
          <View>
            <Text style={[styles.formLabel, { color: theme.textMuted }]}>DATES</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {presets.map((p) => {
                const active = formVacationPreset === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      setFormVacationPreset(p.id);
                      setFormDateRangeMode('manual');
                      setFormDraft((prev) => {
                        const baseDate = prev.rangeFrom || prev.date || selectedDate;
                        let until = prev.rangeUntil;
                        if (p.id === '1d') until = baseDate;
                        else if (p.id === '1w') until = addDaysISO(baseDate, 6);
                        else if (p.id === '2w') until = addDaysISO(baseDate, 13);
                        return { ...prev, rangeFrom: baseDate, rangeUntil: until };
                      });
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: active ? theme.blue600 : theme.bgSubtle,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : theme.textSecondary }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View>
          <Text style={[styles.formLabel, { color: theme.textMuted }]}>WHEN</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { id: 'once', label: 'Once', active: !isRepeating },
              { id: 'repeating', label: 'Repeating', active: isRepeating },
            ].map((btn) => (
              <TouchableOpacity
                key={btn.id}
                activeOpacity={0.8}
                onPress={() => {
                  setFormRecurrenceMode(btn.id);
                  if (btn.id === 'once') {
                    setFormRecurrence('none');
                  } else if (formRecurrence === 'none') {
                    setFormRecurrence('weekly');
                    if (formRepeatDays.length === 0) {
                      setFormRepeatDays([parseISODate(formDraft.date).getDay()]);
                    }
                  }
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  backgroundColor: btn.active ? theme.blueSoftBg : theme.bgInput,
                  borderColor: btn.active ? theme.blueActiveBorder : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: btn.active ? theme.blueSoftText : theme.textMuted,
                  }}
                >
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {renderRecurrenceSubBlock()}

        <View>
          <Text style={[styles.formLabel, { color: theme.textMuted }]}>DATE</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setDatePickerTarget('date')}
            style={[styles.inputField, { backgroundColor: theme.bgInput, justifyContent: 'center' }]}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary }}>{formDraft.date}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.formLabel, { color: theme.textMuted }]}>STARTS</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setTimePickerTarget({ field: 'startTime', title: 'Starts' })}
              style={[styles.inputField, { backgroundColor: theme.bgInput, justifyContent: 'center' }]}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary }}>{formDraft.startTime}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.formLabel, { color: theme.textMuted }]}>ENDS</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setTimePickerTarget({ field: 'endTime', title: 'Ends' })}
              style={[styles.inputField, { backgroundColor: theme.bgInput, justifyContent: 'center' }]}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary }}>{formDraft.endTime}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View>
          <Text style={[styles.formLabel, { color: theme.textMuted }]}>DATE RANGE</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { id: 'none', label: 'None' },
              { id: 'term', label: 'Term' },
              { id: 'manual', label: 'Manual' },
            ].map((rm) => {
              const active = formDateRangeMode === rm.id;
              return (
                <TouchableOpacity
                  key={rm.id}
                  activeOpacity={0.8}
                  onPress={() => setFormDateRangeMode(rm.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    backgroundColor: active ? theme.blueSoftBg : theme.bgInput,
                    borderColor: active ? theme.blueActiveBorder : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: active ? '700' : '600',
                      color: active ? theme.blueSoftText : theme.textSecondary,
                    }}
                  >
                    {rm.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {formDateRangeMode === 'term' && (
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.formLabel, { color: theme.textMuted }]}>SELECT TERM</Text>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() =>
                  setSelectPicker({
                    title: 'Select Term',
                    options: TERM_OPTIONS,
                    field: 'termName',
                  })
                }
                style={[styles.selectBtn, { backgroundColor: theme.bgInput }]}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary }}>
                  {formDraft.termName || TERM_OPTIONS[0]}
                </Text>
                <ChevronDownIcon color={theme.textFaint} size={16} />
              </TouchableOpacity>
            </View>
          )}

          {formDateRangeMode === 'manual' && (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>FROM</Text>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setDatePickerTarget('rangeFrom')}
                    style={[styles.inputField, { backgroundColor: theme.bgInput, justifyContent: 'center' }]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary }}>
                      {formDraft.rangeFrom || formDraft.date}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>UNTIL</Text>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setDatePickerTarget('rangeUntil')}
                    style={[styles.inputField, { backgroundColor: theme.bgInput, justifyContent: 'center' }]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary }}>
                      {formDraft.rangeUntil || formDraft.date}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '700', color: theme.blueSoftText }}>
                {getDaySpanLabel(formDraft.rangeFrom || formDraft.date, formDraft.rangeUntil || formDraft.date)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderWhereSection = (mode) => {
    const isInPerson = formWhereMode === 'in_person';
    return (
      <View style={[styles.formCard, { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault }]}>
        <View>
          <Text style={[styles.formLabel, { color: theme.textMuted }]}>WHERE</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { id: 'in_person', label: 'In Person', active: isInPerson },
              { id: 'online', label: 'Online', active: !isInPerson },
            ].map((w) => (
              <TouchableOpacity
                key={w.id}
                activeOpacity={0.8}
                onPress={() => setFormWhereMode(w.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: w.active ? theme.blueSoftBg : theme.bgSurface,
                  borderColor: w.active ? theme.blue500 : theme.bluePillBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: w.active ? '700' : '600',
                    color: w.active ? theme.blueSoftText : isDark ? theme.textSecondary : 'rgba(37, 99, 235, 0.8)',
                  }}
                >
                  {w.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isInPerson ? (
          mode === 'class' ? (
            <>
              <View>
                <Text style={[styles.formLabel, { color: theme.textMuted }]}>ROOM</Text>
                <TextInput
                  value={formDraft.room}
                  onChangeText={(txt) => setFormDraft((p) => ({ ...p, room: txt }))}
                  placeholder="Room 204, Building A"
                  placeholderTextColor={theme.textFaint}
                  style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                />
              </View>
              <View>
                <Text style={[styles.formLabel, { color: theme.textMuted }]}>BUILDING</Text>
                <TextInput
                  value={formDraft.building}
                  onChangeText={(txt) => setFormDraft((p) => ({ ...p, building: txt }))}
                  placeholder="Building"
                  placeholderTextColor={theme.textFaint}
                  style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                />
              </View>
            </>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formLabel, { color: theme.textMuted }]}>ROOM</Text>
                <TextInput
                  value={formDraft.room}
                  onChangeText={(txt) => setFormDraft((p) => ({ ...p, room: txt }))}
                  placeholder="Room"
                  placeholderTextColor={theme.textFaint}
                  style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formLabel, { color: theme.textMuted }]}>SEAT #</Text>
                <TextInput
                  value={formDraft.seatNumber}
                  onChangeText={(txt) => setFormDraft((p) => ({ ...p, seatNumber: txt }))}
                  placeholder="Seat #"
                  placeholderTextColor={theme.textFaint}
                  style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                />
              </View>
            </View>
          )
        ) : (
          <View>
            <Text style={[styles.formLabel, { color: theme.textMuted }]}>MEETING / EXAM LINK</Text>
            <TextInput
              value={formDraft.onlineLink}
              onChangeText={(txt) => setFormDraft((p) => ({ ...p, onlineLink: txt }))}
              placeholder="Paste meeting or portal link..."
              placeholderTextColor={theme.textFaint}
              autoCapitalize="none"
              style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
            />
          </View>
        )}
      </View>
    );
  };

  /* ----------------------------------------------------------------------- */
  /* RENDER BOTTOM SHEET BODY BY MODE ('plans' | 'form' | 'detail')          */
  /* ----------------------------------------------------------------------- */
  const renderBottomSheetContent = () => {
    // MODE 1: SAVED PLANS FOR SELECTED DATE
    if (sheetMode === 'plans') {
      const dayPlans = getAllPlansForDate(selectedDate);
      const isToday = selectedDate === TODAY_ISO;

      return (
        <>
          <View style={[styles.sheetHeader, { borderBottomColor: theme.borderSubtle }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: isSm ? 20 : 18, fontWeight: '800', color: theme.textPrimary }}>
                  {formatFullDate(selectedDate)}
                </Text>
                {isToday && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: theme.blue600 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>Today</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: isSm ? 14 : 12, color: theme.textMuted, marginTop: 2 }}>
                {dayPlans.length} {dayPlans.length === 1 ? 'plan' : 'plans'} scheduled for this day
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeBottomSheet}
              accessibilityLabel="Close"
              style={[styles.iconBtnSmall, { backgroundColor: theme.bgSubtle }]}
            >
              <CloseIcon color={theme.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: isSm ? 24 : 20, paddingVertical: 16, gap: 12 }}>
            {dayPlans.length > 0 ? (
              dayPlans.map((p) => renderPlanCard(p, selectedDate))
            ) : (
              <Text style={{ textAlign: 'center', fontSize: 14, color: theme.textFaint, paddingVertical: 32 }}>
                No plans scheduled for this day yet.
              </Text>
            )}
          </ScrollView>

          <View style={[styles.sheetFooter, { borderTopColor: theme.borderSubtle, backgroundColor: theme.bgSurface }]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => openNewPlanFormForDate(selectedDate, 'task')}
              style={[styles.primarySaveBtn, { backgroundColor: theme.blue600, flexDirection: 'row', gap: 8 }]}
            >
              <PlusIcon color="#FFFFFF" size={16} strokeWidth={2.6} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>+ Add a plan for this day</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // MODE 2: NEW / EDIT PLAN FORM
    if (sheetMode === 'form') {
      const isEditing = Boolean(editingPlanId);
      const cat = CATEGORIES[formCategory] || CATEGORIES.task;
      const hasPlansOnDate = getAllPlansForDate(selectedDate).length > 0;

      let saveButtonLabel = isEditing ? `Update ${cat.singular}` : `Save ${cat.singular}`;
      if (formCategory === 'task' && !isEditing) {
        const taskCount = plans.filter((p) => p.category === 'task').length;
        const remaining = Math.max(0, 10 - taskCount);
        saveButtonLabel = `Save (${remaining} free tasks remaining)`;
      }

      return (
        <>
          {/* Form Header + 5 Category Tabs */}
          <View style={[styles.formSheetHeader, { borderBottomColor: theme.borderSubtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                {!isEditing && hasPlansOnDate && (
                  <TouchableOpacity
                    onPress={() => {
                      setSheetMode('plans');
                      setEditingPlanId(null);
                      setViewingPlanId(null);
                    }}
                    accessibilityLabel="Back to saved plans"
                    style={{ padding: 6, marginLeft: -4, borderRadius: 12 }}
                  >
                    <ChevronLeftIcon color={theme.textMuted} size={20} />
                  </TouchableOpacity>
                )}
                <View style={[styles.dateHeaderPill, { backgroundColor: theme.blueSoftBg }]}>
                  <CalendarIcon color={theme.blueSoftText} size={14} />
                  <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: theme.blueSoftText }}>
                    {formatFullDate(formDraft.date)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={closeBottomSheet}
                accessibilityLabel="Close"
                style={[styles.iconBtnSmall, { backgroundColor: theme.bgSubtle }]}
              >
                <CloseIcon color={theme.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            {/* 5 Category Pill Tabs */}
            <View style={[styles.catTabBar, { backgroundColor: theme.bgSubtle }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, alignItems: 'center' }}>
                {CATEGORY_ORDER.map((catId) => {
                  const c = CATEGORIES[catId];
                  const active = catId === formCategory;
                  return (
                    <TouchableOpacity
                      key={catId}
                      activeOpacity={0.85}
                      onPress={() => handleSwitchFormTab(catId)}
                      style={[
                        styles.catTabBtn,
                        active && {
                          backgroundColor: theme.bgSurface,
                          borderWidth: 1,
                          borderColor: theme.borderDefault,
                          shadowColor: '#0F172A',
                          shadowOpacity: 0.06,
                          shadowRadius: 4,
                          shadowOffset: { width: 0, height: 1 },
                          elevation: 1,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: isSm ? 14 : 12,
                          fontWeight: '600',
                          color: active ? theme.textPrimary : theme.textMuted,
                        }}
                      >
                        {c.label}
                      </Text>
                      {catId === 'activity' && <CrownIcon color={theme.blue500} size={14} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Scrollable Form Fields */}
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: isSm ? 24 : 20, paddingVertical: 16, gap: 16 }}
          >
            <Text style={{ textAlign: 'center', fontSize: isSm ? 24 : 20, fontWeight: '800', color: theme.textPrimary }}>
              {isEditing ? `Edit ${cat.singular}` : `New ${cat.singular}`}
            </Text>

            {!!formError && (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: theme.roseSoftBg,
                  borderWidth: 1,
                  borderColor: theme.roseSoftBorder,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.roseSoftText }}>{formError}</Text>
              </View>
            )}

            {/* TASK FORM */}
            {formCategory === 'task' && (
              <>
                <TextInput
                  value={formDraft.title}
                  onChangeText={(txt) => setFormDraft((p) => ({ ...p, title: txt }))}
                  placeholder="Task Title"
                  placeholderTextColor={theme.textFaint}
                  style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                />

                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>SUBJECT</Text>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() =>
                      setSelectPicker({
                        title: 'Subject',
                        options: [{ value: '', label: 'Select subject' }, ...subjectOptions.map((s) => ({ value: s, label: s }))],
                        field: 'subject',
                      })
                    }
                    style={[styles.selectBtn, { backgroundColor: theme.bgInput }]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: formDraft.subject ? theme.textPrimary : theme.textFaint }}>
                      {formDraft.subject || 'Select subject'}
                    </Text>
                    <ChevronDownIcon color={theme.textFaint} size={16} />
                  </TouchableOpacity>
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>TYPE (OPTIONAL)</Text>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() =>
                      setSelectPicker({
                        title: 'Task Type',
                        options: [{ value: '', label: 'Task type' }, ...TASK_TYPES.map((t) => ({ value: t, label: t }))],
                        field: 'taskType',
                      })
                    }
                    style={[styles.selectBtn, { backgroundColor: theme.bgInput }]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: formDraft.taskType ? theme.textPrimary : theme.textFaint }}>
                      {formDraft.taskType || 'Task type'}
                    </Text>
                    <ChevronDownIcon color={theme.textFaint} size={16} />
                  </TouchableOpacity>
                </View>

                {renderStandardWhenSection(false)}

                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>DETAILS</Text>
                  <TextInput
                    value={formDraft.notes}
                    onChangeText={(txt) => setFormDraft((p) => ({ ...p, notes: txt }))}
                    placeholder="Add notes..."
                    placeholderTextColor={theme.textFaint}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={[styles.textareaField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  />
                </View>
              </>
            )}

            {/* CLASS FORM */}
            {formCategory === 'class' && (
              <>
                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>CLASS NAME</Text>
                  <TextInput
                    value={formDraft.title}
                    onChangeText={(txt) => setFormDraft((p) => ({ ...p, title: txt }))}
                    placeholder="Class Name"
                    placeholderTextColor={theme.textFaint}
                    style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  />
                </View>

                <View style={{ flexDirection: isSm ? 'row' : 'column', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: theme.textMuted }]}>SUBJECT</Text>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() =>
                        setSelectPicker({
                          title: 'Subject',
                          options: [{ value: '', label: 'Select subject' }, ...subjectOptions.map((s) => ({ value: s, label: s }))],
                          field: 'subject',
                        })
                      }
                      style={[styles.selectBtn, { backgroundColor: theme.bgInput }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', color: formDraft.subject ? theme.textPrimary : theme.textFaint }}>
                        {formDraft.subject || 'Select subject'}
                      </Text>
                      <ChevronDownIcon color={theme.textFaint} size={16} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: theme.textMuted }]}>TEACHER</Text>
                    <TextInput
                      value={formDraft.teacher}
                      onChangeText={(txt) => setFormDraft((p) => ({ ...p, teacher: txt }))}
                      placeholder="Teacher"
                      placeholderTextColor={theme.textFaint}
                      style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                    />
                  </View>
                </View>

                {renderStandardWhenSection(false)}

                {renderWhereSection('class')}

                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>NOTES</Text>
                  <TextInput
                    value={formDraft.notes}
                    onChangeText={(txt) => setFormDraft((p) => ({ ...p, notes: txt }))}
                    placeholder="Add a reminder..."
                    placeholderTextColor={theme.textFaint}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={[styles.textareaField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  />
                </View>
              </>
            )}

            {/* EXAM FORM */}
            {formCategory === 'exam' && (
              <>
                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>EXAM NAME</Text>
                  <TextInput
                    value={formDraft.title}
                    onChangeText={(txt) => setFormDraft((p) => ({ ...p, title: txt }))}
                    placeholder="Exam Name"
                    placeholderTextColor={theme.textFaint}
                    style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  />
                </View>

                <View style={{ flexDirection: isSm ? 'row' : 'column', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: theme.textMuted }]}>SUBJECT</Text>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() =>
                        setSelectPicker({
                          title: 'Subject',
                          options: [{ value: '', label: 'Select subject' }, ...subjectOptions.map((s) => ({ value: s, label: s }))],
                          field: 'subject',
                        })
                      }
                      style={[styles.selectBtn, { backgroundColor: theme.bgInput }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', color: formDraft.subject ? theme.textPrimary : theme.textFaint }}>
                        {formDraft.subject || 'Select subject'}
                      </Text>
                      <ChevronDownIcon color={theme.textFaint} size={16} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: theme.textMuted }]}>TYPE</Text>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() =>
                        setSelectPicker({
                          title: 'Exam Type',
                          options: EXAM_TYPES,
                          field: 'examType',
                        })
                      }
                      style={[styles.selectBtn, { backgroundColor: theme.bgInput }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary }}>
                        {formDraft.examType || 'Exam'}
                      </Text>
                      <ChevronDownIcon color={theme.textFaint} size={16} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.formCard, { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault }]}>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>WHEN</Text>

                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: theme.textMuted }]}>DATE</Text>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => setDatePickerTarget('date')}
                        style={{
                          alignSelf: 'flex-start',
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: theme.bgSubtle,
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>
                          {formatPillDate(formDraft.date)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: theme.textMuted }]}>TIME</Text>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => setTimePickerTarget({ field: 'startTime', title: 'Exam Time' })}
                        style={{
                          alignSelf: 'flex-start',
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: theme.outlinedPillBorder,
                          backgroundColor: theme.bgSurface,
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>
                          {formatTime12h(formDraft.startTime || '10:00')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View>
                    <Text style={[styles.formLabel, { color: theme.textMuted }]}>DURATION</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingVertical: 4 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setFormExamDuration((d) => Math.max(15, Math.min(360, d - 15)))}
                        accessibilityLabel="Decrease duration"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: theme.stepperMinusBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.stepperMinusText, lineHeight: 22 }}>−</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary, minWidth: 68, textAlign: 'center' }}>
                        {formExamDuration} min
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setFormExamDuration((d) => Math.max(15, Math.min(360, d + 15)))}
                        accessibilityLabel="Increase duration"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: theme.bgSubtle,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.textSecondary, lineHeight: 22 }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {renderWhereSection('exam')}

                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>NOTES</Text>
                  <TextInput
                    value={formDraft.notes}
                    onChangeText={(txt) => setFormDraft((p) => ({ ...p, notes: txt }))}
                    placeholder="Add notes..."
                    placeholderTextColor={theme.textFaint}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={[styles.textareaField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  />
                </View>
              </>
            )}

            {/* VACATION FORM */}
            {formCategory === 'vacation' && (
              <>
                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>NAME</Text>
                  <TextInput
                    value={formDraft.title}
                    onChangeText={(txt) => setFormDraft((p) => ({ ...p, title: txt }))}
                    placeholder="Vacation Name"
                    placeholderTextColor={theme.textFaint}
                    style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  />
                </View>

                {renderStandardWhenSection(true)}

                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>NOTES</Text>
                  <TextInput
                    value={formDraft.notes}
                    onChangeText={(txt) => setFormDraft((p) => ({ ...p, notes: txt }))}
                    placeholder="Vacation notes"
                    placeholderTextColor={theme.textFaint}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={[styles.textareaField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  />
                </View>

                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Text style={[styles.formLabel, { color: theme.textMuted, marginBottom: 0 }]}>COVER PHOTO</Text>
                    <CrownIcon color={theme.blue500} size={14} />
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setCoverPhotoModalOpen(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: theme.bgInput,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: theme.bgSurface,
                          borderWidth: 1,
                          borderColor: theme.borderDefault,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PhotoIcon color={theme.textMuted} size={20} />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500', color: theme.textMuted, flex: 1 }}>
                        {formCoverPhotoName || 'Add a photo'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.blueSoftText }}>Upload</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ACTIVITY FORM */}
            {formCategory === 'activity' && (
              <>
                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>ACTIVITY NAME</Text>
                  <TextInput
                    value={formDraft.title}
                    onChangeText={(txt) => setFormDraft((p) => ({ ...p, title: txt }))}
                    placeholder="Activity Name"
                    placeholderTextColor={theme.textFaint}
                    style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  />
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>CATEGORY</Text>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() =>
                      setSelectPicker({
                        title: 'Activity Category',
                        options: ACTIVITY_TYPES,
                        field: 'activityType',
                      })
                    }
                    style={[styles.selectBtn, { backgroundColor: theme.bgInput }]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary }}>
                      {formDraft.activityType || 'Sports & Fitness'}
                    </Text>
                    <ChevronDownIcon color={theme.textFaint} size={16} />
                  </TouchableOpacity>
                </View>

                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>DATE & TIME</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setDatePickerTarget('date')}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: theme.bgSubtle,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>
                        {formatPillDate(formDraft.date)}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setFormShowActivityTimeEditor((v) => !v)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: theme.outlinedPillBorder,
                        backgroundColor: theme.bgSurface,
                      }}
                    >
                      <ClockIcon color={theme.textMuted} size={16} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>
                        {formatTime12h(formDraft.startTime || '16:00')} - {formatTime12h(formDraft.endTime || '17:00')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {formShowActivityTimeEditor && (
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 12,
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 16,
                        backgroundColor: theme.bgMuted,
                        borderWidth: 1,
                        borderColor: theme.borderDefault,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: theme.textMuted }]}>STARTS</Text>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => setTimePickerTarget({ field: 'startTime', title: 'Starts' })}
                          style={[styles.inputField, { backgroundColor: theme.bgInput, justifyContent: 'center' }]}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary }}>
                            {formDraft.startTime || '16:00'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: theme.textMuted }]}>ENDS</Text>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => setTimePickerTarget({ field: 'endTime', title: 'Ends' })}
                          style={[styles.inputField, { backgroundColor: theme.bgInput, justifyContent: 'center' }]}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textPrimary }}>
                            {formDraft.endTime || '17:00'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {renderDurationControl()}

                <View>
                  <Text style={[styles.formLabel, { color: theme.textMuted }]}>NOTES</Text>
                  <TextInput
                    value={formDraft.notes}
                    onChangeText={(txt) => setFormDraft((p) => ({ ...p, notes: txt }))}
                    placeholder="Add notes..."
                    placeholderTextColor={theme.textFaint}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={[styles.textareaField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Stacked Action Footer (Exact Save + Cancel) */}
          <View style={[styles.sheetFooter, { borderTopColor: theme.borderSubtle, backgroundColor: theme.bgSurface, gap: 10 }]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleFormSubmit}
              style={[styles.primarySaveBtn, { backgroundColor: theme.blue600 }]}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{saveButtonLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={closeBottomSheet}
              style={[
                styles.cancelOutlineBtn,
                {
                  borderColor: theme.blue500,
                  backgroundColor: theme.bgSurface,
                },
              ]}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.blueSoftText }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // MODE 3: PLAN DETAILS VIEW
    const plan = plans.find((p) => p.id === viewingPlanId);
    if (!plan) return null;
    const cat = CATEGORIES[plan.category] || CATEGORIES.task;
    const occurrence = getPlannerScheduleOccurrence(
      state,
      planToScheduleItem(plan),
      viewingPlanDate || selectedDate,
      TODAY_ISO
    );
    const pillBg = isDark ? cat.pillBgDark : cat.pillBgLight;
    const pillText = isDark ? cat.pillTextDark : cat.pillTextLight;

    const plannedMinutes = occurrence.plannedSeconds !== null
      ? Math.round(occurrence.plannedSeconds / 60)
      : typeof plan.durationMinutes === 'number' && Number.isFinite(plan.durationMinutes)
        ? Math.round(plan.durationMinutes)
        : null;
    const durationValue = plannedMinutes !== null ? `${plannedMinutes} min` : (plan.duration || 'Not set');
    const actualFocusedDisplay = formatFocusedTime(occurrence.actualSeconds);
    const plannedDisplay = occurrence.plannedSeconds !== null && occurrence.plannedSeconds > 0
      ? formatFocusedTime(occurrence.plannedSeconds)
      : plannedMinutes !== null && plannedMinutes > 0
        ? `${plannedMinutes}m`
        : null;
    const focusProgressValue = plannedDisplay
      ? `${actualFocusedDisplay} focused / ${plannedDisplay} planned · ${occurrence.progressPercent}%`
      : `${actualFocusedDisplay} focused`;

    const rows = [];
    rows.push({ label: 'Date', value: formatFullDate(plan.date) });
    if (plan.category === 'vacation' && plan.endDate && plan.endDate !== plan.date) {
      rows.push({ label: 'End Date', value: formatFullDate(plan.endDate) });
    }
    rows.push({ label: 'Time', value: getTimeRangeDisplay(plan) });
    rows.push({ label: 'Schedule', value: getRecurrenceSummary(plan) });
    if (plan.dateRangeMode === 'term' && plan.termName) rows.push({ label: 'Date Range', value: plan.termName });
    if (plan.dateRangeMode === 'manual' && plan.rangeFrom && plan.rangeUntil) {
      rows.push({
        label: 'Date Range',
        value: `${formatCompactDate(plan.rangeFrom)} – ${formatCompactDate(plan.rangeUntil)}`,
      });
    }
    if (plan.subject) rows.push({ label: 'Subject', value: plan.subject });
    if (plan.taskType) rows.push({ label: 'Task Type', value: plan.taskType });
    if (plan.examType) rows.push({ label: 'Exam Type', value: plan.examType });
    if (plan.category !== 'vacation') {
      rows.push({ label: 'Duration', value: durationValue });
      rows.push({ label: 'Actual Focused', value: actualFocusedDisplay });
      rows.push({ label: 'Focus Progress', value: focusProgressValue });
      rows.push({ label: 'Progress', value: `${occurrence.progressPercent}%` });
    }
    if (plan.activityType) rows.push({ label: 'Category', value: plan.activityType });
    if (plan.teacher || plan.instructor) rows.push({ label: 'Teacher', value: plan.teacher || plan.instructor });
    if (plan.whereMode) rows.push({ label: 'Mode', value: plan.whereMode === 'online' ? 'Online' : 'In Person' });
    if (plan.location) rows.push({ label: 'Location', value: plan.location });
    if (plan.seatNumber) rows.push({ label: 'Seat #', value: plan.seatNumber });
    if (plan.coverPhotoName) rows.push({ label: 'Cover Photo', value: plan.coverPhotoName });

    return (
      <>
        <View style={[styles.sheetHeader, { borderBottomColor: theme.borderSubtle, alignItems: 'center' }]}>
          <TouchableOpacity
            onPress={() => {
              setSheetMode('plans');
              setEditingPlanId(null);
              setViewingPlanId(null);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <ChevronLeftIcon color={theme.textSecondary} size={18} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSecondary }}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={closeBottomSheet}
            accessibilityLabel="Close"
            style={[styles.iconBtnSmall, { backgroundColor: theme.bgSubtle }]}
          >
            <CloseIcon color={theme.textMuted} size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: isSm ? 24 : 20, paddingVertical: 20, gap: 20 }}>
          <View>
            <View style={[styles.detailCatPill, { backgroundColor: pillBg }]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.dotBg }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: pillText }}>{cat.singular}</Text>
            </View>
            <Text style={{ fontSize: isSm ? 24 : 20, fontWeight: '800', color: theme.textPrimary, marginTop: 10 }}>
              {plan.title}
            </Text>
          </View>

          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.borderDefault,
              backgroundColor: theme.bgDetailRows,
              overflow: 'hidden',
            }}
          >
            {rows.map((r, idx) => (
              <View
                key={`${r.label}_${idx}`}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: theme.borderSubtle,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textMuted }}>{r.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary, textAlign: 'right', flexShrink: 1 }}>
                  {r.value}
                </Text>
              </View>
            ))}
          </View>

          {plan.category !== 'vacation' && (
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.borderDefault,
                backgroundColor: theme.bgDetailRows,
                padding: 16,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.5 }}>
                  FOCUS PROGRESS
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: occurrence.progressPercent >= 100 ? theme.emerald600 : theme.blueSoftText }}>
                  {occurrence.progressPercent}%
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.bgSubtle, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(0, occurrence.progressPercent))}%`,
                    borderRadius: 999,
                    backgroundColor: occurrence.progressPercent >= 100 ? theme.emerald500 : theme.blue600,
                  }}
                />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>
                {focusProgressValue}
              </Text>
            </View>
          )}

          {!!plan.notes && (
            <View>
              <Text style={[styles.formLabel, { color: theme.textFaint }]}>NOTES</Text>
              <View style={{ padding: 16, borderRadius: 16, backgroundColor: theme.bgNotesBox }}>
                <Text style={{ fontSize: 14, color: theme.textBody, lineHeight: 22 }}>{plan.notes}</Text>
              </View>
            </View>
          )}
          {occurrence.status !== 'completed' && (
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openFocusForPlan(plan, occurrence.date)}
                style={[styles.primarySaveBtn, { backgroundColor: theme.blue600 }]}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                  {occurrence.status === 'missed' ? 'Complete This' : occurrence.actualSeconds > 0 ? 'Continue' : 'Start Focus'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => markPlanCompleted(plan, occurrence.date)}
                style={[styles.primarySaveBtn, { backgroundColor: theme.bgSubtle }]}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textSecondary }}>Mark as Completed</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={[styles.sheetFooter, { borderTopColor: theme.borderSubtle, flexDirection: 'row', gap: 12 }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setPendingDeleteId(plan.id)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: theme.roseSoftBg,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.roseSoftText }}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openEditPlanForm(plan.id, occurrence.date)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: theme.blue600,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Edit Plan</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  /* ----------------------------------------------------------------------- */
  /* DELETE TARGET PLAN REFERENCE                                            */
  /* ----------------------------------------------------------------------- */
  const pendingDeletePlan = pendingDeleteId ? plans.find((p) => p.id === pendingDeleteId) : null;

  /* ----------------------------------------------------------------------- */
  /* MAIN RENDER                                                             */
  /* ----------------------------------------------------------------------- */
  return (
    <Shell active="StudyPlanner" title="" scroll={false} contentPadding={0}>
      <View style={[styles.root, { backgroundColor: theme.bgBody }]}>
      {plannerRecoveredCount > 0 && plannerRecoveryCount === 0 && (
        <View
          accessibilityRole="alert"
          style={{
            marginHorizontal: 12,
            marginTop: 10,
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.bluePillBorder,
            backgroundColor: theme.blueSoftBg,
          }}
        >
          <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>Planner entries recovered</Text>
          <Text style={{ color: theme.textBody, marginTop: 4 }}>
            {plannerRecoveredCount} saved {plannerRecoveredCount === 1 ? 'entry was' : 'entries were'} automatically restored to your schedule. 0 entries need manual review.
          </Text>
          {dismissPlannerRecoveredNotice ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={dismissPlannerRecoveredNotice}
              style={{ alignSelf: 'flex-start', marginTop: 8 }}
            >
              <Text style={{ color: theme.blue600, fontWeight: '700' }}>Dismiss</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {plannerRecoveryCount > 0 && (
        <View
          accessibilityRole="alert"
          style={{
            marginHorizontal: 12,
            marginTop: 10,
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isDark ? '#92400E' : '#FDE68A',
            backgroundColor: isDark ? '#422006' : '#FEF3C7',
          }}
        >
          <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>Some planner entries need review</Text>
          <Text style={{ color: theme.textBody, marginTop: 4 }}>
            {plannerRecoveredCount > 0
              ? `${plannerRecoveredCount} ${plannerRecoveredCount === 1 ? 'entry was' : 'entries were'} automatically recovered. `
              : ''}
            {plannerRecoveryCount} saved {plannerRecoveryCount === 1 ? 'entry needs' : 'entries need'} manual review and {plannerRecoveryCount === 1 ? 'is' : 'are'} safely preserved in recovery storage.
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
            Your valid entries are available below. Inspect any preserved entry to fix missing or unreadable details without losing your original data.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setEditingRecoveryEntry(null);
                setRecoveryDraftError('');
                setRecoveryModalOpen(true);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: theme.blue600,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                Review entries ({plannerRecoveryCount})
              </Text>
            </TouchableOpacity>
            {retryPlannerRecovery ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={retryPlannerRecovery}
                style={{ paddingVertical: 7 }}
              >
                <Text style={{ color: theme.blue600, fontWeight: '700', fontSize: 12 }}>
                  Retry auto-recovery
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}
      {/* =================================================================== */}
      {/* MAIN SCROLLABLE PLANNER CONTENT                                     */}
      {/* =================================================================== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.mainScrollContent,
          {
            paddingHorizontal: isSm ? 24 : 12,
            paddingBottom: isMd ? 40 : 28,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '100%', maxWidth: 1152, alignSelf: 'center' }}>
          {/* Planner Title Banner & Expanded View Switcher */}
          <View
            style={{
              marginBottom: isSm ? 20 : 16,
              flexDirection: isSm ? 'row' : 'column',
              alignItems: isSm ? 'flex-end' : 'stretch',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: isSm ? 30 : 24,
                  fontWeight: '800',
                  letterSpacing: -0.6,
                  color: theme.textPrimary,
                }}
              >
                Study Planner
              </Text>
              <Text style={{ fontSize: 14, color: theme.textMuted, marginTop: 2 }}>
                Plan tasks, classes, exams and activities
              </Text>
            </View>

            {/* Expanded Calendar / List Switcher */}
            <View
              style={[
                styles.viewSwitcherTrack,
                {
                  width: isSm ? (isMd ? 340 : 300) : '100%',
                  backgroundColor: theme.bgSwitcher,
                  borderColor: theme.bgSwitcherBorder,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setViewMode('calendar')}
                style={[
                  styles.viewSwitchBtn,
                  viewMode === 'calendar' && {
                    backgroundColor: theme.bgSurface,
                    shadowColor: '#0F172A',
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  },
                ]}
              >
                <CalendarIcon color={viewMode === 'calendar' ? theme.blueSoftText : theme.textSecondary} size={16} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: viewMode === 'calendar' ? theme.blueSoftText : theme.textSecondary,
                  }}
                >
                  Calendar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setViewMode('list')}
                style={[
                  styles.viewSwitchBtn,
                  viewMode === 'list' && {
                    backgroundColor: theme.bgSurface,
                    shadowColor: '#0F172A',
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  },
                ]}
              >
                <ListIcon color={viewMode === 'list' ? theme.blueSoftText : theme.textSecondary} size={16} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: viewMode === 'list' ? theme.blueSoftText : theme.textSecondary,
                  }}
                >
                  List
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === 'list' && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {([
                ['completed', 'Completed'],
                ['missed', 'Missed'],
                ['upcoming', 'Upcoming'],
              ] as const).map(([status, label]) => {
                const active = scheduleStatusFilter === status;
                return (
                  <TouchableOpacity
                    key={status}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setScheduleStatusFilter(status)}
                    style={{
                      flex: 1,
                      minHeight: 38,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: active ? theme.blue600 : theme.borderDefault,
                      backgroundColor: active ? theme.blueSoftBg : theme.bgSurface,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? theme.blueSoftText : theme.textMuted }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ================================================================= */}
          {/* PRIMARY CALENDAR CARD (DEFAULT VIEW)                              */}
          {/* ================================================================= */}
          {viewMode === 'calendar' && (
            <View
              style={[
                styles.calendarCard,
                {
                  backgroundColor: theme.bgSurface,
                  borderColor: theme.borderDefault,
                },
              ]}
            >
              {/* Calendar Toolbar */}
              <View
                style={[
                  styles.calendarToolbar,
                  {
                    paddingHorizontal: isSm ? 24 : 16,
                    borderBottomColor: theme.borderSubtle,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: isSm ? 8 : 6, flexShrink: 1 }}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      if (!monthPickerOpen) setPickerYear(currentYear);
                      setMonthPickerOpen((v) => !v);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: isSm ? 12 : 10,
                      paddingVertical: 6,
                      marginLeft: -8,
                      borderRadius: 16,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: isSm ? 24 : 16,
                        fontWeight: '700',
                        letterSpacing: -0.3,
                        color: theme.textPrimary,
                      }}
                    >
                      {MONTH_NAMES[currentMonth]} {currentYear}
                    </Text>
                    <ChevronDownIcon color={theme.textFaint} size={16} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      const now = new Date();
                      setCurrentYear(now.getFullYear());
                      setCurrentMonth(now.getMonth());
                      setSelectedDate(TODAY_ISO);
                      setMonthPickerOpen(false);
                      showToast('Jumped to Today');
                    }}
                    style={{
                      paddingHorizontal: isSm ? 12 : 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: theme.blueSoftBg,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.blueSoftText }}>Today</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: isSm ? 8 : 6 }}>
                  {isSm && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => openNewPlanFormForDate(selectedDate, 'task')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: theme.blue600,
                        marginRight: 4,
                      }}
                    >
                      <PlusIcon color="#FFFFFF" size={16} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Add Plan</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => stepMonth(-1)}
                    accessibilityLabel="Previous month"
                    style={[
                      styles.navSquareBtn,
                      {
                        width: isSm ? 40 : 36,
                        height: isSm ? 40 : 36,
                        borderColor: theme.borderDefault,
                      },
                    ]}
                  >
                    <ChevronLeftIcon color={theme.textSecondary} size={20} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => stepMonth(1)}
                    accessibilityLabel="Next month"
                    style={[
                      styles.navSquareBtn,
                      {
                        width: isSm ? 40 : 36,
                        height: isSm ? 40 : 36,
                        borderColor: theme.borderDefault,
                      },
                    ]}
                  >
                    <ChevronRightIcon color={theme.textSecondary} size={20} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Inline Month / Year Picker Popover */}
              {monthPickerOpen && (
                <View
                  style={[
                    styles.monthPopover,
                    {
                      width: isSm ? 320 : 288,
                      backgroundColor: theme.bgSurface,
                      borderColor: theme.borderStrong,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setPickerYear((y) => y - 1)}
                      style={{ padding: 6, borderRadius: 8 }}
                    >
                      <ChevronLeftIcon color={theme.textSecondary} size={16} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary }}>{pickerYear}</Text>
                    <TouchableOpacity
                      onPress={() => setPickerYear((y) => y + 1)}
                      style={{ padding: 6, borderRadius: 8 }}
                    >
                      <ChevronRightIcon color={theme.textSecondary} size={16} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {SHORT_MONTHS.map((label, idx) => {
                      const isCurrent = pickerYear === currentYear && idx === currentMonth;
                      return (
                        <TouchableOpacity
                          key={label}
                          activeOpacity={0.8}
                          onPress={() => {
                            setCurrentYear(pickerYear);
                            setCurrentMonth(idx);
                            setMonthPickerOpen(false);
                          }}
                          style={{
                            width: '31%',
                            paddingVertical: 8,
                            borderRadius: 12,
                            alignItems: 'center',
                            backgroundColor: isCurrent ? theme.blue600 : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: isCurrent ? '#FFFFFF' : theme.textBody,
                            }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Weekday Headers (Sunday to Saturday) */}
              <View
                style={[
                  styles.weekdayHeaderBar,
                  {
                    paddingHorizontal: isSm ? 16 : 8,
                    borderBottomColor: theme.borderSubtle,
                  },
                ]}
              >
                {WEEKDAY_SHORT.map((dayLabel, idx) => (
                  <Text
                    key={dayLabel}
                    style={{
                      width: '14.285%',
                      textAlign: 'center',
                      fontSize: isSm ? 12 : 11,
                      fontWeight: '700',
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      color: idx === 0 ? theme.textSundayHeader : theme.textFaint,
                    }}
                  >
                    {dayLabel}
                  </Text>
                ))}
              </View>

              {/* Monthly Date Grid */}
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  padding: isSm ? 12 : 6,
                }}
              >
                {calendarCells.map((cell) => {
                  const cellGap = isSm ? 4 : 2;
                  let cellBg = theme.bgSurface;
                  let cellBorder = theme.borderSubtle;
                  if (!cell.isCurrentMonth) {
                    cellBg = theme.bgOtherMonthCell;
                    cellBorder = 'transparent';
                  } else if (cell.isSelected) {
                    cellBg = theme.bgSelectedCell;
                    cellBorder = theme.borderSelectedCell;
                  } else if (cell.isToday) {
                    cellBg = theme.bgTodayCell;
                    cellBorder = theme.borderTodayCell;
                  }

                  let numBg = 'transparent';
                  let numColor = theme.textBody;
                  if (cell.isToday) {
                    numBg = theme.blue600;
                    numColor = '#FFFFFF';
                  } else if (cell.isSelected) {
                    numBg = theme.blueSelectedNumBg;
                    numColor = theme.blueSelectedNumText;
                  } else if (cell.isSunday && cell.isCurrentMonth) {
                    numColor = theme.textSundayNum;
                  }

                  const mobileVisible = cell.dayPlans.slice(0, 3);
                  const mobileExtra = cell.dayPlans.length - 3;
                  const desktopVisible = cell.dayPlans.slice(0, 2);
                  const desktopExtra = cell.dayPlans.length - 2;

                  return (
                    <View key={cell.iso} style={{ width: '14.2857%', padding: cellGap }}>
                      <TouchableOpacity
                        activeOpacity={0.78}
                        onPress={() => handleDateSelected(cell.iso)}
                        accessibilityLabel={`${formatFullDate(cell.iso)}, ${cell.dayPlans.length} plans`}
                        style={[
                          styles.calCell,
                          {
                            minHeight: isMd ? 116 : isSm ? 104 : 70,
                            padding: isSm ? 10 : 6,
                            backgroundColor: cellBg,
                            borderColor: cellBorder,
                            borderWidth: cell.isSelected ? 1.5 : 1,
                            opacity: cell.isCurrentMonth ? 1 : 0.45,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <View
                            style={{
                              width: isSm ? 28 : 24,
                              height: isSm ? 28 : 24,
                              borderRadius: 999,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: numBg,
                            }}
                          >
                            <Text style={{ fontSize: isSm ? 14 : 12, fontWeight: '700', color: numColor }}>
                              {cell.dayNumber}
                            </Text>
                          </View>
                          {isMd && cell.dayPlans.length > 0 && (
                            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textFaint }}>
                              {cell.dayPlans.length}
                            </Text>
                          )}
                        </View>

                        {cell.dayPlans.length > 0 && !isSm && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 4 }}>
                            {mobileVisible.map((p) => {
                              const c = CATEGORIES[p.category] || CATEGORIES.task;
                              return <View key={p.id} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.dotBg }} />;
                            })}
                            {mobileExtra > 0 && (
                              <Text style={{ fontSize: 9, fontWeight: '800', color: theme.textMuted }}>
                                +{mobileExtra}
                              </Text>
                            )}
                          </View>
                        )}

                        {cell.dayPlans.length > 0 && isSm && (
                          <View style={{ gap: 4, marginTop: 6, width: '100%' }}>
                            {desktopVisible.map((p) => {
                              const c = CATEGORIES[p.category] || CATEGORIES.task;
                              return (
                                <View
                                  key={p.id}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    backgroundColor: isDark ? c.pillBgDark : c.pillBgLight,
                                  }}
                                >
                                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.dotBg }} />
                                  <Text
                                    numberOfLines={1}
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '600',
                                      color: isDark ? c.pillTextDark : c.pillTextLight,
                                      flexShrink: 1,
                                    }}
                                  >
                                    {p.title}
                                  </Text>
                                </View>
                              );
                            })}
                            {desktopExtra > 0 && (
                              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, paddingLeft: 4 }}>
                                +{desktopExtra} more
                              </Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              {/* Category Color Legend & Hint Footer */}
              <View
                style={[
                  styles.legendFooter,
                  {
                    paddingHorizontal: isSm ? 24 : 16,
                    backgroundColor: theme.bgMuted,
                    borderTopColor: theme.borderSubtle,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 6 }}>
                  {CATEGORY_ORDER.map((id) => (
                    <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CATEGORIES[id].dotBg }} />
                      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary }}>
                        {CATEGORIES[id].label}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={{ fontSize: isSm ? 12 : 11, color: theme.textFaint }}>
                  Tap any date to view or add plans
                </Text>
              </View>
            </View>
          )}

          {/* ================================================================= */}
          {/* CHRONOLOGICAL LIST VIEW                                           */}
          {/* ================================================================= */}
          {viewMode === 'list' && (
            <View style={{ gap: 16 }}>
              <View
                style={[
                  styles.calendarCard,
                  {
                    backgroundColor: theme.bgSurface,
                    borderColor: theme.borderDefault,
                    paddingHorizontal: isSm ? 24 : 16,
                    paddingVertical: 16,
                    gap: 12,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: isSm ? 12 : 8 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: isSm ? 20 : 17,
                      fontWeight: '700',
                      color: theme.textPrimary,
                      flexShrink: 1,
                    }}
                  >
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: isSm ? 8 : 6, flexShrink: 0 }}>
                    <TouchableOpacity
                      onPress={() => stepMonth(-1)}
                      accessibilityLabel="Previous month"
                      style={[styles.smallSquareBtn, { borderColor: theme.borderStrong }]}
                    >
                      <ChevronLeftIcon color={theme.textSecondary} size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => stepMonth(1)}
                      accessibilityLabel="Next month"
                      style={[styles.smallSquareBtn, { borderColor: theme.borderStrong }]}
                    >
                      <ChevronRightIcon color={theme.textSecondary} size={16} />
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: theme.bgSubtle,
                      flexShrink: 0,
                    }}
                  >
                    <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>
                      {listMonthData.totalOccurrences} {listMonthData.totalOccurrences === 1 ? 'plan' : 'plans'}
                    </Text>
                  </View>
                </View>

                {/* Category Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
                  {[{ id: 'all', label: 'All' }, ...CATEGORY_ORDER.map((id) => ({ id, label: CATEGORIES[id].label }))].map((f) => {
                    const active = listFilter === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        activeOpacity={0.8}
                        onPress={() => setListFilter(f.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: active ? theme.chipActiveBg : theme.bgSubtle,
                        }}
                      >
                        {f.id !== 'all' && (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORIES[f.id].dotBg }} />
                        )}
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: active ? theme.chipActiveText : theme.textSecondary,
                          }}
                        >
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Chronological Plans List */}
              {listMonthData.groupedDays.length === 0 ? (
                <View
                  style={[
                    styles.calendarCard,
                    {
                      backgroundColor: theme.bgSurface,
                      borderColor: theme.borderDefault,
                      padding: 40,
                      alignItems: 'center',
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      backgroundColor: theme.blueSoftBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <CalendarIcon color={theme.blue500} size={28} strokeWidth={1.8} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary }}>
                    No plans in {MONTH_NAMES[currentMonth]}
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.textMuted, marginTop: 4, textAlign: 'center', maxWidth: 300 }}>
                    Tap "Add Plan" or pick any date on the calendar to schedule tasks, classes, exams, or activities.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {listMonthData.groupedDays.map((group) => {
                    const isToday = group.iso === TODAY_ISO;
                    return (
                      <View
                        key={group.iso}
                        style={[
                          styles.calendarCard,
                          {
                            backgroundColor: theme.bgSurface,
                            borderColor: theme.borderDefault,
                          },
                        ]}
                      >
                        <View
                          style={{
                            paddingHorizontal: isSm ? 20 : 16,
                            paddingVertical: 12,
                            backgroundColor: theme.bgMuted,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.borderSubtle,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>
                              {formatFullDate(group.iso)}
                            </Text>
                            {isToday && (
                              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: theme.blue600 }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>Today</Text>
                              </View>
                            )}
                          </View>
                          <TouchableOpacity onPress={() => openNewPlanFormForDate(group.iso, 'task')}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.blueSoftText }}>+ Add</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ padding: isSm ? 16 : 12, gap: 10 }}>
                          {group.plans.map((plan) => renderPlanCard(plan, group.iso))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* =================================================================== */}
      {/* ROUNDED-TOP BOTTOM SHEET MODAL                                      */}
      {/* =================================================================== */}
      <Modal visible={sheetMounted} transparent animationType="none" onRequestClose={closeBottomSheet}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.backdrop, opacity: sheetBackdropOpacity },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeBottomSheet} />
          </Animated.View>

          <Animated.View
            style={[
              styles.bottomSheetPanel,
              {
                height: Math.min(height * 0.9, height - insets.top - insets.bottom),
                maxHeight: height - insets.top - insets.bottom,
                paddingBottom: insets.bottom,
                backgroundColor: theme.bgSurface,
                borderTopColor: theme.borderDefault,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            {/* Drag Handle Pill */}
            <View style={{ paddingTop: 12, paddingBottom: 4, alignItems: 'center' }}>
              <View style={{ width: 44, height: 6, borderRadius: 999, backgroundColor: theme.dragHandle }} />
            </View>

            {renderBottomSheetContent()}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =================================================================== */}
      {/* CUSTOM DELETE CONFIRMATION MODAL                                    */}
      {/* =================================================================== */}
      <Modal
        visible={Boolean(pendingDeletePlan)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDeleteId(null)}
      >
        <Pressable
          style={[styles.centerModalBackdrop, { backgroundColor: theme.modalBackdrop }]}
          onPress={() => setPendingDeleteId(null)}
        >
          <Pressable
            style={[
              styles.confirmCard,
              { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: theme.roseSoftBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <TrashIcon color={theme.rose500} size={24} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary }}>Delete this plan?</Text>
            <Text style={{ fontSize: 14, color: theme.textMuted, marginTop: 6, lineHeight: 20 }}>
              {pendingDeletePlan
                ? `Are you sure you want to delete "${pendingDeletePlan.title}"? This will remove it from your calendar and list.`
                : 'This action will permanently remove the plan from your calendar and list.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setPendingDeleteId(null)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: 'center',
                  backgroundColor: theme.bgSubtle,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textBody }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={confirmDeletePlan}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: 'center',
                  backgroundColor: theme.rose600,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* =================================================================== */}
      {/* QUICK HELP / TIPS MODAL                                             */}
      {/* =================================================================== */}
      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable
          style={[styles.centerModalBackdrop, { backgroundColor: theme.modalBackdrop }]}
          onPress={() => setHelpOpen(false)}
        >
          <Pressable
            style={[
              styles.helpCard,
              { backgroundColor: theme.bgSurface, borderColor: theme.borderDefault },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary }}>Study Planner Guide</Text>
              <TouchableOpacity onPress={() => setHelpOpen(false)} style={{ padding: 6, borderRadius: 12 }}>
                <CloseIcon color={theme.textFaint} size={20} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12 }}>
              {[
                {
                  num: '1',
                  bg: isDark ? '#172554' : '#DBEAFE',
                  fg: isDark ? '#93C5FD' : '#2563EB',
                  bold: 'Tap any date',
                  rest: ' to instantly create a plan (if empty) or browse all saved plans for that day.',
                },
                {
                  num: '2',
                  bg: isDark ? '#022C22' : '#D1FAE5',
                  fg: isDark ? '#6EE7B7' : '#059669',
                  bold: 'Color-coded badges',
                  rest: ' represent Tasks (Blue), Classes (Green), Exams (Orange), Vacations (Purple), and Activities (Teal).',
                },
                {
                  num: '3',
                  bg: isDark ? '#3B0764' : '#F3E8FF',
                  fg: isDark ? '#D8B4FE' : '#9333EA',
                  bold: 'Recurring plans',
                  rest: ' (Daily, Weekly with weekday selection, Monthly, Yearly) automatically appear across your calendar.',
                },
                {
                  num: '4',
                  bg: isDark ? '#451A03' : '#FEF3C7',
                  fg: isDark ? '#FCD34D' : '#D97706',
                  bold: 'Switch seamlessly between Calendar and List',
                  rest: ' views to browse and manage every plan in one place.',
                },
              ].map((tip) => (
                <View key={tip.num} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: tip.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: tip.fg }}>{tip.num}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: theme.textSecondary, lineHeight: 20 }}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{tip.bold}</Text>
                    {tip.rest}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setHelpOpen(false)}
              style={{
                marginTop: 20,
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: theme.blue600,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* =================================================================== */}
      {/* NATIVE PICKERS FOR SELECT / DATE / TIME / COVER PHOTO               */}
      {/* =================================================================== */}
      <SelectPickerModal
        visible={Boolean(selectPicker)}
        title={selectPicker ? selectPicker.title : ''}
        options={selectPicker ? selectPicker.options : []}
        selectedValue={selectPicker ? formDraft[selectPicker.field] : ''}
        onSelect={(val) => {
          if (selectPicker) {
            setFormDraft((prev) => ({ ...prev, [selectPicker.field]: val }));
          }
        }}
        onClose={() => setSelectPicker(null)}
        theme={theme}
      />

      <DatePickerModal
        visible={Boolean(datePickerTarget)}
        valueISO={
          datePickerTarget === 'rangeFrom'
            ? formDraft.rangeFrom || formDraft.date
            : datePickerTarget === 'rangeUntil'
            ? formDraft.rangeUntil || formDraft.date
            : formDraft.date
        }
        onSelect={(iso) => {
          if (datePickerTarget === 'date') {
            setSelectedDate(iso);
            setFormDraft((prev) => ({ ...prev, date: iso }));
          } else if (datePickerTarget === 'rangeFrom') {
            setFormDraft((prev) => ({ ...prev, rangeFrom: iso }));
            if (formCategory === 'vacation') setFormVacationPreset('custom');
          } else if (datePickerTarget === 'rangeUntil') {
            setFormDraft((prev) => ({ ...prev, rangeUntil: iso }));
            if (formCategory === 'vacation') setFormVacationPreset('custom');
          }
        }}
        onClose={() => setDatePickerTarget(null)}
        theme={theme}
      />

      <TimePickerModal
        visible={Boolean(timePickerTarget)}
        title={timePickerTarget ? timePickerTarget.title : 'Select Time'}
        valueTime={timePickerTarget ? formDraft[timePickerTarget.field] : '09:00'}
        onSelect={(t) => {
          if (timePickerTarget) {
            const nextDraft = { ...formDraft, [timePickerTarget.field]: t };
            setFormDraft(nextDraft);
            if ((formCategory === 'task' || formCategory === 'class' || !formDurationTouched) && formCategory !== 'exam' && formCategory !== 'vacation') {
              const span = computeMinutesBetween(nextDraft.startTime, nextDraft.endTime);
              if (span !== null) {
                setFormPlannedDuration(span);
                setFormDurationText(String(span));
              }
            }
          }
        }}
        onClose={() => setTimePickerTarget(null)}
        theme={theme}
      />

      <CoverPhotoModal
        visible={coverPhotoModalOpen}
        currentName={formCoverPhotoName}
        onSelect={(name) => setFormCoverPhotoName(name)}
        onClose={() => setCoverPhotoModalOpen(false)}
        theme={theme}
      />

      <FocusSessionSetupModal
        visible={focusSetupVisible}
        value={focusSetup}
        onChange={setFocusSetup}
        onClose={() => setFocusSetupVisible(false)}
        onContinue={(value) => {
          setFocusSetupVisible(false);
          navigation.navigate('FocusCenter', { focusSession: value });
        }}
      />

      <Modal
        visible={recoveryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEditingRecoveryEntry(null);
          setRecoveryModalOpen(false);
        }}
      >
        <Pressable
          style={[styles.centerModalBackdrop, { backgroundColor: theme.modalBackdrop }]}
          onPress={() => {
            setEditingRecoveryEntry(null);
            setRecoveryModalOpen(false);
          }}
        >
          <Pressable
            style={[
              styles.helpCard,
              {
                maxHeight: Math.min(height * 0.85, 620),
                backgroundColor: theme.bgSurface,
                borderColor: theme.borderDefault,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary }}>
                {editingRecoveryEntry ? 'Fix & Restore Entry' : 'Review Saved Entries'}
              </Text>
              <TouchableOpacity
                accessibilityLabel="Close recovery review"
                onPress={() => {
                  setEditingRecoveryEntry(null);
                  setRecoveryModalOpen(false);
                }}
                style={{ padding: 6, borderRadius: 12 }}
              >
                <CloseIcon color={theme.textFaint} size={20} />
              </TouchableOpacity>
            </View>

            {editingRecoveryEntry ? (
              <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                    {editingRecoveryEntry.guidance}
                  </Text>
                  {!!recoveryDraftError && (
                    <View
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        backgroundColor: theme.roseSoftBg,
                        borderWidth: 1,
                        borderColor: theme.roseSoftBorder,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.roseSoftText }}>
                        {recoveryDraftError}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={[styles.formLabel, { color: theme.textMuted }]}>TITLE</Text>
                    <TextInput
                      value={recoveryDraft.title}
                      onChangeText={(txt) => setRecoveryDraft((d) => ({ ...d, title: txt }))}
                      placeholder="Plan title"
                      placeholderTextColor={theme.textFaint}
                      style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                    />
                  </View>
                  <View>
                    <Text style={[styles.formLabel, { color: theme.textMuted }]}>CATEGORY</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {(['Tasks', 'Classes', 'Exams', 'Vacations', 'Activities'] as const).map((catName) => {
                        const active = recoveryDraft.category === catName;
                        return (
                          <TouchableOpacity
                            key={catName}
                            onPress={() => setRecoveryDraft((d) => ({ ...d, category: catName }))}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 999,
                              backgroundColor: active ? theme.blue600 : theme.bgSubtle,
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFFFFF' : theme.textSecondary }}>
                              {catName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <View>
                    <Text style={[styles.formLabel, { color: theme.textMuted }]}>DATE (YYYY-MM-DD)</Text>
                    <TextInput
                      value={recoveryDraft.date}
                      onChangeText={(txt) => setRecoveryDraft((d) => ({ ...d, date: txt }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.textFaint}
                      style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: theme.textMuted }]}>START TIME (OPTIONAL)</Text>
                      <TextInput
                        value={recoveryDraft.startTime}
                        onChangeText={(txt) => setRecoveryDraft((d) => ({ ...d, startTime: txt }))}
                        placeholder="09:00"
                        placeholderTextColor={theme.textFaint}
                        style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: theme.textMuted }]}>END TIME (OPTIONAL)</Text>
                      <TextInput
                        value={recoveryDraft.endTime}
                        onChangeText={(txt) => setRecoveryDraft((d) => ({ ...d, endTime: txt }))}
                        placeholder="10:00"
                        placeholderTextColor={theme.textFaint}
                        style={[styles.inputField, { backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                      />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <TouchableOpacity
                      disabled={recoveryBusy}
                      onPress={() => {
                        setEditingRecoveryEntry(null);
                        setRecoveryDraftError('');
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 11,
                        borderRadius: 12,
                        alignItems: 'center',
                        backgroundColor: theme.bgSubtle,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textBody }}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={recoveryBusy}
                      onPress={async () => {
                        if (!resolvePlannerRecoveryEntry) return;
                        if (!recoveryDraft.title.trim()) {
                          setRecoveryDraftError('Please enter a title before restoring.');
                          return;
                        }
                        if (recoveryDraft.date.trim() && !isPlannerDate(recoveryDraft.date.trim())) {
                          setRecoveryDraftError('Enter a valid date in YYYY-MM-DD format (e.g. 2026-11-26).');
                          return;
                        }
                        const startRes = normalizePlannerTime(recoveryDraft.startTime);
                        if (!startRes.ok) {
                          setRecoveryDraftError('Start time must be a valid time like 09:00 or 9:00 AM (or leave blank).');
                          return;
                        }
                        const endRes = normalizePlannerTime(recoveryDraft.endTime);
                        if (!endRes.ok) {
                          setRecoveryDraftError('End time must be a valid time like 10:30 or 10:30 AM (or leave blank).');
                          return;
                        }
                        setRecoveryBusy(true);
                        const raw =
                          editingRecoveryEntry.record && typeof editingRecoveryEntry.record === 'object'
                            ? { ...(editingRecoveryEntry.record as Record<string, unknown>) }
                            : {};
                        const nextId =
                          editingRecoveryEntry.fieldHint === 'conflict'
                            ? `${editingRecoveryEntry.id}_restored_${Date.now()}`
                            : editingRecoveryEntry.id;
                        delete raw.time;
                        delete raw.startTime;
                        delete raw.endTime;
                        const candidate = migratePlannerScheduleItem({
                          ...raw,
                          id: nextId,
                          title: recoveryDraft.title.trim(),
                          category: normalizePlannerCategory(recoveryDraft.category) ?? 'Tasks',
                          ...(recoveryDraft.date.trim() ? { date: recoveryDraft.date.trim() } : {}),
                          ...(startRes.value ? { startTime: startRes.value } : {}),
                          ...(endRes.value ? { endTime: endRes.value } : {}),
                          ...(recoveryDraft.notes.trim() ? { notes: recoveryDraft.notes.trim() } : {}),
                        });
                        if (!candidate) {
                          setRecoveryBusy(false);
                          setRecoveryDraftError('Please verify the title, category, date, and times.');
                          return;
                        }
                        const result = await resolvePlannerRecoveryEntry(editingRecoveryEntry.fingerprint, candidate);
                        setRecoveryBusy(false);
                        if (!result.ok) {
                          setRecoveryDraftError(result.error ?? 'Could not restore this entry.');
                          return;
                        }
                        setEditingRecoveryEntry(null);
                        setRecoveryDraftError('');
                        if (plannerRecoveryEntries.length <= 1) {
                          setRecoveryModalOpen(false);
                        }
                        showToast('Entry restored to your planner');
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 11,
                        borderRadius: 12,
                        alignItems: 'center',
                        backgroundColor: theme.blue600,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                        {recoveryBusy ? 'Restoring...' : 'Save & Restore'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <ScrollView style={{ maxHeight: 460 }}>
                <View style={{ gap: 12 }}>
                  {plannerRecoveryEntries.length === 0 ? (
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                      All preserved entries have been reviewed.
                    </Text>
                  ) : (
                    plannerRecoveryEntries.map((entry) => {
                      const raw = entry.record && typeof entry.record === 'object'
                        ? (entry.record as Record<string, unknown>)
                        : {};
                      return (
                        <View
                          key={entry.fingerprint}
                          style={{
                            padding: 12,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: theme.borderDefault,
                            backgroundColor: theme.bgDetailRows,
                            gap: 6,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary, flex: 1 }} numberOfLines={1}>
                              {entry.title}
                            </Text>
                            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: theme.bgSubtle }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary }}>
                                {entry.categoryLabel}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 12, color: theme.textMuted }}>
                            {entry.dateLabel} · {entry.timeLabel}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.textBody, lineHeight: 18 }}>
                            {entry.guidance}
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                            <TouchableOpacity
                              disabled={recoveryBusy}
                              onPress={() => {
                                const startNorm = normalizePlannerTime(raw.startTime ?? raw.time);
                                const endNorm = normalizePlannerTime(raw.endTime);
                                setEditingRecoveryEntry(entry);
                                setRecoveryDraftError('');
                                setRecoveryDraft({
                                  title: typeof raw.title === 'string' ? raw.title : '',
                                  category: normalizePlannerCategory(raw.category) ?? 'Tasks',
                                  date: typeof raw.date === 'string' && isPlannerDate(raw.date) ? raw.date : TODAY_ISO,
                                  startTime: startNorm.ok && startNorm.value ? startNorm.value : '',
                                  endTime: endNorm.ok && endNorm.value ? endNorm.value : '',
                                  notes: typeof raw.notes === 'string' ? raw.notes : '',
                                });
                              }}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 8,
                                backgroundColor: theme.blue600,
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Edit & Restore</Text>
                            </TouchableOpacity>
                            {entry.canClearInvalidTime && (entry.fieldHint === 'time' || entry.fieldHint === 'startTime' || entry.fieldHint === 'endTime') && resolvePlannerRecoveryEntry ? (
                              <TouchableOpacity
                                disabled={recoveryBusy}
                                onPress={async () => {
                                  const patched = stripInvalidTimeFromRecord(entry.record, entry.fieldHint as 'time' | 'startTime' | 'endTime');
                                  if (!patched) return;
                                  setRecoveryBusy(true);
                                  const res = await resolvePlannerRecoveryEntry(entry.fingerprint, patched);
                                  setRecoveryBusy(false);
                                  if (res.ok) {
                                    if (plannerRecoveryEntries.length <= 1) setRecoveryModalOpen(false);
                                    showToast('Entry restored without invalid time');
                                  }
                                }}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  backgroundColor: theme.blueSoftBg,
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.blueSoftText }}>
                                  {entry.fieldHint === 'endTime' ? 'Restore without end time' : 'Restore as all-day'}
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                            {entry.canDuplicateOnConflict && resolvePlannerRecoveryEntry ? (
                              <TouchableOpacity
                                disabled={recoveryBusy}
                                onPress={async () => {
                                  const candidate = migratePlannerScheduleItem({
                                    ...raw,
                                    id: `${entry.id}_restored_${Date.now()}`,
                                  });
                                  if (!candidate) return;
                                  setRecoveryBusy(true);
                                  const res = await resolvePlannerRecoveryEntry(entry.fingerprint, candidate);
                                  setRecoveryBusy(false);
                                  if (res.ok) {
                                    if (plannerRecoveryEntries.length <= 1) setRecoveryModalOpen(false);
                                    showToast('Restored as a separate entry');
                                  }
                                }}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  backgroundColor: theme.blueSoftBg,
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.blueSoftText }}>
                                  Restore as copy
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                            {discardPlannerRecoveryEntry ? (
                              <TouchableOpacity
                                disabled={recoveryBusy}
                                onPress={async () => {
                                  setRecoveryBusy(true);
                                  await discardPlannerRecoveryEntry(entry.fingerprint);
                                  setRecoveryBusy(false);
                                  if (plannerRecoveryEntries.length <= 1) setRecoveryModalOpen(false);
                                }}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  backgroundColor: theme.roseSoftBg,
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.roseSoftText }}>Remove</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* =================================================================== */}
      {/* TOAST NOTIFICATION                                                  */}
      {/* =================================================================== */}
      {!!toastMessage && (
        <View
          pointerEvents="none"
          style={[
            styles.toastWrap,
            { bottom: isMd ? 24 : 20 },
          ]}
        >
          <Animated.View
            style={[
              styles.toastPill,
              {
                backgroundColor: theme.bgToast,
                opacity: toastOpacity,
                transform: [{ translateY: toastTranslateY }, { scale: toastScale }],
              },
            ]}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.toastDot }} />
            <Text style={{ fontSize: isSm ? 14 : 12, fontWeight: '600', color: theme.textToast }}>
              {toastMessage}
            </Text>
          </Animated.View>
        </View>
      )}
      </View>
    </Shell>
  );
}

/* ========================================================================= */
/* STYLESHEET (EXACT 1:1 SPACING, RADII, SHADOWS & DIMENSIONS)               */
/* ========================================================================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerWrap: {
    borderBottomWidth: 1,
    zIndex: 30,
  },
  headerInner: {
    width: '100%',
    maxWidth: 1152,
    alignSelf: 'center',
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mascotBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerIconBtn: {
    padding: 10,
    borderRadius: 999,
    position: 'relative',
  },
  headerHelpBtn: {
    padding: 8,
    borderRadius: 999,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainScrollContent: {
    paddingTop: 16,
  },
  viewSwitcherTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  viewSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  calendarCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  calendarToolbar: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  navSquareBtn: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallSquareBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPopover: {
    position: 'absolute',
    left: 16,
    top: 64,
    zIndex: 25,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  weekdayHeaderBar: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  calCell: {
    borderRadius: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  legendFooter: {
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  planCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  catBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  cardActionBtn: {
    padding: 8,
    borderRadius: 12,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 20,
  },
  bottomSheetPanel: {
    width: '100%',
    maxWidth: 672,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -10 },
    elevation: 16,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  formSheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  iconBtnSmall: {
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 1,
  },
  catTabBar: {
    padding: 6,
    borderRadius: 999,
  },
  catTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  inputField: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  textareaField: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '500',
    minHeight: 84,
  },
  selectBtn: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recHintBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  primarySaveBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelOutlineBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCatPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  centerModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 384,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  helpCard: {
    width: '100%',
    maxWidth: 448,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  pickerModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  selectOptionRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekHeaderRow: {
    flexDirection: 'row',
  },
  modalCancelBtnFull: {
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
  },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 50,
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
