import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import { Shell } from '../components/Shell';
import { updateFocusHistoryRecord } from '../lib/focusHistory';
import { dayKey, getUserScopedStorageKey, useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import {
  Award,
  BadgeCheck,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Download,
  Flame,
  Moon,
  Move,
  Play,
  Share,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react-native';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type SessionType = 'early' | 'complete';
type MoodType = 'distracted' | 'steady' | 'flow';
type ShareThemeId = 'obsidian' | 'aura' | 'receipt' | 'minimal';

interface SessionConfig {
  time: string;
  planned: string;
  percent: number;
  statusLabel: string;
  title: string;
  subtitle: string;
  dailyPrimary: string;
  dailyGoalSuffix: string;
  dailyPlain: string;
  dailyPercent: number;
  xp: string;
  ctaText: string;
  ctaIcon: 'play' | 'coffee';
}

interface ShareThemeMeta {
  id: ShareThemeId;
  label: string;
  dotColors: [string, string, ...string[]];
}

interface ConfettiParticle {
  id: number;
  leftPercent: number;
  topOffset: number;
  color: string;
  delay: number;
  anim: Animated.Value;
}

// ============================================================================
// CONSTANTS & EXACT DESIGN TOKENS (1:1 MATCH WITH HTML/TAILWIND ORIGINAL)
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SAKHA = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
  700: '#047857',
  950: '#022c22',
};

const SLATE = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
  darkBg: '#0B1120',
};

const FONT_MONO = Platform.select({
  ios: 'JetBrainsMono-Bold',
  android: 'monospace',
  default: 'monospace',
});

const RING_RADIUS = 76;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // 477.52
const MINI_RING_RADIUS = 26;
const MINI_RING_CIRCUMFERENCE = 2 * Math.PI * MINI_RING_RADIUS;
const BARCODE_WIDTHS = [2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1, 1, 2];
const SESSION_CONFIGS: Record<SessionType, SessionConfig> = {
  early: {
    time: '03:17',
    planned: 'of 25:00 goal',
    percent: 13,
    statusLabel: 'Saved Early',
    title: 'Every focused start counts!',
    subtitle:
      'Your 3m 17s sprint is safely logged. Pick up right where you left off whenever you’re ready.',
    dailyPrimary: '48m ',
    dailyGoalSuffix: '/ 2h',
    dailyPlain: '48m',
    dailyPercent: 40,
    xp: '+15 XP',
    ctaText: 'Resume Remaining (21:43)',
    ctaIcon: 'play',
  },
  complete: {
    time: '25:00',
    planned: 'of 25:00 goal',
    percent: 100,
    statusLabel: 'Goal Achieved',
    title: 'Locked in! Session complete.',
    subtitle:
      'You stayed consistent for the full Pomodoro block. Take a quick breather to recharge your mind.',
    dailyPrimary: '1h 10m ',
    dailyGoalSuffix: '/ 2h',
    dailyPlain: '1h 10m',
    dailyPercent: 58,
    xp: '+120 XP',
    ctaText: 'Take 5m Smart Break',
    ctaIcon: 'coffee',
  },
};

const SHARE_THEMES: ShareThemeMeta[] = [
  { id: 'obsidian', label: 'Obsidian', dotColors: ['#0f172a', '#059669'] },
  { id: 'aura', label: 'Aura', dotColors: ['#4f46e5', '#14b8a6', '#34d399'] },
  { id: 'receipt', label: 'Focus Pass', dotColors: ['#fef3c7', '#d6d3d1'] },
  { id: 'minimal', label: 'Swiss', dotColors: ['#f1f5f9', '#94a3b8'] },
];

const MOOD_META: Record<MoodType, { emoji: string; label: string; shortLabel: string }> = {
  distracted: { emoji: '😵‍💫', label: 'Distracted', shortLabel: 'Distracted' },
  steady: { emoji: '🙂', label: 'Steady Focus', shortLabel: 'Steady' },
  flow: { emoji: '🔥', label: 'Deep Flow', shortLabel: 'Deep Flow' },
};

const INITIAL_SUBJECTS = ['Physics', 'Mathematics', 'DSA', 'Revision', 'Mock Test'];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function formatMinutes(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  return hours > 0 ? `${hours}h${remainder > 0 ? ` ${remainder}m` : ''}` : `${total}m`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type CompletionSession = AppRoute<'FocusCompletion'>['params']['session'];

function isValidCompletionSession(value: unknown): value is CompletionSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;
  const validTimestamp = (timestamp: unknown) => typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp));
  const validNumber = (number: unknown) => typeof number === 'number' && Number.isFinite(number) && number >= 0;
  return typeof session.id === 'string' && session.id.length > 0 &&
    typeof session.sessionId === 'string' && session.sessionId.length > 0 &&
    validTimestamp(session.startedAt) && validTimestamp(session.endedAt) &&
    (session.completedAt === undefined || validTimestamp(session.completedAt)) &&
    validNumber(session.focusedSeconds) &&
    (session.actualSeconds === undefined || validNumber(session.actualSeconds)) &&
    (session.plannedSeconds === null || validNumber(session.plannedSeconds)) &&
    (session.plannedMinutes === undefined || validNumber(session.plannedMinutes)) &&
    (session.mode === 'timer' || session.mode === 'stopwatch' || session.mode === 'pomodoro') &&
    (session.status === 'completed' || session.status === 'saved_early') &&
    (session.subject === undefined || typeof session.subject === 'string') &&
    (session.topic === undefined || typeof session.topic === 'string') &&
    (session.taskId === undefined || typeof session.taskId === 'string') &&
    (session.scheduleId === undefined || typeof session.scheduleId === 'string') &&
    (session.scheduleOccurrenceId === undefined || typeof session.scheduleOccurrenceId === 'string') &&
    (session.groupId === undefined || typeof session.groupId === 'string');
}

function InvalidCompletionSession({ onBack }: { onBack: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center' }}>This focus session could not be opened.</Text>
      <Text style={{ marginTop: 8, textAlign: 'center' }}>The saved session data is incomplete or invalid.</Text>
      <Pressable accessibilityRole="button" onPress={onBack} style={{ minHeight: 48, marginTop: 20, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontWeight: '700' }}>Return to Dashboard</Text>
      </Pressable>
    </View>
  );
}

export default function FocusCompletionScreen() {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'FocusCompletion'>>();
  const session = route.params?.session;
  if (!isValidCompletionSession(session) || typeof route.params?.message !== 'string') {
    return <InvalidCompletionSession onBack={() => navigation.popTo('DashboardRoot')} />;
  }
  return <FocusCompletionContent />;
}

function FocusCompletionContent() {
  const navigation = useNavigation<AppNavigation>();
  const { params } = useRoute<AppRoute<'FocusCompletion'>>();
  const { state, streak, dispatch } = useStore();
  const { mode, scheme } = useTheme();
  const { session } = params;
  const userId = state.user?.id;
  const hasReachedPlannedDuration = session.plannedSeconds === null ||
    session.focusedSeconds >= session.plannedSeconds;
  const sessionType: SessionType = session.status === 'completed' && hasReachedPlannedDuration
    ? 'complete'
    : 'early';
  const [selectedSubject, setSelectedSubject] = useState<string>(
    () => session.subject || session.topic || INITIAL_SUBJECTS[0],
  );
  const [subjects, setSubjects] = useState<string[]>(() => Array.from(new Set([
    ...INITIAL_SUBJECTS,
    session.topic,
    session.subject,
  ].filter((subject): subject is string => Boolean(subject)))));
  const [mood, setMood] = useState<MoodType>(() => session.focusQuality ?? 'steady');
  const darkMode = scheme === 'dark';
  const [shareTheme, setShareTheme] = useState<ShareThemeId>('obsidian');
  const [showVerifiedSeal, setShowVerifiedSeal] = useState<boolean>(true);

  // --- Modals & UI Feedback State ---
  const [shareModalVisible, setShareModalVisible] = useState<boolean>(false);
  const [isExportingCard, setIsExportingCard] = useState<boolean>(false);
  const [tagModalVisible, setTagModalVisible] = useState<boolean>(false);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('Saved');
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

  // --- Refs & Animated Values ---
  const proofCardRef = useRef<View>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cardLayout, setCardLayout] = useState({ width: 340, height: 320 });

  // Hero Ring SVG Stroke Offset
  const [ringOffsetAnim] = useState(() => new Animated.Value(RING_CIRCUMFERENCE));
  // Daily Goal Bar Progress
  const [dailyBarAnim] = useState(() => new Animated.Value(SESSION_CONFIGS.early.dailyPercent));
  // Auto-saved pulse scale
  const [autoSaveScaleAnim] = useState(() => new Animated.Value(1));
  // Toast animations
  const [toastOpacityAnim] = useState(() => new Animated.Value(0));
  const [toastTranslateYAnim] = useState(() => new Animated.Value(8));
  // Share Modal float-in animation
  const [modalFloatAnim] = useState(() => new Animated.Value(0));

  // Interactive 3D Collectible Card Tilt & Holographic Sheen
  const [tiltXAnim] = useState(() => new Animated.Value(0));
  const [tiltYAnim] = useState(() => new Animated.Value(0));
  const [cardScaleAnim] = useState(() => new Animated.Value(1));
  const [sheenXAnim] = useState(() => new Animated.Value(0.5));
  const [sheenYAnim] = useState(() => new Animated.Value(0.5));
  const [sheenOpacityAnim] = useState(() => new Animated.Value(0));

  const focusedSeconds = Math.max(0, session.focusedSeconds);
  const plannedSeconds = session.plannedSeconds;
  const percent = plannedSeconds && plannedSeconds > 0
    ? Math.max(0, Math.min(100, Math.round((focusedSeconds / plannedSeconds) * 100)))
    : sessionType === 'complete' ? 100 : 0;
  const sessionDateKey = dayKey(new Date(session.endedAt));
  const dailyMinutes = (state.studyLog[sessionDateKey] ?? 0) +
    (state.recordedFocusSessionIds.includes(session.id) ? 0 : focusedSeconds / 60);
  const dailyGoalMinutes = Math.max(0, state.settings.dailyGoalMin);
  const minutesToDailyGoal = Math.max(0, Math.ceil(dailyGoalMinutes - dailyMinutes));
  const dailyPlain = formatMinutes(dailyMinutes);
  const remainingSeconds = plannedSeconds === null
    ? null
    : Math.max(0, plannedSeconds - focusedSeconds);
  const cfg: SessionConfig = {
    ...SESSION_CONFIGS[sessionType],
    time: formatDuration(focusedSeconds),
    planned: plannedSeconds === null
      ? 'Open-ended session'
      : `of ${formatDuration(plannedSeconds)} goal`,
    percent,
    statusLabel: sessionType === 'complete' ? 'Goal Achieved' : 'Saved Early',
    title: params.message || (sessionType === 'complete'
      ? 'Locked in! Session complete.'
      : 'Every focused start counts!'),
    subtitle: sessionType === 'complete'
      ? `You stayed consistent for ${formatDuration(focusedSeconds)}. Take a quick breather to recharge your mind.`
      : `Your ${formatDuration(focusedSeconds)} sprint is safely logged. Pick up right where you left off whenever you’re ready.`,
    dailyPrimary: `${dailyPlain} `,
    dailyGoalSuffix: `/ ${formatMinutes(dailyGoalMinutes)} goal`,
    dailyPlain,
    dailyPercent: dailyGoalMinutes
      ? Math.min(100, Math.round((dailyMinutes / dailyGoalMinutes) * 100))
      : 0,
    xp: '—',
    ctaText: sessionType === 'complete'
      ? 'Take 5m Smart Break'
      : remainingSeconds === null
        ? 'Continue Focus Session'
        : `Resume Remaining (${formatDuration(remainingSeconds)})`,
  };
  const sessionDisplayId = session.id.slice(-8).toUpperCase();
  const sessionStartedAt = new Date(session.startedAt);
  const sessionEndedAt = new Date(session.endedAt);
  const sessionDateLabel = sessionEndedAt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const sessionTimeLabel = `${sessionStartedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}–${sessionEndedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  const weekStreak = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sessionEndedAt);
    date.setDate(date.getDate() - (6 - index));
    const key = dayKey(date);
    return {
      day: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1).toUpperCase(),
      done: (state.studyLog[key] ?? 0) > 0,
    };
  });
  const resumeSession = (subject: string) => {
    const durationMinutes = remainingSeconds === null
      ? 25
      : Math.max(1, Math.ceil(remainingSeconds / 60));
    showToast(`Opening ${subject} focus session`);
    navigation.navigate('FocusCenter', {
      focusSession: {
        mode: session.mode,
        durationMinutes,
        selection: 'manual',
        tag: subject,
        task: null,
      },
    });
  };

  // --- Toast Helper ---
  const showToast = useCallback(
    (msg: string) => {
      setToastMessage(msg);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      Animated.parallel([
        Animated.timing(toastOpacityAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateYAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      toastTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacityAnim, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateYAnim, {
            toValue: 8,
            duration: 260,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2400);
    },
    [toastOpacityAnim, toastTranslateYAnim]
  );

  // --- Auto-Saved Pulse Helper ---
  const pulseAutoSaved = useCallback(() => {
    Animated.sequence([
      Animated.timing(autoSaveScaleAnim, {
        toValue: 1.06,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(autoSaveScaleAnim, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [autoSaveScaleAnim]);

  // --- Confetti Celebration ---
  const triggerConfetti = useCallback(() => {
    const colors = ['#10b981', '#34d399', '#f59e0b', '#06b6d4', '#8b5cf6'];
    const particles: ConfettiParticle[] = Array.from({ length: 24 }, (_, idx) => ({
      id: Date.now() + idx,
      leftPercent: 15 + Math.random() * 70,
      topOffset: Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 250,
      anim: new Animated.Value(0),
    }));

    setConfetti(particles);

    particles.forEach((p) => {
      Animated.timing(p.anim, {
        toValue: 1,
        duration: 1300,
        delay: p.delay,
        easing: Easing.bezier(0.2, 0.8, 0.3, 1),
        useNativeDriver: true,
      }).start();
    });

    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = setTimeout(() => {
      setConfetti([]);
    }, 1700);
  }, []);

  // --- Animate Progress Ring & Daily Bar on Mount & State Change ---
  useEffect(() => {
    const targetOffset = RING_CIRCUMFERENCE - (cfg.percent / 100) * RING_CIRCUMFERENCE;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(ringOffsetAnim, {
          toValue: targetOffset,
          duration: 900,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: false,
        }),
        Animated.timing(dailyBarAnim, {
          toValue: cfg.dailyPercent,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }, 120);

    return () => clearTimeout(timer);
  }, [cfg.percent, cfg.dailyPercent, ringOffsetAnim, dailyBarAnim]);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (sessionType === 'complete') {
      // The confetti state change intentionally starts the completion animation on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      triggerConfetti();
    }
  }, [sessionType, triggerConfetti]);

  useEffect(() => {
    if (params.groupSyncWarning) {
      showToast(`Saved on this device. Group stats could not sync: ${params.groupSyncWarning}`);
    }
  }, [params.groupSyncWarning, showToast]);

  const persistReflection = useCallback(async (patch: { subject?: string; focusQuality?: MoodType }) => {
    try {
      await updateFocusHistoryRecord(
        getUserScopedStorageKey('study-sakha-focus-history-v1', userId),
        session.id,
        patch,
      );
    } catch (error) {
      console.error('Focus session reflection could not be saved:', error);
      showToast('Unable to save your focus reflection');
    }
  }, [session.id, showToast, userId]);

  const handleSelectSubject = useCallback((subject: string) => {
    setSelectedSubject(subject);
    pulseAutoSaved();
    void persistReflection({ subject });
  }, [persistReflection, pulseAutoSaved]);

  const handleSelectMood = useCallback((nextMood: MoodType) => {
    setMood(nextMood);
    pulseAutoSaved();
    void persistReflection({ focusQuality: nextMood });
  }, [persistReflection, pulseAutoSaved]);

  // --- Custom Subject Tag Handler ---
  const handleAddCustomTag = async () => {
    const clean = customTagInput.trim().slice(0, 18);
    if (clean) {
      if (!subjects.includes(clean)) {
        setSubjects((prev) => [...prev, clean]);
      }
      handleSelectSubject(clean);
    }
    setCustomTagInput('');
    setTagModalVisible(false);
  };

  // --- Primary CTA Handler ---
  const handlePrimaryAction = () => {
    if (sessionType === 'early') {
      resumeSession(selectedSubject);
    } else {
      showToast('Starting 5-minute Smart Break timer');
      navigation.navigate('FocusCenter', {
        focusSession: {
          mode: 'timer',
          durationMinutes: Math.max(1, Math.ceil((plannedSeconds ?? 25 * 60) / 60)),
          selection: 'manual',
          tag: selectedSubject,
          task: null,
          startInBreak: true,
        },
      });
    }
  };

  const handleThemeToggle = () => {
    dispatch({
      type: 'settings',
      patch: { themeMode: mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light' },
    });
  };

  // --- Share Modal Open / Close ---
  const openShareModal = () => {
    setShareModalVisible(true);
    modalFloatAnim.setValue(0);
    Animated.timing(modalFloatAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };

  const closeShareModal = () => {
    setShareModalVisible(false);
  };

  // --- 3D Card Tilt PanResponder (Exact Match for Mouse/Touch 3D Tilt & Holo Sheen) ---
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const { width, height } = cardLayout;
          const nx = Math.max(0, Math.min(1, locationX / (width || 340)));
          const ny = Math.max(0, Math.min(1, locationY / (height || 320)));

          Animated.parallel([
            Animated.spring(cardScaleAnim, { toValue: 1.015, useNativeDriver: true }),
            Animated.timing(tiltYAnim, { toValue: (nx - 0.5) * 14, duration: 120, useNativeDriver: true }),
            Animated.timing(tiltXAnim, { toValue: (0.5 - ny) * 14, duration: 120, useNativeDriver: true }),
            Animated.timing(sheenXAnim, { toValue: nx, duration: 80, useNativeDriver: true }),
            Animated.timing(sheenYAnim, { toValue: ny, duration: 80, useNativeDriver: true }),
            Animated.timing(sheenOpacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
          ]).start();
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const { width, height } = cardLayout;
          const nx = Math.max(0, Math.min(1, locationX / (width || 340)));
          const ny = Math.max(0, Math.min(1, locationY / (height || 320)));

          tiltYAnim.setValue((nx - 0.5) * 14);
          tiltXAnim.setValue((0.5 - ny) * 14);
          sheenXAnim.setValue(nx);
          sheenYAnim.setValue(ny);
        },
        onPanResponderRelease: () => {
          Animated.parallel([
            Animated.spring(tiltXAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
            Animated.spring(tiltYAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
            Animated.spring(cardScaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
            Animated.timing(sheenOpacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(tiltXAnim, { toValue: 0, useNativeDriver: true }),
            Animated.spring(tiltYAnim, { toValue: 0, useNativeDriver: true }),
            Animated.spring(cardScaleAnim, { toValue: 1, useNativeDriver: true }),
            Animated.timing(sheenOpacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start();
        },
      }),
    [cardLayout, cardScaleAnim, sheenOpacityAnim, sheenXAnim, sheenYAnim, tiltXAnim, tiltYAnim]
  );

  const rotateXInterpolate = tiltXAnim.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });
  const rotateYInterpolate = tiltYAnim.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });
  const sheenTranslateX = sheenXAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-130, 130],
  });
  const sheenTranslateY = sheenYAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 110],
  });

  // --- High-DPI PNG Capture, Native OS Share & Gallery Save ---
  const captureProofCardUri = async (): Promise<string> => {
    if (!proofCardRef.current) throw new Error('The proof card is not ready to export.');
    return captureRef(proofCardRef, {
      format: 'png',
      quality: 1.0,
      result: 'tmpfile',
      width: 900,
    });
  };

  const shareProofCardImage = async () => {
    setIsExportingCard(true);
    try {
      const uri = await captureProofCardUri();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) throw new Error('Sharing is not supported on this device.');
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'My Study Sakha Focus Proof',
        UTI: 'public.png',
      });
      closeShareModal();
      showToast('Study Proof Card shared!');
    } catch (error) {
      console.error('Study proof card could not be shared:', error);
      showToast(error instanceof Error ? error.message : 'Unable to share the Study Proof Card.');
    } finally {
      setIsExportingCard(false);
    }
  };

  const downloadProofCardImage = async () => {
    if (Platform.OS === 'web') {
      showToast('Gallery saving is available in the mobile app');
      return;
    }
    try {
      const uri = await captureProofCardUri();
      const { Asset, requestPermissionsAsync } = await import('expo-media-library');
      const { status } = await requestPermissionsAsync(true);
      if (status !== 'granted') {
        showToast('Gallery permission needed to save PNG');
        return;
      }
      await Asset.create(uri);
      showToast('High-res Proof Card PNG saved!');
    } catch (error) {
      console.error('Study proof card could not be saved:', error);
      showToast(error instanceof Error ? error.message : 'Unable to save the Study Proof Card.');
    }
  };

  const postCardToGroup = () => {
    closeShareModal();
    showToast('Opening Study Groups...');
    navigation.navigate('Groups');
  };

  // --- Dynamic Sakha AI Insight Text (Preserving Bold & Colored Spans 1:1) ---
  const renderAIInsightText = () => {
    const baseColor = darkMode ? SLATE[300] : SLATE[700];
    const strongColor = darkMode ? '#ffffff' : SLATE[900];
    const subjectColor = darkMode ? SAKHA[400] : SAKHA[700];

    if (sessionType === 'early') {
      if (mood === 'distracted') {
        return (
          <Text style={[styles.aiBody, { color: baseColor }]}>
            Getting started is the hardest part. Try putting your phone on DND and doing a quick{' '}
            <Text style={{ fontWeight: '700', color: strongColor }}>10-minute warm-up sprint</Text>{' '}
            on <Text style={{ fontWeight: '600', color: subjectColor }}>{selectedSubject}</Text>.
          </Text>
        );
      }
      if (mood === 'steady') {
        return (
          <Text style={[styles.aiBody, { color: baseColor }]}>
            Short warm-ups beat zero minutes! Your focus felt steady.{' '}
            {minutesToDailyGoal > 0
              ? <>Another <Text style={{ fontWeight: '700', color: strongColor }}>{minutesToDailyGoal} minutes</Text> would reach your daily goal.</>
              : 'You have already reached your daily goal.'}
          </Text>
        );
      }
      return (
        <Text style={[styles.aiBody, { color: baseColor }]}>
          You hit flow quickly in{' '}
          <Text style={{ fontWeight: '600', color: subjectColor }}>{selectedSubject}</Text>! Since
          your energy is high right now,{' '}
          {remainingSeconds === null
            ? 'starting another open-ended session'
            : <>resuming for <Text style={{ fontWeight: '700', color: strongColor }}>{formatDuration(remainingSeconds)}</Text></>}{' '}
          should feel effortless.
        </Text>
      );
    }

    // sessionType === 'complete'
    if (mood === 'distracted') {
      return (
        <Text style={[styles.aiBody, { color: baseColor }]}>
          Impressive grit—you finished {formatDuration(focusedSeconds)} despite distractions! Step
          away from screens for <Text style={{ fontWeight: '700', color: strongColor }}>5 minutes</Text>{' '}
          to reset your attention span.
        </Text>
      );
    }
    if (mood === 'steady') {
      return (
        <Text style={[styles.aiBody, { color: baseColor }]}>
          Solid consistency on{' '}
          <Text style={{ fontWeight: '600', color: subjectColor }}>{selectedSubject}</Text>! You
          showed up for your goal today—great timing to take a quick recharge.
        </Text>
      );
    }
    return (
      <Text style={[styles.aiBody, { color: baseColor }]}>
        Peak Deep Flow unlocked! After a short 5m break, you’re primed to tackle the hardest
        problems in <Text style={{ fontWeight: '600', color: subjectColor }}>{selectedSubject}</Text>
        .
      </Text>
    );
  };

  // --- Proof Card Renderer (All 4 Themes: Obsidian, Aura, Focus Pass / Receipt, Swiss) ---
  const renderProofCardContent = () => {
    const moodInfo = MOOD_META[mood];
    const miniOffset = MINI_RING_CIRCUMFERENCE - (cfg.percent / 100) * MINI_RING_CIRCUMFERENCE;

    // THEME 3: Focus Pass (Thermal Receipt / Boarding Pass)
    if (shareTheme === 'receipt') {
      const notchBg = darkMode ? SLATE[900] : '#ffffff';
      return (
        <View style={[styles.proofCardBase, styles.receiptCard]}>
          <View style={styles.proofCardPadding}>
            {/* Ticket Top */}
            <View style={styles.receiptTopRow}>
              <View style={styles.brandRow}>
                <View style={styles.receiptLogoBox}>
                  <Sparkles size={14} color={SAKHA[400]} />
                </View>
                <View>
                  <Text style={styles.receiptBrandTitle}>
                    STUDY <Text style={{ color: SAKHA[600] }}>SAKHA</Text>
                  </Text>
                  <Text style={styles.receiptPassCode}>PROOF PASS • #{sessionDisplayId}</Text>
                </View>
              </View>
              <View style={styles.receiptGoalPill}>
                <Text style={styles.receiptGoalText}>{cfg.percent}% GOAL</Text>
              </View>
            </View>

            {/* Main Focus Readout */}
            <View style={styles.receiptHeroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.receiptKicker}>ACTUAL FOCUS</Text>
                <Text style={styles.receiptBigTime}>{cfg.time}</Text>
                <View style={styles.receiptChip}>
                  <Text style={styles.receiptChipText}>
                    📚 {selectedSubject} <Text style={{ color: '#a8a29e' }}>•</Text>{' '}
                    {moodInfo.emoji} {moodInfo.label}
                  </Text>
                </View>
              </View>

              {showVerifiedSeal && (
                <View style={styles.receiptStamp}>
                  <Text style={styles.receiptStampTop}>VERIFIED</Text>
                  <Text style={styles.receiptStampCheck}>✓</Text>
                  <Text style={styles.receiptStampDate}>{sessionDateLabel.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* Perforated Divider with Semi-Circle Notches */}
            <View style={styles.perforationWrap}>
              <View style={styles.perforationLine} />
              <View
                style={[
                  styles.ticketNotchLeft,
                  { backgroundColor: notchBg, borderColor: '#e7e5e4' },
                ]}
              />
              <View
                style={[
                  styles.ticketNotchRight,
                  { backgroundColor: notchBg, borderColor: '#e7e5e4' },
                ]}
              />
            </View>

            {/* Itemized Breakdown */}
            <View style={styles.receiptStatsGrid}>
              <View style={{ flex: 1 }}>
                <Text style={styles.receiptStatLabel}>TODAY</Text>
                <Text style={styles.receiptStatValue}>{cfg.dailyPlain}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.receiptStatLabel}>STREAK</Text>
                <Text style={[styles.receiptStatValue, { color: '#ea580c' }]}>{streak} Days 🔥</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.receiptStatLabel}>REWARD</Text>
                <Text style={[styles.receiptStatValue, { color: SAKHA[600] }]}>{cfg.xp}</Text>
              </View>
            </View>

            {/* Decorative Barcode */}
            <View style={styles.receiptBarcodeRow}>
              <View style={styles.barcodeContainer}>
                {BARCODE_WIDTHS.map((w, idx) => (
                  <View key={idx} style={[styles.barcodeBar, { width: w }]} />
                ))}
              </View>
              <Text style={styles.receiptTimestamp}>{sessionTimeLabel}</Text>
            </View>
          </View>
        </View>
      );
    }

    // THEMES: Obsidian Holo, Sakha Aura, Swiss Minimal
    const isMinimal = shareTheme === 'minimal';
    const isAura = shareTheme === 'aura';

    const gradientColors: [string, string, string] = isMinimal
      ? ['#ffffff', '#f8fafc', '#ecfdf5']
      : isAura
        ? ['#1e1b4b', '#134e4a', '#065f46']
        : ['#070C17', '#0B1726', '#062920'];

    const primaryText = isMinimal ? SLATE[900] : '#ffffff';
    const subText = isMinimal ? SLATE[500] : 'rgba(203, 213, 225, 0.8)';
    const chipBg = isMinimal ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.1)';
    const chipBorder = isMinimal ? SLATE[200] : 'rgba(255, 255, 255, 0.12)';
    const statPanelBg = isMinimal ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.07)';
    const statPanelBorder = isMinimal ? 'rgba(226, 232, 240, 0.85)' : 'rgba(255, 255, 255, 0.12)';
    const trackStroke = isMinimal ? SLATE[200] : 'rgba(255, 255, 255, 0.14)';
    const arcStroke =
      sessionType === 'complete' ? '#10b981' : isAura ? '#34d399' : '#f59e0b';

    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.proofCardBase,
          {
            borderColor: isMinimal
              ? SLATE[200]
              : isAura
                ? 'rgba(255,255,255,0.16)'
                : 'rgba(255,255,255,0.1)',
          },
        ]}
      >
        {/* Top Accent Bar for Swiss Minimal or Ambient Orbs for Dark Themes */}
        {isMinimal ? (
          <LinearGradient
            colors={['#10b981', '#2dd4bf', '#06b6d4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.minimalTopBar}
          />
        ) : (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient id="orbTopRight" cx="92%" cy="8%" r="48%">
                  <Stop
                    offset="0%"
                    stopColor={isAura ? '#22d3ee' : '#10b981'}
                    stopOpacity={isAura ? '0.28' : '0.24'}
                  />
                  <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="orbBottomLeft" cx="10%" cy="94%" r="46%">
                  <Stop
                    offset="0%"
                    stopColor={isAura ? '#8b5cf6' : '#14b8a6'}
                    stopOpacity={isAura ? '0.32' : '0.18'}
                  />
                  <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#orbTopRight)" />
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#orbBottomLeft)" />
            </Svg>
          </View>
        )}

        <View style={styles.proofCardPadding}>
          {/* Header Row */}
          <View style={styles.proofHeaderRow}>
            <View style={styles.brandRow}>
              <View
                style={[
                  styles.proofLogoBox,
                  {
                    backgroundColor: isMinimal ? SLATE[900] : 'rgba(16, 185, 129, 0.2)',
                    borderColor: isMinimal ? 'transparent' : 'rgba(52, 211, 153, 0.3)',
                    borderWidth: isMinimal ? 0 : 1,
                  },
                ]}
              >
                <Sparkles size={14} color={isMinimal ? SAKHA[400] : '#6ee7b7'} />
              </View>
              <View>
                <Text style={[styles.proofBrandName, { color: primaryText }]}>
                  Study{' '}
                  <Text style={{ color: isMinimal ? SAKHA[600] : SAKHA[400] }}>Sakha</Text>
                </Text>
                <Text style={[styles.proofBrandSub, { color: subText }]}>FOCUS PROOF</Text>
              </View>
            </View>

            {showVerifiedSeal ? (
              <View
                style={[
                  styles.verifiedPill,
                  {
                    backgroundColor: isMinimal ? SAKHA[50] : 'rgba(52, 211, 153, 0.15)',
                    borderColor: isMinimal ? SAKHA[200] : 'rgba(52, 211, 153, 0.25)',
                  },
                ]}
              >
                <BadgeCheck size={12} color={isMinimal ? SAKHA[700] : SAKHA[300]} />
                <Text
                  style={[
                    styles.verifiedPillText,
                    { color: isMinimal ? SAKHA[700] : SAKHA[300] },
                  ]}
                >
                  Verified
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.verifiedPill,
                  { backgroundColor: chipBg, borderColor: chipBorder },
                ]}
              >
                <Text style={[styles.verifiedPillText, { color: primaryText }]}>
                  {streak} Day Streak 🔥
                </Text>
              </View>
            )}
          </View>

          {/* Center Hero: Focus Time + Mini Circular Progress Ring */}
          <View style={styles.proofHeroRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.proofHeroKicker, { color: subText }]}>FOCUSED TIME</Text>
              <Text style={[styles.proofBigTime, { color: primaryText }]}>{cfg.time}</Text>
              <View style={styles.proofChipsWrap}>
                <View
                  style={[styles.proofChip, { backgroundColor: chipBg, borderColor: chipBorder }]}
                >
                  <Text style={[styles.proofChipTextBold, { color: primaryText }]}>
                    📚 {selectedSubject}
                  </Text>
                </View>
                <View
                  style={[styles.proofChip, { backgroundColor: chipBg, borderColor: chipBorder }]}
                >
                  <Text style={[styles.proofChipText, { color: primaryText }]}>
                    {moodInfo.emoji} {moodInfo.label}
                  </Text>
                </View>
              </View>
            </View>

            {/* Mini Circular Progress Ring */}
            <View style={styles.miniRingContainer}>
              <Svg width={68} height={68} viewBox="0 0 64 64">
                <Circle
                  cx="32"
                  cy="32"
                  r={MINI_RING_RADIUS}
                  fill="none"
                  stroke={trackStroke}
                  strokeWidth="5.5"
                />
                <Circle
                  cx="32"
                  cy="32"
                  r={MINI_RING_RADIUS}
                  fill="none"
                  stroke={arcStroke}
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeDasharray={MINI_RING_CIRCUMFERENCE}
                  strokeDashoffset={miniOffset}
                  rotation="-90"
                  origin="32, 32"
                />
              </Svg>
              <View style={styles.miniRingCenter}>
                <Text style={[styles.miniRingPercent, { color: primaryText }]}>
                  {cfg.percent}%
                </Text>
                <Text style={[styles.miniRingLabel, { color: subText }]}>GOAL</Text>
              </View>
            </View>
          </View>

          {/* 7-Day Streak Consistency Strip + Metrics */}
          <View
            style={[
              styles.streakPanel,
              { backgroundColor: statPanelBg, borderColor: statPanelBorder },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.streakPanelLabel, { color: subText }]}>
                7-DAY STREAK • {streak}D 🔥
              </Text>
              <View style={styles.streakSquaresRow}>
                {weekStreak.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.streakDayBox,
                      {
                        backgroundColor: item.done
                          ? isMinimal
                            ? SAKHA[500]
                            : SAKHA[400]
                          : isMinimal
                            ? SLATE[200]
                            : 'rgba(255, 255, 255, 0.1)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.streakDayLetter,
                        {
                          color: item.done
                            ? isMinimal
                              ? '#ffffff'
                              : SLATE[950]
                            : isMinimal
                              ? SLATE[400]
                              : 'rgba(255, 255, 255, 0.4)',
                        },
                      ]}
                    >
                      {item.day}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View
              style={[
                styles.streakRightMetric,
                { borderLeftColor: isMinimal ? SLATE[200] : 'rgba(255, 255, 255, 0.1)' },
              ]}
            >
              <Text style={[styles.streakPanelLabel, { color: subText, marginBottom: 1 }]}>
                TODAY
              </Text>
              <Text style={[styles.streakTodayVal, { color: primaryText }]}>{cfg.dailyPlain}</Text>
              <Text
                style={[styles.streakXpVal, { color: isMinimal ? SAKHA[600] : SAKHA[400] }]}
              >
                {cfg.xp}
              </Text>
            </View>
          </View>

          {/* Footer Stamp */}
          <View style={styles.proofFooterRow}>
            <Text style={[styles.proofFooterText, { color: subText }]}>
              {sessionDateLabel} • {sessionEndedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Text>
            <Text style={[styles.proofFooterCode, { color: subText }]}>#{sessionDisplayId}</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  // --- Derived Theme Colors ---
  const screenBg = darkMode ? SLATE.darkBg : SLATE[50];
  const outerBg = darkMode ? SLATE[950] : SLATE[100];
  const cardBg = darkMode ? 'rgba(15, 23, 42, 0.92)' : '#ffffff';
  const cardBorder = darkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(226, 232, 240, 0.8)';
  const textPrimary = darkMode ? '#ffffff' : SLATE[900];
  const textMuted = darkMode ? SLATE[400] : SLATE[500];

  const dailyBarWidth = dailyBarAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const appHeaderActions = (
    <View style={styles.headerActions}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={openShareModal}
        accessibilityRole="button"
        accessibilityLabel="Share Study Card"
        style={[
          styles.headerCircleBtn,
          {
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.82)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: darkMode ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.85)',
          },
        ]}
      >
        <Share2 size={16} color={darkMode ? SLATE[300] : SLATE[600]} />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => navigation.popTo('DashboardRoot')}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={[
          styles.headerCircleBtn,
          {
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.82)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: darkMode ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.85)',
          },
        ]}
      >
        <X size={16} color={darkMode ? SLATE[300] : SLATE[600]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Shell
      active="Dashboard"
      title=""
      scroll={false}
      contentPadding={0}
      appHeaderActions={appHeaderActions}
      fitContentToBottomNav
    >
      <View style={[styles.safeRoot, { backgroundColor: outerBg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      {/* =================================================================== */}
      {/* INTERACTIVE PROTOTYPE CONTROLS (PRESERVED AS-IS FROM ORIGINAL UI)   */}
      {/* =================================================================== */}
      <View style={styles.topControlsBar}>
        {/* Session outcome */}
        <View
          style={[
            styles.stateSwitcherPill,
            {
              backgroundColor: darkMode ? SLATE[900] : '#ffffff',
              borderColor: darkMode ? SLATE[800] : 'rgba(226, 232, 240, 0.85)',
            },
          ]}
        >
          <TouchableOpacity
            disabled
            accessibilityRole="text"
            accessibilityState={{ selected: true }}
            style={[
              styles.stateSwitchBtn,
              sessionType === 'early'
                ? { backgroundColor: 'rgba(245, 158, 11, 0.15)' }
                : { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
            ]}
          >
            <Text
              style={[
                styles.stateSwitchText,
                {
                  color:
                    sessionType === 'early'
                      ? darkMode
                        ? '#fbbf24'
                        : '#b45309'
                      : darkMode
                        ? SAKHA[400]
                        : SAKHA[700],
                },
              ]}
            >
              {sessionType === 'early' ? 'Saved Early' : 'Goal Met'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Theme Toggle */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleThemeToggle}
          accessibilityLabel="Toggle Theme"
          style={[
            styles.themeToggleBtn,
            {
              backgroundColor: darkMode ? SLATE[900] : '#ffffff',
              borderColor: darkMode ? SLATE[800] : 'rgba(226, 232, 240, 0.85)',
            },
          ]}
        >
          {darkMode ? (
            <Sun size={14} color={SAKHA[400]} />
          ) : (
            <Moon size={14} color={SAKHA[600]} />
          )}
          <Text
            style={[
              styles.themeToggleText,
              { color: darkMode ? SLATE[200] : SLATE[700] },
            ]}
          >
            {darkMode ? 'Light' : 'Dark'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* =================================================================== */}
      {/* MAIN MOBILE APP VIEWPORT                                            */}
      {/* =================================================================== */}
      <View style={[styles.viewport, { backgroundColor: screenBg }]}>
        {/* Ambient Top Radial Gradient Glow */}
        <View
          style={[styles.ambientGlowWrap, { opacity: darkMode ? 0.5 : 0.9 }]}
          pointerEvents="none"
        >
          <Svg width="100%" height="288">
            <Defs>
              <RadialGradient id="ambientTopGlow" cx="50%" cy="0%" r="75%">
                <Stop
                  offset="0%"
                  stopColor={sessionType === 'complete' ? '#10b981' : '#f59e0b'}
                  stopOpacity={sessionType === 'complete' ? '0.22' : '0.16'}
                />
                <Stop
                  offset="48%"
                  stopColor={sessionType === 'complete' ? '#06b6d4' : '#10b981'}
                  stopOpacity={sessionType === 'complete' ? '0.08' : '0.06'}
                />
                <Stop offset="100%" stopColor={screenBg} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="288" fill="url(#ambientTopGlow)" />
          </Svg>
        </View>

        {/* Confetti Layer */}
        <View style={styles.confettiLayer} pointerEvents="none">
          {confetti.map((p) => {
            const translateY = p.anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-10, 140],
            });
            const rotate = p.anim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            });
            const opacity = p.anim.interpolate({
              inputRange: [0, 0.75, 1],
              outputRange: [1, 0.85, 0],
            });
            return (
              <Animated.View
                key={p.id}
                style={[
                  styles.confettiPiece,
                  {
                    left: `${p.leftPercent}%`,
                    top: p.topOffset,
                    backgroundColor: p.color,
                    opacity,
                    transform: [{ translateY }, { rotate }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Scrollable Body Content */}
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. HERO PROGRESS RING & ADAPTIVE MESSAGE */}
          <View style={styles.heroSection}>
            <View style={styles.ringWrapper}>
              <Svg width={192} height={192} viewBox="0 0 180 180">
                <Defs>
                  <SvgLinearGradient id="ringGradEarly" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#f59e0b" />
                    <Stop offset="100%" stopColor="#10b981" />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="ringGradComplete" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#10b981" />
                    <Stop offset="100%" stopColor="#06b6d4" />
                  </SvgLinearGradient>
                </Defs>
                {/* Background Track */}
                <Circle
                  cx="90"
                  cy="90"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="11"
                  stroke={darkMode ? SLATE[800] : 'rgba(226, 232, 240, 0.85)'}
                />
                {/* Animated Active Progress Arc */}
                <AnimatedCircle
                  cx="90"
                  cy="90"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="11"
                  strokeLinecap="round"
                  stroke={
                    sessionType === 'complete'
                      ? 'url(#ringGradComplete)'
                      : 'url(#ringGradEarly)'
                  }
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffsetAnim}
                  rotation="-90"
                  origin="90, 90"
                />
              </Svg>

              {/* Center Readout */}
              <View style={styles.ringCenterOverlay}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        sessionType === 'complete'
                          ? darkMode
                            ? 'rgba(16, 185, 129, 0.16)'
                            : SAKHA[100]
                          : darkMode
                            ? 'rgba(245, 158, 11, 0.16)'
                            : '#fef3c7',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          sessionType === 'complete' ? SAKHA[500] : '#f59e0b',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color:
                          sessionType === 'complete'
                            ? darkMode
                              ? SAKHA[400]
                              : SAKHA[700]
                            : darkMode
                              ? '#fbbf24'
                              : '#b45309',
                      },
                    ]}
                  >
                    {cfg.statusLabel}
                  </Text>
                </View>

                <Text style={[styles.heroTimeText, { color: textPrimary }]}>{cfg.time}</Text>

                <View style={styles.heroPlannedRow}>
                  <Text style={[styles.heroPlannedText, { color: textMuted }]}>
                    {cfg.planned}
                  </Text>
                  <Text
                    style={[
                      styles.heroPlannedDot,
                      { color: darkMode ? SLATE[700] : SLATE[300] },
                    ]}
                  >
                    •
                  </Text>
                  <Text
                    style={[
                      styles.heroPercentText,
                      {
                        color:
                          sessionType === 'complete'
                            ? darkMode
                              ? SAKHA[400]
                              : SAKHA[600]
                            : darkMode
                              ? '#fbbf24'
                              : '#d97706',
                      },
                    ]}
                  >
                    {cfg.percent}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Adaptive Headline */}
            <Text style={[styles.heroTitle, { color: textPrimary }]}>{cfg.title}</Text>
            <Text style={[styles.heroSubtitle, { color: textMuted }]}>{cfg.subtitle}</Text>
          </View>

          {/* 2. COMPACT BENTO MOMENTUM STRIP */}
          <View style={styles.bentoGrid}>
            {/* Today Goal */}
            <View
              style={[
                styles.bentoCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.bentoTopRow}>
                <Text
                  style={[
                    styles.bentoKicker,
                    { color: darkMode ? SLATE[500] : SLATE[400] },
                  ]}
                >
                  TODAY
                </Text>
                <Target size={14} color={SAKHA[500]} />
              </View>
              <Text style={[styles.bentoValue, { color: textPrimary }]}>
                {cfg.dailyPrimary}
                <Text style={styles.bentoValueSuffix}>{cfg.dailyGoalSuffix}</Text>
              </Text>
              <View
                style={[
                  styles.bentoProgressTrack,
                  { backgroundColor: darkMode ? SLATE[800] : SLATE[100] },
                ]}
              >
                <Animated.View
                  style={[styles.bentoProgressFill, { width: dailyBarWidth }]}
                />
              </View>
            </View>

            {/* Streak */}
            <View
              style={[
                styles.bentoCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.bentoTopRow}>
                <Text
                  style={[
                    styles.bentoKicker,
                    { color: darkMode ? SLATE[500] : SLATE[400] },
                  ]}
                >
                  STREAK
                </Text>
                <Flame size={14} color="#f97316" />
              </View>
              <Text style={[styles.bentoValue, { color: textPrimary }]}>{streak} Days</Text>
              <Text
                style={[
                  styles.bentoSubHighlight,
                  { color: darkMode ? '#fb923c' : '#ea580c' },
                ]}
              >
                Active today
              </Text>
            </View>

            {/* Earned XP */}
            <View
              style={[
                styles.bentoCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.bentoTopRow}>
                <Text
                  style={[
                    styles.bentoKicker,
                    { color: darkMode ? SLATE[500] : SLATE[400] },
                  ]}
                >
                  EARNED
                </Text>
                <Zap size={14} color="#f59e0b" />
              </View>
              <Text
                style={[
                  styles.bentoValue,
                  { color: darkMode ? SAKHA[400] : SAKHA[600] },
                ]}
              >
                {cfg.xp}
              </Text>
              <Text
                style={[
                  styles.bentoSubMuted,
                  { color: darkMode ? SLATE[500] : SLATE[400] },
                ]}
              >
                {session.mode.charAt(0).toUpperCase() + session.mode.slice(1)}
              </Text>
            </View>
          </View>

          {/* 3. SMART SESSION TAGGING & REFLECTION CARD */}
          <View
            style={[
              styles.reflectionCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            {/* Subject Selector */}
            <View>
              <View style={styles.reflectionHeaderRow}>
                <View style={styles.reflectionLabelRow}>
                  <BookOpen size={14} color={SAKHA[500]} />
                  <Text
                    style={[
                      styles.reflectionLabel,
                      { color: darkMode ? SLATE[200] : SLATE[700] },
                    ]}
                  >
                    What did you study?
                  </Text>
                </View>

                <Animated.View
                  style={[
                    styles.autoSavedBadge,
                    { transform: [{ scale: autoSaveScaleAnim }] },
                  ]}
                >
                  <Check size={12} color={darkMode ? SAKHA[400] : SAKHA[600]} />
                  <Text
                    style={[
                      styles.autoSavedText,
                      { color: darkMode ? SAKHA[400] : SAKHA[600] },
                    ]}
                  >
                    Auto-saved
                  </Text>
                </Animated.View>
              </View>

              <View style={styles.subjectChipsWrap}>
                {subjects.map((subj) => {
                  const active = selectedSubject === subj;
                  return (
                    <TouchableOpacity
                      key={subj}
                      activeOpacity={0.78}
                      onPress={() => void handleSelectSubject(subj)}
                      style={[
                        styles.subjectChip,
                        active
                          ? styles.subjectChipActive
                          : {
                              backgroundColor: darkMode
                                ? 'rgba(30, 41, 59, 0.85)'
                                : SLATE[100],
                            },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subjectChipText,
                          active
                            ? styles.subjectChipTextActive
                            : { color: darkMode ? SLATE[300] : SLATE[600] },
                        ]}
                      >
                        {subj}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => setTagModalVisible(true)}
                  style={[
                    styles.addTagChip,
                    { borderColor: darkMode ? SLATE[700] : SLATE[300] },
                  ]}
                >
                  <Text
                    style={[
                      styles.addTagChipText,
                      { color: darkMode ? SLATE[400] : SLATE[500] },
                    ]}
                  >
                    + Tag
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.cardDivider,
                { backgroundColor: darkMode ? SLATE[800] : SLATE[100] },
              ]}
            />

            {/* Focus Quality Pulse */}
            <View>
              <Text
                style={[
                  styles.reflectionLabel,
                  { color: darkMode ? SLATE[200] : SLATE[700], marginBottom: 8 },
                ]}
              >
                How was your focus quality?
              </Text>

              <View style={styles.moodGrid}>
                {(['distracted', 'steady', 'flow'] as MoodType[]).map((m) => {
                  const selected = mood === m;
                  const meta = MOOD_META[m];
                  return (
                    <TouchableOpacity
                      key={m}
                      activeOpacity={0.78}
                      onPress={() => handleSelectMood(m)}
                      style={[
                        styles.moodBtn,
                        selected
                          ? {
                              borderWidth: 2,
                              borderColor: SAKHA[500],
                              backgroundColor: darkMode
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(236, 253, 245, 0.85)',
                            }
                          : {
                              borderWidth: 1,
                              borderColor: darkMode ? SLATE[800] : SLATE[200],
                              backgroundColor: darkMode
                                ? 'rgba(30, 41, 59, 0.42)'
                                : 'rgba(248, 250, 252, 0.75)',
                            },
                      ]}
                    >
                      <Text style={styles.moodEmoji}>{meta.emoji}</Text>
                      <Text
                        style={[
                          styles.moodLabel,
                          {
                            fontWeight: selected ? '700' : '600',
                            color: selected
                              ? darkMode
                                ? SAKHA[300]
                                : SAKHA[700]
                              : darkMode
                                ? SLATE[300]
                                : SLATE[600],
                          },
                        ]}
                      >
                        {meta.shortLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 4. SAKHA AI SMART INSIGHT CARD */}
          <LinearGradient
            colors={
              darkMode
                ? ['rgba(2, 44, 34, 0.45)', SLATE[900], 'rgba(19, 78, 74, 0.3)']
                : ['rgba(236, 253, 245, 0.92)', '#ffffff', 'rgba(240, 253, 250, 0.7)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.aiCard,
              {
                borderColor: darkMode
                  ? 'rgba(16, 185, 129, 0.22)'
                  : 'rgba(167, 243, 208, 0.85)',
              },
            ]}
          >
            <View style={styles.aiRow}>
              <View
                style={[
                  styles.aiIconBox,
                  {
                    backgroundColor: darkMode
                      ? 'rgba(52, 211, 153, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                  },
                ]}
              >
                <Sparkles size={16} color={darkMode ? SAKHA[400] : SAKHA[600]} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.aiHeaderRow}>
                  <Text
                    style={[
                      styles.aiKicker,
                      { color: darkMode ? SAKHA[400] : SAKHA[700] },
                    ]}
                  >
                    SAKHA AI INSIGHT
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      showToast('Opening Sakha AI Coach...');
                    navigation.navigate('SakhaAI', {
                      prompt: `Give me a practical next step after my ${formatDuration(focusedSeconds)} focus session on ${selectedSubject}.`,
                    });
                    }}
                    style={styles.aiAskBtn}
                  >
                    <Text
                      style={[
                        styles.aiAskText,
                        { color: darkMode ? SAKHA[400] : SAKHA[600] },
                      ]}
                    >
                      Ask AI
                    </Text>
                    <ChevronRight size={12} color={darkMode ? SAKHA[400] : SAKHA[600]} />
                  </TouchableOpacity>
                </View>

                {renderAIInsightText()}
              </View>
            </View>
          </LinearGradient>
        </ScrollView>

        {/* 5. STICKY THUMB-FRIENDLY BOTTOM ACTION DOCK */}
        <BlurView
          intensity={darkMode ? 45 : 65}
          tint={darkMode ? 'dark' : 'light'}
          style={[
            styles.bottomDock,
            {
              backgroundColor: darkMode
                ? 'rgba(11, 17, 32, 0.86)'
                : 'rgba(255, 255, 255, 0.86)',
              borderTopColor: darkMode
                ? 'rgba(30, 41, 59, 0.85)'
                : 'rgba(226, 232, 240, 0.85)',
            },
          ]}
        >
          {/* Primary Momentum CTA */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePrimaryAction}
            style={[
              styles.primaryCtaBtn,
              {
                backgroundColor: darkMode ? SAKHA[500] : SLATE[900],
              },
            ]}
          >
            {cfg.ctaIcon === 'play' ? (
              <Play
                size={16}
                color={darkMode ? SLATE[950] : '#ffffff'}
                fill={darkMode ? SLATE[950] : '#ffffff'}
              />
            ) : (
              <Coffee size={16} color={darkMode ? SLATE[950] : '#ffffff'} />
            )}
            <Text
              style={[
                styles.primaryCtaText,
                { color: darkMode ? SLATE[950] : '#ffffff' },
              ]}
            >
              {cfg.ctaText}
            </Text>
          </TouchableOpacity>

          {/* Secondary Actions */}
          <View style={styles.secondaryCtaRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                showToast('Opening Focus Analytics...');
                navigation.navigate('Statistics');
              }}
              style={[
                styles.secondaryCtaBtn,
                {
                  backgroundColor: darkMode
                    ? 'rgba(30, 41, 59, 0.92)'
                    : SLATE[100],
                },
              ]}
            >
              <TrendingUp size={14} color={darkMode ? SAKHA[400] : SAKHA[600]} />
              <Text
                style={[
                  styles.secondaryCtaText,
                  { color: darkMode ? SLATE[200] : SLATE[700] },
                ]}
              >
                View Statistics
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                showToast('Opening Focus Centre...');
                navigation.navigate('FocusCenter');
              }}
              style={[
                styles.secondaryCtaBtn,
                {
                  backgroundColor: darkMode
                    ? 'rgba(30, 41, 59, 0.92)'
                    : SLATE[100],
                },
              ]}
            >
              <SlidersHorizontal size={14} color={darkMode ? SLATE[400] : SLATE[500]} />
              <Text
                style={[
                  styles.secondaryCtaText,
                  { color: darkMode ? SLATE[200] : SLATE[700] },
                ]}
              >
                Focus Centre
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* ================================================================= */}
        {/* TOAST NOTIFICATION                                                */}
        {/* ================================================================= */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastPill,
            {
              backgroundColor: darkMode ? '#ffffff' : SLATE[900],
              opacity: toastOpacityAnim,
              transform: [{ translateY: toastTranslateYAnim }],
            },
          ]}
        >
          <CheckCircle2 size={14} color={darkMode ? SAKHA[600] : SAKHA[400]} />
          <Text
            style={[
              styles.toastText,
              { color: darkMode ? SLATE[900] : '#ffffff' },
            ]}
          >
            {toastMessage}
          </Text>
        </Animated.View>
      </View>

      {/* =================================================================== */}
      {/* SHAREABLE STUDY PROOF CARD STUDIO MODAL                             */}
      {/* =================================================================== */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeShareModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeShareModal} />

          <Animated.View
            style={[
              styles.shareSheet,
              {
                backgroundColor: darkMode ? SLATE[900] : '#ffffff',
                borderColor: darkMode ? SLATE[800] : 'rgba(226, 232, 240, 0.85)',
                opacity: modalFloatAnim,
                transform: [
                  {
                    translateY: modalFloatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Modal Header */}
              <View style={styles.shareHeaderRow}>
                <View>
                  <View style={styles.shareTitleRow}>
                    <Award size={16} color={SAKHA[500]} />
                    <Text style={[styles.shareTitle, { color: textPrimary }]}>
                      Study Proof Card
                    </Text>
                  </View>
                  <Text style={[styles.shareSubtitle, { color: textMuted }]}>
                    Pick a vibe &amp; share as a verified image card
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={closeShareModal}
                  accessibilityLabel="Close Share Modal"
                  style={[
                    styles.shareCloseBtn,
                    { backgroundColor: darkMode ? SLATE[800] : SLATE[100] },
                  ]}
                >
                  <X size={16} color={SLATE[500]} />
                </TouchableOpacity>
              </View>

              {/* Card Style Selector Pills */}
              <View style={styles.themePillsGrid}>
                {SHARE_THEMES.map((t) => {
                  const active = shareTheme === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      activeOpacity={0.8}
                      onPress={() => setShareTheme(t.id)}
                      style={[
                        styles.themePillBtn,
                        active
                          ? {
                              backgroundColor: darkMode ? '#ffffff' : SLATE[900],
                            }
                          : {
                              backgroundColor: darkMode ? SLATE[800] : SLATE[100],
                            },
                      ]}
                    >
                      <LinearGradient
                        colors={t.dotColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.themePillDot}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.themePillLabel,
                          {
                            fontWeight: active ? '700' : '600',
                            color: active
                              ? darkMode
                                ? SLATE[900]
                                : '#ffffff'
                              : darkMode
                                ? SLATE[300]
                                : SLATE[600],
                          },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Interactive 3D Collectible Proof Card Stage */}
              <View style={styles.proofStageWrap}>
                <Animated.View
                  {...panResponder.panHandlers}
                  onLayout={(e) => {
                    setCardLayout({
                      width: e.nativeEvent.layout.width,
                      height: e.nativeEvent.layout.height,
                    });
                  }}
                  style={[
                    styles.proofCard3DContainer,
                    {
                      transform: [
                        { perspective: 900 },
                        { rotateX: rotateXInterpolate },
                        { rotateY: rotateYInterpolate },
                        { scale: cardScaleAnim },
                      ],
                    },
                  ]}
                >
                  {/* Capturable Card Ref */}
                  <View ref={proofCardRef} collapsable={false}>
                    {renderProofCardContent()}
                  </View>

                  {/* Holographic Sheen Overlay */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.holoSheenOverlay,
                      {
                        opacity: sheenOpacityAnim,
                        transform: [
                          { translateX: sheenTranslateX },
                          { translateY: sheenTranslateY },
                        ],
                      },
                    ]}
                  >
                    <Svg width={260} height={260} viewBox="0 0 260 260">
                      <Defs>
                        <RadialGradient id="holoSpot" cx="50%" cy="50%" r="50%">
                          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                          <Stop offset="45%" stopColor="#ffffff" stopOpacity="0.06" />
                          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </RadialGradient>
                      </Defs>
                      <Circle cx="130" cy="130" r="130" fill="url(#holoSpot)" />
                    </Svg>
                  </Animated.View>
                </Animated.View>
              </View>

              {/* Quick Customization Toggle Row */}
              <View style={styles.shareCustomizeRow}>
                <View style={styles.tiltHintRow}>
                  <Move size={12} color={darkMode ? SLATE[500] : SLATE[400]} />
                  <Text
                    style={[
                      styles.tiltHintText,
                      { color: darkMode ? SLATE[500] : SLATE[400] },
                    ]}
                  >
                    Move/touch card for 3D sheen
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setShowVerifiedSeal((prev) => !prev)}
                  style={styles.verifiedToggleBtn}
                >
                  <ShieldCheck size={14} color={darkMode ? SAKHA[400] : SAKHA[600]} />
                  <Text
                    style={[
                      styles.verifiedToggleText,
                      { color: darkMode ? SAKHA[400] : SAKHA[600] },
                    ]}
                  >
                    Verified Seal: {showVerifiedSeal ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Primary Share Image Card CTA */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isExportingCard}
                onPress={shareProofCardImage}
                style={styles.sharePrimaryWrap}
              >
                <LinearGradient
                  colors={[SAKHA[500], '#14b8a6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sharePrimaryBtn}
                >
                  {!isExportingCard && <Share size={16} color="#ffffff" />}
                  <Text style={styles.sharePrimaryText}>
                    {isExportingCard ? 'Generating Proof Card...' : 'Share Proof Card'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Direct Channel / Export Secondary Actions */}
              <View style={styles.shareSecondaryRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={downloadProofCardImage}
                  style={[
                    styles.shareSecondaryBtn,
                    { backgroundColor: darkMode ? SLATE[800] : SLATE[100] },
                  ]}
                >
                  <Download size={14} color={darkMode ? SAKHA[400] : SAKHA[600]} />
                  <Text
                    style={[
                      styles.shareSecondaryText,
                      { color: darkMode ? SLATE[200] : SLATE[700] },
                    ]}
                  >
                    Save PNG Card
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={postCardToGroup}
                  style={[
                    styles.shareSecondaryBtn,
                    { backgroundColor: darkMode ? SLATE[800] : SLATE[100] },
                  ]}
                >
                  <Users size={14} color={darkMode ? '#818cf8' : '#6366f1'} />
                  <Text
                    style={[
                      styles.shareSecondaryText,
                      { color: darkMode ? SLATE[200] : SLATE[700] },
                    ]}
                  >
                    Post to Group
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* CUSTOM SUBJECT TAG INPUT MODAL (CROSS-PLATFORM EQUIVALENT OF prompt)*/}
      {/* =================================================================== */}
      <Modal
        visible={tagModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTagModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.tagModalBackdrop}
        >
          <View
            style={[
              styles.tagModalCard,
              {
                backgroundColor: darkMode ? SLATE[900] : '#ffffff',
                borderColor: darkMode ? SLATE[800] : SLATE[200],
              },
            ]}
          >
            <Text style={[styles.tagModalTitle, { color: textPrimary }]}>
              Add a subject or topic tag
            </Text>
            <TextInput
              value={customTagInput}
              onChangeText={setCustomTagInput}
              placeholder="e.g., Organic Chem"
              placeholderTextColor={SLATE[400]}
              maxLength={18}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCustomTag}
              style={[
                styles.tagInput,
                {
                  color: textPrimary,
                  backgroundColor: darkMode ? SLATE[800] : SLATE[50],
                  borderColor: darkMode ? SLATE[700] : SLATE[200],
                },
              ]}
            />
            <View style={styles.tagModalActions}>
              <TouchableOpacity
                onPress={() => {
                  setCustomTagInput('');
                  setTagModalVisible(false);
                }}
                style={[
                  styles.tagModalBtn,
                  { backgroundColor: darkMode ? SLATE[800] : SLATE[100] },
                ]}
              >
                <Text
                  style={[
                    styles.tagModalBtnText,
                    { color: darkMode ? SLATE[300] : SLATE[600] },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddCustomTag}
                style={[styles.tagModalBtn, { backgroundColor: SAKHA[500] }]}
              >
                <Text style={[styles.tagModalBtnText, { color: '#ffffff' }]}>Add Tag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </View>
    </Shell>
  );
}

// ============================================================================
// STYLESHEET (PIXEL-EXACT MATCH TO ORIGINAL TAILWIND & CUSTOM CSS)
// ============================================================================

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
  },

  // Top Prototype Controls
  topControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 8,
    gap: 8,
    zIndex: 20,
  },
  stateSwitcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stateSwitchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stateSwitchText: {
    fontSize: 12,
    fontWeight: '600',
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Viewport Container
  viewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlowWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 288,
  },

  // Confetti
  confettiLayer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 176,
    zIndex: 30,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 2,
  },

  // Modal Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBrandStudy: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerBrandSakha: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerTimeText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scrollable Body
  scrollBody: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 152,
    gap: 16,
  },

  // Section 1: Hero Ring
  heroSection: {
    alignItems: 'center',
    paddingTop: 4,
  },
  ringWrapper: {
    width: 192,
    height: 192,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTimeText: {
    fontFamily: FONT_MONO,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  heroPlannedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  heroPlannedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  heroPlannedDot: {
    fontSize: 12,
  },
  heroPercentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 290,
    textAlign: 'center',
  },

  // Section 2: Bento Momentum Strip
  bentoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  bentoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bentoKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  bentoValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  bentoValueSuffix: {
    fontSize: 11,
    fontWeight: '500',
    color: SLATE[400],
  },
  bentoProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    marginTop: 8,
    overflow: 'hidden',
  },
  bentoProgressFill: {
    height: '100%',
    backgroundColor: SAKHA[500],
    borderRadius: 999,
  },
  bentoSubHighlight: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  bentoSubMuted: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 6,
  },

  // Section 3: Reflection & Tagging Card
  reflectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  reflectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reflectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reflectionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  autoSavedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.9,
  },
  autoSavedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subjectChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  subjectChipActive: {
    backgroundColor: SAKHA[500],
    shadowColor: SAKHA[500],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subjectChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  addTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addTagChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    width: '100%',
  },
  moodGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  moodEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
  },

  // Section 4: Sakha AI Insight Card
  aiCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  aiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  aiKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  aiAskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  aiAskText: {
    fontSize: 11,
    fontWeight: '600',
  },
  aiBody: {
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 4,
  },

  // Section 5: Bottom Action Dock
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 10,
  },
  primaryCtaBtn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryCtaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryCtaBtn: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryCtaText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Toast
  toastPill: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // =========================================================================
  // SHARE MODAL & PROOF CARD STUDIO STYLES
  // =========================================================================
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  shareSheet: {
    maxHeight: '92%',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 14,
  },
  shareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  shareTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  shareSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  shareCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePillsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  themePillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  themePillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  themePillLabel: {
    fontSize: 11,
    flexShrink: 1,
  },
  proofStageWrap: {
    marginBottom: 14,
  },
  proofCard3DContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 8,
  },
  holoSheenOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -130,
    marginTop: -130,
    width: 260,
    height: 260,
    zIndex: 20,
  },

  // Shared Proof Card Layout
  proofCardBase: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  proofCardPadding: {
    padding: 20,
    position: 'relative',
  },
  minimalTopBar: {
    height: 6,
    width: '100%',
  },
  proofHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proofLogoBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofBrandName: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  proofBrandSub: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  proofHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginVertical: 20,
  },
  proofHeroKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  proofBigTime: {
    fontFamily: FONT_MONO,
    fontSize: SCREEN_WIDTH < 360 ? 34 : 40,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  proofChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  proofChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  proofChipTextBold: {
    fontSize: 11,
    fontWeight: '700',
  },
  proofChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  miniRingContainer: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRingCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRingPercent: {
    fontFamily: FONT_MONO,
    fontSize: 12,
    fontWeight: '800',
  },
  miniRingLabel: {
    fontSize: 8,
    fontWeight: '700',
  },
  streakPanel: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  streakPanelLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  streakSquaresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakDayBox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDayLetter: {
    fontSize: 8,
    fontWeight: '800',
  },
  streakRightMetric: {
    alignItems: 'flex-end',
    paddingLeft: 10,
    borderLeftWidth: 1,
  },
  streakTodayVal: {
    fontFamily: FONT_MONO,
    fontSize: 14,
    fontWeight: '800',
  },
  streakXpVal: {
    fontSize: 10,
    fontWeight: '700',
  },
  proofFooterRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proofFooterText: {
    fontSize: 10,
    fontWeight: '500',
  },
  proofFooterCode: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    opacity: 0.85,
  },

  // Focus Pass (Receipt Theme) Specific Styles
  receiptCard: {
    backgroundColor: '#FAF7F0',
    borderColor: 'rgba(231, 229, 228, 0.95)',
  },
  receiptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderBottomColor: '#d6d3d1',
  },
  receiptLogoBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: SLATE[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBrandTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SLATE[900],
    letterSpacing: -0.2,
  },
  receiptPassCode: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: '#78716c',
    marginTop: 2,
  },
  receiptGoalPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: SAKHA[100],
    borderWidth: 1,
    borderColor: SAKHA[200],
  },
  receiptGoalText: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  receiptHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  receiptKicker: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#78716c',
  },
  receiptBigTime: {
    fontFamily: FONT_MONO,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    color: SLATE[900],
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  receiptChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(231, 229, 228, 0.75)',
  },
  receiptChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: SLATE[800],
  },
  receiptStamp: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(5, 150, 105, 0.72)',
    backgroundColor: 'rgba(236, 253, 245, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  receiptStampTop: {
    fontFamily: FONT_MONO,
    fontSize: 8,
    fontWeight: '800',
    color: SAKHA[700],
    letterSpacing: 0.6,
  },
  receiptStampCheck: {
    fontSize: 12,
    color: SAKHA[700],
    marginVertical: 1,
  },
  receiptStampDate: {
    fontFamily: FONT_MONO,
    fontSize: 7,
    fontWeight: '700',
    color: SAKHA[700],
  },
  perforationWrap: {
    position: 'relative',
    justifyContent: 'center',
    height: 18,
    marginHorizontal: -20,
    marginVertical: 2,
  },
  perforationLine: {
    marginHorizontal: 18,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderTopColor: 'rgba(214, 211, 209, 0.95)',
  },
  ticketNotchLeft: {
    position: 'absolute',
    left: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderRightWidth: 1,
  },
  ticketNotchRight: {
    position: 'absolute',
    right: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderLeftWidth: 1,
  },
  receiptStatsGrid: {
    flexDirection: 'row',
    paddingTop: 10,
    gap: 8,
  },
  receiptStatLabel: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: '#a8a29e',
  },
  receiptStatValue: {
    fontFamily: FONT_MONO,
    fontSize: 12,
    fontWeight: '700',
    color: SLATE[900],
    marginTop: 2,
  },
  receiptBarcodeRow: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 229, 228, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
    opacity: 0.78,
  },
  barcodeBar: {
    height: '100%',
    backgroundColor: SLATE[900],
  },
  receiptTimestamp: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: '#78716c',
  },

  // Share Modal Customization & Actions
  shareCustomizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  tiltHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tiltHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
  verifiedToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sharePrimaryWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: SAKHA[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 5,
  },
  sharePrimaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sharePrimaryText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  shareSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  shareSecondaryBtn: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Custom Tag Prompt Modal
  tagModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tagModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  tagModalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  tagInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '500',
  },
  tagModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  tagModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tagModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
