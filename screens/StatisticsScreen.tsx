import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  StatusBar,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
  type ViewStyle,
} from 'react-native';
import type { AppNavigation } from '../lib/navigation';
import { Shell } from '../components/Shell';
import {
  deriveStatistics,
  localDateKey,
  normalizeFocusSessions,
  type NormalizedFocusSession,
} from '../lib/statistics';
import { getUserScopedStorageKey, useStore, type State } from '../lib/store';
import { SSDSSectionHeader, SSDSSurface, useSSDSTheme } from '../lib/ssds';
import Svg, {
  Circle,
  Path,
  Rect,
  Line,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import {
  Clock,
  Flame,
  Target,
  TrendingUp,
  TrendingDown,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  BarChart3,
  Activity,
  X,
  Timer,
  Zap,
  Play,
  Info,
  Search,
  Check,
  Database,
  ShieldCheck,
} from 'lucide-react-native';

/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect -- Preserves SVG animation values and resets chart selections when their source data changes. */

/* ============================================================================
 * 0. TYPESCRIPT INTERFACES
 * ============================================================================ */

export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  startHour?: number;
  durationSeconds: number;
  elapsedSeconds?: number;
  subject: string;
  tagType?: 'subject' | 'activity';
  activity?: string;
  sessionType?: string;
  status: 'completed' | 'ongoing';
  taskId: string | null;
}

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  dueDate: string; // YYYY-MM-DD
  plannedMinutes: number;
  actualMinutes: number;
  sessionsCount: number;
  status: 'completed' | 'pending';
}

export interface MockTest {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  subject: string;
  scorePercent: number;
  accuracyPercent: number;
  correct: number;
  attempted: number;
  totalQuestions: number;
}

export interface StudyGoals {
  dailyTargetMinutes: number;
  weeklyTargetMinutes: number;
}

export interface RawDataset {
  sessions: StudySession[];
  tasks: StudyTask[];
  tests: MockTest[];
  goals: StudyGoals;
}

interface DailyPoint {
  date: string;
  label: string;
  dayName: string;
  shortDate: string;
  seconds: number;
  minutes: number;
  sessions: number;
  bySubject: Record<string, number>;
  topSubject: string | null;
  goalMet: boolean;
}

interface HeatmapCell extends DailyPoint {
  level: number;
}

interface BucketPoint {
  id: string;
  label: string;
  rangeLabel: string;
  seconds: number;
  minutes: number;
  sessions: number;
  activeDays?: number;
}

interface SubjectMetric {
  subject: string;
  color: string;
  actualSeconds: number;
  sessions: number;
  activeDays: number;
  plannedMinutes: number;
  completedTasks: number;
  totalTasks: number;
  avgSessionSeconds: number;
  sharePercent: number;
  exactShare: number;
}

interface InsightItem {
  id: string;
  category: string;
  tone: 'teal' | 'blue' | 'amber' | 'violet' | 'emerald';
  title: string;
  detail: string;
  source: string;
}

interface ActionSheetState {
  title: string;
  description: string;
  primaryCta: string;
  route: 'notifications' | 'help' | 'tests';
}

type RangePreset = '7D' | '30D' | '90D' | 'CUSTOM';
type DatasetMode = 'active' | 'snapshot';
type ActivityViewMode = 'daily' | 'weekly' | 'monthly';
type TaskFilterMode = 'all' | 'pending' | 'completed' | 'overdue';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* ============================================================================
 * 1. DESIGN SYSTEM & CONSTANTS
 * ============================================================================
 * Brand palette rooted in Study Sakha's teal/blue identity with semantic
 * tokens for both Light and Dark surfaces.
 */

const REFERENCE_DATE_STR = localDateKey(new Date());
const HISTORY_KEY = 'study-sakha-focus-history-v1';

const SUBJECT_COLORS: Record<string, string> = {
  'General Study': '#0284C7', // Study Sakha Blue
  Polity: '#0D9488', // Signature Sakha Teal
  History: '#06B6D4', // Cyan
  'Current Affairs': '#F59E0B', // Warm Amber
  Economy: '#7C3AED', // Refined Violet
  Geography: '#10B981', // Subtle Emerald
  CSAT: '#EC4899', // Accent Rose
};

const getSubjectColor = (subject: string): string => SUBJECT_COLORS[subject] || '#0EA5E9';

/** Exact Tailwind-matched Light & Dark color tokens from the original web UI */
const getThemeColors = (
  dark: boolean,
  colors: ReturnType<typeof useSSDSTheme>['tokens']['colors'],
) => ({
  bgPage: colors.background,
  bgHeader: colors.surface,
  bgNav: colors.surface,
  bgCard: colors.surfaceElevated,
  bgSubtle: colors.surfaceSecondary,
  bgSubtleStrong: colors.surfaceTertiary,
  bgPill: colors.surfaceTertiary,
  bgTrack: colors.surfaceTertiary,
  bgTrackAlt: colors.surfaceSecondary,
  bgButtonGhost: colors.surfaceSecondary,
  borderCard: colors.border,
  borderSubtle: colors.borderSubtle,
  borderHeader: colors.border,
  textPrimary: colors.textPrimary,
  textHeading: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textBody: colors.textPrimary,
  textMuted: colors.textMuted,
  tealText: colors.secondary,
  tealAccent: colors.secondary,
  skyText: colors.info,
  emeraldText: colors.success,
  amberText: colors.warning,
  roseText: colors.danger,
  violetText: colors.chartQuaternary,
  cyanText: colors.secondary,
});

/* ============================================================================
 * 2. DATE & FORMATTING UTILITIES (PURE, DETERMINISTIC)
 * ============================================================================ */

const parseISODate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const toISODate = (dateObj: Date): string => {
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isValidISODate = (str: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = parseISODate(str);
  return !Number.isNaN(d.getTime()) && toISODate(d) === str;
};

const addDaysISO = (dateStr: string, deltaDays: number): string => {
  const d = parseISODate(dateStr);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return toISODate(d);
};

const diffDaysInclusive = (startISO: string, endISO: string): number => {
  const diffMs = parseISODate(endISO).getTime() - parseISODate(startISO).getTime();
  return Math.max(1, Math.round(diffMs / 86400000) + 1);
};

const buildDateSpan = (startISO: string, endISO: string): string[] => {
  const span: string[] = [];
  const total = diffDaysInclusive(startISO, endISO);
  for (let i = 0; i < total; i++) {
    span.push(addDaysISO(startISO, i));
  }
  return span;
};

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const formatReadableDate = (iso: string): string => {
  const d = parseISODate(iso);
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const formatCompactDate = (iso: string): string => {
  const d = parseISODate(iso);
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;
};

const getDayOfWeekIndex = (iso: string): number => parseISODate(iso).getUTCDay();

const formatDurationSeconds = (
  totalSeconds: number,
  { showSeconds = false, showSign = false }: { showSeconds?: boolean; showSign?: boolean } = {}
): string => {
  const isNegative = totalSeconds < 0;
  const absSec = Math.round(Math.abs(totalSeconds || 0));
  const prefix = isNegative ? '−' : showSign && absSec > 0 ? '+' : '';

  if (absSec === 0) return '0m';
  if (absSec < 60) {
    return showSeconds ? `${prefix}${absSec}s` : `${prefix}<1m`;
  }

  const totalMinutes = Math.floor(absSec / 60);
  const remSeconds = absSec % 60;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) {
    if (showSeconds && remSeconds > 0 && totalMinutes < 10) {
      return `${prefix}${mins}m ${remSeconds}s`;
    }
    return `${prefix}${mins}m`;
  }
  if (mins === 0) return `${prefix}${hours}h`;
  return `${prefix}${hours}h ${mins}m`;
};

const formatMinutes = (
  minutes: number,
  opts: { showSeconds?: boolean; showSign?: boolean } = {}
): string => formatDurationSeconds((minutes || 0) * 60, opts);

/* ============================================================================
 * 3. APP DATA ADAPTERS
 * ============================================================================ */

const createLiveDataset = (
  state: State,
  sessions: NormalizedFocusSession[]
): RawDataset => {
  const taskStatistics = deriveStatistics(state, sessions, {
    startDate: addDaysISO(REFERENCE_DATE_STR, -179),
    endDate: REFERENCE_DATE_STR,
  });
  return {
    sessions: sessions.map((session) => {
      const startDate = session.startedAt ? new Date(session.startedAt) : null;
      const isActivity =
        session.tagType === 'activity' ||
        Boolean(session.activity?.trim()) ||
        session.sessionType === 'meditation' ||
        session.sessionType === 'break' ||
        session.sessionType === 'ambient';
      return {
        id: session.id,
        date: session.dateKey,
        startHour: startDate && !Number.isNaN(startDate.getTime()) ? startDate.getHours() : undefined,
        durationSeconds: session.actualSeconds,
        subject: isActivity
          ? (session.activity?.trim() || session.subject?.trim() || 'Other')
          : (session.subject?.trim() || 'General Study'),
        tagType: isActivity ? 'activity' : 'subject',
        activity: isActivity ? (session.activity?.trim() || session.subject?.trim() || 'Other') : undefined,
        sessionType: session.sessionType,
        status: 'completed',
        taskId: session.taskId ?? null,
      };
    }),
    tasks: taskStatistics.tasks
      .filter((task) => !task.historical)
      .map((task) => ({
        id: `${task.taskId}-${task.scheduledDate}`,
        title: task.title,
        subject: task.category,
        dueDate: task.scheduledDate,
        plannedMinutes: task.plannedMinutes ?? 0,
        actualMinutes: task.actualMinutes,
        sessionsCount: task.focusSessionCount,
        status: task.completed ? 'completed' : 'pending',
      })),
    tests: state.results.map((result) => {
      const totalQuestions = result.correct + result.wrong + result.skipped;
      return {
        id: result.id,
        date: localDateKey(new Date(result.takenAt)),
        title: result.title,
        subject: result.bySubject.length === 1 ? result.bySubject[0].subject : 'General Study',
        scorePercent: result.maxScore > 0
          ? Math.max(0, Math.min(100, Math.round((result.score / result.maxScore) * 100)))
          : 0,
        accuracyPercent: Math.max(0, Math.min(100, Math.round(result.accuracy))),
        correct: result.correct,
        attempted: result.correct + result.wrong,
        totalQuestions,
      };
    }),
    goals: {
      dailyTargetMinutes: state.settings.dailyGoalMin,
      weeklyTargetMinutes: state.plannerSettings.weeklyTargetHours * 60,
    },
  };
};

/* ============================================================================
 * 4. PURE ANALYTICS ENGINE (IDENTICAL DEDUPLICATED & RANGE-CONSISTENT LOGIC)
 * ============================================================================ */

const deduplicateSessions = (rawSessions: StudySession[]): StudySession[] => {
  const map = new Map<string, StudySession>();
  for (const s of rawSessions || []) {
    if (!s || !s.id || !s.date) continue;
    const duration =
      s.status === 'ongoing'
        ? Math.max(0, Number(s.elapsedSeconds ?? s.durationSeconds ?? 0))
        : Math.max(0, Number(s.durationSeconds ?? 0));
    if (duration <= 0) continue;
    if (!map.has(s.id)) {
      map.set(s.id, { ...s, durationSeconds: duration });
    }
  }
  return Array.from(map.values());
};

const getPreviousRange = (startISO: string, endISO: string) => {
  const days = diffDaysInclusive(startISO, endISO);
  const prevEnd = addDaysISO(startISO, -1);
  const prevStart = addDaysISO(prevEnd, -(days - 1));
  return { startISO: prevStart, endISO: prevEnd, days };
};

const computeDashboardAnalytics = (rawData: RawDataset, startISO: string, endISO: string) => {
  const allSessions = deduplicateSessions(rawData.sessions);
  const allTasks = rawData.tasks || [];
  const allTests = rawData.tests || [];
  const goals = rawData.goals || { dailyTargetMinutes: 180, weeklyTargetMinutes: 600 };

  const dateSpan = buildDateSpan(startISO, endISO);
  const periodDays = dateSpan.length;
  const prevRange = getPreviousRange(startISO, endISO);

  const periodSessions = allSessions.filter((s) => s.date >= startISO && s.date <= endISO);
  const prevSessions = allSessions.filter(
    (s) => s.date >= prevRange.startISO && s.date <= prevRange.endISO
  );

  const periodTasks = allTasks.filter((t) => t.dueDate >= startISO && t.dueDate <= endISO);
  const periodTests = allTests
    .filter((t) => t.date >= startISO && t.date <= endISO)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalActualSeconds = periodSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const prevActualSeconds = prevSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalSessions = periodSessions.length;
  const prevTotalSessions = prevSessions.length;
  const avgSessionSeconds = totalSessions > 0 ? Math.round(totalActualSeconds / totalSessions) : 0;
  const longestSessionSeconds =
    totalSessions > 0 ? Math.max(...periodSessions.map((s) => s.durationSeconds)) : 0;
  const dailyAvgSeconds = Math.round(totalActualSeconds / periodDays);

  const actualDeltaSeconds = totalActualSeconds - prevActualSeconds;
  const actualDeltaPercent =
    prevActualSeconds > 0
      ? Math.round(((totalActualSeconds - prevActualSeconds) / prevActualSeconds) * 100)
      : null;

  const dailyMap = new Map<string, Omit<DailyPoint, 'topSubject' | 'goalMet'>>();
  for (const iso of dateSpan) {
    dailyMap.set(iso, {
      date: iso,
      label: periodDays <= 7 ? DAY_INITIALS[getDayOfWeekIndex(iso)] : formatCompactDate(iso),
      dayName: SHORT_DAYS[getDayOfWeekIndex(iso)],
      shortDate: formatCompactDate(iso),
      seconds: 0,
      minutes: 0,
      sessions: 0,
      bySubject: {},
    });
  }

  for (const s of periodSessions) {
    const entry = dailyMap.get(s.date);
    if (!entry) continue;
    entry.seconds += s.durationSeconds;
    entry.sessions += 1;
    entry.bySubject[s.subject] = (entry.bySubject[s.subject] || 0) + s.durationSeconds;
  }

  const dailySeries: DailyPoint[] = dateSpan.map((iso) => {
    const entry = dailyMap.get(iso)!;
    const topSubjEntry = Object.entries(entry.bySubject).sort((a, b) => b[1] - a[1])[0];
    return {
      ...entry,
      minutes: Number((entry.seconds / 60).toFixed(2)),
      topSubject: topSubjEntry ? topSubjEntry[0] : null,
      goalMet: entry.seconds >= goals.dailyTargetMinutes * 60,
    };
  });

  const weeklyBuckets: BucketPoint[] = [];
  for (let i = 0; i < dailySeries.length; i += 7) {
    const chunk = dailySeries.slice(i, i + 7);
    const sumSec = chunk.reduce((a, c) => a + c.seconds, 0);
    const sumSessions = chunk.reduce((a, c) => a + c.sessions, 0);
    weeklyBuckets.push({
      id: `W${weeklyBuckets.length + 1}`,
      label: `W${weeklyBuckets.length + 1}`,
      rangeLabel: `${chunk[0].shortDate} – ${chunk[chunk.length - 1].shortDate}`,
      seconds: sumSec,
      minutes: Number((sumSec / 60).toFixed(1)),
      sessions: sumSessions,
      activeDays: chunk.filter((c) => c.seconds > 0).length,
    });
  }

  const monthlyMap = new Map<string, BucketPoint>();
  for (const d of dailySeries) {
    const key = d.date.slice(0, 7);
    if (!monthlyMap.has(key)) {
      const dt = parseISODate(d.date);
      monthlyMap.set(key, {
        id: key,
        label: `${SHORT_MONTHS[dt.getUTCMonth()]} '${String(dt.getUTCFullYear()).slice(-2)}`,
        rangeLabel: `${SHORT_MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`,
        seconds: 0,
        minutes: 0,
        sessions: 0,
      });
    }
    const m = monthlyMap.get(key)!;
    m.seconds += d.seconds;
    m.sessions += d.sessions;
    m.minutes = Number((m.seconds / 60).toFixed(1));
  }
  const monthlyBuckets = Array.from(monthlyMap.values());

  const periodTargetSeconds = goals.dailyTargetMinutes * 60 * periodDays;
  const dailyGoalAvgPct =
    periodTargetSeconds > 0
      ? Math.min(999, Math.round((totalActualSeconds / periodTargetSeconds) * 100))
      : 0;
  const weeklyTargetForRangeSeconds =
    goals.weeklyTargetMinutes * 60 * Math.max(1, periodDays / 7);
  const weeklyGoalPct =
    weeklyTargetForRangeSeconds > 0
      ? Math.min(999, Math.round((totalActualSeconds / weeklyTargetForRangeSeconds) * 100))
      : 0;

  const totalPlannedMinutes = periodTasks.reduce((acc, t) => acc + (t.plannedMinutes || 0), 0);
  const totalPlannedSeconds = totalPlannedMinutes * 60;
  const plannedDiffSeconds = totalActualSeconds - totalPlannedSeconds;
  const plannedAchievementPct =
    totalPlannedSeconds > 0 ? Math.round((totalActualSeconds / totalPlannedSeconds) * 100) : null;

  let scheduleStatus: { label: string; tone: 'emerald' | 'teal' | 'amber' | 'neutral'; description: string } = {
    label: 'No Schedule Set',
    tone: 'neutral',
    description: 'Add tasks in Study Planner to compare planned vs actual.',
  };
  if (totalPlannedSeconds > 0) {
    const ratio = totalActualSeconds / totalPlannedSeconds;
    if (ratio >= 1.05) {
      scheduleStatus = {
        label: 'Ahead of Schedule',
        tone: 'emerald',
        description: `Recorded focus exceeds planned time by ${formatDurationSeconds(plannedDiffSeconds)}.`,
      };
    } else if (ratio >= 0.85) {
      scheduleStatus = {
        label: 'On Track',
        tone: 'teal',
        description: 'Your actual recorded focus closely matches your planned schedule.',
      };
    } else {
      scheduleStatus = {
        label: 'Behind Schedule',
        tone: 'amber',
        description: `${formatDurationSeconds(Math.abs(plannedDiffSeconds))} remaining to match planned study time.`,
      };
    }
  }

  const activeDaysCount = dailySeries.filter((d) => d.seconds > 0).length;
  const consistencyPct = Math.round((activeDaysCount / periodDays) * 100);

  let bestStreak = 0;
  let running = 0;
  for (const d of dailySeries) {
    if (d.seconds > 0) {
      running += 1;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 0;
    }
  }

  let currentStreak = 0;
  for (let i = dailySeries.length - 1; i >= 0; i--) {
    if (dailySeries[i].seconds > 0) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  const maxDailySec = Math.max(...dailySeries.map((d) => d.seconds), 0);
  const intensityRef = Math.max(maxDailySec, 60);
  const heatmapCells: HeatmapCell[] = dailySeries.map((d) => {
    let level = 0;
    if (d.seconds > 0) {
      const ratio = d.seconds / intensityRef;
      if (ratio >= 0.75) level = 4;
      else if (ratio >= 0.45) level = 3;
      else if (ratio >= 0.2) level = 2;
      else level = 1;
    }
    return { ...d, level };
  });

  const subjectMap = new Map<
    string,
    {
      subject: string;
      color: string;
      actualSeconds: number;
      sessions: number;
      activeDates: Set<string>;
      plannedMinutes: number;
      completedTasks: number;
      totalTasks: number;
    }
  >();

  const activityMap = new Map<
    string,
    {
      activity: string;
      color: string;
      actualSeconds: number;
      sessions: number;
    }
  >();

  for (const s of periodSessions) {
    const isActivity =
      s.tagType === 'activity' ||
      Boolean(s.activity?.trim()) ||
      s.sessionType === 'meditation' ||
      s.sessionType === 'break' ||
      s.sessionType === 'ambient';
    if (isActivity) {
      const activityName = s.activity?.trim() || s.subject?.trim() || 'Other';
      if (!activityMap.has(activityName)) {
        activityMap.set(activityName, {
          activity: activityName,
          color: '#8B5CF6',
          actualSeconds: 0,
          sessions: 0,
        });
      }
      const act = activityMap.get(activityName)!;
      act.actualSeconds += s.durationSeconds;
      act.sessions += 1;
      continue;
    }
    if (!subjectMap.has(s.subject)) {
      subjectMap.set(s.subject, {
        subject: s.subject,
        color: getSubjectColor(s.subject),
        actualSeconds: 0,
        sessions: 0,
        activeDates: new Set(),
        plannedMinutes: 0,
        completedTasks: 0,
        totalTasks: 0,
      });
    }
    const sub = subjectMap.get(s.subject)!;
    sub.actualSeconds += s.durationSeconds;
    sub.sessions += 1;
    sub.activeDates.add(s.date);
  }

  const plannedBySubject = new Map<string, number>();
  for (const t of periodTasks) {
    plannedBySubject.set(t.subject, (plannedBySubject.get(t.subject) || 0) + t.plannedMinutes);
    if (subjectMap.has(t.subject)) {
      const sub = subjectMap.get(t.subject)!;
      sub.plannedMinutes += t.plannedMinutes;
      sub.totalTasks += 1;
      if (t.status === 'completed') sub.completedTasks += 1;
    }
  }

  const totalActivitySeconds = Array.from(activityMap.values()).reduce(
    (sum, item) => sum + item.actualSeconds,
    0,
  );
  const activityAnalytics = Array.from(activityMap.values())
    .map((act) => ({
      activity: act.activity,
      color: act.color,
      actualSeconds: act.actualSeconds,
      sessions: act.sessions,
      sharePercent:
        totalActivitySeconds > 0 ? Math.round((act.actualSeconds / totalActivitySeconds) * 100) : 0,
    }))
    .sort((a, b) => b.actualSeconds - a.actualSeconds);

  const totalSubjectSeconds = Array.from(subjectMap.values()).reduce(
    (sum, item) => sum + item.actualSeconds,
    0,
  );

  const subjectAnalytics: SubjectMetric[] = Array.from(subjectMap.values())
    .map((sub) => ({
      subject: sub.subject,
      color: sub.color,
      actualSeconds: sub.actualSeconds,
      sessions: sub.sessions,
      plannedMinutes: sub.plannedMinutes,
      completedTasks: sub.completedTasks,
      totalTasks: sub.totalTasks,
      activeDays: sub.activeDates.size,
      avgSessionSeconds: sub.sessions > 0 ? Math.round(sub.actualSeconds / sub.sessions) : 0,
      sharePercent:
        totalSubjectSeconds > 0 ? Math.round((sub.actualSeconds / totalSubjectSeconds) * 100) : 0,
      exactShare:
        totalSubjectSeconds > 0
          ? Number(((sub.actualSeconds / totalSubjectSeconds) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.actualSeconds - a.actualSeconds);

  const neglectedPlannedSubjects = Array.from(plannedBySubject.entries())
    .filter(([subj, mins]) => mins > 0 && !subjectMap.has(subj))
    .sort((a, b) => b[1] - a[1])
    .map(([subject, plannedMinutes]) => ({ subject, plannedMinutes }));

  const totalTasks = periodTasks.length;
  const completedTasks = periodTasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = periodTasks.filter(
    (t) => t.status !== 'completed' && t.dueDate < REFERENCE_DATE_STR
  ).length;
  const taskCompletionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const prioritizedTasks = [...periodTasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    if (a.dueDate !== b.dueDate) return b.dueDate.localeCompare(a.dueDate);
    return b.plannedMinutes - a.plannedMinutes;
  });

  const durationBuckets = [
    { key: '<5m', label: '<5m', min: 0, max: 299, count: 0 },
    { key: '5-15m', label: '5–15m', min: 300, max: 899, count: 0 },
    { key: '15-30m', label: '15–30m', min: 900, max: 1799, count: 0 },
    { key: '30-60m', label: '30–60m', min: 1800, max: 3599, count: 0 },
    { key: '60m+', label: '60m+', min: 3600, max: Infinity, count: 0 },
  ];

  const timeOfDayBuckets = [
    { key: 'morning', label: 'Morning', sub: '5–12h', seconds: 0, sessions: 0 },
    { key: 'afternoon', label: 'Afternoon', sub: '12–17h', seconds: 0, sessions: 0 },
    { key: 'evening', label: 'Evening', sub: '17–21h', seconds: 0, sessions: 0 },
    { key: 'night', label: 'Night', sub: '21–5h', seconds: 0, sessions: 0 },
  ];

  for (const s of periodSessions) {
    const b = durationBuckets.find((bk) => s.durationSeconds >= bk.min && s.durationSeconds <= bk.max);
    if (b) b.count += 1;

    const h = s.startHour ?? 12;
    let slotIdx = 1;
    if (h >= 5 && h < 12) slotIdx = 0;
    else if (h >= 12 && h < 17) slotIdx = 1;
    else if (h >= 17 && h < 21) slotIdx = 2;
    else slotIdx = 3;
    timeOfDayBuckets[slotIdx].seconds += s.durationSeconds;
    timeOfDayBuckets[slotIdx].sessions += 1;
  }

  const testsAttempted = periodTests.length;
  const avgTestScore =
    testsAttempted > 0
      ? Math.round(periodTests.reduce((a, t) => a + t.scorePercent, 0) / testsAttempted)
      : null;
  const bestTestScore =
    testsAttempted > 0 ? Math.max(...periodTests.map((t) => t.scorePercent)) : null;
  const avgTestAccuracy =
    testsAttempted > 0
      ? Math.round(periodTests.reduce((a, t) => a + t.accuracyPercent, 0) / testsAttempted)
      : null;

  const subjectTestMap = new Map<string, { subject: string; count: number; scoreSum: number; accSum: number }>();
  for (const t of periodTests) {
    if (!subjectTestMap.has(t.subject)) {
      subjectTestMap.set(t.subject, { subject: t.subject, count: 0, scoreSum: 0, accSum: 0 });
    }
    const st = subjectTestMap.get(t.subject)!;
    st.count += 1;
    st.scoreSum += t.scorePercent;
    st.accSum += t.accuracyPercent;
  }
  const subjectTestPerformance = Array.from(subjectTestMap.values())
    .map((s) => ({
      subject: s.subject,
      color: getSubjectColor(s.subject),
      count: s.count,
      avgScore: Math.round(s.scoreSum / s.count),
      avgAccuracy: Math.round(s.accSum / s.count),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const insights: InsightItem[] = [];

  const bestDay = [...dailySeries].sort((a, b) => b.seconds - a.seconds)[0];
  if (bestDay && bestDay.seconds > 0) {
    insights.push({
      id: 'peak-day',
      category: 'Peak Rhythm',
      tone: 'teal',
      title: `${bestDay.dayName}, ${bestDay.shortDate} was your strongest day`,
      detail: `You logged ${formatDurationSeconds(bestDay.seconds, { showSeconds: true })} across ${bestDay.sessions} focus ${bestDay.sessions === 1 ? 'session' : 'sessions'}.`,
      source: 'Recorded Focus',
    });
  }

  if (subjectAnalytics.length > 0) {
    const top = subjectAnalytics[0];
    insights.push({
      id: 'top-subject',
      category: 'Subject Focus',
      tone: 'blue',
      title: `${top.subject} leads with ${top.sharePercent}% of focus time`,
      detail: `${formatDurationSeconds(top.actualSeconds, { showSeconds: true })} across ${top.sessions} sessions on ${top.activeDays} active ${top.activeDays === 1 ? 'day' : 'days'}.`,
      source: 'Subject Logs',
    });
  }

  if (neglectedPlannedSubjects.length > 0) {
    const missed = neglectedPlannedSubjects[0];
    insights.push({
      id: 'attention-gap',
      category: 'Attention Gap',
      tone: 'amber',
      title: `${missed.subject} has ${formatMinutes(missed.plannedMinutes)} planned but 0m logged`,
      detail: `Starting a single focused block in ${missed.subject} will directly close your planner gap.`,
      source: 'Planner vs Focus',
    });
  } else if (subjectAnalytics.length >= 3) {
    const least = subjectAnalytics[subjectAnalytics.length - 1];
    insights.push({
      id: 'low-subject',
      category: 'Balance Check',
      tone: 'violet',
      title: `${least.subject} received the lowest share (${least.sharePercent}%)`,
      detail: `Only ${formatDurationSeconds(least.actualSeconds)} recorded in this period — consider scheduling a revision sprint.`,
      source: 'Subject Logs',
    });
  }

  if (totalSessions > 0) {
    if (avgSessionSeconds < 300) {
      insights.push({
        id: 'session-depth',
        category: 'Focus Pattern',
        tone: 'violet',
        title: `Sessions averaged ${formatDurationSeconds(avgSessionSeconds, { showSeconds: true })} (${totalSessions} short bursts)`,
        detail: `Try a 25-minute Pomodoro timer in Focus Center to build deeper unbroken concentration.`,
        source: `${totalSessions} Sessions`,
      });
    } else {
      const peakSlot = [...timeOfDayBuckets].sort((a, b) => b.seconds - a.seconds)[0];
      insights.push({
        id: 'session-depth',
        category: 'Focus Depth',
        tone: 'emerald',
        title: `Strong ${formatDurationSeconds(avgSessionSeconds)} avg session · Peak in ${peakSlot.label}`,
        detail: `${Math.round((peakSlot.seconds / totalActualSeconds) * 100)}% of your recorded focus happens during ${peakSlot.label.toLowerCase()} (${peakSlot.sub}).`,
        source: `${totalSessions} Sessions`,
      });
    }
  }

  if (actualDeltaPercent !== null) {
    const up = actualDeltaPercent >= 0;
    insights.push({
      id: 'period-trend',
      category: 'Period Velocity',
      tone: up ? 'emerald' : 'amber',
      title: `Study time is ${up ? 'up' : 'down'} ${Math.abs(actualDeltaPercent)}% vs previous ${periodDays}d`,
      detail: `${formatDurationSeconds(totalActualSeconds)} now compared to ${formatDurationSeconds(prevActualSeconds)} in the prior period.`,
      source: 'Period Delta',
    });
  } else if (totalPlannedSeconds > 0 && plannedAchievementPct !== null) {
    insights.push({
      id: 'plan-alignment',
      category: 'Plan Execution',
      tone: plannedAchievementPct >= 85 ? 'emerald' : 'amber',
      title: `${plannedAchievementPct}% of planned study schedule achieved`,
      detail: `${formatDurationSeconds(totalActualSeconds)} recorded against ${formatDurationSeconds(totalPlannedSeconds)} scheduled in Study Planner.`,
      source: `${totalTasks} Tasks`,
    });
  }

  return {
    meta: { startISO, endISO, periodDays, prevRange },
    hero: {
      totalActualSeconds,
      prevActualSeconds,
      actualDeltaSeconds,
      actualDeltaPercent,
      totalSessions,
      prevTotalSessions,
      avgSessionSeconds,
      longestSessionSeconds,
      dailyAvgSeconds,
      dailyGoalAvgPct,
      weeklyGoalPct,
      periodTargetSeconds,
    },
    activity: {
      dailySeries,
      weeklyBuckets,
      monthlyBuckets,
    },
    plannedVsActual: {
      totalPlannedSeconds,
      totalActualSeconds,
      diffSeconds: plannedDiffSeconds,
      achievementPct: plannedAchievementPct,
      status: scheduleStatus,
    },
    consistency: {
      currentStreak,
      bestStreak,
      activeDaysCount,
      periodDays,
      consistencyPct,
      heatmapCells,
      dailyTargetMinutes: goals.dailyTargetMinutes,
      weeklyTargetMinutes: goals.weeklyTargetMinutes,
      dailyGoalAvgPct,
      weeklyGoalPct,
    },
    subjects: {
      list: subjectAnalytics,
      neglectedPlanned: neglectedPlannedSubjects,
    },
    activities: {
      list: activityAnalytics,
      totalSeconds: totalActivitySeconds,
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      overdue: overdueTasks,
      completionPct: taskCompletionPct,
      prioritized: prioritizedTasks,
    },
    focus: {
      totalSessions,
      avgSessionSeconds,
      longestSessionSeconds,
      activeDaysCount,
      durationBuckets,
      timeOfDayBuckets,
    },
    academic: {
      attempted: testsAttempted,
      avgScore: avgTestScore,
      bestScore: bestTestScore,
      avgAccuracy: avgTestAccuracy,
      recentTests: [...periodTests].reverse(),
      trendSeries: periodTests.map((t) => ({
        id: t.id,
        label: formatCompactDate(t.date),
        title: t.title,
        subject: t.subject,
        score: t.scorePercent,
        accuracy: t.accuracyPercent,
      })),
      subjectPerformance: subjectTestPerformance,
    },
    insights: insights.slice(0, 4),
  };
};

/* ============================================================================
 * 5. SVG CHART & VISUALIZATION PRIMITIVES (1:1 VISUAL PARITY)
 * ============================================================================ */

/** Dual Concentric Activity Rings with smooth Animated strokeDashoffset */
const LearningActivityRings: React.FC<{
  goalPct: number;
  taskPct: number;
  actualLabel: string;
  dark: boolean;
}> = ({ goalPct, taskPct, actualLabel, dark }) => {
  const size = 148;
  const center = size / 2;

  const outerRadius = 60;
  const outerStroke = 11;
  const outerCirc = 2 * Math.PI * outerRadius;
  const outerTargetOffset = outerCirc - (Math.min(100, Math.max(0, goalPct)) / 100) * outerCirc;

  const innerRadius = 44;
  const innerStroke = 9;
  const innerCirc = 2 * Math.PI * innerRadius;
  const innerTargetOffset = innerCirc - (Math.min(100, Math.max(0, taskPct)) / 100) * innerCirc;

  const outerAnim = useRef(new Animated.Value(outerCirc)).current;
  const innerAnim = useRef(new Animated.Value(innerCirc)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(outerAnim, {
        toValue: outerTargetOffset,
        duration: 650,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      }),
      Animated.timing(innerAnim, {
        toValue: innerTargetOffset,
        duration: 750,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      }),
    ]).start();
  }, [outerTargetOffset, innerTargetOffset, outerAnim, innerAnim]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="sakhaGoalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0D9488" />
            <Stop offset="100%" stopColor="#0284C7" />
          </SvgLinearGradient>
          <SvgLinearGradient id="sakhaTaskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#7C3AED" />
            <Stop offset="100%" stopColor="#38BDF8" />
          </SvgLinearGradient>
        </Defs>

        <G rotation={-90} origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke={dark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.07)'}
            strokeWidth={outerStroke}
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="url(#sakhaGoalGrad)"
            strokeWidth={outerStroke}
            strokeLinecap="round"
            strokeDasharray={`${outerCirc} ${outerCirc}`}
            strokeDashoffset={outerAnim}
          />

          <Circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke={dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)'}
            strokeWidth={innerStroke}
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="url(#sakhaTaskGrad)"
            strokeWidth={innerStroke}
            strokeLinecap="round"
            strokeDasharray={`${innerCirc} ${innerCirc}`}
            strokeDashoffset={innerAnim}
          />
        </G>
      </Svg>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.ringCenterReadout}>
          <Text style={[styles.ringRecordedLabel, { color: dark ? '#94A3B8' : '#64748B' }]}>
            RECORDED
          </Text>
          <Text
            style={[styles.ringActualValue, { color: dark ? '#FFFFFF' : '#0F172A' }]}
            numberOfLines={1}
          >
            {actualLabel}
          </Text>
          <Text style={[styles.ringGoalLabel, { color: dark ? '#2DD4BF' : '#0F766E' }]}>
            {goalPct}% goal
          </Text>
        </View>
      </View>
    </View>
  );
};

/** Helper to draw a bar with rounded top corners (top-left=r, top-right=r, bottom=2) */
const buildTopRoundedBarPath = (x: number, y: number, w: number, h: number, rTop = 6, rBot = 2): string => {
  if (h <= 0 || w <= 0) return '';
  const rt = Math.min(rTop, w / 2, h / 2);
  const rb = Math.min(rBot, w / 2, h / 2);
  return [
    `M ${x} ${y + rt}`,
    `Q ${x} ${y} ${x + rt} ${y}`,
    `L ${x + w - rt} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + rt}`,
    `L ${x + w} ${y + h - rb}`,
    `Q ${x + w} ${y + h} ${x + w - rb} ${y + h}`,
    `L ${x + rb} ${y + h}`,
    `Q ${x} ${y + h} ${x} ${y + h - rb}`,
    'Z',
  ].join(' ');
};

/** Interactive Study Activity Bar Chart (exact Recharts equivalent in react-native-svg) */
const ActivityBarChartRN: React.FC<{
  data: (DailyPoint | BucketPoint)[];
  activityView: ActivityViewMode;
  selectedDayISO: string | null;
  onSelectDay: (iso: string) => void;
  dark: boolean;
}> = ({ data, activityView, selectedDayISO, onSelectDay, dark }) => {
  const [chartWidth, setChartWidth] = useState(300);
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  useEffect(() => {
    setTooltipIdx(null);
  }, [data, activityView]);

  const height = 208;
  const padTop = 12;
  const padBottom = 26;
  const padLeft = 36;
  const padRight = 8;
  const plotW = Math.max(100, chartWidth - padLeft - padRight);
  const plotH = height - padTop - padBottom;

  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1);
  const niceMax =
    maxMinutes <= 5
      ? Math.ceil(maxMinutes)
      : maxMinutes <= 60
        ? Math.ceil(maxMinutes / 10) * 10
        : Math.ceil(maxMinutes / 60) * 60;

  const yTicks = [0, niceMax / 3, (2 * niceMax) / 3, niceMax];
  const count = Math.max(1, data.length);
  const slotW = plotW / count;
  const barW = Math.min(34, Math.max(4, slotW * 0.62));
  const labelInterval =
    activityView === 'daily' && data.length > 14 ? Math.max(1, Math.floor(data.length / 6)) : 1;

  const activeTooltipItem = tooltipIdx !== null ? data[tooltipIdx] : null;

  return (
    <View
      style={{ width: '100%', position: 'relative' }}
      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
    >
      <Svg width={chartWidth} height={height}>
        {/* Horizontal Dashed Gridlines + Y-axis labels */}
        {yTicks.map((tick, idx) => {
          const yPos = padTop + plotH - (tick / niceMax) * plotH;
          const formatted = tick >= 60 ? `${(tick / 60).toFixed(0)}h` : `${Math.round(tick)}m`;
          return (
            <G key={`y-${idx}`}>
              <Line
                x1={padLeft}
                y1={yPos}
                x2={chartWidth - padRight}
                y2={yPos}
                stroke={dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.07)'}
                strokeDasharray="3,3"
                strokeWidth={1}
              />
              <SvgText
                x={padLeft - 6}
                y={yPos + 3.5}
                fontSize={10}
                fill={dark ? '#64748B' : '#94A3B8'}
                textAnchor="end"
              >
                {formatted}
              </SvgText>
            </G>
          );
        })}

        {/* Bars & X-axis labels */}
        {data.map((entry, idx) => {
          const cx = padLeft + idx * slotW + slotW / 2;
          const barH = entry.minutes > 0 ? Math.max(4, (entry.minutes / niceMax) * plotH) : 2;
          const x = cx - barW / 2;
          const y = padTop + plotH - barH;
          const isDaily = 'date' in entry;
          const isSelected = isDaily && entry.date === selectedDayISO;
          const isHighlighted = tooltipIdx === idx;
          const fill = isSelected
            ? '#0D9488'
            : entry.seconds > 0
              ? dark
                ? '#38BDF8'
                : '#0284C7'
              : dark
                ? '#1E293B'
                : '#E2E8F0';

          const showXLabel = idx % labelInterval === 0 || idx === data.length - 1;

          return (
            <G key={`bar-${idx}`}>
              {isHighlighted && (
                <Rect
                  x={cx - slotW / 2 + 1}
                  y={padTop}
                  width={Math.max(4, slotW - 2)}
                  height={plotH}
                  rx={6}
                  fill={dark ? 'rgba(45,212,191,0.08)' : 'rgba(13,148,136,0.08)'}
                />
              )}
              <Path d={buildTopRoundedBarPath(x, y, barW, barH)} fill={fill} />
              {/* Expanded touch target */}
              <Rect
                x={cx - slotW / 2}
                y={padTop}
                width={slotW}
                height={plotH + padBottom}
                fill="transparent"
                onPress={() => {
                  setTooltipIdx((prev) => (prev === idx ? null : idx));
                  if (isDaily) onSelectDay(entry.date);
                }}
              />
              {showXLabel && (
                <SvgText
                  x={cx}
                  y={height - 6}
                  fontSize={10.5}
                  fontWeight={isSelected ? '700' : '500'}
                  fill={isSelected ? (dark ? '#2DD4BF' : '#0F766E') : dark ? '#94A3B8' : '#64748B'}
                  textAnchor="middle"
                >
                  {entry.label}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>

      {/* Interactive Tooltip Overlay */}
      {activeTooltipItem && (
        <Pressable
          onPress={() => setTooltipIdx(null)}
          style={[
            styles.chartTooltip,
            {
              backgroundColor: dark ? '#0F172A' : '#FFFFFF',
              borderColor: dark ? '#334155' : '#E2E8F0',
              right: 8,
              top: 4,
            },
          ]}
        >
          <Text style={[styles.tooltipTitle, { color: dark ? '#F1F5F9' : '#0F172A' }]}>
            {'date' in activeTooltipItem
              ? `${activeTooltipItem.dayName}, ${activeTooltipItem.shortDate}`
              : `${activeTooltipItem.label} (${activeTooltipItem.rangeLabel})`}
          </Text>
          <View style={styles.tooltipRow}>
            <Text style={[styles.tooltipMuted, { color: dark ? '#94A3B8' : '#64748B' }]}>
              Recorded Focus
            </Text>
            <Text style={[styles.tooltipVal, { color: '#14B8A6' }]}>
              {formatDurationSeconds(activeTooltipItem.seconds, { showSeconds: true })}
            </Text>
          </View>
          <View style={styles.tooltipRow}>
            <Text style={[styles.tooltipMuted, { color: dark ? '#94A3B8' : '#64748B' }]}>
              Sessions
            </Text>
            <Text style={[styles.tooltipVal, { color: dark ? '#F1F5F9' : '#0F172A' }]}>
              {activeTooltipItem.sessions}
            </Text>
          </View>
          {'topSubject' in activeTooltipItem && activeTooltipItem.topSubject && (
            <View
              style={[
                styles.tooltipRow,
                { marginTop: 3, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dark ? '#334155' : '#E2E8F0' },
              ]}
            >
              <Text style={[styles.tooltipMuted, { color: dark ? '#94A3B8' : '#64748B' }]}>
                Top Subject
              </Text>
              <Text style={[styles.tooltipVal, { color: dark ? '#E2E8F0' : '#1E293B', fontWeight: '500' }]}>
                {activeTooltipItem.topSubject}
              </Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
};

/** Interactive Subject Donut Chart (exact Recharts PieChart equivalent in react-native-svg) */
const SubjectDonutChartRN: React.FC<{
  data: SubjectMetric[];
  selectedSubject: string | null;
  onToggleSubject: (subject: string) => void;
  activeSubjectDetail: SubjectMetric | null;
  dark: boolean;
}> = ({ data, selectedSubject, onToggleSubject, activeSubjectDetail, dark }) => {
  const size = 144;
  const cx = size / 2;
  const cy = size / 2;
  const innerR = 42;
  const outerR = 62;
  const total = data.reduce((a, b) => a + b.actualSeconds, 0) || 1;
  const padDeg = data.length > 1 ? 3 : 0;

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: centerX + radius * Math.cos(rad), y: centerY + radius * Math.sin(rad) };
  };

  const createArcPath = (startAngle: number, endAngle: number) => {
    const sweep = Math.max(0.5, endAngle - startAngle);
    const largeArc = sweep > 180 ? 1 : 0;
    const p1 = polarToCartesian(cx, cy, outerR, startAngle);
    const p2 = polarToCartesian(cx, cy, outerR, endAngle);
    const p3 = polarToCartesian(cx, cy, innerR, endAngle);
    const p4 = polarToCartesian(cx, cy, innerR, startAngle);

    return [
      `M ${p1.x} ${p1.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
      `L ${p3.x} ${p3.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
      'Z',
    ].join(' ');
  };

  let currentAngle = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {data.length === 1 ? (
          <Circle
            cx={cx}
            cy={cy}
            r={(innerR + outerR) / 2}
            fill="none"
            stroke={data[0].color}
            strokeWidth={outerR - innerR}
            onPress={() => onToggleSubject(data[0].subject)}
          />
        ) : (
          data.map((entry) => {
            const sliceDeg = (entry.actualSeconds / total) * 360;
            const start = currentAngle + padDeg / 2;
            const end = currentAngle + Math.max(padDeg + 1, sliceDeg) - padDeg / 2;
            currentAngle += sliceDeg;
            const opacity = !selectedSubject || selectedSubject === entry.subject ? 1 : 0.3;

            return (
              <Path
                key={entry.subject}
                d={createArcPath(start, end)}
                fill={entry.color}
                opacity={opacity}
                onPress={() => onToggleSubject(entry.subject)}
              />
            );
          })
        )}
      </Svg>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.ringCenterReadout}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '500',
              maxWidth: 74,
              textAlign: 'center',
              color: dark ? '#94A3B8' : '#64748B',
            }}
            numberOfLines={1}
          >
            {activeSubjectDetail ? activeSubjectDetail.subject : 'Subjects'}
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
              color: dark ? '#FFFFFF' : '#0F172A',
              marginTop: 1,
            }}
          >
            {activeSubjectDetail ? `${activeSubjectDetail.sharePercent}%` : data.length}
          </Text>
        </View>
      </View>
    </View>
  );
};

/** Focus Session Duration Distribution Bar Chart */
const DurationBarChartRN: React.FC<{
  data: { key: string; label: string; count: number }[];
  dark: boolean;
}> = ({ data, dark }) => {
  const [chartWidth, setChartWidth] = useState(280);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const height = 144;
  const padTop = 10;
  const padBottom = 22;
  const padLeft = 28;
  const padRight = 6;
  const plotW = Math.max(100, chartWidth - padLeft - padRight);
  const plotH = height - padTop - padBottom;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const yStep = Math.max(1, Math.ceil(maxCount / 3));
  const niceMax = yStep * 3;
  const yTicks = [0, yStep, yStep * 2, niceMax];

  const slotW = plotW / data.length;
  const barW = Math.min(36, Math.max(14, slotW * 0.56));

  return (
    <View
      style={{ width: '100%', position: 'relative' }}
      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
    >
      <Svg width={chartWidth} height={height}>
        {yTicks.map((tick, idx) => {
          const yPos = padTop + plotH - (tick / niceMax) * plotH;
          return (
            <G key={`dy-${idx}`}>
              <Line
                x1={padLeft}
                y1={yPos}
                x2={chartWidth - padRight}
                y2={yPos}
                stroke={dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.07)'}
                strokeDasharray="3,3"
                strokeWidth={1}
              />
              <SvgText
                x={padLeft - 6}
                y={yPos + 3.5}
                fontSize={10}
                fill={dark ? '#64748B' : '#94A3B8'}
                textAnchor="end"
              >
                {tick}
              </SvgText>
            </G>
          );
        })}

        {data.map((d, idx) => {
          const cx = padLeft + idx * slotW + slotW / 2;
          const barH = d.count > 0 ? Math.max(4, (d.count / niceMax) * plotH) : 0;
          const x = cx - barW / 2;
          const y = padTop + plotH - barH;
          return (
            <G key={d.key}>
              {activeIdx === idx && (
                <Rect
                  x={cx - slotW / 2 + 2}
                  y={padTop}
                  width={slotW - 4}
                  height={plotH}
                  rx={6}
                  fill={dark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)'}
                />
              )}
              {barH > 0 && <Path d={buildTopRoundedBarPath(x, y, barW, barH)} fill="#7C3AED" />}
              <Rect
                x={cx - slotW / 2}
                y={padTop}
                width={slotW}
                height={plotH + padBottom}
                fill="transparent"
                onPress={() => setActiveIdx((prev) => (prev === idx ? null : idx))}
              />
              <SvgText
                x={cx}
                y={height - 5}
                fontSize={10.5}
                fill={dark ? '#94A3B8' : '#64748B'}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {activeIdx !== null && data[activeIdx] && (
        <Pressable
          onPress={() => setActiveIdx(null)}
          style={[
            styles.chartTooltip,
            {
              backgroundColor: dark ? '#0F172A' : '#FFFFFF',
              borderColor: dark ? '#334155' : '#E2E8F0',
              right: 6,
              top: 2,
              paddingVertical: 6,
            },
          ]}
        >
          <Text style={{ fontSize: 11, color: dark ? '#FFFFFF' : '#0F172A' }}>
            <Text style={{ fontWeight: '600' }}>{data[activeIdx].label}: </Text>
            <Text style={{ fontWeight: '700', color: '#7C3AED' }}>
              {data[activeIdx].count} sessions
            </Text>
          </Text>
        </Pressable>
      )}
    </View>
  );
};

/** Academic Performance Smooth Score & Accuracy Area Chart */
const TestTrendAreaChartRN: React.FC<{
  data: { id: string; label: string; title: string; subject: string; score: number; accuracy: number }[];
  dark: boolean;
}> = ({ data, dark }) => {
  const [chartWidth, setChartWidth] = useState(280);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const height = 144;
  const padTop = 10;
  const padBottom = 22;
  const padLeft = 34;
  const padRight = 10;
  const plotW = Math.max(100, chartWidth - padLeft - padRight);
  const plotH = height - padTop - padBottom;

  const yTicks = [0, 50, 100];

  const getPoints = (key: 'score' | 'accuracy') =>
    data.map((d, i) => ({
      x: padLeft + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
      y: padTop + plotH - (Math.min(100, Math.max(0, d[key])) / 100) * plotH,
    }));

  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const scorePts = getPoints('score');
  const accPts = getPoints('accuracy');
  const scoreLine = buildSmoothPath(scorePts);
  const accLine = buildSmoothPath(accPts);
  const areaPath =
    scorePts.length >= 2
      ? `${scoreLine} L ${scorePts[scorePts.length - 1].x} ${padTop + plotH} L ${scorePts[0].x} ${padTop + plotH} Z`
      : '';

  const activeItem = activeIdx !== null ? data[activeIdx] : null;

  return (
    <View
      style={{ width: '100%', position: 'relative' }}
      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
    >
      <Svg width={chartWidth} height={height}>
        <Defs>
          <SvgLinearGradient id="scoreAreaGradRN" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="5%" stopColor="#0284C7" stopOpacity={0.28} />
            <Stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>

        {yTicks.map((tick) => {
          const yPos = padTop + plotH - (tick / 100) * plotH;
          return (
            <G key={`ty-${tick}`}>
              <Line
                x1={padLeft}
                y1={yPos}
                x2={chartWidth - padRight}
                y2={yPos}
                stroke={dark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.07)'}
                strokeDasharray="3,3"
                strokeWidth={1}
              />
              <SvgText
                x={padLeft - 6}
                y={yPos + 3.5}
                fontSize={10}
                fill={dark ? '#64748B' : '#94A3B8'}
                textAnchor="end"
              >
                {tick}%
              </SvgText>
            </G>
          );
        })}

        {areaPath !== '' && <Path d={areaPath} fill="url(#scoreAreaGradRN)" />}
        <Path d={scoreLine} fill="none" stroke="#0284C7" strokeWidth={2.5} />
        <Path d={accLine} fill="none" stroke="#0D9488" strokeWidth={2} strokeDasharray="4,3" />

        {data.map((d, idx) => {
          const sp = scorePts[idx];
          const ap = accPts[idx];
          const showLabel = data.length <= 5 || idx % 2 === 0 || idx === data.length - 1;
          return (
            <G key={d.id}>
              <Circle cx={sp.x} cy={sp.y} r={activeIdx === idx ? 5 : 3.5} fill="#0284C7" />
              <Circle cx={ap.x} cy={ap.y} r={activeIdx === idx ? 4 : 2.5} fill="#0D9488" />
              <Rect
                x={sp.x - 16}
                y={padTop}
                width={32}
                height={plotH + padBottom}
                fill="transparent"
                onPress={() => setActiveIdx((prev) => (prev === idx ? null : idx))}
              />
              {showLabel && (
                <SvgText
                  x={sp.x}
                  y={height - 5}
                  fontSize={10}
                  fill={dark ? '#94A3B8' : '#64748B'}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>

      {activeItem && (
        <Pressable
          onPress={() => setActiveIdx(null)}
          style={[
            styles.chartTooltip,
            {
              backgroundColor: dark ? '#0F172A' : '#FFFFFF',
              borderColor: dark ? '#334155' : '#E2E8F0',
              right: 8,
              top: 2,
              maxWidth: 195,
            },
          ]}
        >
          <Text style={[styles.tooltipTitle, { color: dark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>
            {activeItem.title}
          </Text>
          <Text style={{ fontSize: 10.5, color: dark ? '#94A3B8' : '#64748B', marginBottom: 4 }}>
            {activeItem.subject} · {activeItem.label}
          </Text>
          <View style={styles.tooltipRow}>
            <Text style={[styles.tooltipMuted, { color: dark ? '#94A3B8' : '#64748B' }]}>Score</Text>
            <Text style={[styles.tooltipVal, { color: '#0EA5E9' }]}>{activeItem.score}%</Text>
          </View>
          <View style={styles.tooltipRow}>
            <Text style={[styles.tooltipMuted, { color: dark ? '#94A3B8' : '#64748B' }]}>Accuracy</Text>
            <Text style={[styles.tooltipVal, { color: '#14B8A6' }]}>{activeItem.accuracy}%</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
};

/* ============================================================================
 * 6. SECTION CARD SHELL
 * ============================================================================ */

interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconTone?: 'teal' | 'blue' | 'violet' | 'amber' | 'emerald';
  rightAction?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  headerSingleRow?: boolean;
  dark: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconTone = 'teal',
  rightAction,
  collapsible = false,
  defaultOpen = true,
  headerSingleRow = false,
  dark,
  children,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { tokens } = useSSDSTheme();
  const c = getThemeColors(dark, tokens.colors);

  const toneStyles: Record<string, { bg: string; fg: string }> = {
    teal: { bg: dark ? 'rgba(20,184,166,0.15)' : '#F0FDFA', fg: dark ? '#2DD4BF' : '#0F766E' },
    blue: { bg: dark ? 'rgba(14,165,233,0.15)' : '#F0F9FF', fg: dark ? '#38BDF8' : '#0369A1' },
    violet: { bg: dark ? 'rgba(139,92,246,0.15)' : '#F5F3FF', fg: dark ? '#A78BFA' : '#6D28D9' },
    amber: { bg: dark ? 'rgba(245,158,11,0.15)' : '#FFFBEB', fg: dark ? '#FBBF24' : '#B45309' },
    emerald: { bg: dark ? 'rgba(16,185,129,0.15)' : '#ECFDF5', fg: dark ? '#34D399' : '#047857' },
  };
  const tone = toneStyles[iconTone] || toneStyles.teal;

  return (
    <SSDSSurface
      variant="outlined"
      radius="lg"
      style={[
        styles.card,
        {
          backgroundColor: c.bgCard,
          borderColor: c.borderCard,
          shadowColor: dark ? '#000000' : '#94A3B8',
        },
        style,
      ]}
    >
      <View style={[styles.cardHeader, headerSingleRow && styles.cardHeaderSingleRow]}>
        <View style={[styles.cardHeaderLeft, headerSingleRow && styles.cardHeaderLeftSingleRow]}>
          {Icon ? (
            <View style={[styles.cardIconBox, { backgroundColor: tone.bg }]}>
              <Icon size={16} color={tone.fg} />
            </View>
          ) : null}
          {headerSingleRow ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.cardTitleSingleRow, { color: c.textHeading }]}
            >
              {title}
            </Text>
          ) : (
            <SSDSSectionHeader
              title={title}
              subtitle={subtitle}
              compact
              style={{ flex: 1, marginBottom: 0 }}
            />
          )}
        </View>
        <View style={styles.cardHeaderRight}>
          {rightAction}
          {collapsible && (
            <TouchableOpacity
              onPress={() => setIsOpen((v) => !v)}
              accessibilityLabel={isOpen ? `Collapse ${title}` : `Expand ${title}`}
              style={styles.collapseBtn}
              activeOpacity={0.7}
            >
              {isOpen ? (
                <ChevronUp size={16} color={c.textSecondary} />
              ) : (
                <ChevronDown size={16} color={c.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {(!collapsible || isOpen) && <View style={styles.cardBody}>{children}</View>}
    </SSDSSurface>
  );
};

/* ============================================================================
 * 7. ERROR BOUNDARY FOR PRODUCTION RESILIENCE
 * ============================================================================ */

class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected rendering error.' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <AlertCircle size={40} color="#F59E0B" />
            <Text style={styles.errorTitle}>Unable to load Learning Analytics</Text>
            <Text style={styles.errorMsg}>{this.state.message}</Text>
            <TouchableOpacity
              onPress={() => this.setState({ hasError: false, message: '' })}
              style={styles.errorBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.errorBtnText}>Retry Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

/* ============================================================================
 * 8. MAIN SCREEN: STUDY SAKHA LEARNING INTELLIGENCE DASHBOARD
 * ============================================================================ */

function StudySakhaStatisticsScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isSm = screenWidth >= 640;
  const isMd = screenWidth >= 768;
  const isLg = screenWidth >= 1024;
  const navigation = useNavigation<AppNavigation>();
  const { state, dispatch } = useStore();
  const { tokens } = useSSDSTheme();
  const historyKey = getUserScopedStorageKey(HISTORY_KEY, state.user?.id);

  // Theme & Dataset Switcher States
  const dark = tokens.isDark;
  const colors = tokens.colors;
  const [datasetMode, setDatasetMode] = useState<DatasetMode>('active');
  const [datasetSnapshot, setDatasetSnapshot] = useState<RawDataset | null>(null);
  const [sessions, setSessions] = useState<NormalizedFocusSession[]>([]);
  const [historyStatus, setHistoryStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [historyError, setHistoryError] = useState('');
  const historyRequestId = useRef(0);

  // Reporting Period Selector State
  const [rangePreset, setRangePreset] = useState<RangePreset>('7D');
  const [customStart, setCustomStart] = useState(addDaysISO(REFERENCE_DATE_STR, -13));
  const [customEnd, setCustomEnd] = useState(REFERENCE_DATE_STR);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customError, setCustomError] = useState('');

  // Interactive Chart & Drilldown States
  const [activityView, setActivityView] = useState<ActivityViewMode>('daily');
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [hoveredHeatmapCell, setHoveredHeatmapCell] = useState<HeatmapCell | null>(null);
  const [showPlannedBySubject, setShowPlannedBySubject] = useState(false);

  // Modals & Navigation Feedback States
  const [showAllTasksModal, setShowAllTasksModal] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilterMode>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [actionSheet, setActionSheet] = useState<ActionSheetState | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const c = getThemeColors(dark, colors);

  const loadHistory = useCallback(async () => {
    const requestId = ++historyRequestId.current;
    setHistoryStatus('loading');
    setHistoryError('');
    try {
      const raw = await AsyncStorage.getItem(historyKey);
      let loadedSessions: NormalizedFocusSession[];
      try {
        const storedRecords: unknown[] = raw ? JSON.parse(raw) : [];
        const mergedRecords = [
          ...(Array.isArray(state.focusHistory) ? state.focusHistory : []),
          ...(Array.isArray(storedRecords) ? storedRecords : []),
        ];
        loadedSessions = normalizeFocusSessions(mergedRecords);
      } catch {
        if (requestId !== historyRequestId.current) return;
        setHistoryError('Focus history could not be read.');
        setHistoryStatus('error');
        return;
      }
      if (requestId !== historyRequestId.current) return;
      setSessions(loadedSessions);
      setHistoryStatus('ready');
    } catch {
      if (requestId !== historyRequestId.current) return;
      setHistoryError('Focus history could not be loaded.');
      setHistoryStatus('error');
    }
  }, [historyKey, state.focusHistory]);

  useFocusEffect(useCallback(() => {
    void loadHistory();
    return () => {
      historyRequestId.current += 1;
    };
  }, [loadHistory]));

  const { startISO, endISO } = useMemo(() => {
    if (rangePreset === '7D') {
      return { startISO: addDaysISO(REFERENCE_DATE_STR, -6), endISO: REFERENCE_DATE_STR };
    }
    if (rangePreset === '30D') {
      return { startISO: addDaysISO(REFERENCE_DATE_STR, -29), endISO: REFERENCE_DATE_STR };
    }
    if (rangePreset === '90D') {
      return { startISO: addDaysISO(REFERENCE_DATE_STR, -89), endISO: REFERENCE_DATE_STR };
    }
    const validStart = isValidISODate(customStart) ? customStart : addDaysISO(REFERENCE_DATE_STR, -13);
    const validEnd = isValidISODate(customEnd) ? customEnd : REFERENCE_DATE_STR;
    const safeStart = validStart <= validEnd ? validStart : validEnd;
    const safeEnd = validStart <= validEnd ? validEnd : validStart;
    return { startISO: safeStart, endISO: safeEnd };
  }, [rangePreset, customStart, customEnd]);

  const liveDataset = useMemo(
    () => createLiveDataset(state, sessions),
    [state, sessions]
  );
  const dataset = datasetMode === 'snapshot' && datasetSnapshot ? datasetSnapshot : liveDataset;
  const analytics = useMemo(
    () => computeDashboardAnalytics(dataset, startISO, endISO),
    [dataset, startISO, endISO]
  );

  useEffect(() => {
    const lastActive = [...analytics.activity.dailySeries].reverse().find((d) => d.seconds > 0);
    setSelectedDayISO(
      lastActive
        ? lastActive.date
        : analytics.activity.dailySeries[analytics.activity.dailySeries.length - 1]?.date || null
    );
    setSelectedSubject(null);
    setHoveredHeatmapCell(null);
  }, [analytics.activity.dailySeries, startISO, endISO, datasetMode]);

  useEffect(() => {
    if (analytics.meta.periodDays <= 7 && activityView !== 'daily') {
      setActivityView('daily');
    } else if (analytics.activity.monthlyBuckets.length < 2 && activityView === 'monthly') {
      setActivityView('weekly');
    }
  }, [activityView, analytics.activity.monthlyBuckets.length, analytics.meta.periodDays]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  const handleDatasetModeChange = (mode: DatasetMode) => {
    if (mode === 'snapshot') setDatasetSnapshot(liveDataset);
    setDatasetMode(mode);
  };

  const handleActionSheetPrimary = () => {
    if (!actionSheet) return;
    const { route } = actionSheet;
    setActionSheet(null);
    if (route === 'notifications') {
      dispatch({ type: 'readNotif' });
      navigation.navigate('Notifications');
    } else if (route === 'help') {
      navigation.navigate('AppGuide');
    } else {
      navigation.navigate('Tests');
    }
  };

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 3000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd || !isValidISODate(customStart) || !isValidISODate(customEnd)) {
      setCustomError('Please enter valid dates in YYYY-MM-DD format.');
      return;
    }
    if (customStart > customEnd) {
      setCustomError('Start date must be on or before end date.');
      return;
    }
    if (customEnd > REFERENCE_DATE_STR) {
      setCustomError(`End date cannot exceed ${REFERENCE_DATE_STR}.`);
      return;
    }
    if (diffDaysInclusive(customStart, customEnd) > 180) {
      setCustomError('Custom range supports up to 180 days for optimal clarity.');
      return;
    }
    setCustomError('');
    setRangePreset('CUSTOM');
    setShowCustomPicker(false);
    showToast(`Reporting period updated: ${formatCompactDate(customStart)} – ${formatCompactDate(customEnd)}`);
  };

  const activityAnalytics = useMemo(() => {
    const allSessions = deduplicateSessions(dataset.sessions);
    const dailyTargetMinutes = dataset.goals?.dailyTargetMinutes ?? 180;

    const buildSeriesForSpan = (span: string[], useDayInitials: boolean): DailyPoint[] => {
      const map = new Map<string, Omit<DailyPoint, 'topSubject' | 'goalMet'>>();
      for (const iso of span) {
        map.set(iso, {
          date: iso,
          label: useDayInitials
            ? DAY_INITIALS[getDayOfWeekIndex(iso)]
            : String(parseISODate(iso).getUTCDate()),
          dayName: SHORT_DAYS[getDayOfWeekIndex(iso)],
          shortDate: formatCompactDate(iso),
          seconds: 0,
          minutes: 0,
          sessions: 0,
          bySubject: {},
        });
      }
      for (const s of allSessions) {
        const entry = map.get(s.date);
        if (!entry) continue;
        entry.seconds += s.durationSeconds;
        entry.sessions += 1;
        entry.bySubject[s.subject] = (entry.bySubject[s.subject] || 0) + s.durationSeconds;
      }
      return span.map((iso) => {
        const entry = map.get(iso)!;
        const topSubjEntry = Object.entries(entry.bySubject).sort((a, b) => b[1] - a[1])[0];
        return {
          ...entry,
          minutes: Number((entry.seconds / 60).toFixed(2)),
          topSubject: topSubjEntry ? topSubjEntry[0] : null,
          goalMet: entry.seconds >= dailyTargetMinutes * 60,
        };
      });
    };

    if (activityView === 'weekly') {
      const anchor = selectedDayISO && isValidISODate(selectedDayISO) ? selectedDayISO : endISO;
      const dow = getDayOfWeekIndex(anchor);
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const weekStart = addDaysISO(anchor, mondayOffset);
      const weekEnd = addDaysISO(weekStart, 6);
      const weekSpan = buildDateSpan(weekStart, weekEnd);
      const series = buildSeriesForSpan(weekSpan, true);
      const totalSeconds = series.reduce((sum, d) => sum + d.seconds, 0);
      const prevWeekStart = addDaysISO(weekStart, -7);
      const prevWeekEnd = addDaysISO(weekEnd, -7);
      const prevSeconds = allSessions
        .filter((s) => s.date >= prevWeekStart && s.date <= prevWeekEnd)
        .reduce((sum, s) => sum + s.durationSeconds, 0);

      return {
        series,
        totalSeconds,
        dailyAvgSeconds: Math.round(totalSeconds / 7),
        prevLabel: 'PREV WEEK',
        prevSeconds,
      };
    }

    if (activityView === 'monthly') {
      const anchor = selectedDayISO && isValidISODate(selectedDayISO) ? selectedDayISO : endISO;
      const anchorDate = parseISODate(anchor);
      const year = anchorDate.getUTCFullYear();
      const month = anchorDate.getUTCMonth();
      const monthStart = toISODate(new Date(Date.UTC(year, month, 1)));
      const monthEnd = toISODate(new Date(Date.UTC(year, month + 1, 0)));
      const monthSpan = buildDateSpan(monthStart, monthEnd);
      const series = buildSeriesForSpan(monthSpan, false);
      const totalSeconds = series.reduce((sum, d) => sum + d.seconds, 0);

      const prevMonthStart = toISODate(new Date(Date.UTC(year, month - 1, 1)));
      const prevMonthEnd = toISODate(new Date(Date.UTC(year, month, 0)));
      const prevSeconds = allSessions
        .filter((s) => s.date >= prevMonthStart && s.date <= prevMonthEnd)
        .reduce((sum, s) => sum + s.durationSeconds, 0);

      return {
        series,
        totalSeconds,
        dailyAvgSeconds: Math.round(totalSeconds / Math.max(1, monthSpan.length)),
        prevLabel: 'PREV MONTH',
        prevSeconds,
      };
    }

    return {
      series: analytics.activity.dailySeries,
      totalSeconds: analytics.hero.totalActualSeconds,
      dailyAvgSeconds: analytics.hero.dailyAvgSeconds,
      prevLabel: `PREV ${analytics.meta.periodDays}D`,
      prevSeconds: analytics.hero.prevActualSeconds,
    };
  }, [activityView, analytics.activity.dailySeries, analytics.hero.dailyAvgSeconds, analytics.hero.prevActualSeconds, analytics.hero.totalActualSeconds, analytics.meta.periodDays, dataset.goals?.dailyTargetMinutes, dataset.sessions, endISO, selectedDayISO]);

  const activeActivityData = activityAnalytics.series;

  const selectedDayDetails = useMemo(
    () =>
      activeActivityData.find((d) => d.date === selectedDayISO) ||
      activeActivityData[activeActivityData.length - 1] ||
      null,
    [activeActivityData, selectedDayISO]
  );

  const activeSubjectDetail = useMemo(
    () => analytics.subjects.list.find((s) => s.subject === selectedSubject) || null,
    [analytics.subjects.list, selectedSubject]
  );

  const modalTasks = useMemo(() => {
    return analytics.tasks.prioritized.filter((t) => {
      const isOverdue = t.status !== 'completed' && t.dueDate < REFERENCE_DATE_STR;
      if (taskFilter === 'pending' && t.status !== 'pending') return false;
      if (taskFilter === 'completed' && t.status !== 'completed') return false;
      if (taskFilter === 'overdue' && !isOverdue) return false;
      if (taskSearch.trim()) {
        const q = taskSearch.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
      }
      return true;
    });
  }, [analytics.tasks.prioritized, taskFilter, taskSearch]);

  const getHeatmapStyle = (level: number): { backgroundColor: string; borderColor: string } => {
    if (dark) {
      const map = [
        { backgroundColor: 'rgba(30,41,59,0.8)', borderColor: 'rgba(51,65,85,0.6)' },
        { backgroundColor: 'rgba(4,47,46,0.9)', borderColor: 'rgba(17,94,89,0.6)' },
        { backgroundColor: 'rgba(17,94,89,0.8)', borderColor: 'rgba(15,118,110,0.6)' },
        { backgroundColor: 'rgba(13,148,136,0.9)', borderColor: 'rgba(20,184,166,0.6)' },
        { backgroundColor: '#2DD4BF', borderColor: '#5EEAD4' },
      ];
      return map[level] || map[0];
    }
    const map = [
      { backgroundColor: '#F1F5F9', borderColor: 'rgba(226,232,240,0.8)' },
      { backgroundColor: '#CCFBF1', borderColor: 'rgba(153,246,228,0.85)' },
      { backgroundColor: '#5EEAD4', borderColor: 'rgba(45,212,191,0.5)' },
      { backgroundColor: '#14B8A6', borderColor: 'rgba(13,148,136,0.4)' },
      { backgroundColor: '#0284C7', borderColor: 'rgba(3,105,161,0.4)' },
    ];
    return map[level] || map[0];
  };

  const getScheduleBadgeStyle = (
    tone: 'emerald' | 'teal' | 'amber' | 'neutral'
  ): { bg: string; text: string; border: string } => {
    if (tone === 'emerald') {
      return dark
        ? { bg: 'rgba(16,185,129,0.15)', text: '#6EE7B7', border: 'rgba(16,185,129,0.3)' }
        : { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
    }
    if (tone === 'teal') {
      return dark
        ? { bg: 'rgba(20,184,166,0.15)', text: '#5EEAD4', border: 'rgba(20,184,166,0.3)' }
        : { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' };
    }
    if (tone === 'amber') {
      return dark
        ? { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D', border: 'rgba(245,158,11,0.3)' }
        : { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
    }
    return dark
      ? { bg: '#1E293B', text: '#CBD5E1', border: '#334155' }
      : { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
  };

  const subjectPlanComparison = useMemo(() => {
    const map = new Map<string, { subject: string; plannedSec: number; actualSec: number; color: string }>();
    for (const t of dataset.tasks.filter(
      (tk) => tk.dueDate >= startISO && tk.dueDate <= endISO
    )) {
      if (!map.has(t.subject)) {
        map.set(t.subject, { subject: t.subject, plannedSec: 0, actualSec: 0, color: getSubjectColor(t.subject) });
      }
      map.get(t.subject)!.plannedSec += t.plannedMinutes * 60;
    }
    for (const s of analytics.subjects.list) {
      if (!map.has(s.subject)) {
        map.set(s.subject, { subject: s.subject, plannedSec: 0, actualSec: 0, color: s.color });
      }
      map.get(s.subject)!.actualSec = s.actualSeconds;
    }
    return Array.from(map.values()).sort((a, b) => b.plannedSec - a.plannedSec);
  }, [dataset, startISO, endISO, analytics.subjects.list]);

  const scheduleBadge = getScheduleBadgeStyle(analytics.plannedVsActual.status.tone);

  const plannedBarMax = Math.max(
    analytics.plannedVsActual.totalPlannedSeconds,
    analytics.plannedVsActual.totalActualSeconds,
    1
  );
  const plannedWidthPct = Math.round((analytics.plannedVsActual.totalPlannedSeconds / plannedBarMax) * 100);
  const actualWidthPct = Math.max(
    analytics.plannedVsActual.totalActualSeconds > 0 ? 3 : 0,
    Math.round((analytics.plannedVsActual.totalActualSeconds / plannedBarMax) * 100)
  );

  if (historyStatus !== 'ready') {
    return (
      <Shell active="Statistics" title="" scroll={false} contentPadding={0}>
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            {historyStatus === 'error' ? (
              <>
                <AlertCircle size={40} color="#F59E0B" />
                <Text style={styles.errorTitle}>Unable to load Learning Analytics</Text>
                <Text style={styles.errorMsg}>{historyError}</Text>
                <TouchableOpacity
                  onPress={() => void loadHistory()}
                  style={styles.errorBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.errorBtnText}>Retry Dashboard</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.errorMsg}>Loading Learning Analytics…</Text>
            )}
          </View>
        </View>
      </Shell>
    );
  }

  return (
    <Shell active="Statistics" title="" scroll={false} contentPadding={0}>
      <View style={[styles.safeRoot, { backgroundColor: c.bgPage }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={c.bgPage} />

      {/* ====================================================================
       * MAIN SCROLLABLE DASHBOARD CONTENT
       * ==================================================================== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxContainer}>
          {/* Dataset Mode Switcher */}
          <>
            <View
              style={[
                styles.mobileDataBar,
                {
                  backgroundColor: dark ? 'rgba(15,23,42,0.85)' : '#FFFFFF',
                  borderColor: c.borderCard,
                },
              ]}
            >
              <View style={styles.rowCenterGap6}>
                <Database size={14} color="#14B8A6" />
                <Text style={[styles.mobileDataLabel, { color: c.textBody }]}>Data View</Text>
              </View>
              <View
                style={[
                  styles.mobileDataToggle,
                  { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
                ]}
              >
                <TouchableOpacity
                  onPress={() => handleDatasetModeChange('active')}
                  style={[
                    styles.mobileDataBtn,
                    datasetMode === 'active' && {
                      backgroundColor: dark ? 'rgba(20,184,166,0.2)' : '#FFFFFF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.mobileDataBtnText,
                      {
                        color:
                          datasetMode === 'active'
                            ? dark
                              ? '#5EEAD4'
                              : '#0F766E'
                            : '#64748B',
                      },
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDatasetModeChange('snapshot')}
                  style={[
                    styles.mobileDataBtn,
                    datasetMode === 'snapshot' && {
                      backgroundColor: dark ? 'rgba(20,184,166,0.2)' : '#FFFFFF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.mobileDataBtnText,
                      {
                        color:
                          datasetMode === 'snapshot'
                            ? dark
                              ? '#5EEAD4'
                              : '#0F766E'
                            : '#64748B',
                      },
                    ]}
                  >
                    Snapshot
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>

          {/* ==================================================================
           * SECTION A: COMPACT PREMIUM DASHBOARD HEADER & DATE RANGE SELECTOR
           * ================================================================== */}
          <View style={[styles.sectionA, isMd && styles.sectionARow]}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeDateRow}>
                <View
                  style={[
                    styles.intelBadge,
                    {
                      backgroundColor: dark ? 'rgba(20,184,166,0.15)' : '#F0FDFA',
                      borderColor: dark ? 'rgba(20,184,166,0.25)' : 'rgba(153,246,228,0.8)',
                    },
                  ]}
                >
                  <Sparkles size={11} color={dark ? '#5EEAD4' : '#0F766E'} />
                  <Text style={[styles.intelBadgeText, { color: dark ? '#5EEAD4' : '#0F766E' }]}>
                    Learning Intelligence
                  </Text>
                </View>
                <Text style={[styles.periodDateText, { color: c.textSecondary }]}>
                  {formatReadableDate(startISO)} – {formatReadableDate(endISO)}
                </Text>
              </View>
              <Text style={[styles.pageTitle, { color: c.textPrimary }]}>
                Your Learning Overview
              </Text>
              <Text style={[styles.pageSubtitle, { color: c.textSecondary }]}>
                Understand your progress and improve your consistency.
              </Text>
            </View>

            {/* Segmented Date-Range Control */}
            <View
              style={[
                styles.rangeControl,
                {
                  backgroundColor: dark ? '#0F172A' : '#FFFFFF',
                  borderColor: c.borderCard,
                },
              ]}
            >
              {(
                [
                  { id: '7D', label: '7 Days' },
                  { id: '30D', label: '30 Days' },
                  { id: '90D', label: '90 Days' },
                ] as const
              ).map((opt) => {
                const active = rangePreset === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => {
                      setRangePreset(opt.id);
                      setShowCustomPicker(false);
                    }}
                    style={[
                      styles.rangeBtn,
                      active && {
                        backgroundColor: dark ? '#14B8A6' : '#0F172A',
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.rangeBtnText,
                        {
                          color: active
                            ? dark
                              ? '#020617'
                              : '#FFFFFF'
                            : c.textSecondary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                onPress={() => setShowCustomPicker((v) => !v)}
                style={[
                  styles.rangeBtn,
                  styles.rowCenterGap4,
                  (rangePreset === 'CUSTOM' || showCustomPicker) && {
                    backgroundColor: dark ? '#14B8A6' : '#0F172A',
                  },
                ]}
                activeOpacity={0.8}
              >
                <Calendar
                  size={13}
                  color={
                    rangePreset === 'CUSTOM' || showCustomPicker
                      ? dark
                        ? '#020617'
                        : '#FFFFFF'
                      : c.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.rangeBtnText,
                    {
                      color:
                        rangePreset === 'CUSTOM' || showCustomPicker
                          ? dark
                            ? '#020617'
                            : '#FFFFFF'
                          : c.textSecondary,
                    },
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline Custom Date Range Drawer */}
          {showCustomPicker && (
            <View
              style={[
                styles.customDrawer,
                {
                  backgroundColor: dark ? '#0F172A' : '#FFFFFF',
                  borderColor: c.borderCard,
                },
              ]}
            >
              <View style={[styles.customInputsRow, !isSm && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: c.textSecondary }]}>START DATE</Text>
                  <TextInput
                    value={customStart}
                    onChangeText={setCustomStart}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={c.textMuted}
                    style={[
                      styles.dateInput,
                      {
                        backgroundColor: dark ? '#1E293B' : '#F8FAFC',
                        borderColor: dark ? '#334155' : '#E2E8F0',
                        color: c.textPrimary,
                      },
                    ]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: c.textSecondary }]}>END DATE</Text>
                  <TextInput
                    value={customEnd}
                    onChangeText={setCustomEnd}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={c.textMuted}
                    style={[
                      styles.dateInput,
                      {
                        backgroundColor: dark ? '#1E293B' : '#F8FAFC',
                        borderColor: dark ? '#334155' : '#E2E8F0',
                        color: c.textPrimary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.customActionsRow}>
                  <TouchableOpacity
                    onPress={() => setShowCustomPicker(false)}
                    style={[styles.secondaryBtn, { backgroundColor: c.bgButtonGhost }]}
                  >
                    <Text style={[styles.secondaryBtnText, { color: c.textBody }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleApplyCustomRange} style={styles.primaryTealBtn}>
                    <Text style={styles.primaryTealBtnText}>Apply Range</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {customError !== '' && (
                <View style={[styles.rowCenterGap6, { marginTop: 8 }]}>
                  <AlertCircle size={14} color="#F43F5E" />
                  <Text style={{ fontSize: 12, color: '#F43F5E' }}>{customError}</Text>
                </View>
              )}
            </View>
          )}

          {/* ==================================================================
           * SECTION B: LEARNING PERFORMANCE HERO (ABOVE THE FOLD)
           * ================================================================== */}
          <View
            style={[
              styles.heroCard,
              {
                borderColor: c.borderCard,
                backgroundColor: dark ? '#0F172A' : '#FFFFFF',
                shadowColor: dark ? '#000000' : '#94A3B8',
              },
            ]}
          >
            {/* Subtle Diagonal Gradient Background Layer (matches CSS bg-gradient-to-br) */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width="100%" height="100%" preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient id="heroBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={dark ? '#0F172A' : '#FFFFFF'} />
                    <Stop offset="55%" stopColor={dark ? '#0F172A' : '#FFFFFF'} />
                    <Stop offset="100%" stopColor={dark ? '#0E1E2E' : '#F0FAFC'} />
                  </SvgLinearGradient>
                </Defs>
                <Rect width="100%" height="100%" rx={16} fill="url(#heroBgGrad)" />
              </Svg>
            </View>

            <View style={[styles.heroInner, isMd && styles.heroInnerWide]}>
              {/* Dual Concentric Activity Rings */}
              <View style={styles.heroRingsCol}>
                <LearningActivityRings
                  goalPct={analytics.hero.dailyGoalAvgPct}
                  taskPct={analytics.tasks.completionPct}
                  actualLabel={formatDurationSeconds(analytics.hero.totalActualSeconds)}
                  dark={dark}
                />
                <View style={styles.ringLegendRow}>
                  <View style={styles.rowCenterGap6}>
                    <View style={[styles.dot8, { backgroundColor: '#14B8A6' }]} />
                    <Text style={[styles.ringLegendText, { color: c.textBody }]}>
                      Study Goal ({analytics.hero.dailyGoalAvgPct}%)
                    </Text>
                  </View>
                  <View style={styles.rowCenterGap6}>
                    <View style={[styles.dot8, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={[styles.ringLegendText, { color: c.textBody }]}>
                      Tasks ({analytics.tasks.completionPct}%)
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right KPI Matrix */}
              <View style={{ flex: 1, width: '100%' }}>
                <View style={styles.heroTopRow}>
                  <View>
                    <Text style={[styles.heroEyebrow, { color: c.tealText }]}>
                      ACTUAL RECORDED FOCUS · {analytics.meta.periodDays} DAYS
                    </Text>
                    <View style={styles.heroValueRow}>
                      <Text style={[styles.heroBigValue, { color: c.textPrimary }]}>
                        {formatDurationSeconds(analytics.hero.totalActualSeconds)}
                      </Text>
                      <Text style={[styles.heroVsText, { color: c.textSecondary }]}>
                        vs {formatDurationSeconds(analytics.plannedVsActual.totalPlannedSeconds)} planned
                      </Text>
                    </View>
                  </View>

                  {/* Period-over-Period Trend Pill */}
                  {analytics.hero.actualDeltaPercent !== null ? (
                    <View
                      style={[
                        styles.trendPill,
                        analytics.hero.actualDeltaPercent >= 0
                          ? {
                              backgroundColor: dark ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
                              borderColor: dark ? 'rgba(16,185,129,0.25)' : '#A7F3D0',
                            }
                          : {
                              backgroundColor: dark ? 'rgba(245,158,11,0.15)' : '#FFFBEB',
                              borderColor: dark ? 'rgba(245,158,11,0.25)' : '#FDE68A',
                            },
                      ]}
                    >
                      {analytics.hero.actualDeltaPercent >= 0 ? (
                        <TrendingUp size={13} color={dark ? '#6EE7B7' : '#047857'} />
                      ) : (
                        <TrendingDown size={13} color={dark ? '#FCD34D' : '#B45309'} />
                      )}
                      <Text
                        style={[
                          styles.trendPillText,
                          {
                            color:
                              analytics.hero.actualDeltaPercent >= 0
                                ? dark
                                  ? '#6EE7B7'
                                  : '#047857'
                                : dark
                                  ? '#FCD34D'
                                  : '#B45309',
                          },
                        ]}
                      >
                        {analytics.hero.actualDeltaPercent >= 0 ? '+' : ''}
                        {analytics.hero.actualDeltaPercent}% vs prev {analytics.meta.periodDays}d
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.trendPill,
                        {
                          backgroundColor: dark ? 'rgba(30,41,59,0.8)' : '#F1F5F9',
                          borderColor: dark ? '#334155' : '#E2E8F0',
                        },
                      ]}
                    >
                      <Info size={12} color={c.textSecondary} />
                      <Text style={[styles.trendPillText, { color: c.textSecondary, fontWeight: '500' }]}>
                        No prior period logs
                      </Text>
                    </View>
                  )}
                </View>

                {/* 4 Compact Metric Tiles */}
                <View style={styles.kpiGrid}>
                  {[
                    {
                      label: 'Focus Sessions',
                      value: String(analytics.hero.totalSessions),
                      sub: `${analytics.consistency.activeDaysCount} active days`,
                      icon: Zap,
                      color: c.skyText,
                    },
                    {
                      label: 'Avg. Session',
                      value: formatDurationSeconds(analytics.hero.avgSessionSeconds),
                      sub: `Best: ${formatDurationSeconds(analytics.hero.longestSessionSeconds)}`,
                      icon: Timer,
                      color: c.tealAccent,
                    },
                    {
                      label: 'Daily Average',
                      value: formatDurationSeconds(analytics.hero.dailyAvgSeconds),
                      sub: `Goal: ${formatMinutes(analytics.consistency.dailyTargetMinutes)}/d`,
                      icon: Clock,
                      color: c.cyanText,
                    },
                    {
                      label: 'Study Streak',
                      value: `${analytics.consistency.currentStreak}d`,
                      sub: `Best: ${analytics.consistency.bestStreak}d`,
                      icon: Flame,
                      color: analytics.consistency.currentStreak > 0 ? '#F59E0B' : c.textMuted,
                    },
                  ].map((m) => (
                    <View
                      key={m.label}
                      style={[
                        styles.kpiTile,
                        {
                          width: isSm ? '23.5%' : '48.2%',
                          backgroundColor: dark ? 'rgba(2,6,23,0.5)' : 'rgba(255,255,255,0.92)',
                          borderColor: c.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.kpiTileHeader}>
                        <Text style={[styles.kpiTileLabel, { color: c.textSecondary }]} numberOfLines={1}>
                          {m.label}
                        </Text>
                        <m.icon size={14} color={m.color} />
                      </View>
                      <Text style={[styles.kpiTileValue, { color: c.textPrimary }]} numberOfLines={1}>
                        {m.value}
                      </Text>
                      <Text style={[styles.kpiTileSub, { color: c.textSecondary }]} numberOfLines={1}>
                        {m.sub}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* ==================================================================
           * SECTION J: SMART LEARNING INSIGHTS
           * ================================================================== */}
          {analytics.insights.length > 0 && (
            <AnalyticsCard
              title="Smart Learning Insights"
              subtitle="Automatically calculated from your verified sessions, planner tasks, and study patterns."
              icon={Sparkles}
              iconTone="violet"
              dark={dark}
              rightAction={
                isSm ? (
                  <View
                    style={[
                      styles.verifiedPill,
                      { backgroundColor: dark ? '#1E293B' : '#F1F5F9' },
                    ]}
                  >
                    <ShieldCheck size={12} color="#14B8A6" />
                    <Text style={[styles.verifiedPillText, { color: c.textBody }]}>Verified Data</Text>
                  </View>
                ) : null
              }
            >
              <View style={styles.insightsGrid}>
                {analytics.insights.map((ins) => {
                  const badgePalette = {
                    teal: { bg: dark ? 'rgba(20,184,166,0.15)' : '#F0FDFA', fg: dark ? '#5EEAD4' : '#0F766E' },
                    blue: { bg: dark ? 'rgba(14,165,233,0.15)' : '#F0F9FF', fg: dark ? '#7DD3FC' : '#0369A1' },
                    amber: { bg: dark ? 'rgba(245,158,11,0.15)' : '#FFFBEB', fg: dark ? '#FCD34D' : '#B45309' },
                    violet: { bg: dark ? 'rgba(139,92,246,0.15)' : '#F5F3FF', fg: dark ? '#C4B5FD' : '#6D28D9' },
                    emerald: { bg: dark ? 'rgba(16,185,129,0.15)' : '#ECFDF5', fg: dark ? '#6EE7B7' : '#047857' },
                  }[ins.tone];

                  return (
                    <View
                      key={ins.id}
                      style={[
                        styles.insightCard,
                        {
                          width: isSm ? '48.8%' : '100%',
                          backgroundColor: dark ? 'rgba(2,6,23,0.45)' : 'rgba(248,250,252,0.8)',
                          borderColor: c.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.insightTopRow}>
                        <View style={[styles.insightCatBadge, { backgroundColor: badgePalette.bg }]}>
                          <Text style={[styles.insightCatText, { color: badgePalette.fg }]}>
                            {ins.category.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.insightSource, { color: c.textMuted }]}>{ins.source}</Text>
                      </View>
                      <Text style={[styles.insightTitle, { color: c.textHeading }]}>{ins.title}</Text>
                      <Text style={[styles.insightDetail, { color: c.textSecondary }]}>{ins.detail}</Text>
                    </View>
                  );
                })}
              </View>
            </AnalyticsCard>
          )}

          {/* ==================================================================
           * BENTO ROW 1: SECTIONS C (ACTIVITY) & D (PLANNED VS ACTUAL)
           * ================================================================== */}
          <View style={[styles.bentoRow, !isLg && { flexDirection: 'column' }]}>
            {/* SECTION C: STUDY ACTIVITY ANALYTICS */}
            <AnalyticsCard
              title="Study Activity Analytics"
              headerSingleRow
              icon={BarChart3}
              iconTone="blue"
              dark={dark}
              style={isLg ? { flex: 7 } : undefined}
              rightAction={
                <View
                  testID="activity-filter-group"
                  style={[
                    styles.miniSegControl,
                    {
                      backgroundColor: dark ? '#020617' : '#F1F5F9',
                      borderColor: c.borderSubtle,
                    },
                  ]}
                >
                  {(
                    [
                      { id: 'daily', label: 'Daily' },
                      { id: 'weekly', label: 'Weekly' },
                      { id: 'monthly', label: 'Monthly' },
                    ] as const
                  ).map((tab) => {
                    const active = activityView === tab.id;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        testID={`activity-filter-${tab.id}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => setActivityView(tab.id)}
                        style={[
                          styles.miniSegBtn,
                          active && {
                            backgroundColor: dark ? '#1E293B' : '#FFFFFF',
                          },
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.miniSegText,
                            {
                              color: active ? c.textPrimary : c.textSecondary,
                            },
                          ]}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              }
            >
              <Text style={[styles.cardSubtitle, { color: c.textSecondary, marginTop: 0, marginBottom: 10 }]}>
                Interactive actual recorded focus time. Tap any bar to inspect details.
              </Text>

              {/* Compact Stats Strip */}
              <View style={[styles.statsStrip3, { backgroundColor: c.bgSubtleStrong }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stripLabel, { color: c.textSecondary }]}>PERIOD TOTAL</Text>
                  <Text testID="activity-period-total" style={[styles.stripValue, { color: c.textPrimary }]}>
                    {formatDurationSeconds(activityAnalytics.totalSeconds)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stripLabel, { color: c.textSecondary }]}>DAILY AVERAGE</Text>
                  <Text testID="activity-daily-average" style={[styles.stripValue, { color: c.textPrimary }]}>
                    {formatDurationSeconds(activityAnalytics.dailyAvgSeconds)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text testID="activity-prev-label" style={[styles.stripLabel, { color: c.textSecondary }]}>
                    {activityAnalytics.prevLabel}
                  </Text>
                  <Text testID="activity-prev-value" style={[styles.stripValue, { color: c.textBody }]}>
                    {activityAnalytics.prevSeconds > 0
                      ? formatDurationSeconds(activityAnalytics.prevSeconds)
                      : '—'}
                  </Text>
                </View>
              </View>

              {/* Interactive Bar Chart */}
              {activityAnalytics.totalSeconds === 0 ? (
                <View style={[styles.emptyChartBox, { borderColor: c.borderCard }]}>
                  <Activity size={26} color={c.textMuted} />
                  <Text style={[styles.emptyChartTitle, { color: c.textSecondary }]}>
                    No study data available yet
                  </Text>
                  <Text style={[styles.emptyChartSub, { color: c.textMuted }]}>
                    Completed focus sessions will appear here.
                  </Text>
                </View>
              ) : (
                <ActivityBarChartRN
                  data={activeActivityData}
                  activityView={activityView}
                  selectedDayISO={selectedDayDetails?.date ?? selectedDayISO}
                  onSelectDay={setSelectedDayISO}
                  dark={dark}
                />
              )}

              {/* Selected Day Inspector Pill */}
              {selectedDayDetails && (
                <View
                  style={[
                    styles.selectedDayPill,
                    {
                      backgroundColor: dark ? 'rgba(4,47,46,0.35)' : 'rgba(240,253,250,0.8)',
                      borderColor: dark ? 'rgba(17,94,89,0.55)' : 'rgba(153,246,228,0.8)',
                    },
                  ]}
                >
                  <View style={styles.rowCenterGap6}>
                    <View style={[styles.dot8, { backgroundColor: '#14B8A6' }]} />
                    <Text style={[styles.selectedDayTitle, { color: c.textHeading }]}>
                      {selectedDayDetails.dayName}, {selectedDayDetails.shortDate}
                    </Text>
                    <Text style={{ fontSize: 12, color: c.textSecondary }}>
                      · {selectedDayDetails.sessions} {selectedDayDetails.sessions === 1 ? 'session' : 'sessions'}
                    </Text>
                  </View>
                  <View style={styles.rowCenterGap8}>
                    {selectedDayDetails.topSubject && (
                      <View
                        style={[
                          styles.topSubjectChip,
                          {
                            backgroundColor: dark ? '#1E293B' : '#FFFFFF',
                            borderColor: c.borderSubtle,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '500', color: c.textBody }}>
                          Top: {selectedDayDetails.topSubject}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.selectedDayDur, { color: c.tealText }]}>
                      {formatDurationSeconds(selectedDayDetails.seconds, { showSeconds: true })}
                    </Text>
                  </View>
                </View>
              )}
            </AnalyticsCard>

            {/* SECTION D: PLANNED VS ACTUAL PERFORMANCE */}
            <AnalyticsCard
              title="Planned vs Actual"
              subtitle="Study Planner schedule compared with recorded Focus time."
              icon={Target}
              iconTone="teal"
              dark={dark}
              style={isLg ? { flex: 5 } : undefined}
              rightAction={
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: scheduleBadge.bg,
                      borderColor: scheduleBadge.border,
                    },
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { color: scheduleBadge.text }]}>
                    {analytics.plannedVsActual.status.label}
                  </Text>
                </View>
              }
            >
              <View style={{ gap: 12 }}>
                <View style={styles.planTopRow}>
                  <View>
                    <Text style={[styles.microLabel, { color: c.textSecondary }]}>Plan Realization</Text>
                    <Text style={[styles.planPctText, { color: c.textPrimary }]}>
                      {analytics.plannedVsActual.achievementPct !== null
                        ? `${analytics.plannedVsActual.achievementPct}%`
                        : '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.microLabel, { color: c.textSecondary }]}>
                      Variance (Actual − Planned)
                    </Text>
                    <Text
                      style={[
                        styles.planVarianceText,
                        {
                          color:
                            analytics.plannedVsActual.diffSeconds >= 0 ? '#10B981' : '#F59E0B',
                        },
                      ]}
                    >
                      {formatDurationSeconds(analytics.plannedVsActual.diffSeconds, { showSign: true })}
                    </Text>
                  </View>
                </View>

                {/* Dual Horizontal Comparison Bars */}
                <View style={{ gap: 10, paddingTop: 2 }}>
                  <View>
                    <View style={styles.barLabelRow}>
                      <Text style={[styles.barLabel, { color: c.textBody }]}>Scheduled Planned</Text>
                      <Text style={[styles.barVal, { color: c.skyText }]}>
                        {formatDurationSeconds(analytics.plannedVsActual.totalPlannedSeconds)}
                      </Text>
                    </View>
                    <View style={[styles.progressTrack10, { backgroundColor: c.bgTrack }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${plannedWidthPct}%`, backgroundColor: 'rgba(14,165,233,0.85)' },
                        ]}
                      />
                    </View>
                  </View>

                  <View>
                    <View style={styles.barLabelRow}>
                      <Text style={[styles.barLabel, { color: c.textBody }]}>Actual Recorded</Text>
                      <Text style={[styles.barVal, { color: c.tealText }]}>
                        {formatDurationSeconds(analytics.plannedVsActual.totalActualSeconds)}
                      </Text>
                    </View>
                    <View style={[styles.progressTrack10, { backgroundColor: c.bgTrack }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${actualWidthPct}%`, backgroundColor: '#14B8A6' },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* Status Explanation */}
                <View style={[styles.statusDescBox, { backgroundColor: c.bgSubtleStrong }]}>
                  <Text style={[styles.statusDescText, { color: c.textSecondary }]}>
                    {analytics.plannedVsActual.status.description}
                  </Text>
                </View>

                {/* Expandable Subject Gap Breakdown */}
                {subjectPlanComparison.length > 0 && (
                  <View>
                    <TouchableOpacity
                      onPress={() => setShowPlannedBySubject((v) => !v)}
                      style={styles.expandLinkBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.expandLinkText, { color: c.tealText }]}>
                        Subject-wise plan comparison
                      </Text>
                      {showPlannedBySubject ? (
                        <ChevronUp size={15} color={c.tealText} />
                      ) : (
                        <ChevronDown size={15} color={c.tealText} />
                      )}
                    </TouchableOpacity>
                    {showPlannedBySubject && (
                      <View style={{ marginTop: 8, gap: 8 }}>
                        {subjectPlanComparison.map((row) => (
                          <View key={row.subject} style={styles.planSubjRow}>
                            <View style={[styles.rowCenterGap6, { flex: 1 }]}>
                              <View style={[styles.dot8, { backgroundColor: row.color }]} />
                              <Text style={{ fontSize: 12, color: c.textBody }} numberOfLines={1}>
                                {row.subject}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, fontVariant: ['tabular-nums'], color: c.textSecondary }}>
                              <Text style={{ fontWeight: '700', color: c.textHeading }}>
                                {formatDurationSeconds(row.actualSec)}
                              </Text>{' '}
                              / {formatDurationSeconds(row.plannedSec)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </AnalyticsCard>
          </View>

          {/* ==================================================================
           * BENTO ROW 2: SECTIONS E (CONSISTENCY) & F (SUBJECT-WISE)
           * ================================================================== */}
          <View style={[styles.bentoRow, !isLg && { flexDirection: 'column' }]}>
            {/* SECTION E: STUDY CONSISTENCY & HABIT TRACKING */}
            <AnalyticsCard
              title="Study Consistency & Habits"
              subtitle="Retained focus streaks, active cadence, and goal attainment."
              icon={Flame}
              iconTone="amber"
              dark={dark}
              style={isLg ? { flex: 6 } : undefined}
            >
              {/* 4 Compact Habit Stats */}
              <View style={styles.grid4Row}>
                {[
                  { label: 'Current', value: `${analytics.consistency.currentStreak}d`, highlight: analytics.consistency.currentStreak > 0 },
                  { label: 'Best', value: `${analytics.consistency.bestStreak}d`, highlight: false },
                  { label: 'Active', value: `${analytics.consistency.activeDaysCount}/${analytics.consistency.periodDays}`, highlight: false },
                  { label: 'Cadence', value: `${analytics.consistency.consistencyPct}%`, highlight: false },
                ].map((st) => (
                  <View
                    key={st.label}
                    style={[
                      styles.habitTile,
                      { backgroundColor: c.bgSubtle, borderColor: c.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.stripLabel, { color: c.textSecondary }]}>
                      {st.label.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.habitVal,
                        { color: st.highlight ? '#F59E0B' : c.textPrimary },
                      ]}
                    >
                      {st.value}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Adaptive Activity Heatmap */}
              <View style={{ marginBottom: 16 }}>
                <View style={styles.heatmapHeader}>
                  <Text style={[styles.subSectionLabel, { color: c.textBody }]}>
                    Activity Intensity ({analytics.meta.periodDays}d)
                  </Text>
                  <Text style={[styles.heatmapInspect, { color: c.tealText }]} numberOfLines={1}>
                    {hoveredHeatmapCell
                      ? `${hoveredHeatmapCell.dayName}, ${hoveredHeatmapCell.shortDate}: ${formatDurationSeconds(hoveredHeatmapCell.seconds, { showSeconds: true })}`
                      : 'Tap any tile to inspect'}
                  </Text>
                </View>

                {analytics.meta.periodDays <= 7 ? (
                  <View style={styles.heatmap7Row}>
                    {analytics.consistency.heatmapCells.map((cell) => {
                      const isFocused = hoveredHeatmapCell?.date === cell.date;
                      const cellColors = getHeatmapStyle(cell.level);
                      const onDarkTile = cell.level >= 3;
                      return (
                        <TouchableOpacity
                          key={cell.date}
                          onPress={() => setHoveredHeatmapCell(cell)}
                          activeOpacity={0.8}
                          style={[
                            styles.heatmap7Tile,
                            cellColors,
                            isFocused && { borderColor: '#14B8A6', borderWidth: 2 },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '600',
                              color: onDarkTile ? '#FFFFFF' : dark ? '#CBD5E1' : '#475569',
                            }}
                          >
                            {cell.dayName.slice(0, 2)}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              fontVariant: ['tabular-nums'],
                              marginTop: 2,
                              color: onDarkTile ? '#FFFFFF' : dark ? '#E2E8F0' : '#1E293B',
                            }}
                          >
                            {parseISODate(cell.date).getUTCDate()}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              fontVariant: ['tabular-nums'],
                              marginTop: 2,
                              color: onDarkTile ? 'rgba(255,255,255,0.9)' : c.textSecondary,
                            }}
                            numberOfLines={1}
                          >
                            {cell.seconds > 0 ? formatDurationSeconds(cell.seconds) : '—'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.heatmapMatrix}>
                    {analytics.consistency.heatmapCells.map((cell) => {
                      const isFocused = hoveredHeatmapCell?.date === cell.date;
                      const cellColors = getHeatmapStyle(cell.level);
                      return (
                        <TouchableOpacity
                          key={cell.date}
                          onPress={() => setHoveredHeatmapCell(cell)}
                          activeOpacity={0.8}
                          style={[
                            styles.heatmapCellBox,
                            cellColors,
                            isFocused && { borderColor: '#14B8A6', borderWidth: 2 },
                          ]}
                        />
                      );
                    })}
                  </View>
                )}

                {/* Intensity Legend */}
                <View style={styles.heatmapLegendRow}>
                  <Text style={styles.legendSmallText}>
                    {formatCompactDate(startISO)} → {formatCompactDate(endISO)}
                  </Text>
                  <View style={styles.rowCenterGap4}>
                    <Text style={styles.legendSmallText}>Less</Text>
                    {[0, 1, 2, 3, 4].map((lvl) => (
                      <View
                        key={lvl}
                        style={[styles.legendSwatch, getHeatmapStyle(lvl)]}
                      />
                    ))}
                    <Text style={styles.legendSmallText}>More</Text>
                  </View>
                </View>
              </View>

              {/* Daily & Weekly Study Goals Progress */}
              <View style={[styles.goalsDivider, { borderTopColor: c.borderSubtle }]}>
                {[
                  {
                    label: `Daily Goal (${formatMinutes(analytics.consistency.dailyTargetMinutes)}/day)`,
                    pct: analytics.consistency.dailyGoalAvgPct,
                    color: '#14B8A6',
                  },
                  {
                    label: `Weekly Goal (${formatMinutes(analytics.consistency.weeklyTargetMinutes)}/week)`,
                    pct: analytics.consistency.weeklyGoalPct,
                    color: '#0EA5E9',
                  },
                ].map((g) => (
                  <View key={g.label}>
                    <View style={styles.barLabelRow}>
                      <Text style={{ fontSize: 12, color: c.textBody }}>{g.label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], color: c.textHeading }}>
                        {g.pct}% in range
                      </Text>
                    </View>
                    <View style={[styles.progressTrack8, { backgroundColor: c.bgTrack }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(100, Math.max(g.pct > 0 ? 2 : 0, g.pct))}%`,
                            backgroundColor: g.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </AnalyticsCard>

            {/* SECTION F: SUBJECT-WISE ANALYTICS */}
            <AnalyticsCard
              title="Subject-wise Analytics"
              subtitle="Recorded focus distribution by subject. Select a subject to inspect."
              icon={BookOpen}
              iconTone="blue"
              dark={dark}
              style={isLg ? { flex: 6 } : undefined}
              rightAction={
                selectedSubject ? (
                  <TouchableOpacity
                    onPress={() => setSelectedSubject(null)}
                    style={[styles.clearChip, { backgroundColor: c.bgButtonGhost }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: c.textBody }}>Clear</Text>
                  </TouchableOpacity>
                ) : null
              }
            >
              {analytics.subjects.list.length === 0 ? (
                <View style={[styles.emptyChartBox, { borderColor: c.borderCard }]}>
                  <BookOpen size={26} color={c.textMuted} />
                  <Text style={[styles.emptyChartTitle, { color: c.textSecondary }]}>
                    No study data available yet
                  </Text>
                  <Text style={[styles.emptyChartSub, { color: c.textMuted }]}>
                    Completed focus sessions will appear here. Tag a session with a subject to view subject distribution.
                  </Text>
                </View>
              ) : (
                <View>
                  <View style={[styles.subjectLayout, isSm && { flexDirection: 'row', alignItems: 'center' }]}>
                    <SubjectDonutChartRN
                      data={analytics.subjects.list}
                      selectedSubject={selectedSubject}
                      onToggleSubject={(subj) =>
                        setSelectedSubject((prev) => (prev === subj ? null : subj))
                      }
                      activeSubjectDetail={activeSubjectDetail}
                      dark={dark}
                    />

                    <View style={{ flex: 1, width: '100%', gap: 6 }}>
                      {analytics.subjects.list.map((sub) => {
                        const isSelected = selectedSubject === sub.subject;
                        return (
                          <TouchableOpacity
                            key={sub.subject}
                            onPress={() =>
                              setSelectedSubject((prev) => (prev === sub.subject ? null : sub.subject))
                            }
                            activeOpacity={0.75}
                            style={[
                              styles.subjectBarBtn,
                              isSelected
                                ? {
                                    backgroundColor: dark ? 'rgba(30,41,59,0.9)' : 'rgba(240,253,250,0.7)',
                                    borderColor: dark ? 'rgba(20,184,166,0.6)' : '#5EEAD4',
                                  }
                                : { borderColor: 'transparent' },
                            ]}
                          >
                            <View style={styles.subjectBarTop}>
                              <View style={[styles.rowCenterGap6, { flex: 1 }]}>
                                <View style={[styles.dot10, { backgroundColor: sub.color }]} />
                                <Text
                                  style={{ fontSize: 12, fontWeight: '600', color: c.textHeading, flexShrink: 1 }}
                                  numberOfLines={1}
                                >
                                  {sub.subject}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], color: c.textHeading }}>
                                {formatDurationSeconds(sub.actualSeconds)}{' '}
                                <Text style={{ fontWeight: '400', color: c.textSecondary }}>
                                  · {sub.sharePercent}%
                                </Text>
                              </Text>
                            </View>
                            <View style={[styles.progressTrack6, { backgroundColor: c.bgTrack }]}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${Math.max(4, sub.sharePercent)}%`,
                                    backgroundColor: sub.color,
                                  },
                                ]}
                              />
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Subject Drilldown Panel */}
                  {activeSubjectDetail && (
                    <View
                      style={[
                        styles.drilldownBox,
                        { backgroundColor: c.bgSubtleStrong, borderColor: c.borderSubtle },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: c.textSecondary }}>Sessions</Text>
                        <Text style={[styles.drilldownVal, { color: c.textHeading }]}>
                          {activeSubjectDetail.sessions} (avg {formatDurationSeconds(activeSubjectDetail.avgSessionSeconds)})
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: c.textSecondary }}>Consistency</Text>
                        <Text style={[styles.drilldownVal, { color: c.textHeading }]}>
                          {activeSubjectDetail.activeDays} / {analytics.meta.periodDays} days
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: c.textSecondary }}>Planner Tasks</Text>
                        <Text style={[styles.drilldownVal, { color: c.textHeading }]}>
                          {activeSubjectDetail.totalTasks > 0
                            ? `${activeSubjectDetail.completedTasks}/${activeSubjectDetail.totalTasks} done`
                            : 'Unlinked'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Honest Note for Planned Subjects with 0m Recorded */}
                  {analytics.subjects.neglectedPlanned.length > 0 && (
                    <View style={[styles.rowCenterGap6, { marginTop: 12 }]}>
                      <AlertCircle size={14} color={dark ? '#FCD34D' : '#B45309'} />
                      <Text
                        style={{
                          fontSize: 11,
                          flex: 1,
                          color: dark ? 'rgba(252,211,77,0.9)' : '#B45309',
                        }}
                      >
                        Scheduled with 0m recorded:{' '}
                        {analytics.subjects.neglectedPlanned
                          .slice(0, 3)
                          .map((n) => `${n.subject} (${formatMinutes(n.plannedMinutes)})`)
                          .join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </AnalyticsCard>
          </View>

          {/* ==================================================================
           * ACTIVITY-WISE TIME DISTRIBUTION (NON-SUBJECT ACTIVITIES)
           * ================================================================== */}
          <AnalyticsCard
            title="Activity-wise Analytics"
            subtitle="Time spent on Meditation, Yoga, Sports, Revision, and other activities."
            icon={Sparkles}
            iconTone="violet"
            dark={dark}
          >
            {analytics.activities.list.length === 0 ? (
              <View style={[styles.emptyChartBox, { borderColor: c.borderCard }]}>
                <Sparkles size={26} color={c.textMuted} />
                <Text style={[styles.emptyChartTitle, { color: c.textSecondary }]}>
                  No study data available yet
                </Text>
                <Text style={[styles.emptyChartSub, { color: c.textMuted }]}>
                  Completed focus sessions tagged with an activity will appear here.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {analytics.activities.list.map((act) => (
                  <View key={act.activity} style={{ gap: 5 }}>
                    <View style={styles.subjectBarTop}>
                      <View style={[styles.rowCenterGap6, { flex: 1 }]}>
                        <View style={[styles.dot10, { backgroundColor: act.color }]} />
                        <Text
                          style={{ fontSize: 12.5, fontWeight: '600', color: c.textHeading, flexShrink: 1 }}
                          numberOfLines={1}
                        >
                          {act.activity}
                        </Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }}>
                          ({act.sessions} {act.sessions === 1 ? 'session' : 'sessions'})
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], color: c.textHeading }}>
                        {formatDurationSeconds(act.actualSeconds)}{' '}
                        <Text style={{ fontWeight: '400', color: c.textSecondary }}>
                          · {act.sharePercent}%
                        </Text>
                      </Text>
                    </View>
                    <View style={[styles.progressTrack6, { backgroundColor: c.bgTrack }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.max(4, act.sharePercent)}%`,
                            backgroundColor: act.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </AnalyticsCard>

          {/* ==================================================================
           * SECTION G: TASK PERFORMANCE INTELLIGENCE
           * ================================================================== */}
          <AnalyticsCard
            title="Task Performance Intelligence"
            subtitle={`Explicit Study Planner completion across ${analytics.tasks.total} scheduled tasks.`}
            icon={CheckCircle2}
            iconTone="emerald"
            dark={dark}
            rightAction={
              <TouchableOpacity
                onPress={() => setShowAllTasksModal(true)}
                style={[
                  styles.actionChip,
                  { backgroundColor: dark ? 'rgba(20,184,166,0.12)' : '#F0FDFA' },
                ]}
                activeOpacity={0.75}
              >
                <Text style={[styles.actionChipText, { color: c.tealText }]}>View All Tasks</Text>
                <ChevronRight size={14} color={c.tealText} />
              </TouchableOpacity>
            }
          >
            {/* 5 Task Summary Tiles */}
            <View style={styles.taskSummaryGrid}>
              {[
                { label: 'Total Tasks', value: String(analytics.tasks.total), color: c.textPrimary },
                { label: 'Completed', value: String(analytics.tasks.completed), color: '#10B981' },
                { label: 'Pending', value: String(analytics.tasks.pending), color: '#0EA5E9' },
                {
                  label: 'Overdue',
                  value: String(analytics.tasks.overdue),
                  color: analytics.tasks.overdue > 0 ? '#F43F5E' : c.textPrimary,
                },
                { label: 'Completion', value: `${analytics.tasks.completionPct}%`, color: '#14B8A6' },
              ].map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.taskStatTile,
                    {
                      width: isSm ? '18.6%' : '48.2%',
                      backgroundColor: c.bgSubtle,
                      borderColor: c.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.stripLabel, { color: c.textSecondary }]}>
                    {item.label.toUpperCase()}
                  </Text>
                  <Text style={[styles.taskStatVal, { color: item.color }]}>{item.value}</Text>
                </View>
              ))}
            </View>

            {/* Segmented Task Progress Bar */}
            {analytics.tasks.total > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={[styles.segmentedTrack, { backgroundColor: c.bgTrack }]}>
                  <View
                    style={{
                      width: `${(analytics.tasks.completed / analytics.tasks.total) * 100}%`,
                      backgroundColor: '#10B981',
                      height: '100%',
                    }}
                  />
                  <View
                    style={{
                      width: `${(analytics.tasks.overdue / analytics.tasks.total) * 100}%`,
                      backgroundColor: 'rgba(251,113,133,0.85)',
                      height: '100%',
                    }}
                  />
                </View>
                <View style={styles.taskLegendRow}>
                  <View style={styles.rowCenterGap6}>
                    <View style={[styles.dot8, { backgroundColor: '#10B981' }]} />
                    <Text style={{ fontSize: 11, color: c.textSecondary }}>
                      Completed ({analytics.tasks.completed})
                    </Text>
                  </View>
                  <View style={styles.rowCenterGap6}>
                    <View style={[styles.dot8, { backgroundColor: '#FB7185' }]} />
                    <Text style={{ fontSize: 11, color: c.textSecondary }}>
                      Overdue ({analytics.tasks.overdue})
                    </Text>
                  </View>
                  <View style={styles.rowCenterGap6}>
                    <View style={[styles.dot8, { backgroundColor: dark ? '#334155' : '#CBD5E1' }]} />
                    <Text style={{ fontSize: 11, color: c.textSecondary }}>
                      Upcoming / Today ({Math.max(0, analytics.tasks.pending - analytics.tasks.overdue)})
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Compact Priority Tasks List (Top 3) */}
            {analytics.tasks.prioritized.length === 0 ? (
              <Text style={[styles.emptyInlineText, { color: c.textSecondary }]}>
                No planner tasks scheduled in this reporting period.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {analytics.tasks.prioritized.slice(0, 3).map((task) => {
                  const remaining = Math.max(0, task.plannedMinutes - task.actualMinutes);
                  const pct =
                    task.plannedMinutes > 0
                      ? Math.min(100, Math.round((task.actualMinutes / task.plannedMinutes) * 100))
                      : 0;
                  const isOverdue = task.status !== 'completed' && task.dueDate < REFERENCE_DATE_STR;
                  const pillColors =
                    task.status === 'completed'
                      ? { bg: dark ? 'rgba(16,185,129,0.15)' : '#ECFDF5', fg: dark ? '#6EE7B7' : '#047857' }
                      : isOverdue
                        ? { bg: dark ? 'rgba(244,63,94,0.15)' : '#FFF1F2', fg: dark ? '#FDA4AF' : '#BE123C' }
                        : { bg: dark ? '#1E293B' : 'rgba(226,232,240,0.8)', fg: dark ? '#CBD5E1' : '#334155' };

                  return (
                    <View
                      key={task.id}
                      style={[
                        styles.taskCard,
                        { backgroundColor: c.bgSubtle, borderColor: c.borderSubtle },
                      ]}
                    >
                      <View style={styles.taskCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.taskCardTitle, { color: c.textHeading }]} numberOfLines={1}>
                            {task.title}
                          </Text>
                          <View style={[styles.rowCenterGap6, { marginTop: 2 }]}>
                            <View
                              style={[
                                styles.dot6,
                                { backgroundColor: getSubjectColor(task.subject) },
                              ]}
                            />
                            <Text style={{ fontSize: 11, fontWeight: '500', color: getSubjectColor(task.subject) }}>
                              {task.subject}
                            </Text>
                            <Text style={{ fontSize: 11, color: c.textMuted }}>·</Text>
                            <Text style={{ fontSize: 11, color: c.textSecondary }}>
                              Due {formatCompactDate(task.dueDate)}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.taskStatusPill, { backgroundColor: pillColors.bg }]}>
                          <Text style={[styles.taskStatusText, { color: pillColors.fg }]}>
                            {task.status === 'completed' ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.progressTrack6, { backgroundColor: c.bgTrackAlt, marginTop: 10 }]}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: '#14B8A6' }]} />
                      </View>

                      <View style={styles.taskMetaRow}>
                        <Text style={{ fontSize: 11, fontVariant: ['tabular-nums'], color: c.textSecondary }}>
                          {formatMinutes(task.actualMinutes)} actual · {formatMinutes(task.plannedMinutes)} planned · {formatMinutes(remaining)} remaining
                        </Text>
                        <Text style={{ fontSize: 11, fontVariant: ['tabular-nums'], color: c.textSecondary }}>
                          {task.sessionsCount} sessions
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {analytics.tasks.total > 3 && (
                  <TouchableOpacity
                    onPress={() => setShowAllTasksModal(true)}
                    style={styles.viewAllFooterBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '500', color: c.textSecondary }}>
                      Showing 3 of {analytics.tasks.total} tasks for {formatCompactDate(startISO)} – {formatCompactDate(endISO)} · View all
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </AnalyticsCard>

          {/* ==================================================================
           * SECONDARY ANALYTICS GRID: SECTIONS H (FOCUS) & I (ACADEMIC)
           * ================================================================== */}
          <View style={[styles.bentoRow, !isLg && { flexDirection: 'column' }]}>
            {/* SECTION H: FOCUS SESSION INTELLIGENCE */}
            <AnalyticsCard
              title="Focus Session Intelligence"
              subtitle="Session length distribution and time-of-day concentration patterns."
              icon={Timer}
              iconTone="violet"
              collapsible
              defaultOpen
              dark={dark}
              style={isLg ? { flex: 6 } : undefined}
            >
              <View style={styles.grid4Row}>
                {[
                  { label: 'Sessions', value: String(analytics.focus.totalSessions) },
                  { label: 'Average', value: formatDurationSeconds(analytics.focus.avgSessionSeconds) },
                  { label: 'Longest', value: formatDurationSeconds(analytics.focus.longestSessionSeconds) },
                  { label: 'Active Days', value: String(analytics.focus.activeDaysCount) },
                ].map((m) => (
                  <View
                    key={m.label}
                    style={[
                      styles.focusMiniTile,
                      { backgroundColor: c.bgSubtle, borderColor: c.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.stripLabel, { color: c.textSecondary }]} numberOfLines={1}>
                      {m.label.toUpperCase()}
                    </Text>
                    <Text style={[styles.habitVal, { color: c.textPrimary }]} numberOfLines={1}>
                      {m.value}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.subSectionLabel, { color: c.textBody, marginBottom: 8 }]}>
                  Session Duration Distribution
                </Text>
                <DurationBarChartRN data={analytics.focus.durationBuckets} dark={dark} />
              </View>

              <View>
                <Text style={[styles.subSectionLabel, { color: c.textBody, marginBottom: 8 }]}>
                  Focus Time by Part of Day
                </Text>
                <View style={styles.grid4Row}>
                  {analytics.focus.timeOfDayBuckets.map((slot) => {
                    const pct =
                      analytics.hero.totalActualSeconds > 0
                        ? Math.round((slot.seconds / analytics.hero.totalActualSeconds) * 100)
                        : 0;
                    return (
                      <View
                        key={slot.key}
                        style={[
                          styles.timeSlotTile,
                          { backgroundColor: c.bgSubtle, borderColor: c.borderSubtle },
                        ]}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: c.textHeading }} numberOfLines={1}>
                          {slot.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            fontVariant: ['tabular-nums'],
                            color: c.tealText,
                            marginTop: 2,
                          }}
                        >
                          {pct}%
                        </Text>
                        <Text style={{ fontSize: 10, fontVariant: ['tabular-nums'], color: c.textMuted }}>
                          {formatDurationSeconds(slot.seconds)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </AnalyticsCard>

            {/* SECTION I: ACADEMIC PERFORMANCE */}
            <AnalyticsCard
              title="Academic Performance"
              subtitle="Mock test scores, accuracy trends, and subject test readiness."
              icon={Award}
              iconTone="teal"
              collapsible
              defaultOpen
              dark={dark}
              style={isLg ? { flex: 6 } : undefined}
              rightAction={
                <TouchableOpacity
                  onPress={() =>
                    setActionSheet({
                      title: 'Study Sakha Test Center',
                      description:
                        'Launch a timed Prelims mock test or subject-wise PYQ drill. Completed results automatically sync into your Academic Performance trend chart.',
                      primaryCta: 'Start Practice Test',
                      route: 'tests',
                    })
                  }
                  style={[
                    styles.actionChip,
                    { backgroundColor: dark ? 'rgba(14,165,233,0.12)' : '#F0F9FF' },
                  ]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.actionChipText, { color: c.skyText }]}>Tests</Text>
                  <ChevronRight size={14} color={c.skyText} />
                </TouchableOpacity>
              }
            >
              {analytics.academic.attempted === 0 ? (
                <View
                  style={[
                    styles.academicEmptyBox,
                    {
                      backgroundColor: dark ? 'rgba(2,6,23,0.4)' : 'rgba(248,250,252,0.75)',
                      borderColor: c.borderCard,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.academicEmptyIcon,
                      { backgroundColor: dark ? 'rgba(14,165,233,0.15)' : '#F0F9FF' },
                    ]}
                  >
                    <Award size={24} color={c.skyText} />
                  </View>
                  <Text style={[styles.academicEmptyTitle, { color: c.textPrimary }]}>
                    No mock test results in this period
                  </Text>
                  <Text style={[styles.academicEmptySub, { color: c.textSecondary }]}>
                    Your test scores, accuracy trends, and subject benchmarks will appear here once you complete an attempt. Cohort percentiles require verified benchmark data and are never estimated.
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setActionSheet({
                        title: 'Take a Diagnostic Mock Test',
                        description:
                          'Ready to establish your baseline? Choose a 15-minute Polity PYQ Sprint or a Full-Length GS Mock in Test Center.',
                        primaryCta: 'Launch Test Center',
                        route: 'tests',
                      })
                    }
                    style={styles.takeTestBtn}
                    activeOpacity={0.85}
                  >
                    <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.takeTestBtnText}>Take a Test</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  <View style={styles.grid4Row}>
                    {[
                      { label: 'Attempted', value: String(analytics.academic.attempted), color: c.textPrimary },
                      { label: 'Avg Score', value: `${analytics.academic.avgScore}%`, color: '#0EA5E9' },
                      { label: 'Best Score', value: `${analytics.academic.bestScore}%`, color: '#10B981' },
                      { label: 'Accuracy', value: `${analytics.academic.avgAccuracy}%`, color: '#14B8A6' },
                    ].map((k) => (
                      <View
                        key={k.label}
                        style={[
                          styles.focusMiniTile,
                          { backgroundColor: c.bgSubtle, borderColor: c.borderSubtle },
                        ]}
                      >
                        <Text style={[styles.stripLabel, { color: c.textSecondary }]} numberOfLines={1}>
                          {k.label.toUpperCase()}
                        </Text>
                        <Text style={[styles.habitVal, { color: k.color }]} numberOfLines={1}>
                          {k.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {analytics.academic.trendSeries.length >= 2 ? (
                    <TestTrendAreaChartRN data={analytics.academic.trendSeries} dark={dark} />
                  ) : (
                    <View style={[styles.statusDescBox, { backgroundColor: c.bgSubtle }]}>
                      <Text style={{ fontSize: 12, color: c.textSecondary }}>
                        Complete at least 2 tests in this period to visualize your score & accuracy trend curve.
                      </Text>
                    </View>
                  )}

                  <View style={{ gap: 6 }}>
                    <View style={styles.barLabelRow}>
                      <Text style={[styles.subSectionLabel, { color: c.textBody }]}>
                        Recent Test Results
                      </Text>
                      <Text style={{ fontSize: 10, color: c.textMuted }}>Score · Accuracy</Text>
                    </View>
                    {analytics.academic.recentTests.slice(0, 3).map((t) => (
                      <View
                        key={t.id}
                        style={[
                          styles.testResultRow,
                          { backgroundColor: c.bgSubtle, borderColor: c.borderSubtle },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: c.textHeading }} numberOfLines={1}>
                            {t.title}
                          </Text>
                          <Text style={{ fontSize: 11, color: c.textSecondary, marginTop: 1 }}>
                            {t.subject} · {formatCompactDate(t.date)} · {t.correct}/{t.totalQuestions}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], color: c.skyText }}>
                            {t.scorePercent}%
                          </Text>
                          <Text style={{ fontSize: 10, fontWeight: '500', fontVariant: ['tabular-nums'], color: c.tealText }}>
                            {t.accuracyPercent}% acc
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </AnalyticsCard>
          </View>
        </View>
      </ScrollView>

      {/* ====================================================================
       * VIEW ALL TASKS MODAL SHEET
       * ==================================================================== */}
      <Modal
        visible={showAllTasksModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAllTasksModal(false)}
      >
        <View style={styles.modalBackdropBottom}>
          <View
            style={[
              styles.tasksModalSheet,
              {
                backgroundColor: dark ? '#0F172A' : '#FFFFFF',
                borderColor: c.borderCard,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: c.borderSubtle }]}>
              <View>
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>All Scheduled Tasks</Text>
                <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 1 }}>
                  {formatCompactDate(startISO)} – {formatCompactDate(endISO)} · {analytics.tasks.total} total
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAllTasksModal(false)}
                style={styles.iconBtn}
              >
                <X size={18} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search & Filter Controls */}
            <View style={[styles.modalControls, { borderBottomColor: c.borderSubtle }]}>
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: dark ? '#020617' : '#F8FAFC',
                    borderColor: c.borderCard,
                  },
                ]}
              >
                <Search size={15} color="#94A3B8" />
                <TextInput
                  value={taskSearch}
                  onChangeText={setTaskSearch}
                  placeholder="Search task or subject..."
                  placeholderTextColor="#94A3B8"
                  style={[styles.searchInput, { color: c.textPrimary }]}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {(
                  [
                    { id: 'all', label: `All (${analytics.tasks.total})` },
                    { id: 'pending', label: `Pending (${analytics.tasks.pending})` },
                    { id: 'overdue', label: `Overdue (${analytics.tasks.overdue})` },
                    { id: 'completed', label: `Completed (${analytics.tasks.completed})` },
                  ] as const
                ).map((f) => {
                  const active = taskFilter === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => setTaskFilter(f.id)}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: active ? '#0D9488' : c.bgButtonGhost,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: active ? '#FFFFFF' : c.textBody,
                        }}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Scrollable Task List */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 10 }}>
              {modalTasks.length === 0 ? (
                <Text style={[styles.emptyInlineText, { color: c.textSecondary }]}>
                  {analytics.tasks.total === 0
                    ? 'No scheduled tasks yet. Tasks you create in Study Planner will appear here.'
                    : 'No tasks match the current filter.'}
                </Text>
              ) : (
                modalTasks.map((t) => {
                  const isOverdue = t.status !== 'completed' && t.dueDate < REFERENCE_DATE_STR;
                  const remaining = Math.max(0, t.plannedMinutes - t.actualMinutes);
                  const pillColors =
                    t.status === 'completed'
                      ? { bg: 'rgba(16,185,129,0.15)', fg: '#10B981' }
                      : isOverdue
                        ? { bg: 'rgba(244,63,94,0.15)', fg: '#F43F5E' }
                        : { bg: dark ? '#1E293B' : '#E2E8F0', fg: dark ? '#CBD5E1' : '#334155' };

                  return (
                    <View
                      key={t.id}
                      style={[
                        styles.taskCard,
                        { backgroundColor: c.bgSubtleStrong, borderColor: c.borderCard },
                      ]}
                    >
                      <View style={styles.taskCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: c.textHeading }}>
                            {t.title}
                          </Text>
                          <Text style={{ fontSize: 11, color: c.textSecondary, marginTop: 2 }}>
                            {t.subject} · Due {formatCompactDate(t.dueDate)}
                          </Text>
                        </View>
                        <View style={[styles.taskStatusPill, { backgroundColor: pillColors.bg }]}>
                          <Text style={[styles.taskStatusText, { color: pillColors.fg }]}>
                            {t.status === 'completed' ? 'Done' : isOverdue ? 'Overdue' : 'Pending'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, fontVariant: ['tabular-nums'], color: c.textSecondary, marginTop: 6 }}>
                        {formatMinutes(t.actualMinutes)} actual · {formatMinutes(t.plannedMinutes)} planned · {formatMinutes(remaining)} remaining
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ====================================================================
       * CONTEXTUAL ACTION SHEET MODAL (REPLACEMENT FOR NATIVE ALERTS)
       * ==================================================================== */}
      <Modal
        visible={actionSheet !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setActionSheet(null)}
      >
        <View style={styles.modalBackdropCenter}>
          {actionSheet && (
            <View
              style={[
                styles.actionSheetCard,
                {
                  backgroundColor: dark ? '#0F172A' : '#FFFFFF',
                  borderColor: c.borderCard,
                },
              ]}
            >
              <View style={styles.actionSheetTop}>
                <Text style={[styles.modalTitle, { color: c.textPrimary, flex: 1 }]}>
                  {actionSheet.title}
                </Text>
                <TouchableOpacity onPress={() => setActionSheet(null)} style={styles.iconBtn}>
                  <X size={16} color={c.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.actionSheetDesc, { color: c.textSecondary }]}>
                {actionSheet.description}
              </Text>
              <View style={styles.actionSheetBtns}>
                <TouchableOpacity
                  onPress={() => setActionSheet(null)}
                  style={[styles.secondaryBtn, { backgroundColor: c.bgButtonGhost }]}
                >
                  <Text style={[styles.secondaryBtnText, { color: c.textBody }]}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleActionSheetPrimary}
                  style={styles.primaryTealBtn}
                >
                  <Text style={styles.primaryTealBtnText}>{actionSheet.primaryCta}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ====================================================================
       * SUBTLE TOAST FEEDBACK BANNER
       * ==================================================================== */}
      {toastMsg !== '' && (
        <View style={styles.toastWrap} pointerEvents="none">
          <View
            style={[
              styles.toastPill,
              { backgroundColor: dark ? '#14B8A6' : '#0F172A' },
            ]}
          >
            <Check size={14} color={dark ? '#020617' : '#FFFFFF'} />
            <Text
              style={[styles.toastText, { color: dark ? '#020617' : '#FFFFFF' }]}
              numberOfLines={1}
            >
              {toastMsg}
            </Text>
          </View>
        </View>
      )}
      </View>
    </Shell>
  );
}

/* ============================================================================
 * 9. STYLESHEET (EXACT VISUAL PARITY WITH ORIGINAL TAILWIND DESIGN)
 * ============================================================================ */

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
  },
  headerInner: {
    width: '100%',
    maxWidth: 1024,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    position: 'relative',
  },
  avatarShell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: 'rgba(153,246,228,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  brandStudy: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandSakha: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#14B8A6',
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F43F5E',
    borderWidth: 1.5,
  },
  datasetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  datasetPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  datasetPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },
  maxContainer: {
    width: '100%',
    maxWidth: 1024,
    alignSelf: 'center',
    gap: 16,
  },
  mobileDataBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  mobileDataLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  mobileDataToggle: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 9,
  },
  mobileDataBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
  },
  mobileDataBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionA: {
    gap: 14,
  },
  sectionARow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  badgeDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  intelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  intelBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  periodDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 6,
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rangeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  rangeBtn: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customDrawer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  customInputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  dateInput: {
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 12.5,
    fontWeight: '500',
  },
  customActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryTealBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#0D9488',
  },
  primaryTealBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  heroInner: {
    padding: 16,
    gap: 20,
    alignItems: 'center',
  },
  heroInnerWide: {
    flexDirection: 'row',
    padding: 24,
    gap: 28,
  },
  heroRingsCol: {
    alignItems: 'center',
  },
  ringCenterReadout: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  ringRecordedLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  ringActualValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  ringGoalLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  ringLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  ringLegendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  heroTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  heroEyebrow: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  heroBigValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  heroVsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  trendPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  kpiTile: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  kpiTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  kpiTileLabel: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  kpiTileValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  kpiTileSub: {
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cardHeaderSingleRow: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  cardHeaderLeftSingleRow: {
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  cardTitleSingleRow: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
    minWidth: 0,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  collapseBtn: {
    padding: 6,
    borderRadius: 8,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  insightCard: {
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    gap: 6,
  },
  insightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  insightCatBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  insightCatText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  insightSource: {
    fontSize: 10,
    fontWeight: '500',
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  insightDetail: {
    fontSize: 12,
    lineHeight: 17,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 16,
    minWidth: 0,
  },
  miniSegControl: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 9,
    borderWidth: 1,
    flexShrink: 0,
  },
  miniSegBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 7,
  },
  miniSegText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  statsStrip3: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  stripLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  stripValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  emptyChartBox: {
    height: 196,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
  },
  emptyChartTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  emptyChartSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  chartTooltip: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    minWidth: 148,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
  },
  tooltipTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 1,
  },
  tooltipMuted: {
    fontSize: 11,
  },
  tooltipVal: {
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  selectedDayPill: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectedDayTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  topSubjectChip: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  selectedDayDur: {
    fontSize: 12.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  microLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  planPctText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  planVarianceText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  barVal: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressTrack10: {
    height: 10,
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressTrack8: {
    height: 8,
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressTrack6: {
    height: 6,
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  statusDescBox: {
    padding: 10,
    borderRadius: 12,
  },
  statusDescText: {
    fontSize: 12,
    lineHeight: 17,
  },
  expandLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  expandLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planSubjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  grid4Row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  habitTile: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  focusMiniTile: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  habitVal: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  heatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  heatmapInspect: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  heatmap7Row: {
    flexDirection: 'row',
    gap: 6,
  },
  heatmap7Tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  heatmapMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heatmapCellBox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  legendSmallText: {
    fontSize: 10,
    color: '#64748B',
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
  },
  goalsDivider: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 10,
  },
  clearChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectLayout: {
    gap: 16,
    alignItems: 'center',
  },
  subjectBarBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  subjectBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 5,
  },
  drilldownBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
  },
  drilldownVal: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 14,
  },
  taskStatTile: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  taskStatVal: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  segmentedTrack: {
    height: 10,
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  taskLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 6,
  },
  taskCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskCardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  taskStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  taskStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  taskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 6,
  },
  viewAllFooterBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyInlineText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 18,
  },
  timeSlotTile: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  academicEmptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
  },
  academicEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  academicEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  academicEmptySub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 6,
  },
  takeTestBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0D9488',
  },
  takeTestBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  testResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  bottomNavInner: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  bottomNavBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  modalBackdropBottom: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.6)',
    justifyContent: 'flex-end',
  },
  tasksModalSheet: {
    height: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalControls: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 9 : 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    padding: 0,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  actionSheetCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  actionSheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionSheetDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 8,
  },
  actionSheetBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  toastWrap: {
    position: 'absolute',
    bottom: 76,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  rowCenterGap4: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowCenterGap6: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowCenterGap8: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot6: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dot8: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dot10: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 12,
  },
  errorMsg: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  errorBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0D9488',
  },
  errorBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default function App() {
  return (
    <DashboardErrorBoundary>
      <StudySakhaStatisticsScreen />
    </DashboardErrorBoundary>
  );
}
