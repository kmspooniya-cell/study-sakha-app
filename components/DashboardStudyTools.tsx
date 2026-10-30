import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../lib/theme';
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

type TaskType = 'Review' | 'Revision' | 'Practice' | 'Reading' | 'Mock Test' | 'Other';

type CustomTask = {
  id: string;
  label: string;
  minutes: number;
  category: string;
  completed: boolean;
  completedOn: string | null;
  targetDate: string;
  taskType: TaskType;
};

type PlanSuggestion = Pick<CustomTask, 'id' | 'label' | 'category' | 'minutes' | 'taskType'>;

type Props = {
  plan: PlanTask[];
  planDone: Record<string, string[]>;
  dispatch: (action: any) => void;
  onOpenItem: (item: PlanTask) => void;
  suggestions: PlanSuggestion[];
};
const STORAGE_KEY = 'study-sakha-custom-tasks-v1';
const TASK_TYPES: TaskType[] = ['Review', 'Revision', 'Practice', 'Reading', 'Mock Test', 'Other'];

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

function formatDateKey(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function taskTypeForCategory(category: string): TaskType {
  if (category === 'PYQ') return 'Practice';
  if (category === 'Current Affairs') return 'Reading';
  if (category === 'Mock Test') return 'Mock Test';
  if (category === 'Note') return 'Review';
  return 'Other';
}

function migrateCustomTask(value: unknown): CustomTask {
  if (!value || typeof value !== 'object') {
    throw new Error('A saved task is not a valid task record.');
  }
  const task = value as Record<string, unknown>;
  if (
    typeof task.id !== 'string' ||
    typeof task.label !== 'string' ||
    typeof task.minutes !== 'number' ||
    !Number.isInteger(task.minutes) ||
    task.minutes < 1 ||
    task.minutes > 600
  ) {
    throw new Error('A saved task is missing a valid title, ID, or duration.');
  }

  const category = typeof task.category === 'string' && task.category.trim()
    ? task.category
    : 'Other';
  const targetDate = isDateKey(task.targetDate) ? task.targetDate : currentDateKey();
  const completedOn = isDateKey(task.completedOn)
    ? task.completedOn
    : task.completed
      ? targetDate
      : null;
  const taskType = TASK_TYPES.includes(task.taskType as TaskType)
    ? task.taskType as TaskType
    : taskTypeForCategory(category);

  return {
    ...task,
    id: task.id,
    label: task.label,
    minutes: task.minutes,
    category,
    targetDate,
    taskType,
    completedOn,
    completed: completedOn === targetDate,
  };
}

export function FocusTimerButton() {
  const { colors } = useTheme();

  const PRESETS = [15, 25, 40, 50];
  const HISTORY_KEY = 'study-sakha-focus-history-v1';

  type FocusSession = {
    id: string;
    subject: string;
    topic: string;
    minutes: number;
    completedAt: string;
  };

  const [visible, setVisible] = useState(false);
  const [ambientSound, setAmbientSound] = useState('Rain');
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);

  const currentSound = AMBIENT_SOUNDS.find((s) => s.label === ambientSound) ?? AMBIENT_SOUNDS[0];
  const audioPlayer = useAudioPlayer(currentSound.source);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
    }).catch((error) => {
      console.warn('Audio mode setup failed:', error);
    });
  }, []);

  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.volume = ambientVolume;
      audioPlayer.loop = true;
    }
  }, [audioPlayer, ambientVolume]);

  useEffect(() => {
    if (ambientPlaying) {
      audioPlayer.play();
    } else {
      audioPlayer.pause();
    }
  }, [ambientPlaying, audioPlayer]);

  useEffect(() => {
    if (!visible && ambientPlaying) {
      audioPlayer.pause();
      setAmbientPlaying(false);
      ambientWasPlaying.current = false;
    }
  }, [visible, ambientPlaying, audioPlayer]);

  function selectAmbientSound(label: string) {
    setAmbientSound(label);
    setShowSoundPicker(false);
  }

  function startAmbient() {
    setAmbientPlaying(true);
  }

  function stopAmbient() {
    audioPlayer.pause();
    setAmbientPlaying(false);
    audioPlayer.seekTo(0).catch(() => {});
  }
  const [input, setInput] = useState('25');
  const [duration, setDuration] = useState(1500);
  const [remaining, setRemaining] = useState(1500);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'done'>(
    'idle'
  );

  const [subject, setSubject] = useState('History');
  const [topic, setTopic] = useState('');
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const deadline = useRef<number | null>(null);
  const sessionStart = useRef<number | null>(null);
  const savedSession = useRef(false);
  const ambientWasPlaying = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then((value) => {
        if (value) setHistory(JSON.parse(value));
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, []);

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
        setStatus('done');

        if (!savedSession.current) {
          savedSession.current = true;

          const session: FocusSession = {
            id: `${Date.now()}`,
            subject: subject.trim() || 'General Study',
            topic: topic.trim(),
            minutes: Math.max(
              1,
              Math.round(
                (Date.now() - (sessionStart.current ?? Date.now())) / 60000
              )
            ),
            completedAt: new Date().toISOString(),
          };

          setHistory((previous) => {
            const updated = [session, ...previous].slice(0, 100);

            AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated)).catch(
              () => {}
            );

            return updated;
          });

          Alert.alert(
            'Focus complete!',
            'बहुत अच्छा! आपका सेशन पूरा हो गया और हिस्ट्री सेव कर दी गई है।'
          );
        }
      }
    };

    tick();
    const timer = setInterval(tick, 500);

    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status === 'done' && ambientPlaying) {
      audioPlayer.pause();
      setAmbientPlaying(false);
    }
  }, [status, ambientPlaying, audioPlayer]);

  function setMinutes(value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 180) {
      Alert.alert('Invalid duration', '1 से 180 मिनट के बीच चुनें।');
      return;
    }

    if (status === 'running' || status === 'paused') return;

    setInput(String(value));
    setDuration(value * 60);
    setRemaining(value * 60);
    deadline.current = null;
    sessionStart.current = null;
    savedSession.current = false;
    setStatus('idle');
  }

  function start() {
    if (status === 'running') return;

    const seconds = status === 'done' ? duration : remaining;

    if (seconds <= 0) {
      setRemaining(duration);
      deadline.current = Date.now() + duration * 1000;
    } else {
      deadline.current = Date.now() + seconds * 1000;
    }

    if (status === 'idle' || status === 'done') {
      sessionStart.current = Date.now();
      savedSession.current = false;
    }

    setStatus('running');
    if (status === 'paused' && ambientWasPlaying.current && !ambientPlaying) {
      ambientWasPlaying.current = false;
      setAmbientPlaying(true);
    }
  }

  function pause() {
    if (deadline.current === null) return;

    const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));

    deadline.current = null;
    setRemaining(left);
    setStatus(left > 0 ? 'paused' : 'done');
    if (ambientPlaying) {
      audioPlayer.pause();
      setAmbientPlaying(false);
      ambientWasPlaying.current = true;
    }
  }

  function reset() {
    deadline.current = null;
    sessionStart.current = null;
    savedSession.current = false;
    setRemaining(duration);
    setStatus('idle');
    audioPlayer.pause();
    setAmbientPlaying(false);
    ambientWasPlaying.current = false;
    audioPlayer.seekTo(0).catch(() => {});
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

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={{
          backgroundColor: 'rgba(255,255,255,0.16)',
          borderColor: 'rgba(255,255,255,0.35)',
          borderWidth: 1,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Ionicons name="timer-outline" size={18} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Start focus session
        </Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
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
                    Focus Mode
                  </Text>
                  <Text style={{ color: colors.textMuted, marginTop: 3 }}>
                    आज का फोकस: {todayMinutes} मिनट
                  </Text>
                </View>

                <Pressable onPress={() => setVisible(false)}>
                  <Ionicons name="close" size={25} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={{ color: colors.textMuted }}>विषय और टॉपिक</Text>

              <TextInput
                value={subject}
                onChangeText={setSubject}
                editable={status !== 'running' && status !== 'paused'}
                placeholder="विषय, जैसे History"
                placeholderTextColor={colors.textFaint}
                style={{
                  color: colors.text,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                }}
              />

              <TextInput
                value={topic}
                onChangeText={setTopic}
                editable={status !== 'running' && status !== 'paused'}
                placeholder="टॉपिक, जैसे Mewar Painting"
                placeholderTextColor={colors.textFaint}
                style={{
                  color: colors.text,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                }}
              />

              <Text style={{ color: colors.textMuted }}>सेशन की अवधि</Text>

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
                  placeholder="Custom minutes"
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
                      ? 'Focus running'
                      : status === 'paused'
                      ? 'Paused'
                      : status === 'done'
                      ? 'Completed'
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
                  onPress={status === 'running' ? pause : start}
                  style={{
                    flex: 1,
                    backgroundColor: colors.blue,
                    borderRadius: 12,
                    padding: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                    {status === 'running'
                      ? 'Pause'
                      : status === 'paused'
                      ? 'Resume'
                      : status === 'done'
                      ? 'Start Again'
                      : 'Start Focus'}
                  </Text>
                </Pressable>

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
                  <Text style={{ color: colors.text, fontWeight: '800' }}>
                    Reset
                  </Text>
                </Pressable>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  आज के पूरे हुए सेशन
                </Text>

                {!historyLoaded ? (
                  <Text style={{ color: colors.textMuted }}>
                    हिस्ट्री लोड हो रही है...
                  </Text>
                ) : todayHistory.length === 0 ? (
                  <Text style={{ color: colors.textMuted }}>
                    अभी कोई सेशन पूरा नहीं हुआ।
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
                        {item.minutes} मिनट ·{' '}
                        {new Date(item.completedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              <View
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
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

export function CustomStudyPlan({
  plan,
  planDone,
  dispatch,
  onOpenItem,
  suggestions,
}: Props) {
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(currentDateKey);
  const [tasks, setTasks] = useState<CustomTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('25');
  const [category, setCategory] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('Review');
  const [taskDate, setTaskDate] = useState(currentDateKey);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  const locks = useRef<Record<string, boolean>>({});
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!active || !saved) return;

        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
          throw new Error('Saved tasks are not in the expected format.');
        }
        const migratedTasks = parsed.map(migrateCustomTask);
        setTasks(migratedTasks);
        migratedTasks
          .filter((task) => task.completedOn === task.targetDate)
          .forEach((task) =>
            dispatch({
              type: 'plannerCompletion',
              date: task.targetDate,
              completion: {
                taskId: task.id,
                label: task.label,
                minutes: task.minutes,
                category: task.category,
                taskType: task.taskType,
              },
              completed: true,
            })
          );
      })
      .catch((cause) => {
        if (active) {
          setLoadFailed(true);
          setStorageError(
            cause instanceof Error
              ? `Could not load saved tasks. They were not changed: ${cause.message}`
              : 'Could not load saved tasks. They were not changed.'
          );
          Alert.alert('Study plan', 'Could not load saved custom tasks. Existing data was not changed.');
        }
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded || loadFailed) return;

    saveQueue.current = saveQueue.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)))
      .then(() => setStorageError(''))
      .catch((cause) => {
        setStorageError(
          cause instanceof Error ? `Could not save your tasks: ${cause.message}` : 'Could not save your tasks.'
        );
        Alert.alert('Save error', 'Could not save your custom tasks.');
      });
  }, [tasks, loaded, loadFailed]);

  const dateDone = planDone[selectedDate] ?? [];
  const visibleCustomTasks = tasks.filter((task) => task.targetDate === selectedDate);
  const defaultDone = plan.filter((item) => dateDone.includes(item.id)).length;

  const customDone = visibleCustomTasks.filter((task) => task.completedOn === selectedDate).length;
  const total = plan.length + visibleCustomTasks.length;
  const doneCount = defaultDone + customDone;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  function openAdd(suggestion?: PlanSuggestion) {
    setEditingId(null);
    setTitle(suggestion?.label ?? '');
    setMinutes(String(suggestion?.minutes ?? 25));
    setCategory(suggestion?.category ?? '');
    setTaskType(suggestion?.taskType ?? 'Review');
    setTaskDate(selectedDate);
    setError('');
    setModal(true);
  }

  function openEdit(task: CustomTask) {
    setEditingId(task.id);
    setTitle(task.label);
    setMinutes(String(task.minutes));
    setCategory(task.category);
    setTaskType(task.taskType);
    setTaskDate(task.targetDate);
    setError('');
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

    if (!isDateKey(taskDate)) {
      setError('Choose a valid target date.');
      return;
    }

    if (editingId) {
      setTasks((old) =>
        old.map((task) =>
          task.id === editingId
            ? {
                ...task,
                label: cleanTitle,
                minutes: duration,
                category: cleanCategory,
                taskType,
                targetDate: taskDate,
                completed: taskDate === task.targetDate && task.completedOn === taskDate,
                completedOn: taskDate === task.targetDate ? task.completedOn : null,
              }
            : task
        )
      );
    } else {
      setTasks((old) => [
        ...old,
        {
          id: `custom-${Date.now()}`,
          label: cleanTitle,
          minutes: duration,
          category: cleanCategory,
          taskType,
          targetDate: taskDate,
          completed: false,
          completedOn: null,
        },
      ]);
    }

    setModal(false);
    setError('');
  }

  function toggleDefault(item: PlanTask) {
    if (locks.current[item.id]) return;
    locks.current[item.id] = true;

    const wasDone = dateDone.includes(item.id);
    dispatch({ type: 'togglePlan', id: item.id, date: selectedDate });

    if (!wasDone && selectedDate === currentDateKey()) {
      dispatch({
        type: 'creditPlanMinutes',
        id: item.id,
        date: selectedDate,
        minutes: Math.max(0, Number(item.minutes) || 0),
      });
    }

    setTimeout(() => {
      delete locks.current[item.id];
    }, 350);
  }

  function toggleCustom(task: CustomTask) {
    const completed = task.completedOn !== selectedDate;
    setTasks((old) =>
      old.map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed,
              completedOn: completed ? selectedDate : null,
            }
          : item
      )
    );
    dispatch({
      type: 'plannerCompletion',
      date: selectedDate,
      completion: {
        taskId: task.id,
        label: task.label,
        minutes: task.minutes,
        category: task.category,
        taskType: task.taskType,
      },
      completed,
    });
  }

  const visiblePlan = plan.filter((item) => {
    const done = dateDone.includes(item.id);
    return (
      filter === 'All' ||
      (filter === 'Done' && done) ||
      (filter === 'Pending' && !done)
    );
  });

  const visibleTasks = visibleCustomTasks.filter(
    (task) =>
      filter === 'All' ||
      (filter === 'Done' && task.completedOn === selectedDate) ||
      (filter === 'Pending' && task.completedOn !== selectedDate)
  );

  const dateLabel = formatDateKey(selectedDate);
  const deleteTask = tasks.find((task) => task.id === deleteTaskId);

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
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 17,
            fontWeight: '800',
            flex: 1,
          }}
        >
          Today's plan
        </Text>

        <Pressable
          onPress={() => openAdd()}
          disabled={!loaded || loadFailed}
          style={{
            backgroundColor: colors.blue,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            opacity: !loaded || loadFailed ? 0.55 : 1,
          }}
        >
          <Ionicons name="add" size={17} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Add</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pressable
          onPress={() => setSelectedDate((date) => shiftDateKey(date, -1))}
          accessibilityRole="button"
          accessibilityLabel="Show previous day"
          hitSlop={8}
          style={{ padding: 8 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.blue} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {selectedDate === currentDateKey() ? 'Today · ' : ''}{dateLabel}
          </Text>
          {selectedDate !== currentDateKey() ? (
            <Pressable onPress={() => setSelectedDate(currentDateKey())} accessibilityRole="button">
              <Text style={{ color: colors.blue, fontSize: 11, marginTop: 2 }}>Go to today</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setSelectedDate((date) => shiftDateKey(date, 1))}
          accessibilityRole="button"
          accessibilityLabel="Show next day"
          hitSlop={8}
          style={{ padding: 8 }}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.blue} />
        </Pressable>
      </View>

      <Text style={{ color: colors.textMuted, marginBottom: 10 }}>
        {doneCount}/{total} completed · {percent}%
      </Text>
      {!loaded ? (
        <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 8 }}>
          Loading saved tasks…
        </Text>
      ) : null}

      <View
        style={{
          height: 7,
          backgroundColor: colors.surfaceAlt,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${percent}%`,
            height: 7,
            backgroundColor: colors.teal,
          }}
        />
      </View>

      <View style={{ marginTop: 14 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
          Suggested for you
        </Text>
        {suggestions.length ? (
          suggestions.map((suggestion) => (
            <View
              key={suggestion.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
                  {suggestion.label}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>
                  {suggestion.category} · {suggestion.taskType} · {suggestion.minutes}m
                </Text>
              </View>
              <Pressable
                onPress={() => openAdd(suggestion)}
                disabled={!loaded || loadFailed}
                accessibilityRole="button"
                accessibilityLabel={`Add suggested task: ${suggestion.label}`}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.tint }}
              >
                <Text style={{ color: colors.blue, fontSize: 11, fontWeight: '800' }}>Add</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: 11, paddingVertical: 6 }}>
            Save a revision note or make progress on a resource to get tailored suggestions.
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 14 }}>
        {['All', 'Pending', 'Done'].map((value) => (
          <Pressable
            key={value}
            onPress={() => setFilter(value)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor:
                filter === value ? colors.tint : colors.surfaceAlt,
            }}
          >
            <Text
              style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>

      {storageError ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 11, marginBottom: 8 }}>
          {storageError}
        </Text>
      ) : null}

      <ScrollView
        style={{ maxHeight: 430 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {visiblePlan.map((item) => {
          const done = dateDone.includes(item.id);

          return (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Pressable
                onPress={() => toggleDefault(item)}
                style={{
                  width: 23,
                  height: 23,
                  borderWidth: 1.5,
                  borderColor: done ? colors.teal : colors.border,
                  backgroundColor: done ? colors.teal : 'transparent',
                  borderRadius: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done && (
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                )}
              </Pressable>

              <Pressable style={{ flex: 1 }} onPress={() => onOpenItem(item)}>
                <Text
                  style={{
                    color: done ? colors.textFaint : colors.text,
                    fontWeight: '600',
                    textDecorationLine: done ? 'line-through' : 'none',
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 10,
                    marginTop: 4,
                  }}
                >
                  {item.kind.toUpperCase()}
                </Text>
              </Pressable>

              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {item.minutes}m
              </Text>
            </View>
          );
        })}

        {visibleTasks.map((task) => {
          const done = task.completedOn === selectedDate;
          return (
            <View
              key={task.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Pressable
                onPress={() => toggleCustom(task)}
                style={{
                  width: 23,
                  height: 23,
                  borderWidth: 1.5,
                  borderColor: done ? colors.teal : colors.border,
                  backgroundColor: done ? colors.teal : 'transparent',
                  borderRadius: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done && (
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                )}
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: '600',
                    textDecorationLine: done ? 'line-through' : 'none',
                  }}
                >
                  {task.label}
                </Text>
                <Text
                  style={{ color: colors.textMuted, fontSize: 10, marginTop: 4 }}
                >
                  {task.category.toUpperCase()} · {task.taskType.toUpperCase()}
                </Text>
              </View>

              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {task.minutes}m
              </Text>

              <Pressable onPress={() => openEdit(task)} hitSlop={8}>
                <Ionicons name="create-outline" size={19} color={colors.blue} />
              </Pressable>

              <Pressable onPress={() => setDeleteTaskId(task.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={19} color={colors.danger} />
              </Pressable>
            </View>
          );
        })}

        {visiblePlan.length === 0 && visibleTasks.length === 0 && (
          <Text
            style={{
              color: colors.textMuted,
              textAlign: 'center',
              padding: 20,
            }}
          >
            No tasks in this view.
          </Text>
        )}
      </ScrollView>

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
        visible={deleteTaskId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTaskId(null)}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Delete task?</Text>
            <Text style={{ color: colors.textMuted }}>{deleteTask?.label}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <Pressable
                onPress={() => setDeleteTaskId(null)}
                style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceAlt }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (deleteTaskId) setTasks((old) => old.filter((task) => task.id !== deleteTaskId));
                  setDeleteTaskId(null);
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
