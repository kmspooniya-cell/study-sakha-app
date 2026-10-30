import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../lib/theme';
import {
  dayKey,
  PlannerPriority,
  PlannerScope,
  PlannerTask,
  PlannerTaskType,
  useStore,
} from '../lib/store';
import { getPlannerTasksForDate, PlannerTaskView, updatePlannerTask } from '../lib/planner';
import Svg, { Circle } from 'react-native-svg';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

import rainSound from '../assets/Sounds/calming_rain copy.mp3';
import forestSound from '../assets/Sounds/forest_crickets.mp3';
import nightSound from '../assets/Sounds/night_time_sounds.mp3';
import relaxingNightSound from '../assets/Sounds/relaxing_night_sounds.mp3';
import riverSound from '../assets/Sounds/small_river.mp3';

const AMBIENT_SOUNDS: { label: string; source: any }[] = [
  { label: 'Rain', source: rainSound },
  { label: 'Forest', source: forestSound },
  { label: 'Night Ambience', source: nightSound },
  { label: 'Relaxing Night', source: relaxingNightSound },
  { label: 'River', source: riverSound },
];

type PlanTask = {
  id: string;
  label: string;
  kind: string;
  refId: string;
  minutes: number;
};

type TodayTask = PlannerTaskView;

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

function formatActualStudy(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
}

export type FocusActivity = 'study' | 'meditation' | 'break';

const STUDY_HISTORY_KEY = 'study-sakha-focus-history-v1';
const MEDITATION_HISTORY_KEY = 'study-sakha-meditation-history-v1';
const BREAK_HISTORY_KEY = 'study-sakha-break-history-v1';

export function FocusActivityTimer({
  activity,
  onClose,
}: {
  activity: FocusActivity;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { state: storeState, dispatch } = useStore();

  const PRESETS = activity === 'study'
    ? [15, 25, 40, 50]
    : activity === 'meditation'
      ? [5, 10, 15, 20, 30]
      : [5, 10, 15];
  const HISTORY_KEY = activity === 'study'
    ? STUDY_HISTORY_KEY
    : activity === 'meditation'
      ? MEDITATION_HISTORY_KEY
      : BREAK_HISTORY_KEY;
  const ACTIVITY_TITLE = activity === 'study'
    ? 'Focus for Study'
    : activity === 'meditation'
      ? 'Meditation'
      : 'Break';

  type FocusSession = {
    id: string;
    subject?: string;
    topic?: string;
    minutes: number;
    completedAt: string;
    taskId?: string;
    startedAt?: string;
    endedAt?: string;
    actualSeconds?: number;
    plannedMinutes?: number;
  };

  const [visible, setVisible] = useState(true);
  const [ambientSound, setAmbientSound] = useState('Rain');
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);

  const currentSound = AMBIENT_SOUNDS.find((s) => s.label === ambientSound) ?? AMBIENT_SOUNDS[0];
  const audioPlayer = useAudioPlayer(currentSound.source);

  useEffect(() => {
    if (activity === 'study') return;
    let active = true;
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch((error) => {
      if (!active) return;
      console.warn('Audio mode setup failed:', error);
      setAudioError(error instanceof Error ? error.message : 'Audio mode setup failed.');
    });
    return () => {
      active = false;
    };
  }, [activity]);

  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.volume = ambientVolume;
      audioPlayer.loop = true;
    }
  }, [audioPlayer, ambientVolume]);

  useEffect(() => {
    if (activity === 'study') return;
    try {
      if (ambientPlaying) audioPlayer.play();
      else audioPlayer.pause();
    } catch (error) {
      console.error('Ambient audio playback failed:', error);
      setAudioError(error instanceof Error ? error.message : 'Ambient audio playback failed.');
      setAmbientPlaying(false);
    }
  }, [ambientPlaying, audioPlayer]);

  useEffect(() => () => {
    audioPlayer.pause();
    audioPlayer.seekTo(0).catch((error) => {
      console.warn('Ambient audio could not be reset:', error);
    });
  }, [audioPlayer]);

  function selectAmbientSound(label: string) {
    setAmbientSound(label);
    setShowSoundPicker(false);
  }

  function startAmbient() {
    setAudioError('');
    setAmbientPlaying(true);
  }

  function stopAmbient() {
    audioPlayer.pause();
    setAmbientPlaying(false);
    audioPlayer.seekTo(0).catch((error) => {
      console.warn('Ambient audio could not be reset:', error);
      if (mounted.current) {
        setAudioError(error instanceof Error ? error.message : 'Ambient audio could not be reset.');
      }
    });
  }
  const initialDuration = activity === 'study' ? 25 * 60 : activity === 'meditation' ? 10 * 60 : 5 * 60;
  const [input, setInput] = useState(String(initialDuration / 60));
  const [duration, setDuration] = useState(initialDuration);
  const [remaining, setRemaining] = useState(initialDuration);
  const [durationError, setDurationError] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'done' | 'ended'>(
    'idle'
  );

  const [subject, setSubject] = useState('History');
  const [topic, setTopic] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedDate = storeState.plannerSelectedDate;
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingDefaultTask, setEditingDefaultTask] = useState(false);
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormCategory, setTaskFormCategory] = useState('');
  const [taskFormMinutes, setTaskFormMinutes] = useState('25');
  const [taskFormType, setTaskFormType] = useState<PlannerTaskType>('Study');
  const [taskFormPriority, setTaskFormPriority] = useState<PlannerPriority>('Medium');
  const [taskFormDate, setTaskFormDate] = useState(currentDateKey);
  const [taskFormError, setTaskFormError] = useState('');
  const [deleteTask, setDeleteTask] = useState<TodayTask | null>(null);
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [audioError, setAudioError] = useState('');

  const deadline = useRef<number | null>(null);
  const sessionStart = useRef<number | null>(null);
  const activeElapsed = useRef(0);
  const savedSession = useRef(false);
  const sessionId = useRef<string | null>(null);
  const sessionTaskId = useRef<string | null>(null);
  const sessionTaskDate = useRef<string | null>(null);
  const sessionStartedAt = useRef<string | null>(null);
  const sessionSubject = useRef('History');
  const sessionTopic = useRef('');
  const sessionPlannedSeconds = useRef(initialDuration);
  const ambientWasPlaying = useRef(false);
  const historyRef = useRef<FocusSession[]>([]);
  const disposeActivity = useRef<() => void>(() => {});
  const mounted = useRef(true);
  const taskLocks = useRef<Record<string, boolean>>({});

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(HISTORY_KEY)
      .then((value) => {
        if (!active) return;
        if (!value) return;
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error('Saved session history has an invalid format.');
        const seenIds = new Set<string>();
        let droppedInvalidRecord = false;
        let droppedDuplicateRecord = false;
        const valid = parsed.filter((item): item is FocusSession => {
          const validRecord = Boolean(
            item &&
            typeof item.id === 'string' &&
            Number.isFinite(item.minutes) &&
            typeof item.completedAt === 'string'
          );
          if (!validRecord) {
            droppedInvalidRecord = true;
            return false;
          }
          if (seenIds.has(item.id)) {
            droppedDuplicateRecord = true;
            return false;
          }
          seenIds.add(item.id);
          return true;
        });
        historyRef.current = valid;
        setHistory(valid);
        if (droppedInvalidRecord) {
          console.warn('Focus history contains malformed records; valid records were loaded without rewriting storage.');
        } else if (droppedDuplicateRecord) {
          AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(valid)).catch((error: unknown) => {
            console.warn('Focus history could not be normalized:', error);
          });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error(`${ACTIVITY_TITLE} history could not be loaded:`, error);
        setHistoryError(error instanceof Error ? error.message : 'Session history could not be loaded.');
      })
      .finally(() => {
        if (active) setHistoryLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [HISTORY_KEY, ACTIVITY_TITLE]);

  function createSessionId() {
    let id = '';
    do {
      id = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    } while (
      historyRef.current.some((session) => session.id === id) ||
      storeState.recordedFocusSessionIds.includes(id)
    );
    return id;
  }

  function saveSession(actualSeconds: number, updateView = true) {
    if (!historyLoaded || historyError) return;
    const recordedSeconds = Math.max(0, Math.round(actualSeconds));
    if (savedSession.current || recordedSeconds <= 0) return;

    const nextSessionId = sessionId.current ?? createSessionId();
    if (
      historyRef.current.some((session) => session.id === nextSessionId) ||
      storeState.recordedFocusSessionIds.includes(nextSessionId)
    ) {
      savedSession.current = true;
      return;
    }

    savedSession.current = true;
    const activityLabel = activity === 'study' ? (sessionSubject.current.trim() || 'General Study') : ACTIVITY_TITLE;
    const endedAt = new Date().toISOString();
    const session: FocusSession = {
      id: nextSessionId,
      subject: activityLabel,
      topic: activity === 'study' ? sessionTopic.current.trim() : '',
      minutes: recordedSeconds / 60,
      completedAt: endedAt,
      ...(activity === 'study' && sessionTaskId.current
        ? { taskId: sessionTaskId.current }
        : {}),
      startedAt: sessionStartedAt.current ?? endedAt,
      endedAt,
      actualSeconds: recordedSeconds,
      plannedMinutes: sessionPlannedSeconds.current / 60,
    };
    const updated = [session, ...historyRef.current].slice(0, 100);
    historyRef.current = updated;
    if (updateView) setHistory(updated);
    if (activity === 'study') {
      dispatch({
        type: 'recordFocusStudy',
        id: session.id,
        date: dayKey(new Date(endedAt)),
        taskId: sessionTaskId.current,
        seconds: recordedSeconds,
        taskTitle: session.taskId ? session.topic : undefined,
        category: session.taskId ? session.subject : undefined,
        plannedMinutes: session.taskId ? session.plannedMinutes : undefined,
      });
    }
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated)).catch((error: unknown) => {
      console.error(`${ACTIVITY_TITLE} history could not be saved:`, error);
      if (updateView && mounted.current) {
        setHistoryError(error instanceof Error ? error.message : 'Session history could not be saved.');
      }
    });
  }

  disposeActivity.current = () => {
    const now = Date.now();
    const elapsed = activeElapsed.current +
      (sessionStart.current === null ? 0 : Math.max(0, (now - sessionStart.current) / 1000));
    if (status === 'running' || status === 'paused') {
      saveSession(elapsed, false);
    }
    deadline.current = null;
    sessionStart.current = null;
    audioPlayer.pause();
    audioPlayer.seekTo(0).catch((error) => {
      console.warn('Ambient audio could not be reset:', error);
    });
  };

  useEffect(() => () => disposeActivity.current(), [audioPlayer]);

  useEffect(() => {
    if (status !== 'running' || deadline.current === null) return;

    const tick = () => {
      if (deadline.current === null) return;

      const left = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000)
      );

      setRemaining(left);

      if (left === 0) {
        deadline.current = null;
        sessionStart.current = null;
        activeElapsed.current = duration;
        setStatus('done');
        saveSession(duration);
      }
    };

    tick();
    const timer = setInterval(tick, 500);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        tick();
      } else {
        audioPlayer.pause();
        setAmbientPlaying(false);
        ambientWasPlaying.current = false;
      }
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [status, duration, activity, subject, topic, HISTORY_KEY, audioPlayer]);

  useEffect(() => {
    if ((status === 'done' || status === 'ended') && ambientPlaying) {
      audioPlayer.pause();
      setAmbientPlaying(false);
    }
  }, [status, ambientPlaying, audioPlayer]);

  function setMinutes(value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 180) {
      setDurationError('Choose a duration between 1 and 180 minutes.');
      return;
    }

    if (status === 'running' || status === 'paused') return;

    setDurationError('');
    setInput(String(value));
    setDuration(value * 60);
    setRemaining(value * 60);
    deadline.current = null;
    sessionStart.current = null;
    activeElapsed.current = 0;
    savedSession.current = false;
    sessionId.current = null;
    sessionTaskId.current = null;
    sessionTaskDate.current = null;
    sessionStartedAt.current = null;
    setStatus('idle');
    setDurationError('');
  }

  function start(task?: TodayTask) {
    if (
      status === 'running' ||
      (task && status === 'paused') ||
      !historyLoaded ||
      historyError
    ) return;
    const now = Date.now();
    const selectedTask = task ?? (
      selectedTaskId
        ? todayTasks.find((item) => item.id === selectedTaskId)
        : undefined
    );
    const selectedDuration = selectedTask ? selectedTask.minutes * 60 : duration;
    const selectedRemaining = selectedTask
      ? selectedDuration
      : status === 'done' || status === 'ended'
        ? duration
        : remaining;
    const isNewSession = Boolean(task) || status === 'idle' || status === 'done' || status === 'ended';

    if (selectedTask) {
      setSelectedTaskId(selectedTask.id);
      setSubject(selectedTask.category);
      setTopic(selectedTask.label);
      setInput(String(selectedTask.minutes));
      setDuration(selectedDuration);
      setRemaining(selectedDuration);
    } else if (status === 'done' || status === 'ended') {
      setRemaining(duration);
    }

    deadline.current = now + selectedRemaining * 1000;
    if (isNewSession) {
      sessionStart.current = now;
      activeElapsed.current = 0;
      savedSession.current = false;
      sessionId.current = createSessionId();
      sessionTaskId.current = activity === 'study' ? (selectedTask?.id ?? null) : null;
      sessionTaskDate.current = selectedTask ? selectedDate : null;
      sessionStartedAt.current = new Date(now).toISOString();
      sessionSubject.current = selectedTask?.category ?? subject;
      sessionTopic.current = selectedTask?.label ?? topic;
      sessionPlannedSeconds.current = selectedDuration;
    } else if (status === 'paused') {
      sessionStart.current = now;
    }
    setStatus('running');
    if (status === 'paused' && ambientWasPlaying.current && !ambientPlaying) {
      ambientWasPlaying.current = false;
      setAmbientPlaying(true);
    }
  }

  function pause() {
    if (deadline.current === null) return;

    const now = Date.now();
    const left = Math.max(0, Math.ceil((deadline.current - now) / 1000));

    if (sessionStart.current !== null) {
      activeElapsed.current += Math.max(0, (now - sessionStart.current) / 1000);
      sessionStart.current = null;
    }
    deadline.current = null;
    setRemaining(left);
    setStatus(left > 0 ? 'paused' : 'done');
    if (left === 0) {
      activeElapsed.current = duration;
      saveSession(duration);
    }
    if (ambientPlaying) {
      audioPlayer.pause();
      setAmbientPlaying(false);
      ambientWasPlaying.current = true;
    }
  }

  function reset() {
    deadline.current = null;
    sessionStart.current = null;
    activeElapsed.current = 0;
    savedSession.current = false;
    setRemaining(duration);
    setStatus('idle');
    audioPlayer.pause();
    setAmbientPlaying(false);
    ambientWasPlaying.current = false;
    audioPlayer.seekTo(0).catch((error) => {
      console.warn('Ambient audio could not be reset:', error);
      if (mounted.current) {
        setAudioError(error instanceof Error ? error.message : 'Ambient audio could not be reset.');
      }
    });
  }

  function end() {
    const now = Date.now();
    const remainingNow = deadline.current === null
      ? remaining
      : Math.max(0, Math.ceil((deadline.current - now) / 1000));
    const elapsed = activeElapsed.current +
      (sessionStart.current === null ? 0 : Math.max(0, (now - sessionStart.current) / 1000));
    deadline.current = null;
    sessionStart.current = null;
    if (remainingNow === 0 && status === 'running') {
      activeElapsed.current = duration;
      setRemaining(0);
      setStatus('done');
      saveSession(duration);
      audioPlayer.pause();
      setAmbientPlaying(false);
      ambientWasPlaying.current = false;
      return;
    }
    activeElapsed.current = elapsed;
    if (status === 'running' || status === 'paused') saveSession(elapsed);
    setStatus('ended');
    audioPlayer.pause();
    setAmbientPlaying(false);
    ambientWasPlaying.current = false;
  }

  function closeActivity() {
    if (status === 'running' || status === 'paused') end();
    audioPlayer.pause();
    setAmbientPlaying(false);
    setVisible(false);
    onClose();
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = duration > 0 ? remaining / duration : 1;
  const ringColor =
    progress > 0.5 ? '#3B82F6' : progress > 0.2 ? '#F59E0B' : '#EF4444';
  const today = new Date().toDateString();
  const todayHistory = history.filter(
    (item) => new Date(item.completedAt).toDateString() === today
  );
  const todayMinutes = todayHistory.reduce(
    (total, item) => total + item.minutes,
    0
  );
  const todayTasks = getPlannerTasksForDate(storeState, selectedDate);

  function selectTask(task: TodayTask) {
    if (status === 'running' || status === 'paused') return;
    setSelectedTaskId(task.id);
    setSubject(task.category);
    setTopic(task.label);
    sessionTaskId.current = task.id;
    sessionTaskDate.current = selectedDate;
    sessionSubject.current = task.category;
    sessionTopic.current = task.label;
    sessionPlannedSeconds.current = task.minutes * 60;
    setInput(String(task.minutes));
    setDuration(task.minutes * 60);
    setRemaining(task.minutes * 60);
    setDurationError('');
    deadline.current = null;
    sessionStart.current = null;
    activeElapsed.current = 0;
    savedSession.current = false;
    setStatus('idle');
  }

  function openTaskEditor(task?: TodayTask) {
    if (!storeState.plannerTasksLoaded || storeState.plannerTaskLoadError) return;
    setEditingTaskId(task?.id ?? null);
    setEditingDefaultTask(Boolean(task?.isDefault));
    setTaskFormTitle(task?.label ?? '');
    setTaskFormCategory(task?.category ?? '');
    setTaskFormMinutes(String(task?.minutes ?? 25));
    setTaskFormType(task?.taskType ?? 'Study');
    setTaskFormPriority(task?.priority ?? 'Medium');
    setTaskFormDate(selectedDate);
    setTaskFormError('');
    setTaskEditorOpen(true);
  }

  function saveTaskFromFocus() {
    const label = taskFormTitle.trim();
    const category = taskFormCategory.trim();
    const plannedMinutes = Number(taskFormMinutes);
    if (!label || !category) {
      setTaskFormError('Enter a task title and subject or category.');
      return;
    }
    if (!Number.isInteger(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > 600) {
      setTaskFormError('Duration must be 1–600 minutes.');
      return;
    }
    if (!isDateKey(taskFormDate)) {
      setTaskFormError('Choose a valid target date.');
      return;
    }
    if (editingDefaultTask && editingTaskId) {
      dispatch({
        type: 'plannerDefaultOverride',
        id: editingTaskId,
        patch: {
          label,
          minutes: plannedMinutes,
          category,
          taskType: taskFormType,
          priority: taskFormPriority,
        },
      });
      if (selectedTaskId === editingTaskId) {
        setSubject(category);
        setTopic(label);
        setInput(String(plannedMinutes));
        setDuration(plannedMinutes * 60);
        setRemaining(plannedMinutes * 60);
      }
    } else {
      const current = storeState.plannerTasks.find((item) => item.id === editingTaskId);
      let updated: PlannerTask[];
      if (current) {
        updated = storeState.plannerTasks.map((item) =>
          item.id === editingTaskId
            ? updatePlannerTask(item, {
                label,
                minutes: plannedMinutes,
                category,
                taskType: taskFormType,
                priority: taskFormPriority,
                targetDate: taskFormDate,
              })
            : item
        );
      } else {
        let id = `planner-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
        while (storeState.plannerTasks.some((item) => item.id === id)) {
          id = `planner-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
        }
        updated = [
          ...storeState.plannerTasks,
          {
            id,
            label,
            minutes: plannedMinutes,
            category,
            taskType: taskFormType,
            priority: taskFormPriority,
            targetDate: taskFormDate,
            scope: 'daily' as const,
            periodKey: taskFormDate,
            completed: false,
            completedOn: null,
          },
        ];
      }
      dispatch({ type: 'savePlannerTasks', tasks: updated });
      if (selectedTaskId === editingTaskId && editingTaskId) {
        setSubject(category);
        setTopic(label);
        setInput(String(plannedMinutes));
        setDuration(plannedMinutes * 60);
        setRemaining(plannedMinutes * 60);
        if (taskFormDate !== selectedDate) setSelectedTaskId(null);
      }
    }
    setTaskEditorOpen(false);
    setTaskFormError('');
  }

  function toggleTodayTask(task: TodayTask) {
    if (taskLocks.current[task.id]) return;
    taskLocks.current[task.id] = true;
    const completed = !task.completed;
    dispatch({
      type: 'setPlannerTaskCompletion',
      taskId: task.id,
      date: selectedDate,
      completed,
      isDefault: task.isDefault,
      completion: {
        taskId: task.id,
        label: task.label,
        minutes: task.minutes,
        category: task.category,
        taskType: task.taskType,
      },
    });
    setTimeout(() => {
      delete taskLocks.current[task.id];
    }, 350);
  }

  function confirmDeleteTask() {
    if (!deleteTask) return;
    if (deleteTask.isDefault) {
      dispatch({ type: 'deletePlannerDefault', id: deleteTask.id });
    } else {
      dispatch({
        type: 'savePlannerTasks',
        tasks: storeState.plannerTasks.filter((task) => task.id !== deleteTask.id),
      });
    }
    if (selectedTaskId === deleteTask.id) setSelectedTaskId(null);
    setDeleteTask(null);
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={closeActivity}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 16,
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 24,
                padding: 20,
                gap: 16,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 22,
                      fontWeight: '800',
                    }}
                  >
                    {ACTIVITY_TITLE}
                  </Text>
                  <Text style={{ color: colors.textMuted, marginTop: 3 }}>
                    Today: {Math.round(todayMinutes)} min
                  </Text>
                </View>

                <Pressable onPress={closeActivity} accessibilityRole="button" accessibilityLabel={`Close ${ACTIVITY_TITLE}`}>
                  <Ionicons name="close" size={25} color={colors.textMuted} />
                </Pressable>
              </View>

              {activity === 'study' ? (
                <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Today’s Tasks</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>{formatDateKey(selectedDate)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Pressable
                        onPress={() => {
                          if (status === 'running' || status === 'paused') return;
                          dispatch({ type: 'plannerSelectedDate', date: shiftDateKey(selectedDate, -1) });
                          setSelectedTaskId(null);
                        }}
                        disabled={status === 'running' || status === 'paused'}
                        accessibilityRole="button"
                        accessibilityLabel="Show previous task day"
                        hitSlop={8}
                        style={{ padding: 8 }}
                      >
                        <Ionicons name="chevron-back" size={18} color={colors.blue} />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (status === 'running' || status === 'paused') return;
                          dispatch({ type: 'plannerSelectedDate', date: currentDateKey() });
                          setSelectedTaskId(null);
                        }}
                        disabled={status === 'running' || status === 'paused'}
                        accessibilityRole="button"
                        style={{ paddingHorizontal: 5, paddingVertical: 8 }}
                      >
                        <Text style={{ color: colors.blue, fontSize: 11, fontWeight: '700' }}>Today</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (status === 'running' || status === 'paused') return;
                          dispatch({ type: 'plannerSelectedDate', date: shiftDateKey(selectedDate, 1) });
                          setSelectedTaskId(null);
                        }}
                        disabled={status === 'running' || status === 'paused'}
                        accessibilityRole="button"
                        accessibilityLabel="Show next task day"
                        hitSlop={8}
                        style={{ padding: 8 }}
                      >
                        <Ionicons name="chevron-forward" size={18} color={colors.blue} />
                      </Pressable>
                    </View>
                  </View>
                  {!storeState.plannerTasksLoaded ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Loading saved tasks…</Text>
                  ) : storeState.plannerTaskLoadError ? (
                    <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12 }}>
                      Tasks could not be loaded: {storeState.plannerTaskLoadError}
                    </Text>
                  ) : (
                    <>
                      {todayTasks.map((task) => {
                        const selected = selectedTaskId === task.id;
                        const actualSeconds = task.actualStudySeconds;
                        return (
                          <View
                            key={task.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                              borderWidth: 1,
                              borderColor: selected ? colors.blue : colors.border,
                              backgroundColor: selected ? colors.tint : colors.surfaceAlt,
                              borderRadius: 12,
                              padding: 10,
                            }}
                          >
                            <Pressable
                              onPress={() => toggleTodayTask(task)}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: task.completed }}
                              accessibilityLabel={`${task.completed ? 'Mark pending' : 'Mark completed'}: ${task.label}`}
                              style={{
                                width: 23,
                                height: 23,
                                borderWidth: 1.5,
                                borderColor: task.completed ? colors.teal : colors.border,
                                backgroundColor: task.completed ? colors.teal : 'transparent',
                                borderRadius: 7,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {task.completed ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                            </Pressable>
                            <Pressable
                              onPress={() => selectTask(task)}
                              disabled={status === 'running' || status === 'paused'}
                              style={{ flex: 1, minWidth: 0 }}
                            >
                              <Text
                                numberOfLines={2}
                                style={{
                                  color: task.completed ? colors.textMuted : colors.text,
                                  fontWeight: '700',
                                  textDecorationLine: task.completed ? 'line-through' : 'none',
                                }}
                              >
                                {task.label}
                              </Text>
                              <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 11, marginTop: 3 }}>
                                {task.category} · {task.minutes}m{actualSeconds > 0 ? ` · studied ${formatActualStudy(actualSeconds)}` : ''}
                              </Text>
                              {selected ? (
                                <Text style={{ color: colors.blue, fontSize: 10, fontWeight: '700', marginTop: 2 }}>Selected for this session</Text>
                              ) : null}
                            </Pressable>
                            <View style={{ alignItems: 'flex-end', gap: 8 }}>
                              <Pressable
                                onPress={() => start(task)}
                                disabled={!historyLoaded || Boolean(historyError) || status === 'running' || status === 'paused'}
                                accessibilityRole="button"
                                accessibilityLabel={`Start focus for ${task.label}`}
                                style={{ backgroundColor: colors.blue, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, opacity: !historyLoaded || historyError || status === 'running' || status === 'paused' ? 0.5 : 1 }}
                              >
                                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Start</Text>
                              </Pressable>
                              <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Pressable
                                  onPress={() => openTaskEditor(task)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Edit ${task.label}`}
                                  hitSlop={6}
                                >
                                  <Ionicons name="create-outline" size={17} color={colors.blue} />
                                </Pressable>
                                <Pressable
                                  onPress={() => setDeleteTask(task)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Delete ${task.label}`}
                                  hitSlop={6}
                                >
                                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                      {!todayTasks.length ? (
                        <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 12 }}>
                          No tasks planned for this day yet.
                        </Text>
                      ) : null}
                      <Pressable
                        onPress={() => openTaskEditor()}
                        disabled={!storeState.plannerTasksLoaded || Boolean(storeState.plannerTaskLoadError)}
                        accessibilityRole="button"
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.tint, borderRadius: 10, padding: 10, opacity: !storeState.plannerTasksLoaded || storeState.plannerTaskLoadError ? 0.5 : 1 }}
                      >
                        <Ionicons name="add" size={17} color={colors.blue} />
                        <Text style={{ color: colors.blue, fontWeight: '800' }}>Add task</Text>
                      </Pressable>
                      {taskEditorOpen ? (
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 9 }}>
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>
                            {editingTaskId || editingDefaultTask ? 'Edit task' : 'Add study task'}
                          </Text>
                          <TextInput
                            value={taskFormTitle}
                            onChangeText={setTaskFormTitle}
                            placeholder="Task title"
                            placeholderTextColor={colors.textFaint}
                            accessibilityLabel="Task title"
                            maxLength={150}
                            style={{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 10 }}
                          />
                          <TextInput
                            value={taskFormCategory}
                            onChangeText={setTaskFormCategory}
                            placeholder="Subject or category"
                            placeholderTextColor={colors.textFaint}
                            accessibilityLabel="Subject or category"
                            maxLength={60}
                            style={{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 10 }}
                          />
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {TASK_TYPES.map((value) => (
                              <Pressable
                                key={value}
                                onPress={() => setTaskFormType(value)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: taskFormType === value }}
                                style={{ paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8, backgroundColor: taskFormType === value ? colors.tint : colors.surfaceAlt }}
                              >
                                <Text style={{ color: colors.text, fontSize: 11 }}>{value}</Text>
                              </Pressable>
                            ))}
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {PRIORITIES.map((value) => (
                              <Pressable
                                key={value}
                                onPress={() => setTaskFormPriority(value)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: taskFormPriority === value }}
                                style={{ paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8, backgroundColor: taskFormPriority === value ? colors.tint : colors.surfaceAlt }}
                              >
                                <Text style={{ color: colors.text, fontSize: 11 }}>{value}</Text>
                              </Pressable>
                            ))}
                          </View>
                          {!editingDefaultTask ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Pressable onPress={() => setTaskFormDate((date) => shiftDateKey(date, -1))} accessibilityLabel="Previous task target date" hitSlop={8} style={{ padding: 6 }}>
                                <Ionicons name="chevron-back" size={17} color={colors.blue} />
                              </Pressable>
                              <Text style={{ color: colors.text, fontSize: 12 }}>{formatDateKey(taskFormDate)}</Text>
                              <Pressable onPress={() => setTaskFormDate((date) => shiftDateKey(date, 1))} accessibilityLabel="Next task target date" hitSlop={8} style={{ padding: 6 }}>
                                <Ionicons name="chevron-forward" size={17} color={colors.blue} />
                              </Pressable>
                            </View>
                          ) : null}
                          <TextInput
                            value={taskFormMinutes}
                            onChangeText={setTaskFormMinutes}
                            keyboardType="number-pad"
                            placeholder="Duration in minutes"
                            placeholderTextColor={colors.textFaint}
                            accessibilityLabel="Task duration in minutes"
                            maxLength={3}
                            style={{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 10 }}
                          />
                          {taskFormError ? <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12 }}>{taskFormError}</Text> : null}
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable onPress={saveTaskFromFocus} style={{ flex: 1, backgroundColor: colors.blue, borderRadius: 10, padding: 11, alignItems: 'center' }}>
                              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Save task</Text>
                            </Pressable>
                            <Pressable onPress={() => { setTaskEditorOpen(false); setTaskFormError(''); }} style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 11, alignItems: 'center' }}>
                              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                      {deleteTask ? (
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 8 }}>
                          <Text style={{ color: colors.text, fontWeight: '700' }}>Delete “{deleteTask.label}”?</Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                            <Pressable onPress={() => setDeleteTask(null)} style={{ padding: 9 }}>
                              <Text style={{ color: colors.text }}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={confirmDeleteTask} style={{ backgroundColor: colors.danger, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 }}>
                              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Delete</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                    </>
                  )}
                  {selectedTaskId ? (
                    <Pressable
                      onPress={() => setSelectedTaskId(null)}
                      disabled={status === 'running' || status === 'paused'}
                      accessibilityRole="button"
                      style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
                    >
                      <Text style={{ color: colors.blue, fontSize: 12, fontWeight: '700' }}>Use a custom Focus Session instead</Text>
                    </Pressable>
                  ) : null}
                  {storeState.plannerPersistenceError ? (
                    <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 11 }}>
                      Task changes could not be saved: {storeState.plannerPersistenceError}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {activity === 'study' ? (
                <>
                  <Text style={{ color: colors.textMuted }}>Subject and topic</Text>
                  <TextInput
                    value={subject}
                    onChangeText={setSubject}
                    editable={status !== 'running' && status !== 'paused' && !selectedTaskId}
                    placeholder="Subject, e.g. History"
                    placeholderTextColor={colors.textFaint}
                    style={{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }}
                  />
                  <TextInput
                    value={topic}
                    onChangeText={setTopic}
                    editable={status !== 'running' && status !== 'paused' && !selectedTaskId}
                    placeholder="Topic, e.g. Mewar Painting"
                    placeholderTextColor={colors.textFaint}
                    style={{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }}
                  />
                </>
              ) : null}

              <Text style={{ color: colors.textMuted }}>Session duration</Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PRESETS.map((value) => (
                  <Pressable
                    key={value}
                    disabled={status === 'running' || status === 'paused'}
                    onPress={() => setMinutes(value)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 13,
                      borderRadius: 12,
                      backgroundColor:
                        duration === value * 60
                          ? colors.tint
                          : colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor:
                        duration === value * 60 ? colors.teal : colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {value}m
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  editable={status !== 'running' && status !== 'paused'}
                  keyboardType="number-pad"
                  placeholder="Custom minutes (1–180)"
                  placeholderTextColor={colors.textFaint}
                  style={{
                    flex: 1,
                    color: colors.text,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                  }}
                />

                <Pressable
                  onPress={() => setMinutes(Number(input))}
                  disabled={status === 'running' || status === 'paused'}
                  style={{
                    backgroundColor: colors.tint,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    Set
                  </Text>
                </Pressable>
              </View>
              {durationError ? (
                <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12 }}>
                  {durationError}
                </Text>
              ) : null}
              {!historyLoaded ? (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Loading session history…</Text>
              ) : null}

              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View
  style={{
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  <Svg width={210} height={210} viewBox="0 0 210 210">
    <Circle
      cx={105}
      cy={105}
      r={91}
      stroke={colors.border}
      strokeWidth={10}
      fill={colors.surfaceAlt}
    />
    <Circle
      cx={105}
      cy={105}
      r={91}
      stroke={ringColor}
      strokeWidth={10}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={2 * Math.PI * 91}
      strokeDashoffset={2 * Math.PI * 91 * (1 - progress)}
      rotation={-90}
      origin="105, 105"
    />
  </Svg>

  <View
    style={{
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
                  <Ionicons
                    name="hourglass-outline"
                    size={23}
                    color={colors.blue}
                  />
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 40,
                      fontWeight: '800',
                      fontVariant: ['tabular-nums'],
                      marginTop: 4,
                    }}
                  >
                    {String(mins).padStart(2, '0')}:
                    {String(secs).padStart(2, '0')}
                  </Text>
                  <Text style={{ color: colors.textMuted }}>
                    {status === 'running'
                      ? `${ACTIVITY_TITLE} in progress`
                      : status === 'paused'
                      ? 'Paused'
                      : status === 'done'
                      ? 'Completed'
                      : status === 'ended'
                      ? 'Session ended'
                      : `${duration / 60} minute session`}
                  </Text>
                </View>

                <View
                  style={{
                    width: '100%',
                    height: 7,
                    backgroundColor: colors.border,
                    borderRadius: 10,
                    overflow: 'hidden',
                    marginTop: 16,
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${Math.max(0, Math.min(1, 1 - progress)) * 100}%`,
                      backgroundColor: colors.blue,
                      borderRadius: 10,
                    }}
                  />
                </View>
              </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={status === 'running' ? pause : () => start()}
                  disabled={!historyLoaded || Boolean(historyError)}
                  style={{
                    flex: 1,
                    backgroundColor: colors.blue,
                    borderRadius: 12,
                    padding: 14,
                    alignItems: 'center',
                    opacity: historyLoaded && !historyError ? 1 : 0.55,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                    {status === 'running'
                      ? 'Pause'
                      : status === 'paused'
                      ? 'Resume'
                      : status === 'done'
                      || status === 'ended'
                      ? 'Start Again'
                      : `Start ${ACTIVITY_TITLE}`}
                  </Text>
                </Pressable>

                {(status === 'running' || status === 'paused') ? (
                  <Pressable
                    onPress={end}
                    style={{
                      flex: 1,
                      backgroundColor: colors.surfaceAlt,
                      borderRadius: 12,
                      padding: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '800' }}>End</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={reset}
                    style={{
                      flex: 1,
                      backgroundColor: colors.surfaceAlt,
                      borderRadius: 12,
                      padding: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '800' }}>Reset</Text>
                  </Pressable>
                )}
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>Today’s {ACTIVITY_TITLE.toLowerCase()} sessions</Text>

                {!historyLoaded ? (
                  <Text style={{ color: colors.textMuted }}>Loading session history…</Text>
                ) : historyError ? (
                  <Text accessibilityRole="alert" style={{ color: colors.danger }}>{historyError}</Text>
                ) : todayHistory.length === 0 ? (
                  <Text style={{ color: colors.textMuted }}>
                    No sessions recorded today.
                  </Text>
                ) : (
                  todayHistory.slice(0, 5).map((item) => (
                    <View
                      key={item.id}
                      style={{
                        backgroundColor: colors.surfaceAlt,
                        padding: 10,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: '700' }}>
                        {item.subject}
                        {item.topic ? ` · ${item.topic}` : ''}
                      </Text>
                      <Text style={{ color: colors.textMuted, marginTop: 3 }}>
                        {formatActualStudy(item.actualSeconds ?? item.minutes * 60)} ·{' '}
                        {new Date(item.completedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {activity !== 'study' ? <View
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: 16,
                  padding: 14,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="musical-notes" size={20} color={colors.blue} />
                    <View>
                      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                        Ambient Sounds
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                        {ambientSound}
                      </Text>
                    </View>
                  </View>
                  {ambientPlaying && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 18 }}>
                      <View style={{ width: 3, height: 8, backgroundColor: colors.teal, borderRadius: 2 }} />
                      <View style={{ width: 3, height: 14, backgroundColor: colors.teal, borderRadius: 2 }} />
                      <View style={{ width: 3, height: 6, backgroundColor: colors.teal, borderRadius: 2 }} />
                    </View>
                  )}
                </View>

                {showSoundPicker ? (
                  <View style={{ gap: 6 }}>
                    {AMBIENT_SOUNDS.map((sound) => (
                      <Pressable
                        key={sound.label}
                        onPress={() => selectAmbientSound(sound.label)}
                        accessibilityLabel={`Select ${sound.label} ambient sound`}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 11,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          backgroundColor:
                            ambientSound === sound.label ? colors.tint : colors.surface,
                          borderWidth: 1,
                          borderColor:
                            ambientSound === sound.label ? colors.teal : colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons
                            name={ambientSound === sound.label ? 'checkmark-circle' : 'radio-button-off'}
                            size={18}
                            color={ambientSound === sound.label ? colors.teal : colors.textMuted}
                          />
                          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                            {sound.label}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setShowSoundPicker(false)}
                      accessibilityLabel="Close sound picker"
                      style={{
                        paddingVertical: 9,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        alignItems: 'center',
                        marginTop: 2,
                      }}
                    >
                      <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13 }}>
                        Cancel
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => setShowSoundPicker(true)}
                        accessibilityLabel="Choose ambient sound"
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingVertical: 11,
                        }}
                      >
                        <Ionicons name="list" size={15} color={colors.text} />
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                          Choose
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={startAmbient}
                        disabled={ambientPlaying}
                        accessibilityLabel="Start ambient sound"
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          backgroundColor: ambientPlaying ? colors.surface : colors.blue,
                          borderRadius: 12,
                          paddingVertical: 11,
                        }}
                      >
                        <Ionicons name="play" size={15} color={ambientPlaying ? colors.textMuted : '#FFFFFF'} />
                        <Text style={{ color: ambientPlaying ? colors.textMuted : '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                          Start
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={stopAmbient}
                        disabled={!ambientPlaying}
                        accessibilityLabel="Stop ambient sound"
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          backgroundColor: ambientPlaying ? colors.surface : colors.surface,
                          borderColor: ambientPlaying ? colors.border : 'transparent',
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingVertical: 11,
                          opacity: ambientPlaying ? 1 : 0.5,
                        }}
                      >
                        <Ionicons name="stop" size={15} color={ambientPlaying ? colors.text : colors.textMuted} />
                        <Text style={{ color: ambientPlaying ? colors.text : colors.textMuted, fontWeight: '700', fontSize: 13 }}>
                          Stop
                        </Text>
                      </Pressable>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Ionicons name="volume-low" size={16} color={colors.textMuted} />
                      <Pressable
                        onPress={() => setAmbientVolume((v) => Math.max(0, +(v - 0.1).toFixed(1)))}
                        accessibilityLabel="Decrease volume"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: colors.surface,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="remove" size={16} color={colors.text} />
                      </Pressable>
                      <View
                        style={{
                          flex: 1,
                          height: 6,
                          backgroundColor: colors.surface,
                          borderRadius: 10,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${ambientVolume * 100}%`,
                            height: '100%',
                            backgroundColor: colors.blue,
                            borderRadius: 10,
                          }}
                        />
                      </View>
                      <Pressable
                        onPress={() => setAmbientVolume((v) => Math.min(1, +(v + 0.1).toFixed(1)))}
                        accessibilityLabel="Increase volume"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: colors.surface,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="add" size={16} color={colors.text} />
                      </Pressable>
                      <Ionicons name="volume-high" size={16} color={colors.textMuted} />
                    </View>
                  </>
                )}
              </View>
              : null}
              {audioError ? (
                <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12 }}>
                  {audioError}
                </Text>
              ) : null}
              {status === 'done' ? (
                <View style={{ borderRadius: 12, padding: 12, backgroundColor: colors.tealTint }}>
                  <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '700' }}>
                    {activity === 'break'
                      ? 'Break complete — welcome back!'
                      : activity === 'meditation'
                        ? 'Meditation complete. Take a calm moment before you continue.'
                        : 'Focus session complete. Great work!'}
                  </Text>
                </View>
              ) : status === 'ended' ? (
                <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 12 }}>
                  {ACTIVITY_TITLE} session ended.
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
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
                  Personalized study suggestions will appear here soon.
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
