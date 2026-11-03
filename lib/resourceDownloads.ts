import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { getUserScopedStorageKey } from './store';

export type ResourceDownload = {
  resourceId: string;
  title: string;
  localUri: string;
  savedAt: number;
};

const STORAGE_KEY = 'study-sakha-library-downloads-v1';
const writeQueues = new Map<string, Promise<void>>();
const activeDownloads = new Map<string, Promise<ResourceDownload>>();
const activeRemovals = new Map<string, Promise<void>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRecords(value: unknown): ResourceDownload[] {
  if (!Array.isArray(value)) throw new Error('Saved library downloads have an invalid format.');
  return value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.resourceId !== 'string' ||
      typeof item.title !== 'string' ||
      typeof item.localUri !== 'string' ||
      typeof item.savedAt !== 'number' ||
      !Number.isFinite(item.savedAt)
    ) throw new Error('A saved library download has an invalid format.');
    return {
      resourceId: item.resourceId,
      title: item.title,
      localUri: item.localUri,
      savedAt: item.savedAt,
    };
  });
}

async function readRecords(key: string): Promise<ResourceDownload[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? parseRecords(JSON.parse(raw)) : [];
}

function enqueueWrite<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  writeQueues.set(key, next.then(() => undefined, () => undefined));
  return next;
}

function safeFileName(resourceId: string, userId: string | null | undefined) {
  const scope = encodeURIComponent(userId || 'local');
  const id = encodeURIComponent(resourceId || 'resource');
  return `${scope}-${id}.pdf`;
}

export async function getResourceDownloads(userId: string | null | undefined) {
  return readRecords(getUserScopedStorageKey(STORAGE_KEY, userId));
}

export function downloadResourceFile(
  userId: string | null | undefined,
  resource: { id: string; title: string },
  url: string,
  onProgress: (progress: number) => void
): Promise<ResourceDownload> {
  const storageKey = getUserScopedStorageKey(STORAGE_KEY, userId);
  const operationKey = `${storageKey}:${resource.id}`;
  const removal = activeRemovals.get(operationKey);
  if (removal) return removal.then(() => downloadResourceFile(userId, resource, url, onProgress));
  const active = activeDownloads.get(operationKey);
  if (active) return active;

  const download = (async () => {
    const existing = await readRecords(storageKey);
    const saved = existing.find((item) => item.resourceId === resource.id);
    if (saved && (await FileSystem.getInfoAsync(saved.localUri)).exists) return saved;

    const directory = FileSystem.documentDirectory;
    if (!directory) throw new Error('Device storage is unavailable for offline downloads.');
    const folder = `${directory}study-sakha-library/`;
    const folderInfo = await FileSystem.getInfoAsync(folder);
    if (!folderInfo.exists) await FileSystem.makeDirectoryAsync(folder, { intermediates: true });

    const localUri = `${folder}${safeFileName(resource.id, userId)}`;
    const previousFile = await FileSystem.getInfoAsync(localUri);
    if (previousFile.exists) await FileSystem.deleteAsync(localUri, { idempotent: true });

    const resumable = FileSystem.createDownloadResumable(
      url,
      localUri,
      {},
      (progress) => {
        if (progress.totalBytesExpectedToWrite > 0) {
          onProgress(Math.min(1, progress.totalBytesWritten / progress.totalBytesExpectedToWrite));
        }
      }
    );
    const result = await resumable.downloadAsync();
    if (!result || result.status < 200 || result.status >= 300) {
      throw new Error(`The resource download failed${result ? ` with HTTP ${result.status}` : ''}.`);
    }
    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    if (!fileInfo.exists || !fileInfo.size) {
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
      throw new Error('The downloaded resource is empty or unavailable.');
    }

    const record: ResourceDownload = {
      resourceId: resource.id,
      title: resource.title,
      localUri: result.uri,
      savedAt: Date.now(),
    };
    try {
      await enqueueWrite(storageKey, async () => {
        const latest = await readRecords(storageKey);
        const next = [record, ...latest.filter((item) => item.resourceId !== resource.id)];
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      });
    } catch (error) {
      try {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
      } catch (cleanupError) {
        throw new Error(
          `The download completed, but its saved record failed and the local file could not be removed: ${
            cleanupError instanceof Error ? cleanupError.message : 'unknown cleanup error'
          }`
        );
      }
      throw error;
    }
    onProgress(1);
    return record;
  })();

  activeDownloads.set(operationKey, download);
  return download.finally(() => activeDownloads.delete(operationKey));
}

export async function removeResourceDownload(userId: string | null | undefined, resourceId: string) {
  const storageKey = getUserScopedStorageKey(STORAGE_KEY, userId);
  const operationKey = `${storageKey}:${resourceId}`;
  const active = activeDownloads.get(operationKey);
  if (active) await active.catch(() => {});
  const removal = enqueueWrite(storageKey, async () => {
    const records = await readRecords(storageKey);
    const record = records.find((item) => item.resourceId === resourceId);
    if (record) await FileSystem.deleteAsync(record.localUri, { idempotent: true });
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify(records.filter((item) => item.resourceId !== resourceId))
    );
  });
  activeRemovals.set(operationKey, removal);
  try {
    await removal;
  } finally {
    if (activeRemovals.get(operationKey) === removal) activeRemovals.delete(operationKey);
  }
}
