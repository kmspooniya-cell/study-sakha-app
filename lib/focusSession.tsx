import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { FocusSessionMode, FocusSessionSetup } from '../components/FocusSessionSetupModal';
import { appendFocusHistory } from './focusHistory';
import type { FocusSessionCategory } from './focusHistory';
import { getFocusedMilliseconds, getFocusedSeconds, shouldPromptToSaveFocusSession } from './focusTimerAccounting';
import { retryPendingStudyMemberActivities, syncStudyMemberActivityWithRetry } from './groupActivitySync';
import {
  endGroupRoomFocus,
  getGroupRoomFocusContexts,
  publishGroupRoomFocus,
  subscribeGroupRoomFocusControls,
} from './groupRoomFocusBridge';
import type { GroupRoomFocusContext, GroupRoomFocusStatus } from './groupRoomFocusBridge';
import { useGroupFocusPresence } from './groupRoomRealtime';
import type { RealtimeDiagnosticState } from './groupRoomRealtime';
import { getActiveStudyGroups } from './groupRooms';
import type { ActiveStudyGroup, GroupRoomId } from './groupRooms';
import { classifySyncError, logStructuredSyncEvent } from './groupSyncErrors';
import { getSchedulePlanDurationSeconds } from './planner';
import { dayKey, getUserScopedStorageKey, PlannerScheduleItem, PlannerTask, useStore } from './store';

export const FOCUS_STUDY_HISTORY_KEY = 'study-sakha-focus-history-v1';
export const FOCUS_ACTIVE_SESSION_KEY = 'study-sakha-focus-active-session-v1';

export type SessionStatus = 'completed' | 'saved_early';
export type SessionPhase = 'focus' | 'break' | 'paused';

export type CompletionRecord = {
  id: string;
  sessionId: string;
  userId?: string;
  startedAt: string;
  endedAt: string;
  completedAt: string;
  date: string;
  focusedSeconds: number;
  actualSeconds: number;
  plannedSeconds: number | null;
  plannedMinutes?: number;
  mode: FocusSessionMode;
  sessionType: FocusSessionCategory;
  subject?: string;
  topic?: string;
  taskId?: string;
  scheduleId?: string;
  scheduleOccurrenceId?: string;
  groupId?: string;
  minutes: number;
  status: SessionStatus;
};

export type ActiveFocusSession = {
  id: string;
  userId: string | null;
  startedAt: string;
  mode: FocusSessionMode;
  sessionType: FocusSessionCategory;
  plannedSeconds: number | null;
  focusedMilliseconds: number;
  focusSegmentStartedAt: number | null;
  phase: SessionPhase;
  resumePhase: 'focus' | 'break' | null;
  breakElapsedMilliseconds: number;
  breakStartedAt: number | null;
  breakDurationSeconds?: number;
  subject: string | null;
  topic: string | null;
  taskId: string | null;
  scheduleId: string | null;
  scheduleOccurrenceId: string | null;
  schedulePlannedSeconds: number | null;
  task: PlannerTask | PlannerScheduleItem | null;
  groupId: string | null;
  sessionLabel: string;
  endRequested: boolean;
  pendingRecord?: CompletionRecord;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isStoredFocusTask(value: unknown): value is PlannerTask | PlannerScheduleItem {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.category !== 'string') return false;
  return (
    (typeof value.label === 'string' && typeof value.targetDate === 'string') ||
    (typeof value.title === 'string' && (value.date === undefined || typeof value.date === 'string'))
  );
}

export function isCompletionRecord(value: unknown): value is CompletionRecord {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.sessionId === 'string' &&
    isValidTimestamp(value.startedAt) &&
    isValidTimestamp(value.endedAt) &&
    isValidTimestamp(value.completedAt) &&
    isNonNegativeFiniteNumber(value.focusedSeconds) &&
    isNonNegativeFiniteNumber(value.actualSeconds) &&
    (value.plannedSeconds === null || isNonNegativeFiniteNumber(value.plannedSeconds)) &&
    (value.mode === 'timer' || value.mode === 'pomodoro' || value.mode === 'stopwatch') &&
    (value.status === 'completed' || value.status === 'saved_early') &&
    isNonNegativeFiniteNumber(value.minutes) &&
    (value.scheduleId === undefined || typeof value.scheduleId === 'string') &&
    (value.scheduleOccurrenceId === undefined || typeof value.scheduleOccurrenceId === 'string');
}

export function isValidFocusSessionSetup(value: unknown): value is FocusSessionSetup {
  if (!isRecord(value)) return false;
  if (!['timer', 'pomodoro', 'stopwatch'].includes(String(value.mode))) return false;
  if (!isNonNegativeFiniteNumber(value.durationMinutes) || value.durationMinutes <= 0) return false;
  if (value.selection !== null && value.selection !== 'manual' && value.selection !== 'schedule') return false;
  if (typeof value.tag !== 'string') return false;
  if (value.startInBreak !== undefined && typeof value.startInBreak !== 'boolean') return false;
  if (
    value.scheduleOccurrenceId !== undefined &&
    (typeof value.scheduleOccurrenceId !== 'string' || value.scheduleOccurrenceId.length === 0)
  ) return false;
  if (value.selection === 'schedule' && !isStoredFocusTask(value.task)) return false;
  if (value.selection !== 'schedule' && value.task !== null) return false;
  return true;
}

export function isActiveFocusSession(value: unknown): value is ActiveFocusSession {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    (value.userId === null || typeof value.userId === 'string') &&
    isValidTimestamp(value.startedAt) &&
    (value.mode === 'timer' || value.mode === 'pomodoro' || value.mode === 'stopwatch') &&
    (value.plannedSeconds === null || isNonNegativeFiniteNumber(value.plannedSeconds)) &&
    isNonNegativeFiniteNumber(value.focusedMilliseconds) &&
    (value.focusSegmentStartedAt === null || isNonNegativeFiniteNumber(value.focusSegmentStartedAt)) &&
    (value.phase === 'focus' || value.phase === 'break' || value.phase === 'paused') &&
    (value.resumePhase === null || value.resumePhase === 'focus' || value.resumePhase === 'break') &&
    isNonNegativeFiniteNumber(value.breakElapsedMilliseconds) &&
    (value.breakDurationSeconds === undefined || isNonNegativeFiniteNumber(value.breakDurationSeconds)) &&
    (value.breakStartedAt === null || isNonNegativeFiniteNumber(value.breakStartedAt)) &&
    (value.subject === null || typeof value.subject === 'string') &&
    (value.topic === null || typeof value.topic === 'string') &&
    (value.taskId === null || typeof value.taskId === 'string') &&
    (value.scheduleId === undefined || value.scheduleId === null || typeof value.scheduleId === 'string') &&
    (value.scheduleOccurrenceId === undefined || value.scheduleOccurrenceId === null || typeof value.scheduleOccurrenceId === 'string') &&
    (value.schedulePlannedSeconds === undefined || value.schedulePlannedSeconds === null || isNonNegativeFiniteNumber(value.schedulePlannedSeconds)) &&
    (value.task === null || isStoredFocusTask(value.task)) &&
    (value.groupId === null || typeof value.groupId === 'string') &&
    typeof value.sessionLabel === 'string' &&
    typeof value.endRequested === 'boolean' &&
    (value.pendingRecord === undefined || isCompletionRecord(value.pendingRecord));
}

export function createFocusSessionId() {
  return `focus-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

export function formatFocusClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function getTaskTitle(task: PlannerTask | PlannerScheduleItem | null) {
  if (!task) return null;
  return 'label' in task ? task.label : task.title;
}

export const PRAISE_MESSAGES = [
  "Outstanding Work! You've made great progress.",
  'A strong session. Keep building on this momentum.',
  'You showed up for your goals. That matters.',
  'Focused effort adds up. Be proud of this step.',
];

export const EARLY_PRAISE_MESSAGES = [
  'Good Effort! Your Focus Session Has Been Saved.',
  'You made time for your goal. Keep going when you are ready.',
  'Every focused minute counts. Nice work showing up.',
];

function randomMessage(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)];
}

export type FocusCompletionPayload = {
  session: CompletionRecord;
  message: string;
  groupSyncWarning?: string;
};

type CompleteCallbacks = {
  onCompleted?: (payload: FocusCompletionPayload) => void;
};

export type ActiveHallContext = {
  groupId: string;
  groupName: string;
  roomId: GroupRoomId;
  roomName: string;
  roomSessionId: string;
  isInsideHall: boolean;
};

export type FocusSessionContextValue = {
  session: ActiveFocusSession | null;
  sessionRef: React.MutableRefObject<ActiveFocusSession | null>;
  clockNow: number;
  sessionStorageReady: boolean;
  isFinalizing: boolean;
  saveError: string;
  setSaveError: React.Dispatch<React.SetStateAction<string>>;
  endConfirmationVisible: boolean;
  setEndConfirmationVisible: React.Dispatch<React.SetStateAction<boolean>>;
  earlyExitConfirmationVisible: boolean;
  setEarlyExitConfirmationVisible: React.Dispatch<React.SetStateAction<boolean>>;
  resumeAfterEarlyExit: boolean;
  cancelEndSession: () => void;
  joinedGroups: ActiveStudyGroup[];
  joinedGroupsLoading: boolean;
  joinedGroupsError: string;
  groupPresenceError: string;
  diagnosticState: RealtimeDiagnosticState;
  activeRoomContext: GroupRoomFocusContext | null;
  setActiveRoomContext: (ctx: GroupRoomFocusContext | null) => void;
  activeHallContext: ActiveHallContext | null;
  setActiveHallContext: (ctx: ActiveHallContext | null) => void;
  registerHallOpener: (handler: (() => void) | null) => void;
  openActiveHall: () => void;
  currentRouteName: string | undefined;
  setCurrentRouteName: (name: string | undefined) => void;
  startSession: (setup: FocusSessionSetup, roomFocus?: GroupRoomFocusContext | null) => ActiveFocusSession | null;
  togglePause: () => void;
  toggleBreak: () => void;
  resetSession: () => void;
  updateSessionSubject: (subject: string) => void;
  requestEndSession: (now?: number, callbacks?: CompleteCallbacks) => void;
  completeSession: (
    value: ActiveFocusSession,
    status: SessionStatus,
    existingRecord?: CompletionRecord,
    callbacks?: CompleteCallbacks,
  ) => Promise<void>;
  discardSession: (value: ActiveFocusSession, onDiscarded?: () => void) => Promise<void>;
  stayInSession: () => void;
  registerCompletionHandler: (handler: ((payload: FocusCompletionPayload) => void) | null) => void;
  refreshJoinedGroups: () => void;
  actualFocusedSeconds: number;
  secondsRemaining: number;
  isOnBreak: boolean;
  isRunning: boolean;
};

const FocusSessionCtx = createContext<FocusSessionContextValue | null>(null);

export function useOptionalFocusSession(): FocusSessionContextValue | null {
  return useContext(FocusSessionCtx);
}

export function useFocusSession(): FocusSessionContextValue {
  const ctx = useContext(FocusSessionCtx);
  if (!ctx) throw new Error('useFocusSession must be used inside FocusSessionProvider');
  return ctx;
}

export function FocusSessionProvider({
  children,
  onNavigateCompletion,
}: {
  children: React.ReactNode;
  onNavigateCompletion?: (payload: FocusCompletionPayload) => void;
}) {
  const { state: storeState, dispatch } = useStore();
  const breakSeconds = Math.max(0, (storeState.settings?.shortBreakMinutes ?? 5) * 60);
  const userId = storeState.user?.id ?? null;
  const activeStorageKey = useMemo(
    () => getUserScopedStorageKey(FOCUS_ACTIVE_SESSION_KEY, userId),
    [userId],
  );

  const [session, setSession] = useState<ActiveFocusSession | null>(null);
  const sessionRef = useRef<ActiveFocusSession | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);
  const sessionStorageReady = hydratedStorageKey === activeStorageKey;
  const [endConfirmationVisible, setEndConfirmationVisible] = useState(false);
  const [earlyExitConfirmationVisible, setEarlyExitConfirmationVisible] = useState(false);
  const [resumeAfterEarlyExit, setResumeAfterEarlyExit] = useState(false);
  const [resumeAfterEndConfirmation, setResumeAfterEndConfirmation] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [activeRoomContext, setActiveRoomContextState] = useState<GroupRoomFocusContext | null>(null);
  const activeRoomContextRef = useRef<GroupRoomFocusContext | null>(null);
  const setActiveRoomContext = useCallback((ctx: GroupRoomFocusContext | null) => {
    activeRoomContextRef.current = ctx;
    setActiveRoomContextState(ctx);
  }, []);
  const [activeHallContext, setActiveHallContext] = useState<ActiveHallContext | null>(null);
  const [currentRouteName, setCurrentRouteNameState] = useState<string | undefined>(undefined);
  const setCurrentRouteName = useCallback((name: string | undefined) => {
    setCurrentRouteNameState((previous) => previous === name ? previous : name);
  }, []);
  const hallOpenerRef = useRef<(() => void) | null>(null);
  const registerHallOpener = useCallback((handler: (() => void) | null) => {
    hallOpenerRef.current = handler;
  }, []);
  const openActiveHall = useCallback(() => {
    hallOpenerRef.current?.();
  }, []);
  const [joinedGroups, setJoinedGroups] = useState<ActiveStudyGroup[]>([]);
  const [joinedGroupsLoading, setJoinedGroupsLoading] = useState(Boolean(userId));
  const [joinedGroupsError, setJoinedGroupsError] = useState('');
  const [groupPresenceError, setGroupPresenceError] = useState('');

  const finalizing = useRef(false);
  const mountedRef = useRef(true);
  const persistenceQueue = useRef<Promise<void>>(Promise.resolve());
  const completionHandlerRef = useRef<((payload: FocusCompletionPayload) => void) | null>(null);
  const onNavigateCompletionRef = useRef(onNavigateCompletion);
  onNavigateCompletionRef.current = onNavigateCompletion;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshJoinedGroups = useCallback(() => {
    if (!userId) {
      setJoinedGroups([]);
      setJoinedGroupsLoading(false);
      return;
    }
    setJoinedGroupsLoading(true);
    void getActiveStudyGroups(userId).then((groups) => {
      if (mountedRef.current) {
        setJoinedGroups(groups);
        setJoinedGroupsError('');
        setJoinedGroupsLoading(false);
      }
    }).catch((error: unknown) => {
      if (mountedRef.current) {
        setJoinedGroupsError(error instanceof Error ? error.message : 'Could not load your joined groups.');
        setJoinedGroupsLoading(false);
      }
    });
  }, [userId]);

  useEffect(() => {
    refreshJoinedGroups();
  }, [refreshJoinedGroups]);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    const retryPending = () => {
      void retryPendingStudyMemberActivities(userId).then((failures) => {
        if (active && failures.length) {
          console.warn('Previously saved group activity could not be synchronized:', failures);
        }
      }).catch((error: unknown) => {
        if (active) console.error('Saved group activity retries could not be loaded:', error);
      });
    };
    retryPending();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') retryPending();
    });
    const handleOnline = () => retryPending();
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', handleOnline);
    }
    return () => {
      active = false;
      subscription.remove();
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [userId]);

  const commitSession = useCallback((next: ActiveFocusSession | null) => {
    sessionRef.current = next;
    setSession(next);
    setClockNow(Date.now());
  }, []);

  const persistSession = useCallback((next: ActiveFocusSession | null) => {
    const write = persistenceQueue.current.catch(() => {}).then(async () => {
      if (next) await AsyncStorage.setItem(activeStorageKey, JSON.stringify(next));
      else await AsyncStorage.removeItem(activeStorageKey);
    });
    persistenceQueue.current = write;
    return write;
  }, [activeStorageKey]);

  const publishRoomUpdate = useCallback((
    next: ActiveFocusSession,
    status: GroupRoomFocusStatus,
    eventType: 'start' | 'pause' | 'resume' | 'break' | 'update' = 'update',
    now = Date.now(),
  ) => {
    const elapsedSeconds = getFocusedSeconds({
      accumulatedMilliseconds: next.focusedMilliseconds,
      startedAtMilliseconds: next.focusSegmentStartedAt,
      plannedSeconds: next.plannedSeconds,
      mode: next.mode,
      phase: next.phase,
    }, now);
    const currentRoomCtx = activeRoomContextRef.current;
    const contexts = [
      ...(currentRoomCtx ? [currentRoomCtx] : []),
      ...getGroupRoomFocusContexts(),
    ];
    const uniqueContexts = Array.from(new Map(
      contexts.map((context) => [context.roomSessionId, context])
    ).values());
    uniqueContexts.forEach((roomFocus) => {
      publishGroupRoomFocus({
        ...roomFocus,
        focusSessionId: next.id,
        subject: next.subject ?? 'General Study',
        status,
        startedAt: next.startedAt,
        elapsedSeconds,
        updatedAt: new Date(now).toISOString(),
      }, eventType);
    });
  }, []);

  const endRoomFocus = useCallback(() => {
    const currentRoomCtx = activeRoomContextRef.current;
    const contexts = [
      ...(currentRoomCtx ? [currentRoomCtx] : []),
      ...getGroupRoomFocusContexts(),
    ];
    const roomSessionIds = Array.from(new Set(contexts.map((context) => context.roomSessionId)));
    roomSessionIds.forEach((roomSessionId) => endGroupRoomFocus(roomSessionId));
    setActiveRoomContext(null);
  }, [setActiveRoomContext]);

  const createRuntime = useCallback((
    setup: FocusSessionSetup,
    now = Date.now(),
    roomFocus?: GroupRoomFocusContext | null,
  ): ActiveFocusSession => {
    const task = setup.selection === 'schedule' ? setup.task : null;
    const subject = task
      ? ('subject' in task ? task.subject || task.category : task.category)
      : setup.selection === 'manual'
        ? setup.tag.trim() || null
        : null;
    const scheduleId = task && 'title' in task ? task.id : null;
    return {
      id: createFocusSessionId(),
      userId,
      startedAt: new Date(now).toISOString(),
      mode: setup.mode,
      sessionType: setup.startInBreak ? 'break' : 'study',
      plannedSeconds: setup.mode === 'stopwatch' ? null : setup.durationMinutes * 60,
      focusedMilliseconds: 0,
      focusSegmentStartedAt: setup.startInBreak ? null : now,
      phase: setup.startInBreak ? 'break' : 'focus',
      resumePhase: null,
      breakElapsedMilliseconds: 0,
      breakStartedAt: setup.startInBreak ? now : null,
      breakDurationSeconds: (storeState.settings?.shortBreakMinutes ?? 5) * 60,
      subject,
      topic: getTaskTitle(task),
      taskId: task?.id ?? setup.scheduleOccurrenceId ?? null,
      scheduleId,
      scheduleOccurrenceId: setup.scheduleOccurrenceId ?? null,
      schedulePlannedSeconds: setup.scheduleOccurrenceId && task && 'title' in task
        ? getSchedulePlanDurationSeconds(task)
        : null,
      task,
      groupId: roomFocus?.groupId ?? activeRoomContextRef.current?.groupId ?? null,
      sessionLabel: setup.startInBreak
        ? 'Smart Break'
        : setup.mode === 'pomodoro'
          ? 'Pomodoro'
          : `${setup.durationMinutes}-minute Focus`,
      endRequested: false,
    };
  }, [storeState.settings?.shortBreakMinutes, userId]);

  const completeSession = useCallback(async (
    value: ActiveFocusSession,
    status: SessionStatus,
    existingRecord?: CompletionRecord,
    callbacks?: CompleteCallbacks,
  ) => {
    if (finalizing.current) return;
    finalizing.current = true;
    setIsFinalizing(true);
    setSaveError('');
    const now = Date.now();
    const focusedSeconds = existingRecord?.focusedSeconds ?? getFocusedSeconds({
      accumulatedMilliseconds: value.focusedMilliseconds,
      startedAtMilliseconds: value.focusSegmentStartedAt,
      plannedSeconds: value.plannedSeconds,
      mode: value.mode,
      phase: value.phase,
    }, now);
    if (focusedSeconds <= 0) {
      finalizing.current = false;
      setIsFinalizing(false);
      return;
    }

    const endedAt = existingRecord?.endedAt ?? new Date(now).toISOString();
    const dateStr = existingRecord?.date ?? dayKey(new Date(endedAt));
    const sessionType: FocusSessionCategory = existingRecord?.sessionType ?? value.sessionType ?? 'study';
    const record: CompletionRecord = existingRecord ?? {
      id: value.id,
      sessionId: value.id,
      ...(value.userId ? { userId: value.userId } : {}),
      startedAt: value.startedAt,
      endedAt,
      completedAt: endedAt,
      date: dateStr,
      focusedSeconds,
      actualSeconds: focusedSeconds,
      plannedSeconds: value.plannedSeconds,
      ...(value.plannedSeconds === null ? {} : { plannedMinutes: value.plannedSeconds / 60 }),
      mode: value.mode,
      sessionType,
      ...(value.subject ? { subject: value.subject } : {}),
      ...(value.topic ? { topic: value.topic } : {}),
      ...(value.taskId ? { taskId: value.taskId } : {}),
      ...(value.scheduleId ? { scheduleId: value.scheduleId } : {}),
      ...(value.scheduleOccurrenceId ? { scheduleOccurrenceId: value.scheduleOccurrenceId } : {}),
      ...(value.groupId ? { groupId: value.groupId } : {}),
      minutes: focusedSeconds / 60,
      status,
    };
    const pendingRuntime: ActiveFocusSession = {
      ...value,
      focusedMilliseconds: focusedSeconds * 1000,
      focusSegmentStartedAt: null,
      phase: 'paused',
      resumePhase: 'focus',
      breakStartedAt: null,
      endRequested: false,
      pendingRecord: record,
    };
    commitSession(pendingRuntime);

    let groupSyncWarning: string | undefined;
    const occurrenceId = value.scheduleOccurrenceId;
    const studySecondsMap = storeState.plannerTaskStudySeconds ?? {};
    const scheduleCompletionsMap = storeState.plannerScheduleCompletions ?? {};
    const existingOccurrenceSeconds = occurrenceId
      ? studySecondsMap[occurrenceId] ?? 0
      : 0;
    const scheduleAlreadyComplete = Boolean(occurrenceId &&
      (scheduleCompletionsMap[occurrenceId] ||
        existingOccurrenceSeconds >= (value.schedulePlannedSeconds ?? Number.POSITIVE_INFINITY)));
    const completesScheduleOccurrence = Boolean(
      sessionType === 'study' &&
      occurrenceId &&
      !scheduleAlreadyComplete &&
      value.schedulePlannedSeconds !== null &&
      value.schedulePlannedSeconds !== undefined &&
      value.schedulePlannedSeconds > 0 &&
      existingOccurrenceSeconds + focusedSeconds >= value.schedulePlannedSeconds
    );
    try {
      await persistSession(pendingRuntime);
      await appendFocusHistory(
        getUserScopedStorageKey(FOCUS_STUDY_HISTORY_KEY, value.userId),
        record,
      );
      dispatch({ type: 'upsertFocusHistory', record });

      dispatch({
        type: 'recordFocusStudy',
        id: record.sessionId,
        date: dateStr,
        taskId: record.taskId ?? null,
        seconds: record.focusedSeconds,
        taskTitle: record.topic,
        category: record.subject,
        plannedMinutes: record.plannedSeconds === null ? undefined : record.plannedSeconds / 60,
        scheduleOccurrenceId: value.scheduleOccurrenceId ?? undefined,
        schedulePlannedSeconds: value.schedulePlannedSeconds ?? undefined,
        status: record.status,
        sessionType,
      });

      if (value.userId && value.groupId) {
        try {
          const activity = {
            userId: value.userId,
            eventId: record.sessionId,
            activityType: 'focus_session' as const,
            taskId: record.taskId,
            subject: record.subject,
            actualSeconds: record.focusedSeconds,
            status: record.status,
            occurredAt: record.endedAt,
            startedAt: record.startedAt,
            endedAt: record.endedAt,
            plannedSeconds: record.plannedSeconds,
            mode: record.mode,
            scheduleId: record.scheduleId,
            scheduleOccurrenceId: record.scheduleOccurrenceId,
          };
          const groupIds = joinedGroups.length ? joinedGroups.map((group) => group.id) : [value.groupId];
          const syncResult = await syncStudyMemberActivityWithRetry(activity, groupIds);
          const syncFailures = [...syncResult.failures];
          if (completesScheduleOccurrence && value.task && 'title' in value.task && occurrenceId) {
            const completionResult = await syncStudyMemberActivityWithRetry({
              userId: value.userId,
              eventId: `${occurrenceId}-completed`,
              activityType: 'planner_task_completed',
              taskId: occurrenceId,
              subject: value.task.subject || value.task.category,
              actualSeconds: 0,
              occurredAt: record.endedAt,
              scheduleId: value.task.id,
              scheduleOccurrenceId: occurrenceId,
            }, groupIds);
            syncFailures.push(...completionResult.failures);
          }
          if (syncFailures.length) {
            groupSyncWarning = syncFailures.map((failure) => `${failure.groupId}: ${failure.message}`).join(' ');
            console.warn('Focus session group activity could not be synchronized:', syncFailures);
          }
        } catch (error) {
          groupSyncWarning = error instanceof Error ? error.message : 'Group activity could not be synchronized.';
          console.warn('Focus session group activity could not be synchronized:', error);
        }
      }

      if (status === 'completed' && sessionType === 'study' && !callbacks?.onCompleted && !completionHandlerRef.current) {
        const focusLabel = record.topic || record.subject || 'Focus session';
        dispatch({
          type: 'notify',
          notif: {
            id: `focus-complete-${record.sessionId}`,
            title: 'Focus session completed',
            body: `${focusLabel}: ${Math.max(1, Math.round(record.focusedSeconds / 60))}m logged.`,
            at: Date.now(),
            kind: 'focus',
            read: false,
            ...(record.scheduleId || record.taskId
              ? { plannerItemId: record.scheduleId ?? record.taskId, taskId: record.taskId }
              : {}),
          },
        });
      }

      await persistSession(null);
      if (!mountedRef.current) return;
      commitSession(null);
      setEndConfirmationVisible(false);
      setEarlyExitConfirmationVisible(false);
      endRoomFocus();

      const payload: FocusCompletionPayload = {
        session: record,
        message: status === 'completed'
          ? randomMessage(PRAISE_MESSAGES)
          : randomMessage(EARLY_PRAISE_MESSAGES),
        ...(groupSyncWarning ? { groupSyncWarning } : {}),
      };
      if (callbacks?.onCompleted) {
        callbacks.onCompleted(payload);
      } else if (completionHandlerRef.current) {
        completionHandlerRef.current(payload);
      } else {
        onNavigateCompletionRef.current?.(payload);
      }
    } catch (error) {
      console.error('Focus session could not be saved:', error);
      if (mountedRef.current) {
        setSaveError(error instanceof Error ? error.message : 'Focus session could not be saved.');
      }
    } finally {
      finalizing.current = false;
      if (mountedRef.current) setIsFinalizing(false);
    }
  }, [
    commitSession,
    dispatch,
    endRoomFocus,
    joinedGroups,
    persistSession,
    storeState.plannerScheduleCompletions,
    storeState.plannerTaskStudySeconds,
  ]);

  const discardSession = useCallback(async (value: ActiveFocusSession, onDiscarded?: () => void) => {
    setSaveError('');
    commitSession(value);
    try {
      await persistSession(null);
      if (!mountedRef.current) return;
      commitSession(null);
      setEndConfirmationVisible(false);
      setEarlyExitConfirmationVisible(false);
      setResumeAfterEarlyExit(false);
      endRoomFocus();
      onDiscarded?.();
    } catch (error) {
      console.error('Focus session could not be discarded:', error);
      if (mountedRef.current) {
        setSaveError(error instanceof Error ? error.message : 'Focus session could not be discarded.');
      }
    }
  }, [commitSession, endRoomFocus, persistSession]);

  const requestEndSession = useCallback((now = Date.now(), callbacks?: CompleteCallbacks) => {
    const current = sessionRef.current;
    if (!current || current.pendingRecord || finalizing.current) return;
    const focusedMilliseconds = getFocusedMilliseconds({
      accumulatedMilliseconds: current.focusedMilliseconds,
      startedAtMilliseconds: current.focusSegmentStartedAt,
      plannedSeconds: current.plannedSeconds,
      mode: current.mode,
      phase: current.phase,
    }, now);
    const focusedSeconds = Math.floor(focusedMilliseconds / 1000);
    if (
      current.phase === 'focus' &&
      current.mode !== 'stopwatch' &&
      current.plannedSeconds !== null &&
      focusedSeconds >= current.plannedSeconds
    ) {
      void completeSession({
        ...current,
        focusedMilliseconds: current.plannedSeconds * 1000,
        focusSegmentStartedAt: null,
        phase: 'paused',
        resumePhase: 'focus',
      }, 'completed', undefined, callbacks);
      return;
    }
    if (!shouldPromptToSaveFocusSession(focusedSeconds)) {
      const wasRunning = current.phase === 'focus' || current.phase === 'break';
      const frozen: ActiveFocusSession = {
        ...current,
        focusedMilliseconds,
        focusSegmentStartedAt: null,
        phase: 'paused',
        resumePhase: current.phase === 'break' || current.resumePhase === 'break' ? 'break' : 'focus',
        breakElapsedMilliseconds: current.phase === 'break' && current.breakStartedAt !== null
          ? current.breakElapsedMilliseconds + Math.max(0, now - current.breakStartedAt)
          : current.breakElapsedMilliseconds,
        breakStartedAt: null,
      };
      commitSession(frozen);
      setEndConfirmationVisible(false);
      setEarlyExitConfirmationVisible(true);
      setResumeAfterEarlyExit(wasRunning);
      setSaveError('');
      if (wasRunning) publishRoomUpdate(frozen, 'paused', 'pause', now);
      void persistSession(frozen).catch((error: unknown) => {
        console.error('Focus session state could not be saved:', error);
        setSaveError(error instanceof Error ? error.message : 'Focus session state could not be saved.');
      });
      return;
    }

    const wasRunning = current.phase === 'focus' || current.phase === 'break';
    const breakElapsed = current.phase === 'break' && current.breakStartedAt !== null
      ? current.breakElapsedMilliseconds + Math.max(0, now - current.breakStartedAt)
      : current.breakElapsedMilliseconds;
    const frozen: ActiveFocusSession = {
      ...current,
      focusedMilliseconds,
      focusSegmentStartedAt: null,
      phase: 'paused',
      resumePhase: current.phase === 'break' || current.resumePhase === 'break' ? 'break' : 'focus',
      breakElapsedMilliseconds: breakElapsed,
      breakStartedAt: null,
      endRequested: true,
    };
    commitSession(frozen);
    setEndConfirmationVisible(true);
    setResumeAfterEndConfirmation(wasRunning);
    setSaveError('');
    if (wasRunning) publishRoomUpdate(frozen, 'paused', 'pause', now);
    void persistSession(frozen).catch((error: unknown) => {
      console.error('Focus session state could not be saved:', error);
      setSaveError(error instanceof Error ? error.message : 'Focus session state could not be saved.');
    });
  }, [commitSession, completeSession, persistSession, publishRoomUpdate]);

  const startSession = useCallback((
    setup: FocusSessionSetup,
    roomFocus?: GroupRoomFocusContext | null,
  ): ActiveFocusSession | null => {
    if (!isValidFocusSessionSetup(setup)) {
      setSaveError('This focus session setup is invalid. Please choose the duration again.');
      return null;
    }
    if (roomFocus) setActiveRoomContext(roomFocus);
    const now = Date.now();
    const next = createRuntime(setup, now, roomFocus);
    commitSession(next);
    setEndConfirmationVisible(false);
    setEarlyExitConfirmationVisible(false);
    setResumeAfterEarlyExit(false);
    setSaveError('');
    void persistSession(next).catch((error: unknown) => {
      console.error('Active focus session could not be persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Active focus session could not be persisted.');
    });
    publishRoomUpdate(
      next,
      setup.startInBreak ? 'break' : 'focusing',
      setup.startInBreak ? 'break' : 'start',
      now,
    );
    return next;
  }, [commitSession, createRuntime, persistSession, publishRoomUpdate]);

  const togglePause = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.endRequested || current.pendingRecord) return;
    const now = Date.now();
    let next: ActiveFocusSession;
    let status: GroupRoomFocusStatus;
    let eventType: 'pause' | 'resume';

    if (current.phase === 'paused') {
      if (current.resumePhase === 'break') {
        next = {
          ...current,
          phase: 'break',
          resumePhase: null,
          breakStartedAt: now,
        };
        status = 'break';
      } else {
        next = {
          ...current,
          phase: 'focus',
          resumePhase: null,
          focusSegmentStartedAt: now,
        };
        status = 'focusing';
      }
      eventType = 'resume';
    } else if (current.phase === 'break') {
      next = {
        ...current,
        phase: 'paused',
        resumePhase: 'break',
        breakElapsedMilliseconds: current.breakElapsedMilliseconds +
          Math.max(0, now - (current.breakStartedAt ?? now)),
        breakStartedAt: null,
      };
      status = 'paused';
      eventType = 'pause';
    } else {
      next = {
        ...current,
        focusedMilliseconds: getFocusedMilliseconds({
          accumulatedMilliseconds: current.focusedMilliseconds,
          startedAtMilliseconds: current.focusSegmentStartedAt,
          plannedSeconds: current.plannedSeconds,
          mode: current.mode,
          phase: current.phase,
        }, now),
        phase: 'paused',
        resumePhase: 'focus',
        focusSegmentStartedAt: null,
      };
      status = 'paused';
      eventType = 'pause';
    }

    commitSession(next);
    void persistSession(next).catch((error: unknown) => {
      console.error('Focus session state could not be persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Focus session state could not be persisted.');
    });
    publishRoomUpdate(next, status, eventType, now);
  }, [commitSession, persistSession, publishRoomUpdate]);

  const stayInSession = useCallback(() => {
    const shouldResume = resumeAfterEarlyExit;
    setEarlyExitConfirmationVisible(false);
    setResumeAfterEarlyExit(false);
    if (shouldResume) togglePause();
  }, [resumeAfterEarlyExit, togglePause]);

  const cancelEndSession = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.pendingRecord || finalizing.current) {
      setEndConfirmationVisible(false);
      setResumeAfterEndConfirmation(false);
      return;
    }
    const now = Date.now();
    const shouldResume = resumeAfterEndConfirmation;
    const targetPhase: SessionPhase = shouldResume
      ? (current.resumePhase === 'break' ? 'break' : 'focus')
      : 'paused';
    const next: ActiveFocusSession = {
      ...current,
      phase: targetPhase,
      resumePhase: shouldResume ? null : current.resumePhase,
      focusSegmentStartedAt: targetPhase === 'focus' ? now : null,
      breakStartedAt: targetPhase === 'break' ? now : null,
      endRequested: false,
    };
    commitSession(next);
    setEndConfirmationVisible(false);
    setResumeAfterEndConfirmation(false);
    setSaveError('');
    void persistSession(next).catch((error: unknown) => {
      console.error('Focus session state could not be persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Focus session state could not be persisted.');
    });
    if (shouldResume) {
      publishRoomUpdate(
        next,
        targetPhase === 'break' ? 'break' : 'focusing',
        'resume',
        now,
      );
    }
  }, [commitSession, persistSession, publishRoomUpdate, resumeAfterEndConfirmation]);

  const toggleBreak = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.endRequested || current.pendingRecord) return;
    const now = Date.now();
    let next: ActiveFocusSession;
    if (current.phase === 'break' || (current.phase === 'paused' && current.resumePhase === 'break')) {
      next = {
        ...current,
        phase: 'focus',
        resumePhase: null,
        breakElapsedMilliseconds: 0,
        breakStartedAt: null,
        focusSegmentStartedAt: now,
      };
      publishRoomUpdate(next, 'focusing', 'resume', now);
    } else {
      const focusMilliseconds = getFocusedMilliseconds({
        accumulatedMilliseconds: current.focusedMilliseconds,
        startedAtMilliseconds: current.focusSegmentStartedAt,
        plannedSeconds: current.plannedSeconds,
        mode: current.mode,
        phase: current.phase,
      }, now);
      next = {
        ...current,
        focusedMilliseconds: focusMilliseconds,
        phase: 'break',
        resumePhase: null,
        focusSegmentStartedAt: null,
        breakElapsedMilliseconds: 0,
        breakStartedAt: now,
        breakDurationSeconds: (current.mode === 'pomodoro'
          ? storeState.settings?.longBreakMinutes ?? 15
          : storeState.settings?.shortBreakMinutes ?? 5) * 60,
      };
      publishRoomUpdate(next, 'break', 'break', now);
    }
    commitSession(next);
    void persistSession(next).catch((error: unknown) => {
      console.error('Focus session state could not be persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Focus session state could not be persisted.');
    });
  }, [commitSession, persistSession, publishRoomUpdate, storeState.settings?.longBreakMinutes, storeState.settings?.shortBreakMinutes]);

  const resetSession = useCallback(() => {
    const current = sessionRef.current;
    if (!current || finalizing.current) return;
    const next = createRuntime({
      mode: 'timer',
      durationMinutes: storeState.settings?.focusDurationMinutes ?? 25,
      selection: current.task ? 'schedule' : current.subject ? 'manual' : null,
      tag: current.subject ?? '',
      task: current.task,
      ...(current.scheduleOccurrenceId ? { scheduleOccurrenceId: current.scheduleOccurrenceId } : {}),
    });
    commitSession(next);
    setSaveError('');
    setEndConfirmationVisible(false);
    void persistSession(next).catch((error: unknown) => {
      console.error('Reset focus session could not be persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Reset focus session could not be persisted.');
    });
    publishRoomUpdate(next, 'focusing', 'start');
  }, [commitSession, createRuntime, persistSession, publishRoomUpdate, storeState.settings?.focusDurationMinutes]);

  const updateSessionSubject = useCallback((subject: string) => {
    const current = sessionRef.current;
    if (!current || current.endRequested || current.pendingRecord) return;
    const next: ActiveFocusSession = {
      ...current,
      subject: subject === 'No subject selected' ? null : subject,
      ...(current.taskId ? {} : { topic: null }),
    };
    commitSession(next);
    void persistSession(next).catch((error: unknown) => {
      console.error('Focus session subject could not be persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Focus session subject could not be persisted.');
    });
  }, [commitSession, persistSession]);

  const advanceSession = useCallback((now = Date.now()) => {
    const current = sessionRef.current;
    if (!current || current.endRequested || current.pendingRecord) return;
    if (current.phase === 'break') {
      const elapsed = current.breakElapsedMilliseconds +
        Math.max(0, now - (current.breakStartedAt ?? now));
      if (elapsed >= (current.breakDurationSeconds ?? breakSeconds) * 1000) {
        const next: ActiveFocusSession = {
          ...current,
          phase: storeState.settings?.focusAutoStartNextSession !== false ? 'focus' : 'break',
          resumePhase: null,
          breakElapsedMilliseconds: storeState.settings?.focusAutoStartNextSession !== false
            ? 0
            : (current.breakDurationSeconds ?? breakSeconds) * 1000,
          breakStartedAt: null,
          focusSegmentStartedAt: storeState.settings?.focusAutoStartNextSession !== false ? now : null,
        };
        commitSession(next);
        void persistSession(next).catch((error: unknown) => {
          console.error('Focus session state could not be persisted:', error);
          setSaveError(error instanceof Error ? error.message : 'Focus session state could not be persisted.');
        });
        publishRoomUpdate(
          next,
          storeState.settings?.focusAutoStartNextSession !== false ? 'focusing' : 'paused',
          storeState.settings?.focusAutoStartNextSession !== false ? 'resume' : 'pause',
          now,
        );
      }
      return;
    }
    if (current.phase !== 'focus' || current.mode === 'stopwatch' || current.plannedSeconds === null) return;
    const focusedSeconds = getFocusedSeconds({
      accumulatedMilliseconds: current.focusedMilliseconds,
      startedAtMilliseconds: current.focusSegmentStartedAt,
      plannedSeconds: current.plannedSeconds,
      mode: current.mode,
      phase: current.phase,
    }, now);
    if (focusedSeconds >= current.plannedSeconds) {
      void completeSession({
        ...current,
        focusedMilliseconds: current.plannedSeconds * 1000,
        focusSegmentStartedAt: null,
        phase: 'paused',
        resumePhase: 'focus',
      }, 'completed');
    }
  }, [breakSeconds, commitSession, completeSession, persistSession, publishRoomUpdate, storeState.settings?.focusAutoStartNextSession]);

  // Hydrate persisted active session at app startup / account switch
  useEffect(() => {
    if (storeState.storageReady === false) return;
    let active = true;
    commitSession(null);
    AsyncStorage.getItem(activeStorageKey).then((raw) => {
      if (!active) return;
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isActiveFocusSession(parsed)) {
        throw new Error('Saved focus session has an invalid format.');
      }
      const restored: ActiveFocusSession = {
        ...parsed,
        sessionType: parsed.sessionType ?? 'study',
        scheduleId: parsed.scheduleId ?? null,
        scheduleOccurrenceId: parsed.scheduleOccurrenceId ?? null,
        schedulePlannedSeconds: parsed.schedulePlannedSeconds ?? null,
        breakDurationSeconds: parsed.breakDurationSeconds ?? (storeState.settings?.shortBreakMinutes ?? 5) * 60,
      };
      commitSession(restored);
      setEndConfirmationVisible(restored.endRequested);
      if (restored.pendingRecord) {
        void completeSession(restored, restored.pendingRecord.status, restored.pendingRecord);
      }
    }).catch((error: unknown) => {
      if (!active) return;
      console.error('Active focus session could not be restored:', error);
      setSaveError(error instanceof Error ? error.message : 'Active focus session could not be restored.');
    }).finally(() => {
      if (!active) return;
      setHydratedStorageKey(activeStorageKey);
    });
    return () => {
      active = false;
    };
  }, [activeStorageKey, commitSession, completeSession, storeState.settings?.shortBreakMinutes, storeState.storageReady]);

  // Global 1-second timer ticker (persists across navigation!)
  useEffect(() => {
    if (
      !session ||
      session.pendingRecord ||
      session.endRequested ||
      session.phase === 'paused'
    ) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      advanceSession(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [advanceSession, session]);

  // Catch up timer on AppState foreground & persist on background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const now = Date.now();
        setClockNow(now);
        advanceSession(now);
      } else if (sessionRef.current) {
        void persistSession(sessionRef.current).catch((error: unknown) => {
          console.error('Active focus session could not be persisted in the background:', error);
          setSaveError(error instanceof Error ? error.message : 'Active focus session could not be persisted.');
        });
      }
    });
    return () => subscription.remove();
  }, [advanceSession, persistSession]);

  // Subscribe to Silent Focus Hall remote controls
  useEffect(() => {
    return subscribeGroupRoomFocusControls((event) => {
      const currentRoomSessionIds = new Set([
        ...(activeRoomContext ? [activeRoomContext.roomSessionId] : []),
        ...getGroupRoomFocusContexts().map((context) => context.roomSessionId),
      ]);
      if (!currentRoomSessionIds.has(event.roomSessionId)) return;
      if (event.type === 'togglePause') togglePause();
      if (event.type === 'end') requestEndSession();
    });
  }, [activeRoomContext, requestEndSession, togglePause]);

  // 15s Group room heartbeat
  useEffect(() => {
    if (!session) return;
    const heartbeat = setInterval(() => {
      const current = sessionRef.current;
      if (!current || current.pendingRecord || current.endRequested) return;
      const status: GroupRoomFocusStatus = current.phase === 'break' ||
        (current.phase === 'paused' && current.resumePhase === 'break')
        ? 'break'
        : current.phase === 'paused'
          ? 'paused'
          : 'focusing';
      publishRoomUpdate(current, status);
    }, 15_000);
    return () => clearInterval(heartbeat);
  }, [publishRoomUpdate, session]);

  const currentSession = session;
  const focusedMilliseconds = currentSession
    ? getFocusedMilliseconds({
      accumulatedMilliseconds: currentSession.focusedMilliseconds,
      startedAtMilliseconds: currentSession.focusSegmentStartedAt,
      plannedSeconds: currentSession.plannedSeconds,
      mode: currentSession.mode,
      phase: currentSession.phase === 'paused' && currentSession.resumePhase === 'break'
        ? 'break'
        : currentSession.phase,
    }, clockNow)
    : 0;
  const isOnBreak = Boolean(
    currentSession?.phase === 'break' ||
    (currentSession?.phase === 'paused' && currentSession?.resumePhase === 'break')
  );
  const breakElapsed = currentSession
    ? currentSession.breakElapsedMilliseconds +
      (currentSession.phase === 'break' && currentSession.breakStartedAt !== null
        ? Math.max(0, clockNow - currentSession.breakStartedAt)
        : 0)
    : 0;
  const secondsRemaining = !currentSession
    ? 0
    : isOnBreak
      ? Math.max(0, (currentSession.breakDurationSeconds ?? breakSeconds) - Math.floor(breakElapsed / 1000))
      : currentSession.mode === 'stopwatch'
        ? Math.floor(focusedMilliseconds / 1000)
        : Math.max(0, (currentSession.plannedSeconds ?? 0) - Math.floor(focusedMilliseconds / 1000));
  const actualFocusedSeconds = currentSession
    ? getFocusedSeconds({
      accumulatedMilliseconds: currentSession.focusedMilliseconds,
      startedAtMilliseconds: currentSession.focusSegmentStartedAt,
      plannedSeconds: currentSession.plannedSeconds,
      mode: currentSession.mode,
      phase: currentSession.phase === 'paused' && currentSession.resumePhase === 'break'
        ? 'break'
        : currentSession.phase,
    }, clockNow)
    : 0;
  const isRunning = Boolean(currentSession && (currentSession.phase === 'focus' || currentSession.phase === 'break'));

  const focusPresenceStatus: GroupRoomFocusStatus | null = currentSession
    ? isOnBreak
      ? 'break'
      : currentSession.phase === 'paused'
        ? 'paused'
        : 'focusing'
    : null;

  const reportPresenceError = useCallback((message: string) => {
    if (!message) {
      setGroupPresenceError('');
      return;
    }
    if (/\b(?:socket|websocket)\s+closed\s*:\s*1000\b/i.test(message) || (/\b1000\b/.test(message) && /closed|normal/i.test(message))) return;
    const classified = classifySyncError(message);
    logStructuredSyncEvent(
      classified.requiresUserAction ? 'error' : 'warn',
      'group_presence_error',
      { category: classified.category, message: classified.message },
      `group_presence:${classified.category}`,
    );
    if (classified.requiresUserAction) {
      setGroupPresenceError(classified.message);
    }
  }, []);

  const activeSilentRoomGroupId = activeRoomContext?.roomId === 'silent-focus'
    ? activeRoomContext.groupId
    : null;
  const groupFocusPresence = useGroupFocusPresence({
    groupIds: joinedGroups
      .map((group) => group.id)
      .filter((groupId) => groupId !== activeSilentRoomGroupId),
    userId,
    activity: currentSession && focusPresenceStatus
      ? {
          sessionId: currentSession.id,
          subject: currentSession.subject ?? 'General Study',
          startedAt: currentSession.startedAt,
          status: focusPresenceStatus,
          elapsedSeconds: actualFocusedSeconds,
        }
      : null,
    onError: reportPresenceError,
  });

  const diagnosticState: RealtimeDiagnosticState = groupFocusPresence?.diagnosticState ?? {
    sessionId: null,
    verifiedUserId: null,
    sessionExists: false,
    authTokenPresent: false,
    activeGroupMembershipMatch: false,
    topic: null,
    subscriptionStatus: 'idle',
    authorizationError: null,
    subscriptionStartedBeforeAuth: false,
  };

  const registerCompletionHandler = useCallback((handler: ((payload: FocusCompletionPayload) => void) | null) => {
    completionHandlerRef.current = handler;
  }, []);

  const value = useMemo<FocusSessionContextValue>(() => ({
    session,
    sessionRef,
    clockNow,
    sessionStorageReady,
    isFinalizing,
    saveError,
    setSaveError,
    endConfirmationVisible,
    setEndConfirmationVisible,
    earlyExitConfirmationVisible,
    setEarlyExitConfirmationVisible,
    resumeAfterEarlyExit,
    joinedGroups,
    joinedGroupsLoading,
    joinedGroupsError,
    groupPresenceError,
    diagnosticState,
    activeRoomContext,
    setActiveRoomContext,
    activeHallContext,
    setActiveHallContext,
    registerHallOpener,
    openActiveHall,
    currentRouteName,
    setCurrentRouteName,
    startSession,
    togglePause,
    toggleBreak,
    resetSession,
    updateSessionSubject,
    requestEndSession,
    completeSession,
    discardSession,
    stayInSession,
    cancelEndSession,
    registerCompletionHandler,
    refreshJoinedGroups,
    actualFocusedSeconds,
    secondsRemaining,
    isOnBreak,
    isRunning,
  }), [
    session,
    clockNow,
    sessionStorageReady,
    isFinalizing,
    saveError,
    endConfirmationVisible,
    earlyExitConfirmationVisible,
    resumeAfterEarlyExit,
    joinedGroups,
    joinedGroupsLoading,
    joinedGroupsError,
    groupPresenceError,
    diagnosticState,
    activeRoomContext,
    activeHallContext,
    registerHallOpener,
    openActiveHall,
    currentRouteName,
    startSession,
    togglePause,
    toggleBreak,
    resetSession,
    updateSessionSubject,
    requestEndSession,
    completeSession,
    discardSession,
    stayInSession,
    cancelEndSession,
    registerCompletionHandler,
    refreshJoinedGroups,
    actualFocusedSeconds,
    secondsRemaining,
    isOnBreak,
    isRunning,
  ]);

  return <FocusSessionCtx.Provider value={value}>{children}</FocusSessionCtx.Provider>;
}
