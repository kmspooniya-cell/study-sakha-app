import { supabase, supabaseConfigured } from '../supabase';
import type { AccountSyncDocument, RemoteSyncRow } from './syncTypes';

export async function pullAccountDocument(userId: string): Promise<RemoteSyncRow | null> {
  if (!supabaseConfigured) throw new Error('Supabase is not configured for account synchronization.');
  const { data, error } = await supabase
    .from('account_sync_documents')
    .select('version, document, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.document || typeof data.document !== 'object') return null;
  return {
    version: Number(data.version),
    document: data.document as AccountSyncDocument,
    updated_at: data.updated_at,
  };
}

export async function pushAccountDocument(
  document: AccountSyncDocument,
  expectedVersion: number,
  deviceId: string,
): Promise<{ accepted: boolean; row: RemoteSyncRow }> {
  if (!supabaseConfigured) throw new Error('Supabase is not configured for account synchronization.');
  const { data, error } = await supabase.rpc('push_account_sync_document', {
    document_value: document,
    expected_version: expectedVersion,
    device_key: deviceId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') throw new Error('Supabase returned an invalid account sync response.');
  return {
    accepted: row.accepted === true,
    row: {
      version: Number(row.version),
      document: row.document as AccountSyncDocument,
      updated_at: String(row.updated_at),
    },
  };
}

