import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
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
  getSoundById,
  MEDITATION_PRESETS,
  MEDITATION_SOUND_LIST,
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
  id: FocusActivity;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'blue' | 'teal' | 'violet';
}[] = [
  { id: 'study', title: 'Focus for Study', subtitle: 'Build a focused study session.', icon: 'book-outline', colorKey: 'blue' },
  { id: 'meditation', title: 'Mindful Meditation', subtitle: 'Immersive animations & soundscapes.', icon: 'leaf-outline', colorKey: 'teal' },
  { id: 'break', title: 'Rest & Recharge', subtitle: 'Reset your mind between study blocks.', icon: 'cafe-outline', colorKey: 'violet' },
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
  const [selectedPresetId, setSelectedPresetId] = useState<MeditationPresetId>('pure_cosmic_waves');
  const [selectedSoundId, setSelectedSoundId] = useState<string>('pure_cosmic_waves');
  const [hasCustomSound, setHasCustomSound] = useState(false);
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
          if (parsed.presetId) setSelectedPresetId(parsed.presetId);
          if (parsed.soundId) setSelectedSoundId(parsed.soundId);
          if (parsed.durationMinutes) setMeditationDuration(parsed.durationMinutes);
          if (parsed.hasCustomSound !== undefined) setHasCustomSound(parsed.hasCustomSound);
        }
      } catch (e) {
        console.warn('Could not load meditation prefs:', e);
      }
    })();
  }, []);

  // Save preferences
  const savePrefs = async (presetId: MeditationPresetId, soundId: string, duration: number, customSound: boolean) => {
    try {
      await AsyncStorage.setItem(
        MEDITATION_PREFS_KEY,
        JSON.stringify({
          presetId,
          soundId,
          durationMinutes: duration,
          hasCustomSound: customSound,
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

  const handleCardPress = (id: FocusActivity) => {
    if (id === 'meditation') {
      setShowMeditationConfig(true);
    } else {
      setActivity(id);
    }
  };

  // Handle preset selection with automatic default sound mapping
  const handleSelectPreset = (newPresetId: MeditationPresetId) => {
    setSelectedPresetId(newPresetId);
    const preset = getPresetById(newPresetId);
    // Automatically map to default sound unless user previously set a custom sound
    const newSoundId = preset.defaultSoundId;
    setSelectedSoundId(newSoundId);
    setHasCustomSound(false);
    savePrefs(newPresetId, newSoundId, meditationDuration, false);
  };

  // Handle independent sound choice
  const handleSelectSound = (soundId: string) => {
    setSelectedSoundId(soundId);
    const preset = getPresetById(selectedPresetId);
    const isCustom = soundId !== preset.defaultSoundId;
    setHasCustomSound(isCustom);
    savePrefs(selectedPresetId, soundId, meditationDuration, isCustom);
  };

  // Restore default sound for current preset
  const handleRestoreDefaultSound = () => {
    const preset = getPresetById(selectedPresetId);
    setSelectedSoundId(preset.defaultSoundId);
    setHasCustomSound(false);
    savePrefs(selectedPresetId, preset.defaultSoundId, meditationDuration, false);
  };

  // Change duration
  const handleSelectDuration = (duration: number) => {
    setMeditationDuration(duration);
    savePrefs(selectedPresetId, selectedSoundId, duration, hasCustomSound);
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
      soundId: selectedSoundId,
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

  const selectedPreset = useMemo(() => getPresetById(selectedPresetId), [selectedPresetId]);
  const activeSound = useMemo(() => getSoundById(selectedSoundId), [selectedSoundId]);
  const isDefaultSound = selectedSoundId === selectedPreset.defaultSoundId;

  return (
    <Shell active="FocusCenter" title="Focus & Wellness" subtitle="Choose a session for your next study moment">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {ACTIVITIES.map((item, index) => {
          const color = colors[item.colorKey];
          const fullWidth = index === ACTIVITIES.length - 1;
          return (
            <Pressable
              key={item.id}
              onPress={() => handleCardPress(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={({ pressed }) => ({
                width: fullWidth ? '100%' : '48%',
                flexGrow: fullWidth ? 0 : 1,
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
                      {activeSound.name}
                    </Txt>
                  </View>
                </View>
              </View>

              {/* Animation Preset Gallery (6 Presets) */}
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt size={12} weight="800" color={colors.textMuted} style={{ letterSpacing: 0.5 }}>
                    CHOOSE ANIMATION EXPERIENCE
                  </Txt>
                  <Txt size={11} color={colors.textMuted}>
                    6 Presets
                  </Txt>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {MEDITATION_PRESETS.map((preset) => {
                    const isSelected = preset.id === selectedPresetId;
                    return (
                      <Pressable
                        key={preset.id}
                        onPress={() => handleSelectPreset(preset.id)}
                        accessibilityRole="button"
                        accessibilityLabel={preset.title}
                        style={({ pressed }) => ({
                          width: '48%',
                          flexGrow: 1,
                          padding: 12,
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: isSelected ? preset.accentColor : colors.borderSubtle,
                          backgroundColor: isSelected
                            ? (isDark ? `${preset.accentColor}18` : `${preset.accentColor}10`)
                            : (isDark ? colors.surfaceAlt : '#F7F8FA'),
                          opacity: pressed ? 0.85 : 1,
                          gap: 6,
                        })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              backgroundColor: `${preset.accentColor}25`,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name={preset.icon} size={18} color={preset.accentColor} />
                          </View>
                          {isSelected && (
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: preset.accentColor,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        <Txt size={13} weight="800" color={isSelected ? preset.accentColor : colors.text}>
                          {preset.title}
                        </Txt>
                        <Txt size={10.5} color={colors.textMuted} numberOfLines={2}>
                          {preset.subtitle}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Soundscape Selection & Default Mapping */}
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt size={12} weight="800" color={colors.textMuted} style={{ letterSpacing: 0.5 }}>
                    CALMING AUDIO SOUNDSCAPE
                  </Txt>
                  {!isDefaultSound && (
                    <Pressable
                      onPress={handleRestoreDefaultSound}
                      hitSlop={6}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Ionicons name="refresh-outline" size={12} color={colors.blue} />
                      <Txt size={11} weight="700" color={colors.blue}>
                        Restore Default
                      </Txt>
                    </Pressable>
                  )}
                </View>

                {/* Default Mapping Note */}
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
                  <Ionicons
                    name={isDefaultSound ? 'sparkles' : 'information-circle-outline'}
                    size={14}
                    color={isDefaultSound ? selectedPreset.accentColor : colors.textMuted}
                  />
                  <Txt size={11} color={colors.textMuted} style={{ flex: 1 }}>
                    {isDefaultSound
                      ? `Default sound for ${selectedPreset.title}: ${activeSound.name}`
                      : `Custom sound active. Default is ${getSoundById(selectedPreset.defaultSoundId).name}`}
                  </Txt>
                </View>

                {/* Horizontal Sound Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {MEDITATION_SOUND_LIST.map((snd) => {
                    const isSelected = snd.id === selectedSoundId;
                    const isPresetDefault = snd.id === selectedPreset.defaultSoundId;
                    return (
                      <Pressable
                        key={snd.id}
                        onPress={() => handleSelectSound(snd.id)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          paddingHorizontal: 13,
                          paddingVertical: 9,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: isSelected ? selectedPreset.accentColor : colors.borderSubtle,
                          backgroundColor: isSelected
                            ? (isDark ? `${selectedPreset.accentColor}25` : `${selectedPreset.accentColor}12`)
                            : (isDark ? '#1B2439' : '#F2F2F7'),
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Ionicons
                          name={snd.icon}
                          size={16}
                          color={isSelected ? selectedPreset.accentColor : colors.textMuted}
                        />
                        <View>
                          <Txt
                            size={12}
                            weight={isSelected ? '800' : '600'}
                            color={isSelected ? selectedPreset.accentColor : colors.text}
                          >
                            {snd.name}
                          </Txt>
                          {isPresetDefault && (
                            <Txt size={9} weight="700" color={selectedPreset.accentColor}>
                              Preset Default
                            </Txt>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Downloadable Offline Audio Card for Pure Cosmic Waves */}
                {selectedSoundId === 'pure_cosmic_waves' && (
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
                )}
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dedicated Automatic Full-Screen Meditation Experience */}
      <FullScreenMeditation
        visible={fullScreenMeditationActive}
        presetId={selectedPresetId}
        soundId={selectedSoundId}
        durationMinutes={meditationDuration}
        onSoundChange={(newSoundId) => {
          setSelectedSoundId(newSoundId);
          setHasCustomSound(newSoundId !== selectedPreset.defaultSoundId);
        }}
        onComplete={handleMeditationComplete}
        onClose={() => setFullScreenMeditationActive(false)}
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
