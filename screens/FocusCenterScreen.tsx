import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';
import { AudioDownloadManager, AudioDownloadState } from '../lib/audioDownloadManager';

const MEDITATION_HISTORY_KEY = 'study-sakha-meditation-history-v1';
const MEDITATION_PREFS_KEY = 'study-sakha-meditation-prefs-v2';

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
  const navigation = useNavigation<any>();
  const { dispatch } = useStore();
  const isDark = scheme === 'dark';

  const [activity, setActivity] = useState<FocusActivity | null>(null);

  // Meditation configuration state (defaults to new Pure Cosmic Waves experience)
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

  // Save preferences
  const savePrefs = async (duration: number) => {
    try {
      await AsyncStorage.setItem(
        MEDITATION_PREFS_KEY,
        JSON.stringify({
          durationMinutes: duration,
        })
      );
    } catch (e) {
      console.warn('Could not save meditation prefs:', e);
    }
  };

  useEffect(() => {
    return navigation.addListener('blur', () => {
      setActivity(null);
      setShowMeditationConfig(false);
      setFullScreenMeditationActive(false);
    });
  }, [navigation]);

  const handleCardPress = (id: FocusActivity | 'hobbies') => {
    if (id === 'meditation') {
      setShowMeditationConfig(true);
    } else if (id === 'hobbies') {
      navigation.navigate('Hobbies');
    } else {
      setActivity(id);
    }
  };

  // Change duration
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

  return (
    <Shell active="FocusCenter" title="Focus & Wellness" subtitle="Choose a session for your next study moment">
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
          <Txt size={11} weight="700" color="#FFFFFF" style={{ marginTop: 4 }}>SET UP SESSION  &gt;</Txt>
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
                    <Txt size={12} color={colors.textMuted}>Select animation preset & calming audio</Txt>
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
                {/* Embedded Live 60fps Animation Preview */}
                <MeditationSceneRenderer
                  presetId={selectedPresetId}
                  isPlaying={showMeditationConfig}
                  width={580}
                  height={180}
                />

                {/* Live Preview Floating Badge & Meta */}
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

                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 12,
                    right: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Txt size={12.5} weight="800" color="#FFFFFF">{selectedPreset.title}</Txt>
                    <Txt size={10} color="rgba(255,255,255,0.7)" numberOfLines={1}>
                      {selectedPreset.subtitle}
                    </Txt>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      borderRadius: 8,
                      backgroundColor: `${selectedPreset.accentColor}30`,
                    }}
                  >
                    <Ionicons name="volume-medium-outline" size={12} color={selectedPreset.accentColor} />
                    <Txt size={10} weight="700" color={selectedPreset.accentColor}>
                      Pure Cosmic Waves
                    </Txt>
                  </View>
                </View>
              </View>

              {/* The Studio has one focused experience: Pure Cosmic Waves. */}
              <View
                style={{
                  gap: 6,
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: selectedPreset.accentColor,
                  backgroundColor: isDark ? `${selectedPreset.accentColor}18` : `${selectedPreset.accentColor}10`,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: `${selectedPreset.accentColor}25`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={selectedPreset.icon} size={18} color={selectedPreset.accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={13} weight="800" color={selectedPreset.accentColor}>
                      {selectedPreset.title}
                    </Txt>
                    <Txt size={10.5} color={colors.textMuted} numberOfLines={2}>
                      {selectedPreset.subtitle}
                    </Txt>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={selectedPreset.accentColor} />
                </View>
                <Txt size={11} color={colors.textMuted}>
                  {selectedPreset.description}
                </Txt>
              </View>

              {/* Pure Cosmic Waves is the only available meditation audio. */}
              <View style={{ gap: 8 }}>
                <Txt size={12} weight="800" color={colors.textMuted} style={{ letterSpacing: 0.5 }}>
                  CALMING AUDIO SOUNDSCAPE
                </Txt>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F2F4F7',
                  }}
                >
                  <Ionicons name="sparkles" size={14} color={selectedPreset.accentColor} />
                  <Txt size={11} color={colors.textMuted} style={{ flex: 1 }}>
                    Pure Cosmic Waves · default audio
                  </Txt>
                </View>

                {/* Downloadable Offline Audio Card for Pure Cosmic Waves */}
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

                    {/* Progress Bar while downloading */}
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Txt size={11} color={colors.textMuted}>Downloading high-fidelity audio...</Txt>
                          <Txt size={11} weight="700" color="#FFB800">
                            {`${(cosmicDownloadState.bytesWritten / (1024 * 1024)).toFixed(1)} / ${(cosmicDownloadState.totalBytes / (1024 * 1024)).toFixed(1)} MB`}
                          </Txt>
                        </View>
                      </View>
                    )}

                    {/* Download / Delete Action Buttons */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Txt size={11} color={colors.textMuted} style={{ flex: 1, marginRight: 8 }}>
                        {cosmicDownloadState.status === 'downloaded'
                          ? 'Saved to local device storage. Plays 100% offline without network.'
                          : 'Plays directly or download once for 100% offline meditation.'}
                      </Txt>

                      {cosmicDownloadState.status === 'downloaded' ? (
                        <Pressable
                          onPress={handleDeleteCosmic}
                          hitSlop={6}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 10,
                            backgroundColor: pressed ? 'rgba(255, 59, 48, 0.18)' : 'rgba(255, 59, 48, 0.1)',
                          })}
                        >
                          <Ionicons name="trash-outline" size={13} color="#FF3B30" />
                          <Txt size={11} weight="700" color="#FF3B30">Delete Audio</Txt>
                        </Pressable>
                      ) : cosmicDownloadState.status === 'downloading' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Txt size={11} weight="700" color="#FFB800">Downloading...</Txt>
                        </View>
                      ) : (
                        <Pressable
                          onPress={handleDownloadCosmic}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 10,
                            backgroundColor: pressed ? '#E0A300' : '#FFB800',
                          })}
                        >
                          <Ionicons name="arrow-down-circle-outline" size={15} color="#000000" />
                          <Txt size={11.5} weight="800" color="#000000">Download Audio</Txt>
                        </Pressable>
                      )}
                    </View>
                  </View>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dedicated Automatic Full-Screen Meditation Experience */}
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
