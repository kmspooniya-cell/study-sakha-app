import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getPresetById,
  getSoundById,
  MeditationPresetId,
} from './MeditationPresets';
import { MeditationSceneRenderer } from './MeditationSceneRenderer';
import { radii, useTheme } from '../lib/theme';
import { AudioDownloadManager } from '../lib/audioDownloadManager';

function formatMinutesSeconds(totalSeconds: number) {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export type FullScreenMeditationProps = {
  visible: boolean;
  presetId?: MeditationPresetId;
  durationMinutes?: number;
  onComplete: (elapsedSeconds: number) => void;
  onClose: () => void;
};

export function FullScreenMeditation({
  visible,
  presetId = 'pure_cosmic_waves',
  durationMinutes = 10,
  onComplete,
  onClose,
}: FullScreenMeditationProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const preset = useMemo(() => getPresetById(presetId), [presetId]);
  const activeSound = getSoundById('pure_cosmic_waves');

  // Offline downloaded local file URI support
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    if (activeSound.id === 'pure_cosmic_waves') {
      unsub = AudioDownloadManager.subscribe('pure_cosmic_waves', (st) => {
        if (st.status === 'downloaded' && st.localUri) {
          setDownloadedUri(st.localUri);
        } else {
          setDownloadedUri(null);
        }
      });
    } else {
      setDownloadedUri(null);
    }
    return unsub;
  }, [activeSound.id]);

  const effectiveAudioSource = useMemo(() => {
    if (downloadedUri && activeSound.id === 'pure_cosmic_waves') {
      return { uri: downloadedUri };
    }
    return activeSound.source;
  }, [downloadedUri, activeSound]);

  const totalDurationSeconds = Math.max(60, durationMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(totalDurationSeconds);
  const [isRunning, setIsRunning] = useState(true);

  // Audio controls
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showSoundSelector, setShowSoundSelector] = useState(false);

  // Audio player from expo-audio
  const audioPlayer = useAudioPlayer(effectiveAudioSource);

  const timerIntervalRef = useRef<any>(null);
  const elapsedSecondsRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      setRemainingSeconds(totalDurationSeconds);
      setIsRunning(true);
      setShowSoundSelector(false);
      elapsedSecondsRef.current = 0;
    }
  }, [visible, totalDurationSeconds]);

  // Setup audio mode
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  }, []);

  // Configure AudioPlayer loop & volume
  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.loop = true;
      audioPlayer.volume = isMuted ? 0 : volume;
    }
  }, [audioPlayer, isMuted, volume]);

  // Synchronize playback with running state and sound changes
  useEffect(() => {
    if (!audioPlayer) return;
    try {
      if (visible && isRunning && !isMuted) {
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
    } catch {
      // Audio playback safety catch
    }
  }, [visible, isRunning, isMuted, audioPlayer]);

  // Cleanup audio on unmount or close
  useEffect(() => {
    return () => {
      if (audioPlayer) {
        try {
          audioPlayer.pause();
          audioPlayer.seekTo(0);
        } catch {}
      }
    };
  }, [audioPlayer]);

  // Countdown timer (does NOT restart when changing sounds)
  useEffect(() => {
    if (!visible) return;

    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            handleFinish();
            return 0;
          }
          return prev - 1;
        });
        elapsedSecondsRef.current += 1;
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [visible, isRunning]);

  const togglePauseResume = () => {
    setIsRunning((prev) => {
      const next = !prev;
      if (!next && audioPlayer) {
        audioPlayer.pause();
      } else if (next && audioPlayer && !isMuted) {
        audioPlayer.play();
      }
      return next;
    });
  };

  const handleFinish = () => {
    if (audioPlayer) {
      try {
        audioPlayer.pause();
        audioPlayer.seekTo(0);
      } catch {}
    }
    const elapsed = Math.max(1, elapsedSecondsRef.current);
    onComplete(elapsed);
    onClose();
  };

  const handleBackToStudio = () => {
    if (audioPlayer) {
      try {
        audioPlayer.pause();
        audioPlayer.seekTo(0);
      } catch {}
    }
    onClose();
  };

  if (!visible) return null;

  const isDark = scheme === 'dark';
  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={handleBackToStudio}
    >
      <View
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: preset.gradient[0],
        }}
      >
        {/* Soft Animated Preset Gradient */}
        <LinearGradient
          colors={preset.gradient}
          start={{ x: 0.1, y: 0.0 }}
          end={{ x: 0.9, y: 1.0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Selected Animation Experience Scene */}
        <MeditationSceneRenderer
          presetId={presetId}
          isPlaying={isRunning}
          width={width}
          height={height}
        />

        {/* Minimal Apple HUD Layer */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 22),
            paddingHorizontal: 20,
            justifyContent: 'space-between',
            zIndex: 100,
            elevation: 100,
          }}
          pointerEvents="box-none"
        >
          {/* Top Bar: Back and Audio Controls */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 48,
              zIndex: 101,
              elevation: 101,
            }}
            pointerEvents="auto"
          >
            {/* End Button */}
            <Pressable
              onPress={handleBackToStudio}
              testID="meditation-back-button"
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to Meditation Studio"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                minWidth: 88,
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radii.control,
                backgroundColor: 'rgba(10, 16, 30, 0.78)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.35)',
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Ionicons name="arrow-back" size={17} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                Back
              </Text>
            </Pressable>

            {/* Experience & Audio Indicator */}
            <View
              style={{
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: -0.3 }}>
                {preset.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <Ionicons
                  name={isMuted ? 'volume-mute' : 'musical-note'}
                  size={12}
                  color={preset.accentColor}
                />
                <Text style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: 11, fontWeight: '600' }}>
                  {activeSound.name}
                </Text>
                <Ionicons name="chevron-down" size={12} color="rgba(255, 255, 255, 0.6)" />
              </View>
            </View>
            <Pressable
              onPress={() => setShowSoundSelector(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Audio volume controls"
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: radii.control,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Ionicons name="musical-notes-outline" size={19} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Bottom Floating Control Dock */}
          <View
            style={{ alignItems: 'center', gap: 14, zIndex: 101, elevation: 101 }}
            pointerEvents="auto"
          >
            {/* Minimal Timer Display */}
            <View style={{ alignItems: 'center', gap: 3 }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 26,
                  fontWeight: '800',
                  letterSpacing: -0.5,
                  fontVariant: ['tabular-nums'],
                  textShadowColor: 'rgba(0, 0, 0, 0.4)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 6,
                }}
              >
                {formatMinutesSeconds(remainingSeconds)}
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {durationMinutes} min session
              </Text>
            </View>

            {/* Apple Floating Control Capsule */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 26,
                backgroundColor: 'rgba(20, 28, 46, 0.82)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.16)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 18,
                elevation: 8,
              }}
            >
              {/* Mute / Unmute Toggle */}
              <Pressable
                onPress={() => setIsMuted((m) => !m)}
                accessibilityRole="button"
                accessibilityLabel={isMuted ? 'Unmute sound' : 'Mute sound'}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isMuted
                    ? 'rgba(255, 59, 48, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)',
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}
              >
                <Ionicons
                  name={isMuted ? 'volume-mute' : 'volume-high'}
                  size={20}
                  color={isMuted ? '#FF453A' : '#FFFFFF'}
                />
              </Pressable>

              {/* Main Pause / Resume Button */}
              <Pressable
                onPress={togglePauseResume}
                testID="meditation-pause-resume-button"
                accessibilityRole="button"
                accessibilityLabel={isRunning ? 'Pause meditation' : 'Resume meditation'}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 24,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: preset.accentColor,
                  shadowColor: preset.accentColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 5,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Ionicons name={isRunning ? 'pause' : 'play'} size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: -0.3 }}>
                  {isRunning ? 'Pause' : 'Resume'}
                </Text>
              </Pressable>

              <View style={{ width: 44, height: 44 }} />
            </View>
          </View>
        </View>

        {/* In-Session Sound Selector Sheet */}
        <Modal
          visible={showSoundSelector}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSoundSelector(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <View
              style={{
                maxHeight: height * 0.8,
                backgroundColor: isDark ? '#141C2E' : '#FFFFFF',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: 20,
                paddingBottom: Math.max(insets.bottom, 24),
                gap: 16,
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: isDark ? '#EDF1F8' : '#1C1C1E', fontSize: 18, fontWeight: '800' }}>
                    Pure Cosmic Waves Audio
                  </Text>
                  <Text style={{ color: isDark ? '#9AA6BC' : '#8E8E93', fontSize: 12, marginTop: 2 }}>
                    Adjust volume without interrupting your session
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowSoundSelector(false)}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark ? '#1E283F' : '#F2F2F7',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Ionicons name="close" size={20} color={isDark ? '#EDF1F8' : '#1C1C1E'} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {/* Volume Level Controls */}
                <View
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: isDark ? '#1B2439' : '#F2F2F7',
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: isDark ? '#EDF1F8' : '#1C1C1E', fontSize: 13.5, fontWeight: '700' }}>
                      Audio Volume
                    </Text>
                    <Text style={{ color: preset.accentColor, fontSize: 13, fontWeight: '800' }}>
                      {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[0.2, 0.4, 0.65, 0.85, 1.0].map((v) => (
                      <Pressable
                        key={v}
                        onPress={() => {
                          setVolume(v);
                          if (isMuted) setIsMuted(false);
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor:
                            !isMuted && Math.abs(volume - v) < 0.05
                              ? preset.accentColor
                              : isDark
                              ? '#141C2E'
                              : '#FFFFFF',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color:
                              !isMuted && Math.abs(volume - v) < 0.05
                                ? '#FFF'
                                : isDark
                                ? '#9AA6BC'
                                : '#8E8E93',
                            fontSize: 11.5,
                            fontWeight: '700',
                          }}
                        >
                          {Math.round(v * 100)}%
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
