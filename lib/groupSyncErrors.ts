export type SyncErrorCategory =
  | 'temporary_network'
  | 'slow_network'
  | 'auth_failure'
  | 'permission_rls'
  | 'server_error';

export type ClassifiedSyncError = {
  category: SyncErrorCategory;
  message: string;
  requiresUserAction: boolean;
  isTransient: boolean;
};

const recentLogTimestamps = new Map<string, number>();
const LOG_COOLDOWN_MS = 30_000;

export function classifySyncError(error: unknown, statusOrResult?: string): ClassifiedSyncError {
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : statusOrResult ?? 'Synchronization failed.';
  const normalized = `${rawMessage} ${statusOrResult ?? ''}`.toLowerCase();

  if (
    /\b(jwt|token|unauthorized|401|not authenticated|auth session|invalid session|session expired)\b/.test(normalized)
  ) {
    return {
      category: 'auth_failure',
      message: rawMessage || 'Your session needs to be refreshed before syncing.',
      requiresUserAction: true,
      isTransient: false,
    };
  }

  if (
    /\b(rls|row-level security|permission denied|forbidden|403|42501|not a member|authorization)\b/.test(normalized)
  ) {
    return {
      category: 'permission_rls',
      message: rawMessage || 'You do not have permission to sync with this group.',
      requiresUserAction: true,
      isTransient: false,
    };
  }

  if (
    /\b(timed?_?\s*out|timeout|aborted|slow)\b/.test(normalized) ||
    statusOrResult === 'timed out' ||
    statusOrResult === 'TIMED_OUT'
  ) {
    return {
      category: 'slow_network',
      message: rawMessage || 'Network response timed out.',
      requiresUserAction: false,
      isTransient: true,
    };
  }

  if (
    /\b(network|fetch|offline|err_network|failed to fetch|channel_error|socket|econnrefused|enotfound|502|503|504)\b/.test(normalized) ||
    statusOrResult === 'error' ||
    statusOrResult === 'CHANNEL_ERROR'
  ) {
    return {
      category: 'temporary_network',
      message: rawMessage || 'Temporary network interruption.',
      requiresUserAction: false,
      isTransient: true,
    };
  }

  return {
    category: 'server_error',
    message: rawMessage || 'Unexpected synchronization error.',
    requiresUserAction: false,
    isTransient: false,
  };
}

export function logStructuredSyncEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  details: Record<string, unknown>,
  dedupeKey?: string,
) {
  if (dedupeKey) {
    const now = Date.now();
    const last = recentLogTimestamps.get(dedupeKey) ?? 0;
    if (now - last < LOG_COOLDOWN_MS) return;
    recentLogTimestamps.set(dedupeKey, now);
  }

  const payload = {
    scope: 'group-focus-sync',
    event,
    at: new Date().toISOString(),
    ...details,
  };

  if (level === 'error') {
    console.error('[group-focus-sync]', payload);
  } else if (level === 'warn') {
    console.warn('[group-focus-sync]', payload);
  } else {
    console.info('[group-focus-sync]', payload);
  }
}

export function clearSyncLogCooldowns() {
  recentLogTimestamps.clear();
}
