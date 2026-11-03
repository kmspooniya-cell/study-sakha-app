import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Shell } from '../components/Shell';
import { Button, Card, Chip, SectionHeader, Txt } from '../components/ui';
import { getUserScopedStorageKey, useStore } from '../lib/store';
import { appendFocusHistory } from '../lib/focusHistory';
import { radii, useTheme } from '../lib/theme';

const HOBBY_HISTORY_KEY = 'study-sakha-hobby-history-v1';
const QUICK_DURATIONS = [5, 10, 15, 20, 30, 45];

const HOBBIES = [
  { id: 'reading', label: 'Reading', icon: 'book-outline' },
  { id: 'drawing', label: 'Drawing & Sketching', icon: 'color-palette-outline' },
  { id: 'music', label: 'Music', icon: 'musical-notes-outline' },
  { id: 'writing', label: 'Writing & Journaling', icon: 'create-outline' },
  { id: 'photography', label: 'Photography', icon: 'camera-outline' },
  { id: 'gardening', label: 'Gardening', icon: 'leaf-outline' },
  { id: 'sports', label: 'Sports & Physical Activities', icon: 'football-outline' },
  { id: 'crafts', label: 'Crafts & DIY', icon: 'construct-outline' },
  { id: 'cooking', label: 'Cooking', icon: 'restaurant-outline' },
  { id: 'other', label: 'Other Hobbies', icon: 'sparkles-outline' },
] as const;

type HobbyId = (typeof HOBBIES)[number]['id'];
type HobbySession = { id: string; category: HobbyId; durationMinutes: number; completedAt: string };

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.max(0, totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function categoryLabel(id: HobbyId) {
  return HOBBIES.find((item) => item.id === id)?.label ?? 'Hobby';
}

export default function HobbiesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<AppNavigation>();
  const { state, dispatch } = useStore();
  const historyKey = getUserScopedStorageKey(HOBBY_HISTORY_KEY, state.user?.id);
  const [selectedHobby, setSelectedHobby] = useState<HobbyId | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [customDuration, setCustomDuration] = useState('15');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [message, setMessage] = useState('');
  const [sessions, setSessions] = useState<HobbySession[]>([]);
  const endAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(historyKey)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSessions(parsed);
      })
      .catch(() => setMessage('Saved hobby history could not be loaded.'));
  }, [historyKey]);

  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return undefined;
    }

    const tick = () => {
      const endAt = endAtRef.current;
      if (!endAt) return;
      const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0) {
        clearTimer();
        setIsRunning(false);
        setHasStarted(false);
        completeSession();
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 250);
    return clearTimer;
  }, [isRunning]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      clearTimer();
      setIsRunning(false);
    });
    return () => {
      unsubscribe();
      clearTimer();
    };
  }, [navigation]);

  const completeSession = async () => {
    if (!selectedHobby) return;
    const session: HobbySession = {
      id: `hobby-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
      category: selectedHobby,
      durationMinutes,
      completedAt: new Date().toISOString(),
    };
    setMessage(`${categoryLabel(selectedHobby)} session complete. Nice work!`);
    dispatch({
      type: 'notify',
      notif: {
        id: `n-${Date.now()}`,
        title: 'Hobby Timer Complete',
        body: `Your ${durationMinutes}-minute ${categoryLabel(selectedHobby).toLowerCase()} session is complete.`,
        at: Date.now(),
        kind: 'streak',
        read: false,
      },
    });
    try {
      const nextSessions = await appendFocusHistory(historyKey, session);
      setSessions(nextSessions);
    } catch {
      setMessage('Session completed, but history could not be saved.');
    }
  };

  const chooseDuration = (minutes: number) => {
    if (hasStarted) return;
    setDurationMinutes(minutes);
    setCustomDuration(String(minutes));
    setMessage('');
  };

  const applyCustomDuration = () => {
    if (hasStarted) return;
    const parsed = Number.parseInt(customDuration, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 180) {
      Alert.alert('Choose a valid duration', 'Enter a whole number from 1 to 180 minutes.');
      return;
    }
    setDurationMinutes(parsed);
    setCustomDuration(String(parsed));
    setMessage('');
  };

  const startOrResume = () => {
    if (!selectedHobby) {
      Alert.alert('Choose a hobby first', 'Select a category before starting your timer.');
      return;
    }
    if (!hasStarted || remainingSeconds === 0) {
      setRemainingSeconds(durationMinutes * 60);
    }
    endAtRef.current = Date.now() + (hasStarted && remainingSeconds > 0 ? remainingSeconds : durationMinutes * 60) * 1000;
    setMessage('');
    setHasStarted(true);
    setIsRunning(true);
  };

  const pause = () => {
    if (!endAtRef.current) return;
    const next = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    setRemainingSeconds(next);
    setIsRunning(false);
  };

  const reset = (stoppedEarly = false) => {
    clearTimer();
    endAtRef.current = null;
    setIsRunning(false);
    setHasStarted(false);
    setRemainingSeconds(0);
    setMessage(stoppedEarly ? 'Session stopped early. It was not added to completed history.' : '');
  };

  const totalMinutes = useMemo(() => sessions.reduce((sum, session) => sum + session.durationMinutes, 0), [sessions]);

  return (
    <Shell active="FocusCenter" title="Hobbies" subtitle="Take a refreshing break with activities you enjoy.">
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Back to Focus and Wellness"
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, opacity: pressed ? 0.6 : 1 })}
      >
        <Ionicons name="arrow-back" size={18} color={colors.blue} />
        <Txt size={13} weight="700" color={colors.blue}>Focus & Wellness</Txt>
      </Pressable>

      <Card style={{ gap: 14 }}>
        <SectionHeader title="Choose your hobby" icon="sparkles-outline" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {HOBBIES.map((hobby) => {
            const active = selectedHobby === hobby.id;
            return (
              <Pressable
                key={hobby.id}
                disabled={hasStarted}
                onPress={() => { setSelectedHobby(hobby.id); setMessage(''); }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => ({
                  flexGrow: 1,
                  minWidth: 135,
                  flexBasis: '30%',
                  minHeight: 52,
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: active ? colors.blue : colors.borderSubtle,
                  backgroundColor: active ? colors.tint : pressed ? colors.surfaceAlt : colors.surface,
                  opacity: hasStarted && !active ? 0.65 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                })}
              >
                <Ionicons name={hobby.icon as keyof typeof Ionicons.glyphMap} size={17} color={active ? colors.blue : colors.textMuted} />
                <Txt size={11.5} weight={active ? '800' : '600'} color={active ? colors.blue : colors.textPrimary} style={{ flex: 1 }}>{hobby.label}</Txt>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: 14, marginTop: 14 }}>
        <SectionHeader title="Hobby timer" icon="timer-outline" />
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Txt size={12} weight="700" color={colors.textMuted}>{selectedHobby ? categoryLabel(selectedHobby) : 'Select a category to begin'}</Txt>
          <Txt size={52} weight="800" display style={{ letterSpacing: 1, marginTop: 3 }}>{formatTime(remainingSeconds || durationMinutes * 60)}</Txt>
          <Txt size={12} color={colors.textMuted}>{isRunning ? 'In progress' : hasStarted ? 'Paused' : 'Ready when you are'}</Txt>
        </View>

        <View style={{ gap: 8 }}>
          <Txt size={12} weight="800" color={colors.textMuted}>QUICK DURATION</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_DURATIONS.map((minutes) => <Chip key={minutes} label={`${minutes} min`} active={durationMinutes === minutes && !hasStarted} onPress={() => chooseDuration(minutes)} />)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={customDuration}
              onChangeText={setCustomDuration}
              onEndEditing={applyCustomDuration}
              editable={!hasStarted}
              keyboardType="number-pad"
              placeholder="Custom minutes"
              placeholderTextColor={colors.textFaint}
              style={{ flex: 1, height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radii.control, color: colors.textPrimary, backgroundColor: colors.surfaceAlt }}
            />
            <Button label="Set" variant="outline" size="sm" disabled={hasStarted} onPress={applyCustomDuration} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!isRunning ? <Button label={hasStarted ? 'Resume' : 'Start'} icon="play" full onPress={startOrResume} /> : <Button label="Pause" icon="pause" full variant="soft" onPress={pause} />}
          <Button label="Reset" icon="refresh" variant="outline" onPress={() => reset()} disabled={!hasStarted && remainingSeconds === 0} />
        </View>
        {hasStarted ? <Button label="Stop session early" variant="ghost" onPress={() => reset(true)} /> : null}
        {message ? <Txt size={12.5} color={message.includes('complete') ? colors.success : colors.textMuted}>{message}</Txt> : null}
      </Card>

      <Card style={{ gap: 12, marginTop: 14 }}>
        <SectionHeader title="Your hobby progress" icon="stats-chart-outline" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, padding: 12, borderRadius: radii.md, backgroundColor: colors.tint }}><Txt size={22} weight="800" color={colors.blue}>{totalMinutes}m</Txt><Txt size={11} color={colors.textMuted}>total hobby time</Txt></View>
          <View style={{ flex: 1, padding: 12, borderRadius: radii.md, backgroundColor: colors.tealTint }}><Txt size={22} weight="800" color={colors.teal}>{sessions.length}</Txt><Txt size={11} color={colors.textMuted}>completed sessions</Txt></View>
        </View>
        {sessions.length === 0 ? <Txt size={12.5} color={colors.textMuted}>Completed sessions will appear here.</Txt> : sessions.slice(0, 8).map((session) => (
          <View key={session.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <View style={{ flex: 1 }}><Txt size={12.5} weight="700">{categoryLabel(session.category)}</Txt><Txt size={11} color={colors.textMuted}>{session.durationMinutes} min · {new Date(session.completedAt).toLocaleDateString()}</Txt></View>
          </View>
        ))}
      </Card>
    </Shell>
  );
}
