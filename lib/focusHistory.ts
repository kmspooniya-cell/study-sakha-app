import AsyncStorage from '@react-native-async-storage/async-storage';

export type FocusHistoryRecord = {
  id: string;
  completedAt: string;
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
