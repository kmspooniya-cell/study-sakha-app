import Ionicons from '@expo/vector-icons/Ionicons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AudioDownloadManager, AudioDownloadState } from '../lib/audioDownloadManager';
import { useTheme } from '../lib/theme';
import { Button, Txt } from './ui';
import { Popup } from './Popup';
import { MEDITATION_SOUND_LIST } from './MeditationPresets';

type Props = {
  visible: boolean;
  selectedId: string;
  volume: number;
  sessionRunning: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
};

const EMPTY_DOWNLOAD_STATE: AudioDownloadState = {
  status: 'idle',
  progress: 0,
  bytesWritten: 0,
  totalBytes: 0,
  localUri: null,
};

export function FocusMusicSelection({ visible, selectedId, volume, sessionRunning, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [downloads, setDownloads] = useState<Record<string, AudioDownloadState>>({});
  const selectedTrack = MEDITATION_SOUND_LIST.find((track) => track.id === selectedId) ?? MEDITATION_SOUND_LIST[0];
  const selectedDownload = downloads[selectedTrack.id] ?? EMPTY_DOWNLOAD_STATE;
  const audioSource = useMemo(
    () => selectedDownload.status === 'downloaded' && selectedDownload.localUri
      ? { uri: selectedDownload.localUri }
      : selectedTrack.source,
    [selectedDownload.localUri, selectedDownload.status, selectedTrack],
  );
  const audioPlayer = useAudioPlayer(audioSource);
  const handlePlaybackError = useCallback((error: unknown) => {
    setAudioError(error instanceof Error ? error.message : 'Music playback failed.');
    setMusicEnabled(false);
  }, []);

  useEffect(() => {
    let active = true;
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch((error: unknown) => {
      if (active) setAudioError(error instanceof Error ? error.message : 'Audio setup failed.');
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = MEDITATION_SOUND_LIST.map((track) =>
      AudioDownloadManager.subscribe(track.id, (state) => {
        setDownloads((current) => ({ ...current, [track.id]: state }));
      })
    );
    return () => unsubscribe.forEach((remove) => remove());
  }, []);

  useEffect(() => {
    // Expo Audio exposes looping as a mutable player control.
    // eslint-disable-next-line react-hooks/immutability
    audioPlayer.loop = true;
    audioPlayer.volume = Math.max(0, Math.min(1, volume));
    try {
      if (sessionRunning && musicEnabled) audioPlayer.play();
      else audioPlayer.pause();
    } catch (error) {
      // Surface a failed native playback command in the music selector.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handlePlaybackError(error);
    }
  }, [audioPlayer, handlePlaybackError, musicEnabled, sessionRunning, volume]);

  useEffect(() => () => {
    audioPlayer.pause();
    audioPlayer.seekTo(0).catch((error: unknown) => {
      console.warn('Focus music could not be reset:', error);
    });
  }, [audioPlayer]);

  const download = async (id: string) => {
    const track = MEDITATION_SOUND_LIST.find((item) => item.id === id);
    if (!track?.isDownloadable || !track.filename || !track.downloadUrl) return;
    setAudioError('');
    const state = await AudioDownloadManager.download({
      id: track.id,
      name: track.name,
      subtitle: track.subtitle,
      filename: track.filename,
      sizeBytes: track.sizeBytes ?? 0,
      downloadUrl: track.downloadUrl,
    });
    if (state.status === 'error') setAudioError(state.error ?? 'The audio download failed.');
  };

  const deleteDownload = async (id: string) => {
    setAudioError('');
    await AudioDownloadManager.deleteDownloaded(id);
  };

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      title="Music Selection"
      subtitle="Choose a soundscape for this focus session."
      scrollable={false}
      style={{ maxWidth: 620, padding: 0, paddingBottom: 20 }}
    >
      <View style={{ paddingHorizontal: 20 }}>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
            {MEDITATION_SOUND_LIST.map((track) => {
              const isSelected = selectedTrack.id === track.id;
              const downloadState = downloads[track.id] ?? EMPTY_DOWNLOAD_STATE;
              const label = track.id === 'pure_cosmic_waves'
                ? 'Pure Cosmic Waves (Offline Audio)'
                : track.name;
              return (
                <View
                  key={track.id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: isSelected ? `${colors.blue}12` : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.blue : colors.borderSubtle,
                    gap: 10,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onSelect(track.id);
                      setMusicEnabled(true);
                      setAudioError('');
                    }}
                    style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.amber}20` }}>
                      <Ionicons name={track.icon} size={20} color={colors.amber} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt size={13} weight="800">{label}</Txt>
                      <Txt size={11} color={colors.textMuted} style={{ marginTop: 3 }}>{track.subtitle}</Txt>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={21} color={colors.blue} /> : null}
                  </Pressable>

                  {track.isDownloadable ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <Txt size={11} color={colors.textMuted} style={{ flex: 1 }}>
                        {downloadState.status === 'downloaded'
                          ? 'Saved on this device for offline playback.'
                          : downloadState.status === 'downloading'
                            ? `${Math.round(downloadState.progress * 100)}% downloaded`
                            : `${((track.sizeBytes ?? 0) / 1_000_000).toFixed(1)} MB available offline`}
                      </Txt>
                      {downloadState.status === 'downloaded' ? (
                        <Pressable accessibilityRole="button" onPress={() => void deleteDownload(track.id)} style={{ minHeight: 40, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}>
                          <Txt size={12} weight="700" color={colors.danger}>Remove download</Txt>
                        </Pressable>
                      ) : downloadState.status === 'downloading' ? (
                        <Txt size={12} weight="700" color={colors.blue}>Downloading…</Txt>
                      ) : (
                        <Pressable accessibilityRole="button" onPress={() => void download(track.id)} style={{ minHeight: 40, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}>
                          <Txt size={12} weight="700" color={colors.blue}>Download</Txt>
                        </Pressable>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          {audioError ? <Txt size={12} color={colors.danger}>{audioError}</Txt> : null}
          <View style={{ gap: 10, marginTop: 14 }}>
            <Button
              label={musicEnabled ? 'Pause Music' : 'Play Music'}
              icon={musicEnabled ? 'pause' : 'play'}
              full
              style={{ width: '100%' }}
              onPress={() => {
                setAudioError('');
                setMusicEnabled((enabled) => !enabled);
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
              })}
            >
              <Txt size={13} weight="700">Done</Txt>
            </Pressable>
          </View>
      </View>
    </Popup>
  );
}
