import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserScopedStorageKey } from './store';

export const FOCUS_LOCK_STORAGE_KEY = 'study-sakha-focus-lock-v2';

export type FocusLockSnapshot = {
  sessionState?: string;
  remainingSecs?: number;
  totalSessionSecs?: number;
  selectedAppIds?: string[];
  blockedAttemptsToday?: number;
  focusPoints?: number;
  sessionStartTime?: string | null;
};

export async function readFocusLockSnapshot(userId?: string | null): Promise<FocusLockSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(getUserScopedStorageKey(FOCUS_LOCK_STORAGE_KEY, userId));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    return {
      sessionState: typeof record.sessionState === 'string' ? record.sessionState : undefined,
      remainingSecs: typeof record.remainingSecs === 'number' && Number.isFinite(record.remainingSecs) ? record.remainingSecs : undefined,
      totalSessionSecs: typeof record.totalSessionSecs === 'number' && Number.isFinite(record.totalSessionSecs) ? record.totalSessionSecs : undefined,
      selectedAppIds: Array.isArray(record.selectedAppIds) ? record.selectedAppIds.filter((id): id is string => typeof id === 'string') : undefined,
      blockedAttemptsToday: typeof record.blockedAttemptsToday === 'number' && Number.isFinite(record.blockedAttemptsToday) ? record.blockedAttemptsToday : undefined,
      focusPoints: typeof record.focusPoints === 'number' && Number.isFinite(record.focusPoints) ? record.focusPoints : undefined,
      sessionStartTime: typeof record.sessionStartTime === 'string' ? record.sessionStartTime : null,
    };
  } catch {
    return null;
  }
}
