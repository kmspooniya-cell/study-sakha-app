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

type CustomTask = {
  id: string;
  label: string;
  minutes: number;
  category: string;
  completed: boolean;
};

type Props = {
  plan: PlanTask[];
  todayDone: string[];
  dispatch: (action: any) => void;
  onOpenItem: (item: PlanTask) => void;
};
const STORAGE_KEY = 'study-sakha-custom-tasks-v1';
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
  todayDone,
  dispatch,
  onOpenItem,
}: Props) {
  const { colors } = useTheme();

  const [tasks, setTasks] = useState<CustomTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('25');
  const [category, setCategory] = useState('Note');
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');

  const locks = useRef<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!active || !saved) return;

        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setTasks(parsed);
      })
      .catch(() => {
        if (active) {
          Alert.alert('Study plan', 'Could not load saved custom tasks.');
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
    if (!loaded) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {
      Alert.alert('Save error', 'Could not save your custom tasks.');
    });
  }, [tasks, loaded]);

  const defaultDone = plan.filter((item) => todayDone.includes(item.id)).length;

  const customDone = tasks.filter((task) => task.completed).length;
  const total = plan.length + tasks.length;
  const doneCount = defaultDone + customDone;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  function openAdd() {
    setEditingId(null);
    setTitle('');
    setMinutes('25');
    setCategory('Note');
    setError('');
    setModal(true);
  }

  function openEdit(task: CustomTask) {
    setEditingId(task.id);
    setTitle(task.label);
    setMinutes(String(task.minutes));
    setCategory(task.category);
    setError('');
    setModal(true);
  }

  function saveTask() {
    const cleanTitle = title.trim();
    const duration = Number(minutes);

    if (!cleanTitle) {
      setError('Please enter a task title.');
      return;
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
      setError('Duration must be 1–600 minutes.');
      return;
    }

    if (editingId) {
      setTasks((old) =>
        old.map((task) =>
          task.id === editingId
            ? { ...task, label: cleanTitle, minutes: duration, category }
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
          category,
          completed: false,
        },
      ]);
    }

    setModal(false);
    setError('');
  }

  function toggleDefault(item: PlanTask) {
    if (locks.current[item.id]) return;
    locks.current[item.id] = true;

    const wasDone = todayDone.includes(item.id);
    dispatch({ type: 'togglePlan', id: item.id });

    if (!wasDone) {
      dispatch({
        type: 'study',
        minutes: Math.max(0, Number(item.minutes) || 0),
      });
    }

    setTimeout(() => {
      delete locks.current[item.id];
    }, 350);
  }

  const visiblePlan = plan.filter((item) => {
    const done = todayDone.includes(item.id);
    return (
      filter === 'All' ||
      (filter === 'Done' && done) ||
      (filter === 'Pending' && !done)
    );
  });

  const visibleTasks = tasks.filter(
    (task) =>
      filter === 'All' ||
      (filter === 'Done' && task.completed) ||
      (filter === 'Pending' && !task.completed)
  );

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
          onPress={openAdd}
          style={{
            backgroundColor: colors.blue,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Ionicons name="add" size={17} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Add</Text>
        </Pressable>
      </View>

      <Text style={{ color: colors.textMuted, marginBottom: 10 }}>
        {doneCount}/{total} completed · {percent}%
      </Text>

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

      <ScrollView
        style={{ maxHeight: 430 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {visiblePlan.map((item) => {
          const done = todayDone.includes(item.id);

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

        {visibleTasks.map((task) => (
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
              onPress={() =>
                setTasks((old) =>
                  old.map((item) =>
                    item.id === task.id
                      ? { ...item, completed: !item.completed }
                      : item
                  )
                )
              }
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
              {task.completed && (
                <Ionicons name="checkmark" size={15} color="#FFFFFF" />
              )}
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: '600',
                  textDecorationLine: task.completed ? 'line-through' : 'none',
                }}
              >
                {task.label}
              </Text>
              <Text
                style={{ color: colors.textMuted, fontSize: 10, marginTop: 4 }}
              >
                {task.category.toUpperCase()} · CUSTOM
              </Text>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {task.minutes}m
            </Text>

            <Pressable onPress={() => openEdit(task)} hitSlop={8}>
              <Ionicons name="create-outline" size={19} color={colors.blue} />
            </Pressable>

            <Pressable
              onPress={() =>
                Alert.alert('Delete task?', task.label, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () =>
                      setTasks((old) =>
                        old.filter((item) => item.id !== task.id)
                      ),
                  },
                ])
              }
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={19} color={colors.danger} />
            </Pressable>
          </View>
        ))}

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
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              gap: 12,
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
              Category
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {['Note', 'PYQ', 'Current Affairs', 'Mock Test', 'Other'].map(
                (value) => (
                  <Pressable
                    key={value}
                    onPress={() => setCategory(value)}
                    style={{
                      padding: 9,
                      borderRadius: 9,
                      backgroundColor:
                        category === value ? colors.tint : colors.surfaceAlt,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 12 }}>
                      {value}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            <TextInput
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              placeholder="Duration in minutes"
              placeholderTextColor={colors.textFaint}
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
        </View>
      </Modal>
    </View>
  );
}
