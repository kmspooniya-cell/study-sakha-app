export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'pending' | 'error';

export type SyncTombstones = Record<string, Record<string, string>>;

export type AccountSyncDocument = {
  schemaVersion: 1;
  updatedAt: string;
  deviceId: string;
  tombstones: SyncTombstones;
  fieldUpdatedAt?: Record<string, string>;
  [key: string]: unknown;
};

export type StoredSyncOperation = {
  id: string;
  userId: string;
  document: AccountSyncDocument;
  baseVersion: number;
  createdAt: string;
  attempts: number;
  nextAttemptAt: number;
};

export type RemoteSyncRow = {
  version: number;
  document: AccountSyncDocument;
  updated_at: string;
};

