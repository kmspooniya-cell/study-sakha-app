import { Platform } from 'react-native';
import { ChatMsg, ExamId, SourceRef } from './types';

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
    percentile: number;
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
  action?: { label: string; route: string; params?: any } | null;
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
  model?: string;
  examContext?: ExamContext;
}): Promise<GeminiChatResponse> {
  const { message, history, model, examContext } = params;

  // Resolve base URL (handles native Android/iOS and web)
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/chat`;

  // Format history for server endpoint
  const formattedHistory = history
    .filter((m) => m.status !== 'error')
    .map((m) => ({
      role: m.role,
      text: m.text,
    }));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
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
