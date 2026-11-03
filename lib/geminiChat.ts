import { Platform } from 'react-native';
import type { AppNavigationTarget } from './navigation';
import { ChatMsg, ExamId, SourceRef } from './types';
import GEMINI_MODELS from './geminiModels.json';
import { supabase, supabaseConfigured } from './supabase';

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
  activeReading?: Array<{
    resourceId: string;
    title: string;
    percent: number;
  }>;
  todayTasks?: Array<{
    label: string;
    category: string;
    taskType: string;
    completed: boolean;
  }>;
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

/**
 * Resolves the backend base URL for API requests.
 * Uses EXPO_PUBLIC_API_BASE_URL in mobile and production builds.
 * On web in preview environments, falls back to the current origin (relative path).
 * On native platforms (Android / iOS), throws a clear configuration error if missing.
 */
export function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredUrl) {
    // Strip trailing slash if present
    return configuredUrl.replace(/\/+$/, '');
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

/**
 * Checks server health and verifies that the backend is reachable and configured.
 * Does not expose any secrets.
 */
export async function checkApiHealth(): Promise<ApiHealthStatus> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/health`;

  const res = await fetch(endpoint, {
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
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
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

  const res = await fetch(endpoint, {
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
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data || data.error) {
    const errorText = data?.error || `Server responded with status ${res.status}`;
    const err = new Error(errorText) as Error & { needsKey?: boolean; status?: number };
    err.needsKey = data?.needsKey;
    err.status = res.status;
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
