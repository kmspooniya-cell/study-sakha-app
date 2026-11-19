import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  FullScreenMeditation,
} from '../components/FullScreenMeditation';
import {
  getPresetById,
  MeditationPresetId,
} from '../components/MeditationPresets';
import { MeditationSceneRenderer } from '../components/MeditationSceneRenderer';
import { FocusActivity, FocusActivityTimer } from '../components/DashboardStudyTools';
import { Shell } from '../components/Shell';
import { Button, Card, Chip, SectionHeader, Txt } from '../components/ui';
import { appendFocusHistory } from '../lib/focusHistory';
import { dayKey, getUserScopedStorageKey, PlannerTask, useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { AudioDownloadManager, AudioDownloadState } from '../lib/audioDownloadManager';

const MEDITATION_HISTORY_KEY = 'study-sakha-meditation-history-v1';
const MEDITATION_PREFS_KEY = 'study-sakha-meditation-prefs-v2';
const STUDY_HISTORY_KEY = 'study-sakha-focus-history-v1';

const ACTIVITIES: {
  id: FocusActivity | 'hobbies';
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'blue' | 'teal' | 'violet';
}[] = [
  { id: 'study', title: 'Focus for Study', subtitle: 'Build a focused study session.', icon: 'book-outline', colorKey: 'blue' },
  { id: 'meditation', title: 'Mindful Meditation', subtitle: 'Immersive animations & soundscapes.', icon: 'leaf-outline', colorKey: 'teal' },
  { id: 'break', title: 'Rest & Recharge', subtitle: 'Reset your mind between study blocks.', icon: 'cafe-outline', colorKey: 'violet' },
  { id: 'hobbies', title: 'Hobbies', subtitle: 'Take a refreshing break with activities you enjoy.', icon: 'color-palette-outline', colorKey: 'violet' },
];

const MEDITATION_DURATIONS = [5, 10, 15, 20, 30];

export default function FocusCenterScreen() {
  const { colors, scheme } = useTheme();
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<AppRoute<'FocusCenter'>>();
  const { state: storeState, dispatch } = useStore();
  const isDark = scheme === 'dark';

  const [activity, setActivity] = useState<FocusActivity | null>(null);

  // Focus for Study Popup & Active Session States
  const [showStudySetupModal, setShowStudySetupModal] = useState(false);
  const [timerMode, setTimerMode] = useState<'timer' | 'stopwatch' | 'pomodoro'>('timer');
  const [selectedTag, setSelectedTag] = useState('History');
  const [selectedTask, setSelectedTask] = useState<PlannerTask | null>(null);
  const [studySelection, setStudySelection] = useState<'schedule' | 'manual' | null>(null);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [scheduleTaskModalVisible, setScheduleTaskModalVisible] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [studyDurationMinutes, setStudyDurationMinutes] = useState(25);
  const [isStudySessionActive, setIsStudySessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const studySessionStartedAt = React.useRef<string | null>(null);
  const studySessionSaved = React.useRef(false);

  useEffect(() => {
    if (route.params?.openStudySetup) {
      setShowStudySetupModal(true);
      navigation.setParams({ openStudySetup: undefined });
    }
  }, [navigation, route.params?.openStudySetup]);

  // 3-Line Menu Modal States (Music, Themes, Blocked Apps)
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState('Lofi Beats');
  const [selectedTheme, setSelectedTheme] = useState('Starry Sky');
  const [blockedAppsCount, setBlockedAppsCount] = useState(5);

  // Group Selection State
const [groupSelectModalVisible, setGroupSelectModalVisible] = useState(false);
const [currentSelectedGroup, setCurrentSelectedGroup] = useState('ras');

  // Meditation configuration state
  const [showMeditationConfig, setShowMeditationConfig] = useState(false);
  const selectedPresetId: MeditationPresetId = 'pure_cosmic_waves';
  const [meditationDuration, setMeditationDuration] = useState(10);
  const [fullScreenMeditationActive, setFullScreenMeditationActive] = useState(false);

  // Audio Download State for Pure Cosmic Waves
  const [cosmicDownloadState, setCosmicDownloadState] = useState<AudioDownloadState>({
    status: 'idle',
    progress: 0,
    bytesWritten: 0,
    totalBytes: 9756716,
    localUri: null,
  });

  useEffect(() => {
    const unsub = AudioDownloadManager.subscribe('pure_cosmic_waves', (st) => {
      setCosmicDownloadState(st);
    });
    return unsub;
  }, []);

  // Study Timer Countdown Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStudySessionActive && !isPaused && timerMode !== 'stopwatch') {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsStudySessionActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (isStudySessionActive && !isPaused && timerMode === 'stopwatch') {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStudySessionActive, isPaused, timerMode]);

  const handleStartStudySession = () => {
    setSecondsRemaining(timerMode === 'stopwatch' ? 0 : studyDurationMinutes * 60);
    studySessionStartedAt.current = new Date().toISOString();
    studySessionSaved.current = false;
    setShowStudySetupModal(false);
    setIsStudySessionActive(true);
    setIsPaused(false);
  };

  const saveStudySession = useCallback((actualSeconds: number) => {
    const recordedSeconds = Math.max(0, Math.round(actualSeconds));
    const startedAt = studySessionStartedAt.current;
    if (studySessionSaved.current || !startedAt || recordedSeconds <= 0) return;

    studySessionSaved.current = true;
    studySessionStartedAt.current = null;
    const endedAt = new Date().toISOString();
    const task = studySelection === 'schedule' ? selectedTask : null;
    const id = `focus-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const session = {
      id,
      ...(task ? { subject: task.category, topic: task.label, taskId: task.id } : {}),
      ...(!task && studySelection === 'manual' ? { subject: selectedTag.trim() || 'General Study' } : {}),
      minutes: recordedSeconds / 60,
      completedAt: endedAt,
      startedAt,
      endedAt,
      actualSeconds: recordedSeconds,
      plannedMinutes: timerMode === 'stopwatch' ? undefined : studyDurationMinutes,
    };

    dispatch({
      type: 'recordFocusStudy',
      id,
      date: dayKey(new Date(endedAt)),
      taskId: task?.id ?? null,
      seconds: recordedSeconds,
      taskTitle: task?.label,
      category: task?.category,
      plannedMinutes: task ? studyDurationMinutes : undefined,
    });
    void appendFocusHistory(
      getUserScopedStorageKey(STUDY_HISTORY_KEY, storeState.user?.id),
      session
    ).catch((error: unknown) => {
      console.error('Focus session history could not be saved:', error);
    });
  }, [dispatch, selectedTag, selectedTask, storeState.user?.id, studyDurationMinutes, studySelection, timerMode]);

  const handleStopStudySession = useCallback(() => {
    const actualSeconds = timerMode === 'stopwatch'
      ? secondsRemaining
      : studyDurationMinutes * 60 - secondsRemaining;
    saveStudySession(actualSeconds);
    setIsStudySessionActive(false);
  }, [saveStudySession, secondsRemaining, studyDurationMinutes, timerMode]);

  useEffect(() => {
    if (!isStudySessionActive && timerMode !== 'stopwatch' && secondsRemaining === 0) {
      saveStudySession(studyDurationMinutes * 60);
    }
  }, [isStudySessionActive, secondsRemaining, saveStudySession, studyDurationMinutes, timerMode]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadCosmic = async () => {
    await AudioDownloadManager.download({
      id: 'pure_cosmic_waves',
      name: 'Pure Cosmic Waves',
      subtitle: 'Deep harmonic cosmic waves (10 mins)',
      filename: 'pure_cosmic_waves.mp3',
      sizeBytes: 9756716,
      downloadUrl: '/api/audio/pure_cosmic_waves.mp3',
    });
  };

  const handleDeleteCosmic = async () => {
    await AudioDownloadManager.deleteDownloaded('pure_cosmic_waves');
  };

  // Load saved preferences
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(MEDITATION_PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Number.isInteger(parsed.durationMinutes) && parsed.durationMinutes >= 5 && parsed.durationMinutes <= 30) {
            setMeditationDuration(parsed.durationMinutes);
          }
        }
      } catch (e) {
        console.warn('Could not load meditation prefs:', e);
      }
    })();
  }, []);

  const savePrefs = async (duration: number) => {
    try {
      await AsyncStorage.setItem(
        MEDITATION_PREFS_KEY,
        JSON.stringify({ durationMinutes: duration })
      );
    } catch (e) {
      console.warn('Could not save meditation prefs:', e);
    }
  };

  useEffect(() => {
    return navigation.addListener('blur', () => {
      setActivity(null);
      setShowMeditationConfig(false);
      setShowStudySetupModal(false);
      if (studySessionStartedAt.current) handleStopStudySession();
      setIsStudySessionActive(false);
      setFullScreenMeditationActive(false);
      setTagModalVisible(false);
      setScheduleTaskModalVisible(false);
      setMenuModalVisible(false);
    });
  }, [handleStopStudySession, navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (scheduleTaskModalVisible) {
        setScheduleTaskModalVisible(false);
        return true;
      }
      if (tagModalVisible) {
        setTagModalVisible(false);
        return true;
      }
      if (menuModalVisible) {
        setMenuModalVisible(false);
        return true;
      }
      if (isStudySessionActive) {
        handleStopStudySession();
        return true;
      }
      if (showStudySetupModal) {
        setShowStudySetupModal(false);
        return true;
      }
      if (fullScreenMeditationActive) {
        setFullScreenMeditationActive(false);
        setShowMeditationConfig(true);
        return true;
      }
      if (showMeditationConfig) {
        setShowMeditationConfig(false);
        return true;
      }
      if (activity) {
        setActivity(null);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [activity, fullScreenMeditationActive, showMeditationConfig, isStudySessionActive, showStudySetupModal, tagModalVisible, scheduleTaskModalVisible, menuModalVisible, handleStopStudySession]);

  const handleCardPress = (id: FocusActivity | 'hobbies') => {
    if (id === 'study') {
      setShowStudySetupModal(true);
    } else if (id === 'meditation') {
      setShowMeditationConfig(true);
    } else if (id === 'hobbies') {
      navigation.navigate('Hobbies');
    } else {
      setActivity(id);
    }
  };

  const handleSelectDuration = (duration: number) => {
    setMeditationDuration(duration);
    savePrefs(duration);
  };

  const startMeditationImmediately = () => {
    setShowMeditationConfig(false);
    setFullScreenMeditationActive(true);
  };

  const handleMeditationComplete = async (elapsedSeconds: number) => {
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
    dispatch({ type: 'study', minutes });

    const newSession = {
      id: `med-${Date.now()}`,
      minutes,
      completedAt: new Date().toISOString(),
      actualSeconds: elapsedSeconds,
      plannedMinutes: meditationDuration,
      presetId: selectedPresetId,
      soundId: 'pure_cosmic_waves',
    };

    try {
      const raw = await AsyncStorage.getItem(MEDITATION_HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(MEDITATION_HISTORY_KEY, JSON.stringify([newSession, ...history]));
    } catch (e) {
      console.warn('Could not save meditation session:', e);
    }

    dispatch({
      type: 'notify',
      notif: {
        id: `n-${Date.now()}`,
        title: 'Meditation Completed',
        body: `You completed a ${minutes}-minute mindful meditation with ${selectedPreset.title}. Great work!`,
        at: Date.now(),
        kind: 'streak',
        read: false,
      },
    });
  };

  const selectedPreset = getPresetById(selectedPresetId);
  const greenAccent = '#4ADE80';
  const surfaceBg = isDark ? '#18191C' : colors.surface;
  const surfaceAltBg = isDark ? '#202225' : colors.surfaceAlt;
  const renderManualTagPicker = () => (
    <Modal
      visible={tagModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setTagModalVisible(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: surfaceBg, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Txt color={colors.text} size={18} weight="800">Select Subject Tag</Txt>
            <Pressable onPress={() => setTagModalVisible(false)}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {['History', 'Polity', 'Economy', 'Rajasthan Geography', 'General Science', 'Work'].map((tag) => (
            <Pressable
              key={tag}
              onPress={() => {
                setSelectedTag(tag);
                setStudySelection('manual');
                setTagModalVisible(false);
              }}
              style={[styles.modalTagItem, { backgroundColor: surfaceAltBg }]}
            >
              <Txt color={colors.text} size={14} weight="700">{tag}</Txt>
              {selectedTag === tag && <Ionicons name="checkmark" size={18} color={colors.blue} />}
            </Pressable>
          ))}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              style={[styles.modalInput, { backgroundColor: surfaceAltBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Add custom tag..."
              placeholderTextColor={colors.textMuted}
              value={customTagInput}
              onChangeText={setCustomTagInput}
            />
            <Pressable
              onPress={() => {
                if (customTagInput.trim()) {
                  setSelectedTag(customTagInput.trim());
                  setStudySelection('manual');
                  setCustomTagInput('');
                  setTagModalVisible(false);
                }
              }}
              style={[styles.addTagBtn, { backgroundColor: colors.blue }]}
            >
              <Txt color="#FFFFFF" size={13} weight="700">Add</Txt>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ==================== 1. ACTIVE FULL-SCREEN FOCUS VIEW (TRUE FULLSCREEN) ====================
  if (isStudySessionActive) {
    return (
      <View style={styles.trueFullScreenRoot}>
        
                  {/* Top Group / Live Status Feature */}
          <View style={styles.activeTopHeader}>
            <Pressable
              onPress={() => setGroupSelectModalVisible(true)}
              style={styles.activeGroupPill}
            >
              <View style={[styles.liveDot, { backgroundColor: greenAccent }]} />
              <Txt color="#F8FAFC" size={12.5} weight="700">
                {currentSelectedGroup} • Active session
              </Txt>
              <Ionicons name="chevron-down" size={13} color="#94A3B8" />
            </Pressable>
          </View>

        {/* Center Circle with Tag at Top */}
        <View style={styles.timerCenterContainer}>
          <View style={styles.timerOuterRing}>
            <Pressable
              onPress={() => setTagModalVisible(true)}
              style={styles.circleTopTagRow}
            >
              <Txt color="#94A3B8" size={12} weight="600">
                {studySelection === 'schedule' && selectedTask
                  ? `${selectedTask.label} · ${selectedTask.category}`
                  : studySelection === 'manual'
                    ? selectedTag
                    : 'No subject selected'}
              </Txt>
              <Ionicons name="chevron-down" size={12} color="#94A3B8" />
            </Pressable>

            <Txt color="#94A3B8" size={11} weight="700" style={{ letterSpacing: 1.2, marginTop: 6 }}>
              {timerMode.toUpperCase()}
            </Txt>

            <Txt color="#FFFFFF" size={56} weight="800" style={{ letterSpacing: -1, marginVertical: 8 }}>
              {formatTime(secondsRemaining)}
            </Txt>

            <Pressable
              onPress={() => setIsPaused(!isPaused)}
              style={styles.takeBreakPill}
            >
              <Txt color="#CBD5E1" size={12} weight="600">
                {isPaused ? 'Paused' : 'Take a break'}
              </Txt>
            </Pressable>
          </View>
        </View>

        {/* Bottom Controls: 3-Line Menu (Left) & Pause/Stop */}
        <View style={styles.activeBottomBar}>
          <Pressable
            onPress={() => setMenuModalVisible(true)}
            style={styles.controlIconBtn}
          >
            <Ionicons name="menu" size={22} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={handleStopStudySession}
            style={styles.stopFocusBtn}
          >
            <Txt color="#0F172A" size={14.5} weight="800">
              Stop Focus
            </Txt>
          </Pressable>

          <Pressable
            onPress={() => setIsPaused(!isPaused)}
            style={[styles.resumeBtn, { backgroundColor: isPaused ? greenAccent : '#334155' }]}
          >
            <Txt color={isPaused ? '#052E16' : '#FFFFFF'} size={14.5} weight="800">
              {isPaused ? 'Resume' : 'Pause'}
            </Txt>
          </Pressable>
        </View>

        {/* ================= MODALS INSIDE FULLSCREEN VIEW ================= */}
        {/* Tag Selection Modal */}
        {renderManualTagPicker()}

        {/* 3-Line Menu Modal */}
        <Modal animationType="fade" transparent visible={menuModalVisible} onRequestClose={() => setMenuModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: surfaceBg, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Txt color={colors.text} size={18} weight="800">Focus Settings & Menu</Txt>
                <Pressable onPress={() => setMenuModalVisible(false)}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={[styles.menuItemRow, { backgroundColor: surfaceAltBg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="musical-notes-outline" size={18} color={colors.blue} />
                  <Txt color={colors.text} size={14} weight="700">Music ({selectedMusic})</Txt>
                </View>
                <Pressable onPress={() => setSelectedMusic(selectedMusic === 'Lofi Beats' ? 'White Noise' : 'Lofi Beats')}>
                  <Txt color={colors.blue} size={13} weight="700">Change</Txt>
                </Pressable>
              </View>

              <View style={[styles.menuItemRow, { backgroundColor: surfaceAltBg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="color-palette-outline" size={18} color="#A855F7" />
                  <Txt color={colors.text} size={14} weight="700">Themes ({selectedTheme})</Txt>
                </View>
                <Pressable onPress={() => setSelectedTheme(selectedTheme === 'Starry Sky' ? 'Deep Forest' : 'Starry Sky')}>
                  <Txt color="#A855F7" size={13} weight="700">Switch</Txt>
                </Pressable>
              </View>

              <View style={[styles.menuItemRow, { backgroundColor: surfaceAltBg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="shield-outline" size={18} color="#EF4444" />
                  <Txt color={colors.text} size={14} weight="700">Blocked Apps ({blockedAppsCount} Apps)</Txt>
                </View>
                <Pressable onPress={() => setBlockedAppsCount(blockedAppsCount === 5 ? 8 : 5)}>
                  <Txt color="#EF4444" size={13} weight="700">Manage</Txt>
                </Pressable>
              </View>

              <View style={{ marginTop: 14 }}>
                <Button label="Done" full onPress={() => setMenuModalVisible(false)} />
              </View>
            </View>
          </View>
        </Modal>

        {/* ================= 3. GROUP SELECTOR BOTTOM SHEET MODAL ================= */}
        <Modal
          animationType="slide"
          transparent
          visible={groupSelectModalVisible}
          onRequestClose={() => setGroupSelectModalVisible(false)}
        >
          <View style={styles.bottomSheetBackdrop}>
            <View style={[styles.bottomSheetCard, { backgroundColor: surfaceBg, borderColor: colors.border }]}>
              <View style={styles.sheetHandleBar} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Txt color={colors.text} size={18} weight="800">Select Active Study Group</Txt>
                <Pressable onPress={() => setGroupSelectModalVisible(false)}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Txt color={colors.textMuted} size={11.5} weight="700" style={{ marginBottom: 10 }}>YOUR JOINED GROUPS</Txt>

              {['ras', 'upsc 2027', '12 hours study group', 'CDS aspirants'].map((grp) => (
                <Pressable
                  key={grp}
                  onPress={() => {
                    setCurrentSelectedGroup(grp);
                    setGroupSelectModalVisible(false);
                  }}
                  style={[
                    styles.modalTagItem,
                    { backgroundColor: surfaceAltBg, borderWidth: currentSelectedGroup === grp ? 1.5 : 0, borderColor: colors.blue }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.liveDot, { backgroundColor: currentSelectedGroup === grp ? greenAccent : colors.textFaint }]} />
                    <Txt color={colors.text} size={14.5} weight="700">{grp}</Txt>
                  </View>
                  {currentSelectedGroup === grp && <Ionicons name="checkmark-circle" size={20} color={colors.blue} />}
                </Pressable>
              ))}

              <View style={{ marginTop: 16 }}>
                <Button label="Done" full onPress={() => setGroupSelectModalVisible(false)} />
              </View>
            </View>
          </View>
        </Modal>
        
      </View>
    );
  }

  // ==================== MAIN FOCUS CENTER VIEW ====================
  return (
    <Shell active="FocusCenter" title="Focus & Wellness" subtitle="Choose a session for your next study moment">

      {/* Focus Lock Banner */}
      <Pressable
        onPress={() => navigation.navigate('FocusLock')}
        accessibilityRole="button"
        accessibilityLabel="Open Focus Lock setup"
        style={({ pressed }) => ({
          minHeight: 132,
          marginBottom: 14,
          padding: 20,
          borderRadius: 20,
          backgroundColor: isDark ? '#1A2E3D' : colors.navy,
          borderWidth: 1,
          borderColor: isDark ? '#315269' : '#38559A',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        })}
      >
        <View style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <Ionicons name="lock-closed-outline" size={25} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt size={18} weight="800" color="#FFFFFF">Focus Lock</Txt>
          <Txt size={12.5} color="rgba(255,255,255,0.78)">Set a focus timer and choose what you want to avoid.</Txt>
          <Txt size={11} weight="700" color="#FFFFFF" style={{ marginTop: 4 }}>SET UP SESSION &gt;</Txt>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {ACTIVITIES.map((item) => {
          const color = colors[item.colorKey];
          return (
            <Pressable
              key={item.id}
              onPress={() => handleCardPress(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={({ pressed }) => ({
                width: '48%',
                flexGrow: 1,
                minHeight: 152,
                justifyContent: 'space-between',
                backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                borderRadius: 20,
                padding: 18,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              })}
            >
              <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: `${color}18` }}>
                <Ionicons name={item.icon} size={22} color={color} />
              </View>
              <View style={{ marginTop: 16, gap: 3 }}>
                <Txt size={15.5} weight="800">{item.title}</Txt>
                <Txt size={12} color={colors.textMuted}>{item.subtitle}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ================= 2. BOTTOM POPUP SHEET FOR STUDY SETUP ================= */}
      <Modal
        visible={showStudySetupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStudySetupModal(false)}
      >
        <View style={styles.bottomSheetBackdrop}>
          <View style={[styles.bottomSheetCard, { backgroundColor: surfaceBg, borderColor: colors.border }]}>
            <View style={styles.sheetHandleBar} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Txt color={colors.text} size={18} weight="800">Focus Session Setup</Txt>
              <Pressable onPress={() => setShowStudySetupModal(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Timer Modes */}
            <View style={[styles.modeTabsRow, { backgroundColor: surfaceAltBg, marginBottom: 16 }]}>
              {(['timer', 'stopwatch', 'pomodoro'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setTimerMode(m)}
                  style={[
                    styles.modeTabItem,
                    timerMode === m && { backgroundColor: surfaceBg },
                  ]}
                >
                  <Txt
                    color={timerMode === m ? colors.text : colors.textMuted}
                    size={13}
                    weight={timerMode === m ? '800' : '600'}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Txt>
                </Pressable>
              ))}
            </View>

            <Txt color={colors.textMuted} size={11.5} weight="700" style={{ marginBottom: 6 }}>SUBJECT OR TASK (OPTIONAL)</Txt>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: studySelection === 'schedule' }}
                onPress={() => {
                  setStudySelection('schedule');
                  setScheduleTaskModalVisible(true);
                }}
                style={[
                  styles.studySourceButton,
                  {
                    backgroundColor: studySelection === 'schedule' ? colors.blue + '18' : surfaceAltBg,
                    borderColor: studySelection === 'schedule' ? colors.blue : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={studySelection === 'schedule' ? colors.blue : colors.textMuted}
                />
                <Txt
                  color={studySelection === 'schedule' ? colors.blue : colors.text}
                  size={12}
                  weight="700"
                  numberOfLines={1}
                >
                  Add from Schedule
                </Txt>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: studySelection === 'manual' }}
                onPress={() => {
                  setStudySelection('manual');
                  setTagModalVisible(true);
                }}
                style={[
                  styles.studySourceButton,
                  {
                    backgroundColor: studySelection === 'manual' ? colors.blue + '18' : surfaceAltBg,
                    borderColor: studySelection === 'manual' ? colors.blue : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={17}
                  color={studySelection === 'manual' ? colors.blue : colors.textMuted}
                />
                <Txt
                  color={studySelection === 'manual' ? colors.blue : colors.text}
                  size={12}
                  weight="700"
                  numberOfLines={1}
                >
                  Tag Manually
                </Txt>
              </Pressable>
            </View>
            {/* Duration Pills */}
            {timerMode !== 'stopwatch' && (
              <>
                <Txt color={colors.textMuted} size={11.5} weight="700" style={{ marginBottom: 6 }}>DURATION (MINUTES)</Txt>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  {[15, 25, 40, 50].map((mins) => (
                    <Pressable
                      key={mins}
                      onPress={() => setStudyDurationMinutes(mins)}
                      style={[
                        styles.durationPill,
                        {
                          backgroundColor: studyDurationMinutes === mins ? colors.blue : surfaceAltBg,
                          borderColor: studyDurationMinutes === mins ? colors.blue : colors.border,
                        },
                      ]}
                    >
                      <Txt color={studyDurationMinutes === mins ? '#FFFFFF' : colors.text} size={13} weight="700">
                        {mins}m
                      </Txt>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Continue Button */}
            <Button
              label="Continue to Full Focus"
              icon="arrow-forward-outline"
              full
              size="lg"
              onPress={handleStartStudySession}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={scheduleTaskModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduleTaskModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: surfaceBg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Txt color={colors.text} size={18} weight="800">Select a Scheduled Task</Txt>
              <Pressable onPress={() => setScheduleTaskModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close scheduled task list">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            {!storeState.plannerTasksLoaded ? (
              <Txt color={colors.textMuted} size={13}>Loading scheduled tasks...</Txt>
            ) : storeState.plannerTaskLoadError ? (
              <Txt color={colors.danger} size={13}>{storeState.plannerTaskLoadError}</Txt>
            ) : storeState.plannerTasks.length === 0 ? (
              <Txt color={colors.textMuted} size={13}>No scheduled tasks are available. You can continue without selecting one.</Txt>
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {storeState.plannerTasks.map((task) => (
                  <Pressable
                    key={task.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedTask?.id === task.id }}
                    onPress={() => {
                      setSelectedTask(task);
                      setStudySelection('schedule');
                      setScheduleTaskModalVisible(false);
                    }}
                    style={[
                      styles.modalTagItem,
                      {
                        backgroundColor: surfaceAltBg,
                        borderWidth: selectedTask?.id === task.id ? 1 : 0,
                        borderColor: colors.blue,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Txt color={colors.text} size={14} weight="700">{task.label}</Txt>
                      <Txt color={colors.textMuted} size={12} style={{ marginTop: 3 }}>
                        {task.category} · {task.targetDate}
                      </Txt>
                    </View>
                    {selectedTask?.id === task.id && <Ionicons name="checkmark-circle" size={19} color={colors.blue} />}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {renderManualTagPicker()}

      {/* Pre-Session Setup Modal for Meditation Gallery */}
      <Modal
        visible={showMeditationConfig}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMeditationConfig(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View
            style={{
              width: '100%',
              maxWidth: 620,
              maxHeight: '90%',
              alignSelf: 'center',
              borderRadius: radii.dialog,
              backgroundColor: colors.surface,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              overflow: 'hidden',
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 18, paddingBottom: 6 }}
            >
              {/* Modal Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: `${selectedPreset.accentColor}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={selectedPreset.icon} size={24} color={selectedPreset.accentColor} />
                  </View>
                  <View>
                    <Txt size={18} weight="800">Meditation Studio</Txt>
                  </View>
                </View>
                <Pressable
                  onPress={() => setShowMeditationConfig(false)}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                  })}
                >
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Duration Selector */}
              <View style={{ gap: 8 }}>
                <Txt size={12} weight="800" color={colors.textMuted} style={{ letterSpacing: 0.5 }}>
                  SESSION DURATION
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {MEDITATION_DURATIONS.map((dur) => (
                    <Chip
                      key={dur}
                      label={`${dur} min`}
                      active={meditationDuration === dur}
                      onPress={() => handleSelectDuration(dur)}
                    />
                  ))}
                </View>
              </View>

              {/* Start Button */}
              <View style={{ marginTop: 6 }}>
                <Button
                  label="Start Meditation"
                  icon="play"
                  size="lg"
                  full
                  onPress={startMeditationImmediately}
                />
              </View>

              {/* Live Preview Card */}
              <View
                style={{
                  height: 180,
                  width: '100%',
                  borderRadius: 18,
                  overflow: 'hidden',
                  backgroundColor: '#0A1120',
                  position: 'relative',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <MeditationSceneRenderer
                  presetId={selectedPresetId}
                  isPlaying={showMeditationConfig}
                  width={580}
                  height={180}
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759' }} />
                  <Txt size={10} weight="800" color="#FFFFFF">LIVE PREVIEW</Txt>
                </View>
              </View>

              {/* Downloadable Offline Audio Card */}
              <View
                style={{
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: isDark ? 'rgba(255, 184, 0, 0.08)' : 'rgba(255, 184, 0, 0.09)',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255, 184, 0, 0.25)' : 'rgba(255, 184, 0, 0.3)',
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="cloud-download-outline" size={18} color="#FFB800" />
                    <Txt size={13} weight="800">
                      Pure Cosmic Waves (Offline Audio)
                    </Txt>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      backgroundColor: cosmicDownloadState.status === 'downloaded' ? '#34C75920' : 'rgba(255, 184, 0, 0.18)',
                    }}
                  >
                    <Txt
                      size={10.5}
                      weight="800"
                      color={cosmicDownloadState.status === 'downloaded' ? '#34C759' : '#FFB800'}
                    >
                      {cosmicDownloadState.status === 'downloaded'
                        ? 'Downloaded ✓'
                        : cosmicDownloadState.status === 'downloading'
                        ? `${Math.round(cosmicDownloadState.progress * 100)}%`
                        : '9.3 MB'}
                    </Txt>
                  </View>
                </View>

                {cosmicDownloadState.status === 'downloading' && (
                  <View style={{ gap: 6 }}>
                    <View
                      style={{
                        height: 6,
                        width: '100%',
                        backgroundColor: isDark ? '#1F293D' : '#E2E8F0',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.round(cosmicDownloadState.progress * 100)}%`,
                          backgroundColor: '#FFB800',
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt size={11} color={colors.textMuted} style={{ flex: 1, marginRight: 8 }}>
                    {cosmicDownloadState.status === 'downloaded'
                      ? 'Saved to local device storage. Plays 100% offline.'
                      : 'Download once for 100% offline meditation.'}
                  </Txt>

                  {cosmicDownloadState.status === 'downloaded' ? (
                    <Pressable
                      onPress={handleDeleteCosmic}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255, 59, 48, 0.1)' }}
                    >
                      <Ionicons name="trash-outline" size={13} color="#FF3B30" />
                      <Txt size={11} weight="700" color="#FF3B30">Delete</Txt>
                    </Pressable>
                  ) : cosmicDownloadState.status === 'downloading' ? (
                    <Txt size={11} weight="700" color="#FFB800">Downloading...</Txt>
                  ) : (
                    <Pressable
                      onPress={handleDownloadCosmic}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFB800' }}
                    >
                      <Ionicons name="arrow-down-circle-outline" size={15} color="#000000" />
                      <Txt size={11.5} weight="800" color="#000000">Download</Txt>
                    </Pressable>
                  )}
                </View>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Meditation */}
      <FullScreenMeditation
        visible={fullScreenMeditationActive}
        presetId={selectedPresetId}
        durationMinutes={meditationDuration}
        onComplete={handleMeditationComplete}
        onClose={() => {
          setFullScreenMeditationActive(false);
          setShowMeditationConfig(true);
        }}
      />

      {/* Focus for Study & Break activities */}
      {activity && activity !== 'meditation' ? (
        <FocusActivityTimer
          key={activity}
          activity={activity}
          onClose={() => setActivity(null)}
        />
      ) : null}

    </Shell>
  );
}

const styles = StyleSheet.create({
  trueFullScreenRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: '#090A0F',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  activeTopHeader: {
    alignItems: 'center',
  },
  activeGroupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerOuterRing: {
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 2,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  circleTopTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  takeBreakPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 4,
  },
  activeBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  controlIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopFocusBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modeTabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  modeTabItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  studySourceButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  durationPill: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
  },
  modalTagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13.5,
  },
  addTagBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
});
