import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  BackHandler,
  Image,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { isAppDrawerOpen, Shell } from '../components/Shell';
import { Button, Card, Chip, Txt } from '../components/ui';
import type { AppNavigation } from '../lib/navigation';
import { useTheme } from '../lib/theme';
import { dayKey, getUserScopedStorageKey, useStore } from '../lib/store';
import { appendFocusHistory } from '../lib/focusHistory';
import { focusLockNative, isFocusLockNativeAvailable, type InstalledFocusApp } from '../lib/focusLockNative';

const SESSION_STORAGE_KEY = 'study-sakha-focus-lock-session-v1';
const PRESET_DURATIONS = [25, 45, 60, 90];

const DISTRACTION_CATEGORIES = [
  { id: 'social', label: 'Social', icon: 'chatbubbles-outline' },
  { id: 'video', label: 'Video', icon: 'play-circle-outline' },
  { id: 'games', label: 'Gaming', icon: 'game-controller-outline' },
  { id: 'messaging', label: 'Messaging', icon: 'mail-outline' },
] as const;

type DurationMode = 'preset' | 'custom' | 'long';
type LongPeriodMode = 'hours' | 'endTime' | 'days';
type SessionStatus = 'active' | 'completed' | 'stopped';

type FocusSession = {
  id: string;
  status: SessionStatus;
  startedAt: number;
  endsAt: number;
  durationMinutes: number;
  categories: string[];
  stoppedAt?: number;
};

function parseSavedSession(raw: string | null): FocusSession | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<FocusSession>;
  if (
    typeof parsed.id !== 'string' ||
    !['active', 'completed', 'stopped'].includes(parsed.status ?? '') ||
    !Number.isFinite(parsed.startedAt) ||
    !Number.isFinite(parsed.endsAt) ||
    !Number.isFinite(parsed.durationMinutes) ||
    !Array.isArray(parsed.categories) ||
    !parsed.categories.every((category) => typeof category === 'string') ||
    (parsed.stoppedAt !== undefined && !Number.isFinite(parsed.stoppedAt))
  ) {
    throw new Error('The saved focus session could not be read.');
  }
  return parsed as FocusSession;
}

function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function describeDuration(minutes: number) {
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? '' : 's'}`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
  if (minutes > 60) return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
  return `${minutes} min`;
}

function formatEndTime(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function FocusLockScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { colors, scheme } = useTheme();
  const { state, dispatch } = useStore();
  const storageKey = useMemo(
    () => getUserScopedStorageKey(SESSION_STORAGE_KEY, state.user?.id),
    [state.user?.id]
  );
  const historyKey = useMemo(
    () => getUserScopedStorageKey('study-sakha-focus-history-v1', state.user?.id),
    [state.user?.id]
  );
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [now, setNow] = useState(Date.now());
  const [durationMode, setDurationMode] = useState<DurationMode>('preset');
  const [selectedPreset, setSelectedPreset] = useState(25);
  const [customMinutes, setCustomMinutes] = useState('45');
  const [longPeriodMode, setLongPeriodMode] = useState<LongPeriodMode>('hours');
  const [longHours, setLongHours] = useState('2');
  const [endTime, setEndTime] = useState('18:00');
  const [longDays, setLongDays] = useState('2');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledFocusApp[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [usageAccessEnabled, setUsageAccessEnabled] = useState(false);
  const [nativeStatusError, setNativeStatusError] = useState<string | null>(null);
  const [appSearch, setAppSearch] = useState('');
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  const mountedRef = useRef(true);
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const creditedSessionId = useRef<string | null>(null);

  const loadNativeStatus = useCallback(async () => {
    if (Platform.OS !== 'android' || !focusLockNative) return;
    try {
      const [apps, status] = await Promise.all([
        focusLockNative.getInstalledApps(),
        focusLockNative.getBlockingStatus(),
      ]);
      setInstalledApps(apps);
      setAccessibilityEnabled(status.accessibilityEnabled);
      setUsageAccessEnabled(status.usageAccessEnabled);
      setNativeStatusError(null);
      if (status.activeSession?.status === 'active' && !session) {
        setSession({
          id: status.activeSession.id,
          status: 'active',
          startedAt: status.activeSession.startedAt,
          endsAt: status.activeSession.endsAt,
          durationMinutes: Math.max(1, Math.ceil((status.activeSession.endsAt - status.activeSession.startedAt) / 60000)),
          categories: status.activeSession.packageIds,
        });
        setSelectedPackages(status.activeSession.packageIds);
      }
    } catch (error) {
      console.error('Focus Lock native status could not be loaded:', error);
      setNativeStatusError('Android blocking status could not be verified. Retry before starting.');
    }
  }, [session]);

  useEffect(() => {
    const timer = setTimeout(() => void loadNativeStatus(), 0);
    return () => clearTimeout(timer);
  }, [loadNativeStatus]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void loadNativeStatus();
    });
    return () => subscription.remove();
  }, [loadNativeStatus]);

  const creditSession = useCallback((completedSession: FocusSession, endedAt: number) => {
    if (creditedSessionId.current === completedSession.id) return;
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Math.min(endedAt, completedSession.endsAt) - completedSession.startedAt) / 1000)
    );
    if (elapsedSeconds <= 0) return;
    creditedSessionId.current = completedSession.id;
    dispatch({
      type: 'recordFocusStudy',
      id: completedSession.id,
      date: dayKey(new Date(completedSession.startedAt)),
      taskId: null,
      seconds: elapsedSeconds,
      category: 'Focus Lock',
    });
    const completedAt = new Date(endedAt).toISOString();
    void appendFocusHistory(historyKey, {
      id: completedSession.id,
      subject: 'Focus Lock',
      topic: completedSession.categories.join(', '),
      minutes: elapsedSeconds / 60,
      completedAt,
      startedAt: new Date(completedSession.startedAt).toISOString(),
      endedAt: completedAt,
      actualSeconds: elapsedSeconds,
      plannedMinutes: completedSession.durationMinutes,
    }).catch((error: unknown) => {
      if (mountedRef.current) {
        console.error('Focus Lock history could not be saved:', error);
        setStorageError('The session was recorded in your study totals, but focus history could not be saved.');
      }
    });
  }, [dispatch, historyKey]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    Animated.timing(heroOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [heroOpacity]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isAppDrawerOpen(navigation)) return false;
      if (showStopConfirmation) {
        setShowStopConfirmation(false);
        return true;
      }
      navigation.popTo('DashboardRoot');
      return true;
    });
    return () => subscription.remove();
  }, [navigation, showStopConfirmation]));

  useEffect(() => {
    let mounted = true;
    const resetTimer = setTimeout(() => {
      if (mounted) {
        setLoadStatus('loading');
        setStorageError(null);
      }
    }, 0);
    AsyncStorage.getItem(storageKey)
      .then(async (raw) => {
        let saved = parseSavedSession(raw);
        if (saved?.status === 'active' && saved.endsAt <= Date.now()) {
          saved = { ...saved, status: 'completed' };
          await AsyncStorage.setItem(storageKey, JSON.stringify(saved));
        }
        if (saved?.status === 'completed') {
          creditSession(saved, saved.endsAt);
        } else if (saved?.status === 'stopped' && saved.stoppedAt) {
          creditSession(saved, saved.stoppedAt);
        }
        if (mounted) {
          setSession(saved);
          setLoadStatus('ready');
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadStatus('error');
          setStorageError('Saved session data is unavailable. Retry before starting a timer.');
        }
      });
    return () => {
      mounted = false;
      clearTimeout(resetTimer);
    };
  }, [creditSession, loadAttempt, storageKey]);

  useEffect(() => {
    const updateClock = () => {
      const current = Date.now();
      setNow(current);
      if (session?.status === 'active' && current >= session.endsAt) {
        const completed = { ...session, status: 'completed' as const };
        setSession(completed);
        creditSession(completed, completed.endsAt);
        AsyncStorage.setItem(storageKey, JSON.stringify(completed)).catch(() => {
          setStorageError('The timer ended, but its completed state could not be saved.');
        });
      }
    };
    const interval = setInterval(updateClock, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateClock();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [creditSession, session, storageKey]);

  const durationMinutes = useMemo(() => {
    if (durationMode === 'preset') return selectedPreset;
    if (durationMode === 'custom') {
      const minutes = Number(customMinutes);
      return Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440 ? minutes : null;
    }
    if (longPeriodMode === 'hours') {
      const hours = Number(longHours);
      return Number.isInteger(hours) && hours >= 1 && hours <= 720 ? hours * 60 : null;
    }
    if (longPeriodMode === 'days') {
      const days = Number(longDays);
      return Number.isInteger(days) && days >= 1 && days <= 30 ? days * 1440 : null;
    }
    const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(endTime);
    if (!match) return null;
    const [hours, minutes] = endTime.split(':').map(Number);
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= now) target.setDate(target.getDate() + 1);
    return Math.ceil((target.getTime() - now) / 60000);
  }, [customMinutes, durationMode, endTime, longDays, longHours, longPeriodMode, now, selectedPreset]);

  const activeSession = session?.status === 'active' ? session : null;
  const summaryEnd = activeSession?.endsAt ?? (durationMinutes ? now + durationMinutes * 60000 : null);
  const remainingSeconds = activeSession ? Math.max(0, Math.ceil((activeSession.endsAt - now) / 1000)) : 0;
  const isDark = scheme === 'dark';

  const saveSession = async (next: FocusSession) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      setSession(next);
      setStorageError(null);
    } catch {
      setStorageError('Your focus session could not be saved. No timer was started.');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((current) =>
      current.includes(categoryId)
        ? current.filter((category) => category !== categoryId)
        : [...current, categoryId]
    );
  };

  const startTimer = async () => {
    const usingNativeBlocking = Platform.OS === 'android' && isFocusLockNativeAvailable();
    const selected = usingNativeBlocking ? selectedPackages : selectedCategories;
    if (!durationMinutes || selected.length === 0 || loadStatus !== 'ready' || storageError) return;
    if (usingNativeBlocking && !accessibilityEnabled) {
      setNativeStatusError('Enable the Study Sakha Accessibility Service before starting app blocking.');
      return;
    }
    const startedAt = Date.now();
    const id = `focus-${startedAt}-${Math.floor(Math.random() * 1_000_000)}`;
    const endsAt = startedAt + durationMinutes * 60000;
    if (usingNativeBlocking) {
      try {
        await focusLockNative?.startBlockingSession({
          sessionId: id,
          userId: state.user?.id ?? 'local-user',
          startedAt,
          endsAt,
          packageIds: selectedPackages,
        });
      } catch (error) {
        console.error('Native Focus Lock session could not start:', error);
        setNativeStatusError(error instanceof Error ? error.message : 'Native app blocking could not start.');
        return;
      }
    }
    await saveSession({
      id,
      status: 'active',
      startedAt,
      endsAt,
      durationMinutes,
      categories: selected,
    });
  };

  const stopTimer = async () => {
    if (!activeSession) return;
    const stoppedAt = Date.now();
    const stopped = { ...activeSession, status: 'stopped' as const, stoppedAt };
    setShowStopConfirmation(false);
    if (Platform.OS === 'android' && focusLockNative) {
      try {
        await focusLockNative.stopBlockingSession(activeSession.id, true);
      } catch (error) {
        console.error('Native Focus Lock session could not stop:', error);
        setNativeStatusError('The native blocker did not confirm emergency exit. Check Accessibility status.');
      }
    }
    setSession(stopped);
    creditSession(stopped, stoppedAt);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(stopped));
      setStorageError(null);
    } catch {
      setStorageError('The timer stopped, but its state could not be saved.');
    }
  };

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
      setSession(null);
      setSelectedCategories([]);
      setStorageError(null);
    } catch {
      setStorageError('The previous session could not be cleared.');
    }
  };

  const inputStyle = {
    minWidth: 96,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  };

  return (
    <Shell active="Dashboard" title="Focus Lock" subtitle="Plan a focused block">
      <View style={{ gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <Animated.View style={{ opacity: heroOpacity }}>
          <View
            style={{
              padding: 20,
              borderRadius: 20,
              backgroundColor: isDark ? '#1A2E3D' : colors.navy,
              borderWidth: 1,
              borderColor: isDark ? '#315269' : '#38559A',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <Ionicons name="lock-closed-outline" size={25} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt size={19} weight="800" color="#FFFFFF">Build a distraction-free block</Txt>
              <Txt size={12.5} color="rgba(255,255,255,0.78)">Choose an intention and a time window. This build provides a timer, not app blocking.</Txt>
            </View>
          </View>
        </Animated.View>

        {loadStatus === 'loading' ? (
          <Card>
            <View style={{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ActivityIndicator color={colors.blue} />
              <Txt color={colors.textMuted}>Restoring your saved focus session…</Txt>
            </View>
          </Card>
        ) : null}

        {loadStatus === 'error' ? (
          <Card>
            <View style={{ gap: 12 }}>
              <Txt size={15} weight="800" color={colors.danger}>Session recovery unavailable</Txt>
              <Txt size={13} color={colors.textMuted}>{storageError}</Txt>
              <Button label="Retry" icon="refresh-outline" variant="outline" onPress={() => setLoadAttempt((attempt) => attempt + 1)} />
            </View>
          </Card>
        ) : null}

        {storageError && loadStatus === 'ready' ? (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="warning-outline" size={20} color={colors.danger} />
              <Txt size={12.5} color={colors.danger} style={{ flex: 1 }}>{storageError}</Txt>
            </View>
          </Card>
        ) : null}

        {activeSession ? (
          <Card>
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.orange }} />
                  <Txt size={13} weight="800">FOCUS TIMER RUNNING</Txt>
                </View>
                  <Txt size={11.5} weight="700" color={Platform.OS === 'android' ? colors.success : colors.orange}>{Platform.OS === 'android' ? 'APP BLOCKING ON' : 'APP BLOCKING OFF'}</Txt>
              </View>
              <Txt size={42} weight="800" display style={{ fontVariant: ['tabular-nums'] }}>{formatClock(remainingSeconds)}</Txt>
              <Txt size={13} color={colors.textMuted}>
                {describeDuration(activeSession.durationMinutes)} · ends {formatEndTime(activeSession.endsAt)}
              </Txt>
              <Txt size={12} color={colors.textMuted}>
                Focus categories: {activeSession.categories.map((id) => DISTRACTION_CATEGORIES.find((item) => item.id === id)?.label ?? id).join(', ') || 'None'}
              </Txt>
              <Button label="Emergency stop" icon="stop-circle-outline" variant="danger" onPress={() => setShowStopConfirmation(true)} />
            </View>
          </Card>
        ) : null}

        {session && !activeSession ? (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Ionicons
                name={session.status === 'completed' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={24}
                color={session.status === 'completed' ? colors.success : colors.textMuted}
              />
              <View style={{ flex: 1, gap: 5 }}>
                <Txt size={15} weight="800">{session.status === 'completed' ? 'Focus timer complete' : 'Focus timer stopped early'}</Txt>
                <Txt size={12.5} color={colors.textMuted}>
                  {session.status === 'completed' ? 'Your timer reached its end. App access was not restricted.' : 'The timer ended early. App access was not restricted.'}
                </Txt>
                <Button label="Set up another session" icon="refresh-outline" variant="soft" onPress={() => void clearSession()} style={{ marginTop: 6 }} />
              </View>
            </View>
          </Card>
        ) : null}

        {!activeSession ? (
        <Card>
          <View style={{ gap: 14 }}>
            <View>
              <Txt size={16} weight="800">Choose a duration</Txt>
              <Txt size={12} color={colors.textMuted} style={{ marginTop: 3 }}>Select a study preset or set your own time.</Txt>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {([
                ['preset', 'Study session'],
                ['custom', 'Custom'],
                ['long', 'Long period'],
              ] as const).map(([mode, label]) => (
                <Chip key={mode} label={label} active={durationMode === mode} onPress={() => setDurationMode(mode)} disabled={!!activeSession} />
              ))}
            </View>

            {durationMode === 'preset' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PRESET_DURATIONS.map((minutes) => (
                  <Chip key={minutes} label={`${minutes} min`} active={selectedPreset === minutes} onPress={() => setSelectedPreset(minutes)} disabled={!!activeSession} />
                ))}
              </View>
            ) : null}

            {durationMode === 'custom' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TextInput
                  accessibilityLabel="Custom duration in minutes"
                  value={customMinutes}
                  onChangeText={(value) => setCustomMinutes(value.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  editable={!activeSession}
                  maxLength={4}
                  style={inputStyle}
                />
                <Txt color={colors.textMuted}>minutes · 1 to 1,440</Txt>
              </View>
            ) : null}

            {durationMode === 'long' ? (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {([
                    ['hours', 'Hours'],
                    ['endTime', 'End time'],
                    ['days', 'Multi-day'],
                  ] as const).map(([mode, label]) => (
                    <Chip key={mode} label={label} active={longPeriodMode === mode} onPress={() => setLongPeriodMode(mode)} disabled={!!activeSession} />
                  ))}
                </View>
                {longPeriodMode === 'hours' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TextInput accessibilityLabel="Long period hours" value={longHours} onChangeText={(value) => setLongHours(value.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" editable={!activeSession} maxLength={3} style={inputStyle} />
                    <Txt color={colors.textMuted}>hours · 1 to 720</Txt>
                  </View>
                ) : null}
                {longPeriodMode === 'endTime' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TextInput accessibilityLabel="End time in 24-hour format" value={endTime} onChangeText={(value) => setEndTime(value.replace(/[^\d:]/g, '').slice(0, 5))} keyboardType="numbers-and-punctuation" editable={!activeSession} maxLength={5} placeholder="18:00" placeholderTextColor={colors.textFaint} style={inputStyle} />
                    <Txt color={colors.textMuted}>24-hour time; next occurrence</Txt>
                  </View>
                ) : null}
                {longPeriodMode === 'days' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TextInput accessibilityLabel="Multi-day duration" value={longDays} onChangeText={(value) => setLongDays(value.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" editable={!activeSession} maxLength={2} style={inputStyle} />
                    <Txt color={colors.textMuted}>days · 1 to 30</Txt>
                  </View>
                ) : null}
              </View>
            ) : null}

            {durationMinutes === null ? (
              <Txt size={12} color={colors.danger}>Enter a valid duration to continue.</Txt>
            ) : null}
          </View>
        </Card>
        ) : null}

        {!activeSession ? (
        <Card>
          <View style={{ gap: 14 }}>
            <View>
              <Txt size={16} weight="800">{Platform.OS === 'android' ? 'Select apps to block' : 'Choose a focus preference'}</Txt>
              <Txt size={12} color={colors.textMuted} style={{ marginTop: 3 }}>
                {Platform.OS === 'android' ? 'Only selected launchable apps are interrupted while this session is active.' : 'The web version can time a focus preference; Android app blocking requires the installed Android app.'}
              </Txt>
            </View>
            {Platform.OS === 'android' ? (
              <>
                <TextInput accessibilityLabel="Search installed apps" value={appSearch} onChangeText={setAppSearch} placeholder="Search apps" placeholderTextColor={colors.textFaint} style={[inputStyle, { minWidth: 0, textAlign: 'left', flex: 1 }]} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button label="Select all" variant="soft" onPress={() => setSelectedPackages(installedApps.map((app) => app.packageId))} disabled={!!activeSession || installedApps.length === 0} />
                  <Button label="Deselect all" variant="outline" onPress={() => setSelectedPackages([])} disabled={!!activeSession || selectedPackages.length === 0} />
                </View>
                <View style={{ gap: 6 }}>
                  {installedApps.filter((app) => app.name.toLowerCase().includes(appSearch.toLowerCase()) || app.packageId.toLowerCase().includes(appSearch.toLowerCase())).map((app) => {
                    const selected = selectedPackages.includes(app.packageId);
                    return <Pressable key={app.packageId} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setSelectedPackages((current) => selected ? current.filter((id) => id !== app.packageId) : [...current, app.packageId])} disabled={!!activeSession} style={{ minHeight: 52, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: selected ? colors.blue : colors.borderSubtle, backgroundColor: selected ? (isDark ? '#20375D' : '#EEF4FF') : colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {app.iconBase64 ? <Image source={{ uri: `data:image/png;base64,${app.iconBase64}` }} style={{ width: 32, height: 32, borderRadius: 8 }} /> : null}
                      <View style={{ flex: 1 }}><Txt size={13} weight="700">{app.name}</Txt><Txt size={10.5} color={colors.textMuted}>{app.packageId}</Txt></View>
                      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? colors.blue : colors.textFaint} />
                    </Pressable>;
                  })}
                </View>
                {installedApps.length === 0 ? <Txt size={12} color={colors.textMuted}>No launchable applications were returned. Android package visibility can restrict discovery; enter a supported package through your device’s app settings if needed.</Txt> : null}
                {selectedPackages.length === 0 && !activeSession ? <Txt size={12} color={colors.danger}>Select at least one application to enable blocking.</Txt> : null}
              </>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DISTRACTION_CATEGORIES.map((category) => <Chip key={category.id} label={category.label} icon={category.icon} active={selectedCategories.includes(category.id)} onPress={() => toggleCategory(category.id)} disabled={!!activeSession} />)}
              </View>
            )}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 12, gap: 8 }}>
              <Txt size={12} weight="800" color={colors.textMuted}>SESSION SUMMARY</Txt>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Txt size={12.5} color={colors.textMuted}>{Platform.OS === 'android' ? 'Protected applications' : 'Focus preference'}</Txt>
                <Txt size={12.5} weight="700" style={{ flex: 1, textAlign: 'right' }}>
                  {Platform.OS === 'android' ? `${selectedPackages.length} selected` : selectedCategories.map((id) => DISTRACTION_CATEGORIES.find((item) => item.id === id)?.label ?? id).join(', ') || 'None selected'}
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Txt size={12.5} color={colors.textMuted}>Duration</Txt>
                <Txt size={12.5} weight="700">{durationMinutes ? describeDuration(durationMinutes) : 'Not set'}</Txt>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Txt size={12.5} color={colors.textMuted}>Expected end</Txt>
                <Txt size={12.5} weight="700" style={{ flex: 1, textAlign: 'right' }}>{summaryEnd ? formatEndTime(summaryEnd) : 'Not set'}</Txt>
              </View>
            </View>
          </View>
        </Card>
        ) : null}

        <Card>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="shield-outline" size={22} color={Platform.OS === 'android' && accessibilityEnabled ? colors.success : colors.orange} />
              <View style={{ flex: 1 }}>
                <Txt size={15} weight="800">{Platform.OS === 'android' ? 'Android blocking service' : 'Android blocking capability'}</Txt>
                <Txt size={12} color={colors.textMuted} style={{ marginTop: 2 }}>{Platform.OS === 'android' ? (accessibilityEnabled ? 'Accessibility Service enabled' : 'Accessibility Service disabled') : 'Unavailable in a web browser'}</Txt>
              </View>
            </View>
            <Txt size={12.5} color={colors.textMuted}>
              {Platform.OS === 'android' ? 'Study Sakha uses foreground app transitions to show a blocking screen for your selected applications. Android can revoke or limit Accessibility access at any time.' : 'A browser cannot enumerate or block installed Android applications. Install the Android build to use Focus Lock.'}
            </Txt>
            {Platform.OS === 'android' && !accessibilityEnabled ? <Button label="Open Accessibility Settings" icon="settings-outline" variant="outline" onPress={() => void focusLockNative?.openAccessibilitySettings()} full /> : null}
            {Platform.OS === 'android' && !usageAccessEnabled ? <Button label="Open Usage Access Settings" icon="analytics-outline" variant="outline" onPress={() => void focusLockNative?.openUsageAccessSettings()} full /> : null}
            {nativeStatusError ? <Txt size={12} color={colors.danger}>{nativeStatusError}</Txt> : null}
          </View>
        </Card>

        {!activeSession ? (
          <Button
            label={Platform.OS === 'android' ? 'Start Blocking' : 'Start focus timer'}
            icon="timer-outline"
            onPress={() => void startTimer()}
            disabled={loadStatus !== 'ready' || !!storageError || !durationMinutes || (Platform.OS === 'android' ? selectedPackages.length === 0 || !accessibilityEnabled : selectedCategories.length === 0) || session?.status === 'completed' || session?.status === 'stopped'}
            full
            size="lg"
            accessibilityHint={Platform.OS === 'android' ? 'Starts the native app blocking session.' : 'Starts a local countdown only. It will not block other apps.'}
          />
        ) : null}
      </View>

      <Modal visible={showStopConfirmation} transparent animationType="fade" onRequestClose={() => setShowStopConfirmation(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 }}>
          <Card style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
            <View style={{ gap: 12 }}>
              <Txt size={17} weight="800">End this focus session?</Txt>
              <Txt size={13} color={colors.textMuted}>Stopping early ends the focus timer. Other-app access is unchanged because app blocking is unavailable in this build.</Txt>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                <Button label="Keep session" variant="outline" onPress={() => setShowStopConfirmation(false)} />
                <Button label="Stop timer" variant="danger" onPress={() => void stopTimer()} />
              </View>
            </View>
          </Card>
        </View>
      </Modal>
    </Shell>
  );
}
