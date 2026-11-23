import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationAction } from '@react-navigation/native';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import GeminiFocusTimer from '../components/GeminiFocusTimer';
import type { FocusTimerController } from '../components/GeminiFocusTimer';
import { FocusMusicSelection } from '../components/FocusMusicSelection';
import { isAppDrawerOpen } from '../components/Shell';
import { Button, Txt } from '../components/ui';
import { appendFocusHistory } from '../lib/focusHistory';
import {
  getFocusedMilliseconds,
  getFocusedSeconds,
  shouldPromptToSaveFocusSession,
} from '../lib/focusTimerAccounting';
import {
  dayKey,
  getUserScopedStorageKey,
  PlannerScheduleItem,
  PlannerTask,
  useStore,
} from '../lib/store';
import { getSchedulePlanDurationSeconds } from '../lib/planner';
import { useTheme } from '../lib/theme';
import {
  endGroupRoomFocus,
  getGroupRoomFocusContexts,
  publishGroupRoomFocus,
  subscribeGroupRoomFocusControls,
} from '../lib/groupRoomFocusBridge';
import type { GroupRoomFocusStatus } from '../lib/groupRoomFocusBridge';
import { getActiveStudyGroups } from '../lib/groupRooms';
import type { ActiveStudyGroup } from '../lib/groupRooms';
import {
  retryPendingStudyMemberActivities,
  syncStudyMemberActivityWithRetry,
} from '../lib/groupActivitySync';
import { useGroupFocusPresence } from '../lib/groupRoomRealtime';
import type { FocusSessionMode, FocusSessionSetup } from '../components/FocusSessionSetupModal';

const STUDY_HISTORY_KEY = 'study-sakha-focus-history-v1';
const ACTIVE_SESSION_KEY = 'study-sakha-focus-active-session-v1';
const BREAK_SECONDS = 5 * 60;
const PRAISE_MESSAGES = [
  "Outstanding Work! You've made great progress.",
  'A strong session. Keep building on this momentum.',
  'You showed up for your goals. That matters.',
  'Focused effort adds up. Be proud of this step.',
];
const EARLY_PRAISE_MESSAGES = [
  'Good Effort! Your Focus Session Has Been Saved.',
  'You made time for your goal. Keep going when you are ready.',
  'Every focused minute counts. Nice work showing up.',
];

type SessionStatus = 'completed' | 'saved_early';
type SessionPhase = 'focus' | 'break' | 'paused';
type CompletionRecord = {
  id: string;
  sessionId: string;
  userId?: string;
  startedAt: string;
  endedAt: string;
  completedAt: string;
  focusedSeconds: number;
  actualSeconds: number;
  plannedSeconds: number | null;
  plannedMinutes?: number;
  mode: FocusSessionMode;
  subject?: string;
  topic?: string;
  taskId?: string;
  scheduleId?: string;
  scheduleOccurrenceId?: string;
  groupId?: string;
  minutes: number;
  status: SessionStatus;
};

type ActiveFocusSession = {
  id: string;
  userId: string | null;
  startedAt: string;
  mode: FocusSessionMode;
  plannedSeconds: number | null;
  focusedMilliseconds: number;
  focusSegmentStartedAt: number | null;
  phase: SessionPhase;
  resumePhase: 'focus' | 'break' | null;
  breakElapsedMilliseconds: number;
  breakStartedAt: number | null;
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

function isStoredTask(value: unknown): value is PlannerTask | PlannerScheduleItem {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.category !== 'string') return false;
  return (
    (typeof value.label === 'string' && typeof value.targetDate === 'string') ||
    (typeof value.title === 'string' && (value.date === undefined || typeof value.date === 'string'))
  );
}

function isCompletionRecord(value: unknown): value is CompletionRecord {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.sessionId === 'string' &&
    typeof value.startedAt === 'string' &&
    typeof value.endedAt === 'string' &&
    typeof value.completedAt === 'string' &&
    typeof value.focusedSeconds === 'number' &&
    typeof value.actualSeconds === 'number' &&
    (value.plannedSeconds === null || typeof value.plannedSeconds === 'number') &&
    (value.mode === 'timer' || value.mode === 'pomodoro' || value.mode === 'stopwatch') &&
    (value.status === 'completed' || value.status === 'saved_early') &&
    typeof value.minutes === 'number' &&
    (value.scheduleId === undefined || typeof value.scheduleId === 'string') &&
    (value.scheduleOccurrenceId === undefined || typeof value.scheduleOccurrenceId === 'string');
}

function isActiveFocusSession(value: unknown): value is ActiveFocusSession {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    (value.userId === null || typeof value.userId === 'string') &&
    typeof value.startedAt === 'string' &&
    (value.mode === 'timer' || value.mode === 'pomodoro' || value.mode === 'stopwatch') &&
    (value.plannedSeconds === null || typeof value.plannedSeconds === 'number') &&
    typeof value.focusedMilliseconds === 'number' &&
    (value.focusSegmentStartedAt === null || typeof value.focusSegmentStartedAt === 'number') &&
    (value.phase === 'focus' || value.phase === 'break' || value.phase === 'paused') &&
    (value.resumePhase === null || value.resumePhase === 'focus' || value.resumePhase === 'break') &&
    typeof value.breakElapsedMilliseconds === 'number' &&
    (value.breakStartedAt === null || typeof value.breakStartedAt === 'number') &&
    (value.subject === null || typeof value.subject === 'string') &&
    (value.topic === null || typeof value.topic === 'string') &&
    (value.taskId === null || typeof value.taskId === 'string') &&
    (value.scheduleId === undefined || value.scheduleId === null || typeof value.scheduleId === 'string') &&
    (value.scheduleOccurrenceId === undefined || value.scheduleOccurrenceId === null || typeof value.scheduleOccurrenceId === 'string') &&
    (value.schedulePlannedSeconds === undefined || value.schedulePlannedSeconds === null || typeof value.schedulePlannedSeconds === 'number') &&
    (value.task === null || isStoredTask(value.task)) &&
    (value.groupId === null || typeof value.groupId === 'string') &&
    typeof value.sessionLabel === 'string' &&
    typeof value.endRequested === 'boolean' &&
    (value.pendingRecord === undefined || isCompletionRecord(value.pendingRecord));
}

function createSessionId() {
  return `focus-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function randomMessage(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function getTaskTitle(task: PlannerTask | PlannerScheduleItem | null) {
  if (!task) return null;
  return 'label' in task ? task.label : task.title;
}

export default function FocusCenterScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'FocusCenter'>>();
  const { state: storeState, dispatch } = useStore();
  const userId = storeState.user?.id ?? null;
  const activeStorageKey = useMemo(
    () => getUserScopedStorageKey(ACTIVE_SESSION_KEY, userId),
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
  const [saveError, setSaveError] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [musicSelectionVisible, setMusicSelectionVisible] = useState(false);
  const [selectedMusicId, setSelectedMusicId] = useState('pure_cosmic_waves');
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [groupSelectModalVisible, setGroupSelectModalVisible] = useState(false);
  const [joinedGroups, setJoinedGroups] = useState<ActiveStudyGroup[]>([]);
  const [joinedGroupsLoading, setJoinedGroupsLoading] = useState(Boolean(userId));
  const [joinedGroupsError, setJoinedGroupsError] = useState('');
  const [groupPresenceError, setGroupPresenceError] = useState('');
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState('Study Group');
  const [selectedTheme, setSelectedTheme] = useState('Starry Sky');
  const [blockedAppsCount, setBlockedAppsCount] = useState(5);

  const endNavigationAction = useRef<NavigationAction | null>(null);
  const finalizing = useRef(false);
  const persistenceQueue = useRef<Promise<void>>(Promise.resolve());
  const activeStateHydrated = useRef(false);
  const returningToOrigin = useRef(false);
  const sessionOrigin = useRef<'DashboardRoot' | 'Groups'>(
    route.params?.roomFocus ? 'Groups' : 'DashboardRoot'
  );

  useFocusEffect(useCallback(() => {
    if (!userId) return undefined;
    let active = true;
    void getActiveStudyGroups(userId).then((groups) => {
      if (active) {
        setJoinedGroups(groups);
        setJoinedGroupsError('');
        setJoinedGroupsLoading(false);
      }
    }).catch((error: unknown) => {
      if (active) {
        setJoinedGroupsError(error instanceof Error ? error.message : 'Could not load your joined groups.');
        setJoinedGroupsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [userId]));

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
    return () => {
      active = false;
      subscription.remove();
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
    const contexts = [
      ...(route.params?.roomFocus ? [route.params.roomFocus] : []),
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
  }, [route.params]);

  const endRoomFocus = useCallback(() => {
    const contexts = [
      ...(route.params?.roomFocus ? [route.params.roomFocus] : []),
      ...getGroupRoomFocusContexts(),
    ];
    const roomSessionIds = Array.from(new Set(contexts.map((context) => context.roomSessionId)));
    roomSessionIds.forEach((roomSessionId) => endGroupRoomFocus(roomSessionId));
    if (route.params?.roomFocus) navigation.setParams({ roomFocus: undefined });
  }, [navigation, route.params]);

  const createRuntime = useCallback((
    setup: FocusSessionSetup,
    now = Date.now(),
  ): ActiveFocusSession => {
    const task = setup.selection === 'schedule' ? setup.task : null;
    const subject = task
      ? ('subject' in task ? task.subject || task.category : task.category)
      : setup.selection === 'manual'
        ? setup.tag.trim() || null
        : null;
    return {
      id: createSessionId(),
      userId,
      startedAt: new Date(now).toISOString(),
      mode: setup.mode,
      plannedSeconds: setup.mode === 'stopwatch' ? null : setup.durationMinutes * 60,
      focusedMilliseconds: 0,
      focusSegmentStartedAt: now,
      phase: 'focus',
      resumePhase: null,
      breakElapsedMilliseconds: 0,
      breakStartedAt: null,
      subject,
      topic: getTaskTitle(task),
      taskId: setup.scheduleOccurrenceId ?? task?.id ?? null,
      scheduleId: setup.scheduleOccurrenceId && task && 'title' in task ? task.id : null,
      scheduleOccurrenceId: setup.scheduleOccurrenceId ?? null,
      schedulePlannedSeconds: setup.scheduleOccurrenceId && task && 'title' in task
        ? getSchedulePlanDurationSeconds(task)
        : null,
      task,
      groupId: route.params?.roomFocus?.groupId ?? null,
      sessionLabel: setup.mode === 'pomodoro'
        ? 'Pomodoro'
        : `${setup.durationMinutes}-minute Focus`,
      endRequested: false,
    };
  }, [route.params?.roomFocus?.groupId, userId]);

  const completeSession = useCallback(async (
    value: ActiveFocusSession,
    status: SessionStatus,
    existingRecord?: CompletionRecord,
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
    const record: CompletionRecord = existingRecord ?? {
      id: value.id,
      sessionId: value.id,
      ...(value.userId ? { userId: value.userId } : {}),
      startedAt: value.startedAt,
      endedAt,
      completedAt: endedAt,
      focusedSeconds,
      actualSeconds: focusedSeconds,
      plannedSeconds: value.plannedSeconds,
      ...(value.plannedSeconds === null ? {} : { plannedMinutes: value.plannedSeconds / 60 }),
      mode: value.mode,
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
    const existingOccurrenceSeconds = occurrenceId
      ? storeState.plannerTaskStudySeconds[occurrenceId] ?? 0
      : 0;
    const scheduleAlreadyComplete = Boolean(occurrenceId &&
      (storeState.plannerScheduleCompletions[occurrenceId] ||
        existingOccurrenceSeconds >= (value.schedulePlannedSeconds ?? Number.POSITIVE_INFINITY)));
    const completesScheduleOccurrence = Boolean(
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
        getUserScopedStorageKey(STUDY_HISTORY_KEY, value.userId),
        record,
      );

      dispatch({
        type: 'recordFocusStudy',
        id: record.sessionId,
        date: dayKey(new Date(record.endedAt)),
        taskId: record.taskId ?? null,
        seconds: record.focusedSeconds,
        taskTitle: record.topic,
        category: record.subject,
        plannedMinutes: record.plannedSeconds === null ? undefined : record.plannedSeconds / 60,
        scheduleOccurrenceId: value.scheduleOccurrenceId ?? undefined,
        schedulePlannedSeconds: value.schedulePlannedSeconds ?? undefined,
      });

      if (value.userId) {
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
          const syncResult = await syncStudyMemberActivityWithRetry(activity);
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
            });
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

      await persistSession(null);
      commitSession(null);
      setEndConfirmationVisible(false);
      setEarlyExitConfirmationVisible(false);
      setMenuModalVisible(false);
      endRoomFocus();
      navigation.replace('FocusCompletion', {
        session: record,
        message: status === 'completed'
          ? randomMessage(PRAISE_MESSAGES)
          : randomMessage(EARLY_PRAISE_MESSAGES),
        ...(groupSyncWarning ? { groupSyncWarning } : {}),
      });
    } catch (error) {
      console.error('Focus session could not be saved:', error);
      setSaveError(error instanceof Error ? error.message : 'Focus session could not be saved.');
    } finally {
      finalizing.current = false;
      setIsFinalizing(false);
    }
  }, [
    commitSession,
    dispatch,
    endRoomFocus,
    navigation,
    persistSession,
    storeState.plannerScheduleCompletions,
    storeState.plannerTaskStudySeconds,
  ]);

  const discardSession = useCallback(async (value: ActiveFocusSession) => {
    setSaveError('');
    returningToOrigin.current = true;
    commitSession(value);
    try {
      await persistSession(null);
      commitSession(null);
      setEndConfirmationVisible(false);
      setEarlyExitConfirmationVisible(false);
      setResumeAfterEarlyExit(false);
      endRoomFocus();
      const pendingAction = endNavigationAction.current;
      endNavigationAction.current = null;
      if (pendingAction) {
        navigation.dispatch(pendingAction);
      } else {
        navigation.popTo(value.groupId ? 'Groups' : sessionOrigin.current);
      }
    } catch (error) {
      returningToOrigin.current = false;
      console.error('Focus session could not be discarded:', error);
      setSaveError(error instanceof Error ? error.message : 'Focus session could not be discarded.');
    }
  }, [commitSession, endRoomFocus, navigation, persistSession]);

  const requestEndSession = useCallback((now = Date.now()) => {
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
      }, 'completed');
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

    const breakElapsed = current.phase === 'break' && current.breakStartedAt !== null
      ? current.breakElapsedMilliseconds + Math.max(0, now - current.breakStartedAt)
      : current.breakElapsedMilliseconds;
    const frozen: ActiveFocusSession = {
      ...current,
      focusedMilliseconds: focusedSeconds * 1000,
      focusSegmentStartedAt: null,
      phase: 'paused',
      resumePhase: current.phase === 'break' || current.resumePhase === 'break' ? 'break' : 'focus',
      breakElapsedMilliseconds: breakElapsed,
      breakStartedAt: null,
      endRequested: true,
    };
    commitSession(frozen);
    setEndConfirmationVisible(true);
    setSaveError('');
    void persistSession(frozen).catch((error: unknown) => {
      console.error('Focus session state could not be saved:', error);
      setSaveError(error instanceof Error ? error.message : 'Focus session state could not be saved.');
    });
  }, [commitSession, completeSession, persistSession, publishRoomUpdate]);

  const startSession = useCallback((setup: FocusSessionSetup) => {
    const now = Date.now();
    const next = createRuntime(setup, now);
    sessionOrigin.current = next.groupId ? 'Groups' : 'DashboardRoot';
    returningToOrigin.current = false;
    commitSession(next);
    setEndConfirmationVisible(false);
    setEarlyExitConfirmationVisible(false);
    setResumeAfterEarlyExit(false);
    setSaveError('');
    void persistSession(next).catch((error: unknown) => {
      console.error('Active focus session could not be persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Active focus session could not be persisted.');
    });
    publishRoomUpdate(next, 'focusing', 'start', now);
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
    endNavigationAction.current = null;
    setEarlyExitConfirmationVisible(false);
    setResumeAfterEarlyExit(false);
    if (shouldResume) togglePause();
  }, [resumeAfterEarlyExit, togglePause]);

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
      };
      publishRoomUpdate(next, 'break', 'break', now);
    }
    commitSession(next);
    void persistSession(next).catch((error: unknown) => {
      console.error('Focus session state could not be persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Focus session state could not be persisted.');
    });
  }, [commitSession, persistSession, publishRoomUpdate]);

  const selectPreset = useCallback((label: string, minutes: number) => {
    const current = sessionRef.current;
    if (!current || current.endRequested || current.pendingRecord) return;
    const now = Date.now();
    const focusedMilliseconds = getFocusedMilliseconds({
      accumulatedMilliseconds: current.focusedMilliseconds,
      startedAtMilliseconds: current.focusSegmentStartedAt,
      plannedSeconds: current.plannedSeconds,
      mode: current.mode,
      phase: current.phase,
    }, now);
    const next: ActiveFocusSession = {
      ...current,
      mode: 'timer',
      plannedSeconds: Math.floor(focusedMilliseconds / 1000) + minutes * 60,
      focusedMilliseconds,
      focusSegmentStartedAt: now,
      phase: 'focus',
      resumePhase: null,
      breakElapsedMilliseconds: 0,
      breakStartedAt: null,
      sessionLabel: label,
    };
    commitSession(next);
    void persistSession(next).catch((error: unknown) => {
      console.error('Focus session state could not be persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Focus session state could not be persisted.');
    });
    publishRoomUpdate(next, 'focusing', 'resume', now);
  }, [commitSession, persistSession, publishRoomUpdate]);

  const resetSession = useCallback(() => {
    const current = sessionRef.current;
    if (!current || finalizing.current) return;
    const next = createRuntime({
      mode: 'timer',
      durationMinutes: 25,
      selection: current.task ? 'schedule' : current.subject ? 'manual' : null,
      tag: current.subject ?? '',
      task: current.task,
    });
    commitSession(next);
    setSaveError('');
    setEndConfirmationVisible(false);
    void persistSession(next).catch((error: unknown) => {
      console.error('Reset focus session could not be persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Reset focus session could not be persisted.');
    });
    publishRoomUpdate(next, 'focusing', 'start');
  }, [commitSession, createRuntime, persistSession, publishRoomUpdate]);

  const updateSessionSubject = useCallback((subject: string) => {
    const current = sessionRef.current;
    if (!current || current.endRequested || current.pendingRecord) return;
    const next: ActiveFocusSession = {
      ...current,
      subject: subject === 'No subject selected' ? null : subject,
      topic: null,
      taskId: null,
      task: null,
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
      if (elapsed >= BREAK_SECONDS * 1000) {
        const next: ActiveFocusSession = {
          ...current,
          phase: 'focus',
          resumePhase: null,
          breakElapsedMilliseconds: 0,
          breakStartedAt: null,
          focusSegmentStartedAt: now,
        };
        commitSession(next);
        void persistSession(next).catch((error: unknown) => {
          console.error('Focus session state could not be persisted:', error);
          setSaveError(error instanceof Error ? error.message : 'Focus session state could not be persisted.');
        });
        publishRoomUpdate(next, 'focusing', 'resume', now);
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
  }, [commitSession, completeSession, persistSession, publishRoomUpdate]);

  useEffect(() => {
    let active = true;
    activeStateHydrated.current = false;
    AsyncStorage.getItem(activeStorageKey).then((raw) => {
      if (!active) return;
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isActiveFocusSession(parsed)) {
        throw new Error('Saved focus session has an invalid format.');
      }
      const restored: ActiveFocusSession = {
        ...parsed,
        scheduleId: parsed.scheduleId ?? null,
        scheduleOccurrenceId: parsed.scheduleOccurrenceId ?? null,
        schedulePlannedSeconds: parsed.schedulePlannedSeconds ?? null,
      };
      if (restored.groupId) sessionOrigin.current = 'Groups';
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
      activeStateHydrated.current = true;
      setHydratedStorageKey(activeStorageKey);
    });
    return () => {
      active = false;
    };
  }, [activeStorageKey, commitSession, completeSession]);

  useEffect(() => {
    if (!sessionStorageReady || !route.params?.focusSession) return;
    if (!sessionRef.current) startSession(route.params.focusSession);
    navigation.setParams({ focusSession: undefined });
  }, [navigation, route.params?.focusSession, sessionStorageReady, startSession]);

  useEffect(() => {
    if (
      !sessionStorageReady ||
      sessionRef.current ||
      route.params?.focusSession ||
      isFinalizing ||
      returningToOrigin.current
    ) return;
    navigation.popTo(route.params?.roomFocus ? 'Groups' : sessionOrigin.current);
  }, [isFinalizing, navigation, route.params?.focusSession, route.params?.roomFocus, session, sessionStorageReady]);

  useEffect(() => {
    const current = sessionRef.current;
    if (current?.endRequested) setEndConfirmationVisible(true);
  }, [session]);

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

  useEffect(() => {
    const roomFocus = route.params?.roomFocus;
    return subscribeGroupRoomFocusControls((event) => {
      const currentRoomSessionIds = new Set([
        ...(roomFocus ? [roomFocus.roomSessionId] : []),
        ...getGroupRoomFocusContexts().map((context) => context.roomSessionId),
      ]);
      if (!currentRoomSessionIds.has(event.roomSessionId)) return;
      if (event.type === 'togglePause') togglePause();
      if (event.type === 'end') requestEndSession();
    });
  }, [requestEndSession, route.params?.roomFocus, togglePause]);

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

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (!sessionRef.current || sessionRef.current.pendingRecord || !activeStateHydrated.current) return;
    event.preventDefault();
    endNavigationAction.current = event.data.action;
    requestEndSession();
  }), [navigation, requestEndSession]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isAppDrawerOpen(navigation)) return false;
      if (tagModalVisible) {
        setTagModalVisible(false);
        return true;
      }
      if (musicSelectionVisible) {
        setMusicSelectionVisible(false);
        return true;
      }
      if (menuModalVisible) {
        setMenuModalVisible(false);
        return true;
      }
      if (groupSelectModalVisible) {
        setGroupSelectModalVisible(false);
        return true;
      }
      if (sessionRef.current) {
        requestEndSession();
        return true;
      }
      navigation.popTo(route.params?.roomFocus ? 'Groups' : sessionOrigin.current);
      return true;
    });
    return () => subscription.remove();
  }, [groupSelectModalVisible, menuModalVisible, musicSelectionVisible, navigation, requestEndSession, route.params?.roomFocus, tagModalVisible]));

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
  const isOnBreak = currentSession?.phase === 'break' ||
    (currentSession?.phase === 'paused' && currentSession.resumePhase === 'break');
  const breakElapsed = currentSession
    ? currentSession.breakElapsedMilliseconds +
      (currentSession.phase === 'break' && currentSession.breakStartedAt !== null
        ? Math.max(0, clockNow - currentSession.breakStartedAt)
        : 0)
    : 0;
  const secondsRemaining = !currentSession
    ? 0
    : isOnBreak
      ? Math.max(0, BREAK_SECONDS - Math.floor(breakElapsed / 1000))
      : currentSession.mode === 'stopwatch'
        ? Math.floor(focusedMilliseconds / 1000)
        : Math.max(0, (currentSession.plannedSeconds ?? 0) - Math.floor(focusedMilliseconds / 1000));
  const focusTimerController: FocusTimerController | null = currentSession ? {
    totalSeconds: isOnBreak
      ? BREAK_SECONDS
      : currentSession.mode === 'stopwatch'
        ? Math.max(1, secondsRemaining)
        : currentSession.plannedSeconds ?? 0,
    remainingSeconds: secondsRemaining,
    running: currentSession.phase === 'focus' || currentSession.phase === 'break',
    isBreak: Boolean(isOnBreak),
    sessionLabel: currentSession.sessionLabel,
    modeLabel: currentSession.mode.toUpperCase(),
  } : null;
  const activeSubject = currentSession
    ? [currentSession.topic, currentSession.subject].filter(Boolean).join(' · ') || 'No subject selected'
    : '';
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
  const focusPresenceStatus: GroupRoomFocusStatus | null = currentSession
    ? currentSession.phase === 'break' ||
      (currentSession.phase === 'paused' && currentSession.resumePhase === 'break')
      ? 'break'
      : currentSession.phase === 'paused'
        ? 'paused'
        : 'focusing'
    : null;
  const reportPresenceError = useCallback((message: string) => {
    setGroupPresenceError(message);
  }, []);
  const activeSilentRoomGroupId = route.params?.roomFocus?.roomId === 'silent-focus'
    ? route.params.roomFocus.groupId
    : null;
  useGroupFocusPresence({
    groupIds: joinedGroups
      .map((group) => group.id)
      // GroupsScreen already owns this topic for the originating Silent Focus Hall.
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

  const openJoinedGroup = (group: ActiveStudyGroup) => {
    setSelectedGroupName(group.name);
    setGroupSelectModalVisible(false);
    const current = sessionRef.current;
    const currentSeconds = current
      ? getFocusedSeconds({
          accumulatedMilliseconds: current.focusedMilliseconds,
          startedAtMilliseconds: current.focusSegmentStartedAt,
          plannedSeconds: current.plannedSeconds,
          mode: current.mode,
          phase: current.phase === 'paused' && current.resumePhase === 'break'
            ? 'break'
            : current.phase,
        }, clockNow)
      : 0;
    const status: GroupRoomFocusStatus | undefined = current
      ? current.phase === 'break' ||
        (current.phase === 'paused' && current.resumePhase === 'break')
        ? 'break'
        : current.phase === 'paused'
          ? 'paused'
          : 'focusing'
      : undefined;
    navigation.push('Groups', {
      openGroupRoom: {
        groupId: group.id,
        roomId: 'silent-focus',
        ...(current && status ? {
          focusSession: {
            sessionId: current.id,
            subject: current.subject ?? 'General Study',
            startedAt: current.startedAt,
            elapsedSeconds: currentSeconds,
            status,
          },
        } : {}),
      },
    });
  };

  if (currentSession && focusTimerController) {
    return (
      <>
        {groupPresenceError ? (
          <View style={[styles.presenceWarning, { backgroundColor: colors.surfaceAlt, borderColor: colors.danger }]}>
            <Txt size={11} color={colors.danger}>{groupPresenceError}</Txt>
          </View>
        ) : null}
        <GeminiFocusTimer
          timer={focusTimerController}
          subject={activeSubject}
          groupName={route.params?.roomFocus ? selectedGroupName : currentSession.groupId ? selectedGroupName : 'Solo focus'}
          onPause={togglePause}
          onStop={() => requestEndSession()}
          onBreak={toggleBreak}
          onSelectPreset={selectPreset}
          onReset={resetSession}
          onSubjectChange={updateSessionSubject}
          onChooseStudyTag={() => setTagModalVisible(true)}
          onGroupPress={() => setGroupSelectModalVisible(true)}
          onMoreOptions={() => setMenuModalVisible(true)}
        />
        <FocusMusicSelection
          visible={musicSelectionVisible}
          selectedId={selectedMusicId}
          sessionRunning={currentSession.phase === 'focus'}
          onSelect={setSelectedMusicId}
          onClose={() => setMusicSelectionVisible(false)}
        />

        <Modal visible={tagModalVisible} transparent animationType="fade" onRequestClose={() => setTagModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Txt size={18} weight="800">Select Subject Tag</Txt>
                <Pressable accessibilityRole="button" accessibilityLabel="Close subject tags" onPress={() => setTagModalVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              {['History', 'Polity', 'Economy', 'Rajasthan Geography', 'General Science', 'Work'].map((tag) => (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  onPress={() => {
                    updateSessionSubject(tag);
                    setTagModalVisible(false);
                  }}
                  style={[styles.optionRow, { backgroundColor: colors.surfaceAlt }]}
                >
                  <Txt size={14} weight="700">{tag}</Txt>
                  {currentSession.subject === tag ? <Ionicons name="checkmark" size={18} color={colors.blue} /> : null}
                </Pressable>
              ))}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TextInput
                  accessibilityLabel="Custom subject tag"
                  style={[styles.textInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                  placeholder="Add custom tag..."
                  placeholderTextColor={colors.textMuted}
                  value={customTagInput}
                  onChangeText={setCustomTagInput}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const tag = customTagInput.trim();
                    if (!tag) return;
                    updateSessionSubject(tag);
                    setCustomTagInput('');
                    setTagModalVisible(false);
                  }}
                  style={[styles.addButton, { backgroundColor: colors.blue }]}
                >
                  <Txt size={13} weight="700" color="#FFFFFF">Add</Txt>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal animationType="fade" transparent visible={menuModalVisible} onRequestClose={() => setMenuModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Txt size={18} weight="800">Focus Settings</Txt>
                <Pressable accessibilityRole="button" accessibilityLabel="Close focus settings" onPress={() => setMenuModalVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <View style={[styles.menuRow, { backgroundColor: colors.surfaceAlt }]}>
                <View style={styles.menuLabel}>
                  <Ionicons name="musical-notes-outline" size={18} color={colors.blue} />
                  <Txt size={13} weight="700" numberOfLines={1}>
                    {selectedMusicId === 'pure_cosmic_waves' ? 'Pure Cosmic Waves' : 'Deep Positive Energy'}
                  </Txt>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setMenuModalVisible(false);
                    setMusicSelectionVisible(true);
                  }}
                  style={styles.menuAction}
                >
                  <Txt size={12} weight="700" color={colors.blue}>Choose</Txt>
                </Pressable>
              </View>
              <View style={[styles.menuRow, { backgroundColor: colors.surfaceAlt }]}>
                <View style={styles.menuLabel}>
                  <Ionicons name="color-palette-outline" size={18} color={colors.violet} />
                  <Txt size={13} weight="700">Themes ({selectedTheme})</Txt>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setSelectedTheme(selectedTheme === 'Starry Sky' ? 'Deep Forest' : 'Starry Sky')} style={styles.menuAction}>
                  <Txt size={12} weight="700" color={colors.violet}>Switch</Txt>
                </Pressable>
              </View>
              <View style={[styles.menuRow, { backgroundColor: colors.surfaceAlt }]}>
                <View style={styles.menuLabel}>
                  <Ionicons name="shield-outline" size={18} color={colors.danger} />
                  <Txt size={13} weight="700">Blocked Apps ({blockedAppsCount})</Txt>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setBlockedAppsCount((count) => count === 5 ? 8 : 5)} style={styles.menuAction}>
                  <Txt size={12} weight="700" color={colors.danger}>Manage</Txt>
                </Pressable>
              </View>
              <Button label="Done" full onPress={() => setMenuModalVisible(false)} />
            </View>
          </View>
        </Modal>

        <Modal animationType="slide" transparent visible={groupSelectModalVisible} onRequestClose={() => setGroupSelectModalVisible(false)}>
          <View style={styles.bottomSheetBackdrop}>
            <View style={[styles.bottomSheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.modalHeader}>
                <Txt size={18} weight="800">Your Groups</Txt>
                <Pressable accessibilityRole="button" accessibilityLabel="Close group selection" onPress={() => setGroupSelectModalVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <Txt size={12} color={colors.textMuted} style={{ marginBottom: 10 }}>
                Choose a joined group&apos;s Silent Focus Hall. Your current focus session will keep running.
              </Txt>
              {joinedGroupsLoading ? (
                <Txt size={13} color={colors.textMuted}>Loading your joined groups…</Txt>
              ) : joinedGroupsError ? (
                <Txt size={13} color={colors.danger}>{joinedGroupsError}</Txt>
              ) : joinedGroups.length === 0 ? (
                <Txt size={13} color={colors.textMuted}>You have not joined any study groups yet.</Txt>
              ) : joinedGroups.map((group) => (
                <Pressable
                  key={group.id}
                  accessibilityRole="button"
                  onPress={() => openJoinedGroup(group)}
                  style={[styles.optionRow, { backgroundColor: colors.surfaceAlt }]}
                >
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="700">{group.name}</Txt>
                    <Txt size={11} color={colors.textMuted} style={{ marginTop: 2 }}>Open Silent Focus Hall</Txt>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.blue} />
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>

        <Modal
          visible={earlyExitConfirmationVisible}
          transparent
          animationType="fade"
          onRequestClose={stayInSession}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, padding: 20 }]}>
              <Txt size={17} weight="800">Are you sure you want to leave?</Txt>
              <Txt size={13} color={colors.textMuted} style={{ marginTop: 6 }}>
                This session has not been saved.
              </Txt>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={stayInSession}
                  style={({ pressed }) => ({
                    minHeight: 46,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                  })}
                >
                  <Txt size={13} weight="700">Stay</Txt>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isFinalizing}
                  onPress={() => {
                    const current = sessionRef.current;
                    if (current) void discardSession(current);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 46,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: colors.danger,
                    opacity: isFinalizing ? 0.6 : 1,
                  })}
                >
                  <Txt size={13} weight="700" color="#FFFFFF">Leave</Txt>
                </Pressable>
              </View>
              {saveError ? <Txt size={12} color={colors.danger} style={{ marginTop: 10 }}>{saveError}</Txt> : null}
            </View>
          </View>
        </Modal>

        <Modal
          visible={endConfirmationVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {}}
        >
          <View style={styles.bottomSheetBackdrop}>
            <View style={[styles.bottomSheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sheetHandle} />
              <View style={{ alignItems: 'center', marginBottom: 18 }}>
                <View style={[styles.endIcon, { backgroundColor: `${colors.amber}20` }]}>
                  <Ionicons name="hourglass-outline" size={24} color={colors.amber} />
                </View>
                <Txt size={20} weight="800" style={{ marginTop: 12 }}>End Focus Session?</Txt>
                <Txt size={13} color={colors.textMuted} style={{ textAlign: 'center', marginTop: 5 }}>
                  Your focused time is ready to save or discard.
                </Txt>
              </View>
              <View style={[styles.sessionSummary, { backgroundColor: colors.surfaceAlt }]}>
                <View style={styles.summaryRow}>
                  <Txt size={12} color={colors.textMuted}>Actual focused time</Txt>
                  <Txt size={15} weight="800" style={{ fontVariant: ['tabular-nums'] }}>{formatDuration(actualFocusedSeconds)}</Txt>
                </View>
                <View style={styles.summaryRow}>
                  <Txt size={12} color={colors.textMuted}>Planned duration</Txt>
                  <Txt size={13} weight="700">
                    {currentSession?.plannedSeconds === null ? 'Open-ended' : formatDuration(currentSession?.plannedSeconds ?? 0)}
                  </Txt>
                </View>
                {currentSession?.topic || currentSession?.subject ? (
                  <View style={styles.summaryRow}>
                    <Txt size={12} color={colors.textMuted}>Subject / task</Txt>
                    <Txt size={13} weight="700" numberOfLines={2} style={{ maxWidth: '60%', textAlign: 'right' }}>
                      {[currentSession.topic, currentSession.subject].filter(Boolean).join(' · ')}
                    </Txt>
                  </View>
                ) : null}
                <View style={styles.summaryRow}>
                  <Txt size={12} color={colors.textMuted}>Mode</Txt>
                  <Txt size={13} weight="700">{currentSession?.mode.charAt(0).toUpperCase()}{currentSession?.mode.slice(1)}</Txt>
                </View>
              </View>
              {saveError ? <Txt size={12} color={colors.danger} style={{ marginVertical: 10 }}>{saveError}</Txt> : null}
              <View style={{ gap: 10, marginTop: 16 }}>
                <Button
                  label="Save Session"
                  icon="checkmark"
                  full
                  disabled={isFinalizing}
                  onPress={() => {
                    const current = sessionRef.current;
                    if (current) void completeSession(current, 'saved_early', current.pendingRecord);
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const current = sessionRef.current;
                    if (current) void discardSession(current);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  })}
                >
                  <Txt size={13} weight="700" color={colors.danger}>Delete Session</Txt>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        {saveError && !endConfirmationVisible ? (
          <View pointerEvents="none" style={[styles.errorBanner, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
            <Txt size={12} color={colors.danger}>{saveError}</Txt>
          </View>
        ) : null}
      </>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  presenceWarning: { position: 'absolute', top: 12, left: 16, right: 16, zIndex: 5, padding: 10, borderWidth: 1, borderRadius: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '90%', borderRadius: 20, padding: 20, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  optionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8 },
  textInput: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 13.5 },
  addButton: { minWidth: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 14 },
  menuRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 10 },
  menuLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, marginRight: 8 },
  menuAction: { minHeight: 40, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
  bottomSheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheetCard: { width: '100%', maxWidth: 620, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 30, borderWidth: 1, borderBottomWidth: 0 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  endIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sessionSummary: { padding: 14, borderRadius: 16, gap: 12 },
  summaryRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  errorBanner: { position: 'absolute', top: 24, left: 16, right: 16, padding: 12, borderWidth: 1, borderRadius: 12 },
});
