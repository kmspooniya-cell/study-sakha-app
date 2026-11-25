import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../supabase';
import { addTombstones, mergeAccountDocuments } from './syncConflictResolver';
import { getDeviceId, readSyncQueue, writeSyncQueue } from './syncQueue';
import { pullAccountDocument, pushAccountDocument } from './syncRepository';
import type { AccountSyncDocument, StoredSyncOperation, SyncStatus } from './syncTypes';

const RETRY_BASE_MS = 1500;
const RETRY_MAX_MS = 5 * 60 * 1000;

export class AccountSyncEngine {
  private userId: string | null = null;
  private deviceId = '';
  private version = 0;
  private queue: StoredSyncOperation[] = [];
  private channel: RealtimeChannel | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private stopped = true;
  private lastDocument: AccountSyncDocument | null = null;
  private onRemote: ((document: AccountSyncDocument) => void) | null = null;
  private onStatus: ((status: SyncStatus) => void) | null = null;

  async start(
    userId: string,
    localDocument: AccountSyncDocument,
    onRemote: (document: AccountSyncDocument) => void,
    onStatus: (status: SyncStatus) => void,
  ) {
    await this.stop();
    this.stopped = false;
    this.userId = userId;
    this.onRemote = onRemote;
    this.onStatus = onStatus;
    this.deviceId = await getDeviceId();
    this.queue = await readSyncQueue(userId);
    this.lastDocument = { ...localDocument, deviceId: this.deviceId };
    this.setStatus(this.queue.length > 0 ? 'pending' : 'syncing');

    try {
      const remote = await pullAccountDocument(userId);
      if (remote) {
        this.version = remote.version;
        // A clean device must not overwrite the account with a freshly-created
        // local timestamp. Only merge local state when this user has durable
        // pending work from an offline session.
        const merged = this.queue.length
          ? mergeAccountDocuments(localDocument, remote.document)
          : remote.document;
        this.lastDocument = merged;
        this.onRemote?.(merged);
        if (JSON.stringify(merged) !== JSON.stringify(remote.document)) {
          await this.enqueue(merged, remote.version);
        }
      } else {
        await this.enqueue(this.lastDocument, 0);
      }
      await this.flush();
      this.subscribe();
      this.timer = setInterval(() => { void this.flush(); }, 30_000);
      if (!this.queue.length) this.setStatus('synced');
    } catch (error) {
      console.warn('Account synchronization is temporarily unavailable:', error);
      this.setStatus(this.queue.length ? 'pending' : 'offline');
    }
  }

  async stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.channel) {
      try {
        await supabase.removeChannel(this.channel);
      } catch (error) {
        console.warn('Account sync channel cleanup failed:', error);
      }
    }
    this.channel = null;
    this.userId = null;
    this.onRemote = null;
    this.onStatus = null;
    this.queue = [];
    this.version = 0;
    this.lastDocument = null;
  }

  async submit(document: AccountSyncDocument) {
    if (this.stopped || !this.userId) return;
    const updatedAt = new Date().toISOString();
    const nextDocument: AccountSyncDocument = { ...document, deviceId: this.deviceId, updatedAt };
    const comparable = (value: AccountSyncDocument) => JSON.stringify({ ...value, updatedAt: '', deviceId: '' });
    if (this.lastDocument && comparable(this.lastDocument) === comparable(nextDocument)) return;
    const fieldUpdatedAt = { ...(this.lastDocument?.fieldUpdatedAt ?? {}), ...(nextDocument.fieldUpdatedAt ?? {}) };
    if (this.lastDocument?.settings && nextDocument.settings && typeof this.lastDocument.settings === 'object' && typeof nextDocument.settings === 'object') {
      const before = this.lastDocument.settings as Record<string, unknown>;
      const after = nextDocument.settings as Record<string, unknown>;
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) fieldUpdatedAt[`settings.${key}`] = updatedAt;
      }
    }
    const withTombstones = addTombstones(this.lastDocument, { ...nextDocument, fieldUpdatedAt });
    this.lastDocument = withTombstones;
    await this.enqueue(withTombstones, this.version);
    void this.flush();
  }

  private async enqueue(document: AccountSyncDocument, baseVersion: number) {
    if (!this.userId) return;
    const operation: StoredSyncOperation = {
      id: `${this.deviceId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: this.userId,
      document,
      baseVersion,
      createdAt: new Date().toISOString(),
      attempts: 0,
      nextAttemptAt: Date.now(),
    };
    // A full snapshot is used, so only the newest operation is needed. The
    // previous operation remains represented by its local document.
    this.queue = [...this.queue.filter((item) => item.userId !== this.userId), operation];
    await writeSyncQueue(this.userId, this.queue);
    this.setStatus('pending');
  }

  private subscribe() {
    if (!this.userId || !supabaseConfigured || typeof supabase.channel !== 'function') return;
    this.channel = supabase
      .channel(`account-sync:${this.userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'account_sync_documents', filter: `user_id=eq.${this.userId}`,
      }, (payload) => {
        const next = payload.new as { version?: unknown; document?: unknown; updated_at?: unknown };
        if (typeof next.version !== 'number' || !next.document || typeof next.document !== 'object') return;
        if (next.version <= this.version) return;
        this.version = next.version;
        const merged = mergeAccountDocuments(this.lastDocument ?? next.document as AccountSyncDocument, next.document as AccountSyncDocument);
        this.lastDocument = merged;
        this.onRemote?.(merged);
        void this.flush();
      })
      .subscribe();
  }

  private async flush() {
    if (this.flushing || this.stopped || !this.userId || !supabaseConfigured) return;
    this.flushing = true;
    try {
      while (!this.stopped && this.queue.length) {
        const operation = this.queue[0];
        if (operation.nextAttemptAt > Date.now()) break;
        this.setStatus('syncing');
        try {
          const result = await pushAccountDocument(operation.document, operation.baseVersion, this.deviceId);
          if (result.accepted) {
            this.version = result.row.version;
            this.lastDocument = result.row.document;
            this.queue.shift();
            await writeSyncQueue(this.userId, this.queue);
            continue;
          }
          this.version = result.row.version;
          const merged = mergeAccountDocuments(operation.document, result.row.document);
          this.lastDocument = merged;
          this.onRemote?.(merged);
          this.queue[0] = { ...operation, document: merged, baseVersion: result.row.version, attempts: operation.attempts + 1, nextAttemptAt: Date.now() };
          await writeSyncQueue(this.userId, this.queue);
        } catch (error) {
          const attempts = operation.attempts + 1;
          const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** Math.min(attempts, 8)));
          this.queue[0] = { ...operation, attempts, nextAttemptAt: Date.now() + delay };
          await writeSyncQueue(this.userId, this.queue);
          console.warn('Account sync upload failed; queued for retry:', error);
          this.setStatus('offline');
          break;
        }
      }
      if (this.queue.length === 0) this.setStatus('synced');
      else if (this.onStatus) this.setStatus('pending');
    } finally {
      this.flushing = false;
    }
  }

  private setStatus(status: SyncStatus) {
    this.onStatus?.(status);
  }
}

