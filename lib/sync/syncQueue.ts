import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoredSyncOperation } from './syncTypes';

const QUEUE_PREFIX = 'study-sakha-sync-queue-v1:';

function key(userId: string) {
  return `${QUEUE_PREFIX}${userId}`;
}

export async function readSyncQueue(userId: string): Promise<StoredSyncOperation[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredSyncOperation => Boolean(item && typeof item === 'object' && typeof (item as StoredSyncOperation).id === 'string'));
  } catch {
    return [];
  }
}

export async function writeSyncQueue(userId: string, queue: StoredSyncOperation[]) {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(key(userId));
    return;
  }
  await AsyncStorage.setItem(key(userId), JSON.stringify(queue));
}

export async function getDeviceId() {
  const deviceKey = 'study-sakha-sync-device-id-v1';
  const existing = await AsyncStorage.getItem(deviceKey);
  if (existing) return existing;
  const created = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(deviceKey, created);
  return created;
}

