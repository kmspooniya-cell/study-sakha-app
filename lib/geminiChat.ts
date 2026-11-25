import { Platform } from 'react-native';
import type { AppNavigationTarget } from './navigation';
import { ChatMsg, ExamId, SourceRef } from './types';
import GEMINI_MODELS from './geminiModels.json';
import { supabase, supabaseConfigured } from './supabase';
import { validateApiBaseUrl } from './apiConfig';
export { validateApiBaseUrl } from './apiConfig';

export const GEMINI_MODEL_OPTIONS = GEMINI_MODELS;
export type GeminiModelId = (typeof GEMINI_MODEL_OPTIONS)[number]['id'];

export type ExamContext = {
  name?: string | null;
  exam?: ExamId | string | null;
  streak?: number;
  todayMinutes?: number;
  goalMinutes?: number;
  notesCount?: number;
  starredCount?: number;
  testsAttempted?: number;
  recentResult?: {
    title: string;
    accuracy: number;
    score: number;
    maxScore: number;
    percentile?: number;
    comparisonStatus?: 'unavailable' | 'estimated' | 'measured';
    weakestSubject?: string;
  } | null;
  activeReading?: {
    resourceId: string;
    title: string;
    percent: number;
  }[];
  todayTasks?: {
    label: string;
    category: string;
    taskType: string;
    completed: boolean;
  }[];
  aiPreferences?: {
    responseLanguage: string;
    responseLength: 'Concise' | 'Balanced' | 'Detailed';
    detailLevel: string;
    learningMode: string;
  };
};

export type GeminiChatResponse = {
  text: string;
  action?: ({ label: string } & AppNavigationTarget) | null;
  sources?: SourceRef[];
  chips?: string[];
  modelUsed?: string;
  provider?: string;
  fallbackUsed?: boolean;
  timestamp?: number;
};

export type ApiHealthStatus = {
  status: string;
  service?: string;
  hasGeminiKey: boolean;
  timestamp: number;
};

export type GeminiErrorCategory = 'network' | 'authentication' | 'rate-limit' | 'server' | 'model' | 'request';

export function classifyGeminiError(error: unknown): GeminiErrorCategory {
  const value = error as { status?: number; message?: string } | null;
  const status = value?.status;
  const message = (value?.message ?? '').toLowerCase();
  if (status === 401 || status === 403 || message.includes('session expired') || message.includes('sign in is required')) return 'authentication';
  if (status === 429 || message.includes('quota exceeded') || message.includes('rate limit')) return 'rate-limit';
  if (status === 504 || message.includes('gemini') || message.includes('model') || message.includes('took too long')) return 'model';
  if (typeof status === 'number' && status >= 500) return 'server';
  if (message.includes('could not be reached') || message.includes('timed out') || error instanceof TypeError) return 'network';
  return 'request';
}

const API_REQUEST_TIMEOUT_MS = 15_000;
const CHAT_REQUEST_TIMEOUT_MS = 55_000;
const SESSION_LOOKUP_TIMEOUT_MS = 10_000;

/**
 * Resolves the backend base URL for API requests.
 * Uses EXPO_PUBLIC_API_BASE_URL in mobile and production builds.
 * On web in preview environments, falls back to the current origin (relative path).
 * On native platforms (Android / iOS), throws a clear configuration error if missing.
 */
export function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredUrl) {
    return validateApiBaseUrl(configuredUrl);
  }

  // In web browser / AI Studio preview environments, always use relative path ('/api/...')
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    return '';
  }

  // On native mobile platforms (Android, iOS), a relative URL cannot resolve to a host
  throw new Error(
    'Backend API URL is not configured. Please set the EXPO_PUBLIC_API_BASE_URL environment variable to your deployed Study Sakha server URL (e.g., https://your-backend.example.com).'
  );
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = API_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  init.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted) {
      throw new Error('The Study Sakha API request timed out. Check your connection and try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('The Study Sakha API could not be reached. Check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Checks server health and verifies that the backend is reachable and configured.
 * Does not expose any secrets.
 */
export async function checkApiHealth(): Promise<ApiHealthStatus> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/health`;

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Health check request failed with status ${res.status}`);
  }

  const data = await res.json();
  return {
    status: data.status || 'ok',
    service: data.service,
    hasGeminiKey: Boolean(data.hasGeminiKey),
    timestamp: data.timestamp || Date.now(),
  };
}

export async function askGemini(params: {
  message: string;
  history: ChatMsg[];
  model?: GeminiModelId;
  signal?: AbortSignal;
  examContext?: ExamContext;
}): Promise<GeminiChatResponse> {
  const { message, history, model, signal, examContext } = params;
  if (!supabaseConfigured) throw new Error('Sign in is required to use Sakha AI.');
  let sessionTimer: ReturnType<typeof setTimeout> | undefined;
  let sessionResult: Awaited<ReturnType<typeof supabase.auth.getSession>>;
  try {
    sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => {
        sessionTimer = setTimeout(() => reject(new Error('Your sign-in session check timed out. Try again.')), SESSION_LOOKUP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (sessionTimer) clearTimeout(sessionTimer);
  }
  const { data: sessionData, error: sessionError } = sessionResult;
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error('Your session expired. Sign in again to continue chatting.');

  // Resolve base URL (handles native Android/iOS and web)
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/chat`;

  // Format history for server endpoint
  const formattedHistory = history
    .filter((m) => m.status !== 'error')
    .slice(-12)
    .map((m) => ({
      role: m.role,
      text: m.text,
    }));

  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    signal,
    body: JSON.stringify({
      message,
      history: formattedHistory,
      model,
      examContext,
    }),
  };
  let res: Response | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      res = await fetchWithTimeout(endpoint, requestInit, CHAT_REQUEST_TIMEOUT_MS);
      if (![429, 502, 503, 504].includes(res.status) || attempt === 1) break;
    } catch (error) {
      lastError = error;
      if (signal?.aborted || attempt === 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  if (!res) throw lastError instanceof Error ? lastError : new Error('The Study Sakha API could not be reached.');

  const data = await res.json().catch(() => null);

  if (!res.ok || !data || data.error) {
    const errorText = data?.error || `Server responded with status ${res.status}`;
    const err = new Error(errorText) as Error & { needsKey?: boolean; status?: number; category?: GeminiErrorCategory };
    err.needsKey = data?.needsKey;
    err.status = res.status;
    err.category = classifyGeminiError(err);
    throw err;
  }

  return {
    text: data.text,
    action: data.action || null,
    sources: Array.isArray(data.sources) ? data.sources : [],
    chips: data.chips || [],
    modelUsed: data.modelUsed,
    provider: data.provider,
    fallbackUsed: data.fallbackUsed,
    timestamp: data.timestamp || Date.now(),
  };
}
