import AsyncStorage from '@react-native-async-storage/async-storage';

export type FocusSessionCategory = 'study' | 'meditation' | 'break' | 'ambient';

export type FocusHistoryRecord = {
  id: string;
  completedAt: string;
  startedAt?: string;
  endedAt?: string;
  sessionId?: string;
  date?: string;
  minutes?: number;
  actualSeconds?: number;
  focusedSeconds?: number;
  plannedSeconds?: number | null;
  plannedMinutes?: number;
  mode?: 'timer' | 'stopwatch' | 'pomodoro';
  sessionType?: FocusSessionCategory;
  taskId?: string;
  scheduleId?: string;
  scheduleOccurrenceId?: string;
  groupId?: string;
  subject?: string;
  topic?: string;
  focusQuality?: 'distracted' | 'steady' | 'flow';
  status?: 'completed' | 'saved_early' | 'interrupted' | 'abandoned';
};

const pendingWrites = new Map<string, Promise<FocusHistoryRecord[]>>();

export function appendFocusHistory<T extends FocusHistoryRecord>(
  storageKey: string,
  record: T
): Promise<T[]> {
  const previous = pendingWrites.get(storageKey) ?? Promise.resolve([]);
  const write = previous.catch(() => []).then(async () => {
    const raw = await AsyncStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) throw new Error('Saved focus history has an invalid format.');
    if (parsed.some((item) =>
      !item ||
      typeof item !== 'object' ||
      typeof (item as Record<string, unknown>).id !== 'string' ||
      typeof (item as Record<string, unknown>).completedAt !== 'string'
    )) {
      throw new Error('Saved focus history contains an invalid record.');
    }

    const history = parsed as T[];
    if (history.some((item) => item.id === record.id)) return history;
    const updated = [record, ...history];
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    return updated;
  });
  pendingWrites.set(storageKey, write);
  void write.finally(() => {
    if (pendingWrites.get(storageKey) === write) pendingWrites.delete(storageKey);
  }).catch(() => {});
  return write;
}

export function updateFocusHistoryRecord(
  storageKey: string,
  id: string,
  patch: Partial<Pick<FocusHistoryRecord, 'subject' | 'focusQuality'>>
): Promise<FocusHistoryRecord[]> {
  const previous = pendingWrites.get(storageKey) ?? Promise.resolve([]);
  const write = previous.catch(() => []).then(async () => {
    const raw = await AsyncStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) throw new Error('Saved focus history has an invalid format.');
    if (parsed.some((item) =>
      !item ||
      typeof item !== 'object' ||
      typeof (item as Record<string, unknown>).id !== 'string' ||
      typeof (item as Record<string, unknown>).completedAt !== 'string'
    )) {
      throw new Error('Saved focus history contains an invalid record.');
    }

    const history = parsed as FocusHistoryRecord[];
    if (!history.some((item) => item.id === id)) {
      throw new Error('The saved focus session could not be found.');
    }
    const updated = history.map((item) => item.id === id ? { ...item, ...patch } : item);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    return updated;
  });
  pendingWrites.set(storageKey, write);
  void write.finally(() => {
    if (pendingWrites.get(storageKey) === write) pendingWrites.delete(storageKey);
  }).catch(() => {});
  return write;
}
