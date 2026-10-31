import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export interface DownloadableAudioTrack {
  id: string;
  name: string;
  subtitle: string;
  filename: string;
  sizeBytes: number;
  downloadUrl: string;
}

export interface AudioDownloadState {
  status: 'idle' | 'downloading' | 'downloaded' | 'error';
  progress: number; // 0 to 1
  bytesWritten: number;
  totalBytes: number;
  localUri: string | null;
  error?: string | null;
}

const STORAGE_KEY_PREFIX = 'study-sakha-downloaded-audio-';

// In-memory listeners for active download progress
const listeners: Record<string, Set<(state: AudioDownloadState) => void>> = {};
const currentStates: Record<string, AudioDownloadState> = {};

function notifyListeners(id: string, state: AudioDownloadState) {
  currentStates[id] = state;
  const set = listeners[id];
  if (set) {
    set.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.warn('Download listener error:', err);
      }
    });
  }
}

export const AudioDownloadManager = {
  /**
   * Subscribe to progress updates for a track
   */
  subscribe(id: string, callback: (state: AudioDownloadState) => void): () => void {
    if (!listeners[id]) {
      listeners[id] = new Set();
    }
    listeners[id].add(callback);
    // Emit immediate current state
    if (currentStates[id]) {
      callback(currentStates[id]);
    } else {
      AudioDownloadManager.getState(id).then((st) => callback(st));
    }
    return () => {
      listeners[id]?.delete(callback);
    };
  },

  /**
   * Get current state of an audio track
   */
  async getState(id: string): Promise<AudioDownloadState> {
    if (currentStates[id]) {
      return currentStates[id];
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + id);
      if (raw) {
        const parsed: AudioDownloadState = JSON.parse(raw);
        // Verify local file exists if native
        if (Platform.OS !== 'web' && parsed.localUri) {
          try {
            const info = await FileSystem.getInfoAsync(parsed.localUri);
            if (!info.exists) {
              parsed.status = 'idle';
              parsed.localUri = null;
              await AsyncStorage.removeItem(STORAGE_KEY_PREFIX + id);
            }
          } catch {
            // ignore info error
          }
        }
        currentStates[id] = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read audio download state:', e);
    }
    const defaultState: AudioDownloadState = {
      status: 'idle',
      progress: 0,
      bytesWritten: 0,
      totalBytes: 0,
      localUri: null,
    };
    currentStates[id] = defaultState;
    return defaultState;
  },

  /**
   * Download audio track with real progress reporting
   */
  async download(track: DownloadableAudioTrack): Promise<AudioDownloadState> {
    const id = track.id;
    const initial: AudioDownloadState = {
      status: 'downloading',
      progress: 0.05,
      bytesWritten: 0,
      totalBytes: track.sizeBytes || 9756716,
      localUri: null,
    };
    notifyListeners(id, initial);

    try {
      // 1. Native platform (Android / iOS)
      if (Platform.OS !== 'web' && FileSystem && FileSystem.documentDirectory) {
        const targetDir = `${FileSystem.documentDirectory}meditation_audio/`;
        const dirInfo = await FileSystem.getInfoAsync(targetDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
        }
        const fileUri = `${targetDir}${track.filename}`;

        const downloadResumable = FileSystem.createDownloadResumable(
          track.downloadUrl,
          fileUri,
          {},
          (downloadProgress) => {
            const progress =
              downloadProgress.totalBytesExpectedToWrite > 0
                ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
                : 0.5;
            const updated: AudioDownloadState = {
              status: 'downloading',
              progress: Math.min(0.99, Math.max(0.05, progress)),
              bytesWritten: downloadProgress.totalBytesWritten,
              totalBytes: downloadProgress.totalBytesExpectedToWrite || track.sizeBytes,
              localUri: fileUri,
            };
            notifyListeners(id, updated);
          }
        );

        const result = await downloadResumable.downloadAsync();
        const finalUri = result?.uri || fileUri;

        const completeState: AudioDownloadState = {
          status: 'downloaded',
          progress: 1,
          bytesWritten: track.sizeBytes,
          totalBytes: track.sizeBytes,
          localUri: finalUri,
        };
        await AsyncStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify(completeState));
        notifyListeners(id, completeState);
        return completeState;
      }

      // 2. Web browser platform (fetch stream + blob)
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const res = await fetch(track.downloadUrl);
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        const total = parseInt(res.headers.get('content-length') || `${track.sizeBytes}`, 10);
        let loaded = 0;

        if (res.body && typeof res.body.getReader === 'function') {
          const reader = res.body.getReader();
          const chunks: any[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              loaded += value.length;
              const progress = total > 0 ? loaded / total : 0.5;
              notifyListeners(id, {
                status: 'downloading',
                progress: Math.min(0.99, progress),
                bytesWritten: loaded,
                totalBytes: total,
                localUri: null,
              });
            }
          }

          const blob = new Blob(chunks, { type: 'audio/mpeg' });
          const blobUrl = URL.createObjectURL(blob);

          const completeState: AudioDownloadState = {
            status: 'downloaded',
            progress: 1,
            bytesWritten: loaded,
            totalBytes: total,
            localUri: blobUrl,
          };
          await AsyncStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify(completeState));
          notifyListeners(id, completeState);
          return completeState;
        } else {
          // Fallback blob
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const completeState: AudioDownloadState = {
            status: 'downloaded',
            progress: 1,
            bytesWritten: blob.size,
            totalBytes: blob.size,
            localUri: blobUrl,
          };
          await AsyncStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify(completeState));
          notifyListeners(id, completeState);
          return completeState;
        }
      }

      throw new Error('Unsupported platform for download');
    } catch (error: any) {
      console.error('Audio download error:', error);
      const errorState: AudioDownloadState = {
        status: 'error',
        progress: 0,
        bytesWritten: 0,
        totalBytes: track.sizeBytes,
        localUri: null,
        error: error?.message || 'Download failed',
      };
      notifyListeners(id, errorState);
      return errorState;
    }
  },

  /**
   * Delete downloaded audio to free up device storage
   */
  async deleteDownloaded(id: string): Promise<void> {
    try {
      const state = await AudioDownloadManager.getState(id);
      if (Platform.OS !== 'web' && state.localUri && FileSystem) {
        try {
          await FileSystem.deleteAsync(state.localUri, { idempotent: true });
        } catch {
          // ignore delete failure
        }
      } else if (state.localUri && typeof window !== 'undefined' && window.URL) {
        try {
          URL.revokeObjectURL(state.localUri);
        } catch {
          // ignore
        }
      }
      await AsyncStorage.removeItem(STORAGE_KEY_PREFIX + id);
      const resetState: AudioDownloadState = {
        status: 'idle',
        progress: 0,
        bytesWritten: 0,
        totalBytes: 0,
        localUri: null,
      };
      notifyListeners(id, resetState);
    } catch (e) {
      console.warn('Could not delete downloaded audio:', e);
    }
  },
};
