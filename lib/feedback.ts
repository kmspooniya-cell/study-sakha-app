import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase, supabaseConfigured } from './supabase';

export type FeedbackCategory = 'report_issue' | 'share_idea' | 'appreciate_team';
export type FeedbackCategoryLabel = 'Report an issue' | 'Share an idea' | 'Appreciate the team';
export type FeedbackStatus = 'submitted' | 'received' | 'in_progress' | 'resolved' | 'closed';

export const FEEDBACK_BUCKET = 'feedback-attachments';
export const MAX_FEEDBACK_MESSAGE_LENGTH = 2000;
export const MAX_REPRO_STEPS_LENGTH = 2000;
export const MAX_LOG_BYTES = 16 * 1024;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export const FEEDBACK_CATEGORY_OPTIONS: {
  id: FeedbackCategory;
  label: FeedbackCategoryLabel;
  description: string;
}[] = [
  {
    id: 'report_issue',
    label: 'Report an issue',
    description: 'Let us know if something is broken, crashing, or behaving unexpectedly.',
  },
  {
    id: 'share_idea',
    label: 'Share an idea',
    description: 'Suggest a feature, study tool, or workflow improvement.',
  },
  {
    id: 'appreciate_team',
    label: 'Appreciate the team',
    description: 'Share what is working well for your exam preparation.',
  },
];

export const ISSUE_SUBCATEGORIES = [
  'Subscription Issue',
  'Block/Feature not working',
  'Permission Issue',
  'App crashing',
  'Other',
] as const;

export const IDEA_CATEGORIES = [
  'Study Planner',
  'Focus Centre & Lock',
  'Alarm & Reminders',
  'Mock Tests & PYQs',
  'Groups & Rooms',
  'Sakha AI',
  'Other',
] as const;

export const FEEDBACK_STATUS_OPTIONS: FeedbackStatus[] = [
  'submitted',
  'received',
  'in_progress',
  'resolved',
  'closed',
];

export interface FeedbackScreenshotAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  base64?: string | null;
}

export interface FeedbackAttachmentMetadata {
  clientRequestId?: string;
  screenshotPath?: string;
  screenshotMimeType?: string;
  screenshotSizeBytes?: number;
  logsRedacted?: boolean;
  logsByteLength?: number;
  logsTruncated?: boolean;
  logsPreview?: string;
  routeName?: string;
}

export interface FeedbackSubmissionPayload {
  category: FeedbackCategory;
  subCategory?: string;
  subject?: string;
  message: string;
  reproductionSteps?: string;
  shareLogs: boolean;
  includeScreenshot: boolean;
  screenshotAsset?: FeedbackScreenshotAsset | null;
  routeName?: string;
  clientRequestId?: string;
}

export interface FeedbackSubmissionRecord {
  id: string;
  user_id: string;
  client_request_id: string | null;
  category: FeedbackCategory;
  sub_category: string | null;
  subject: string;
  message: string;
  reproduction_steps: string | null;
  status: FeedbackStatus;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  logs_shared: boolean;
  screenshot_included: boolean;
  attachment_metadata: FeedbackAttachmentMetadata;
  app_version: string | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
}

export class FeedbackSubmissionError extends Error {
  stage: 'validation' | 'auth' | 'screenshot_upload' | 'submit' | 'config';
  retryable: boolean;

  constructor(
    message: string,
    stage: FeedbackSubmissionError['stage'],
    retryable = false
  ) {
    super(message);
    this.name = 'FeedbackSubmissionError';
    this.stage = stage;
    this.retryable = retryable;
  }
}

const MAX_BREADCRUMBS = 40;
const breadcrumbBuffer: string[] = [];

export function redactSensitiveText(input: string): string {
  if (!input) return '';
  return input
    // Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    // JWTs
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{2,}\b/g, '[REDACTED_JWT]')
    // Supabase / Google / OpenAI-style keys
    .replace(/\b(?:sb_publishable|sb_secret|sbp)_[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_KEY]')
    .replace(/\bAIza[0-9A-Za-z\-_]{16,}\b/g, '[REDACTED_API_KEY]')
    // Key-value secrets
    .replace(
      /\b(password|passcode|pin|secret|token|access_token|refresh_token|api_key|apikey|authorization|cookie)\s*([:=])\s*([^\s,;]+)/gi,
      '$1$2[REDACTED]'
    )
    // Email addresses
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]');
}

export function recordFeedbackBreadcrumb(source: string, message: string): void {
  const cleanSource = redactSensitiveText(source).slice(0, 48);
  const cleanMessage = redactSensitiveText(message).slice(0, 240);
  const line = `[${new Date().toISOString()}] ${cleanSource}: ${cleanMessage}`;
  breadcrumbBuffer.push(line);
  if (breadcrumbBuffer.length > MAX_BREADCRUMBS) {
    breadcrumbBuffer.splice(0, breadcrumbBuffer.length - MAX_BREADCRUMBS);
  }
}

export function getAppVersionLabel(): string {
  const version = Constants.expoConfig?.version;
  return typeof version === 'string' && version.trim() ? version.trim() : '1.0.0';
}

export function collectSafeDiagnosticLogs(routeName?: string): {
  logsText: string;
  byteLength: number;
  truncated: boolean;
} {
  const lines = [
    `appVersion=${getAppVersionLabel()}`,
    `platform=${Platform.OS}`,
    `osVersion=${String(Platform.Version ?? 'unknown')}`,
    `route=${redactSensitiveText(routeName || 'unknown')}`,
    `capturedAt=${new Date().toISOString()}`,
    '--- breadcrumbs ---',
    ...breadcrumbBuffer.map((entry) => redactSensitiveText(entry)),
  ];

  let combined = lines.join('\n');
  let truncated = false;
  if (combined.length > MAX_LOG_BYTES) {
    combined = combined.slice(combined.length - MAX_LOG_BYTES);
    truncated = true;
  }

  return {
    logsText: combined,
    byteLength: combined.length,
    truncated,
  };
}

export function createClientRequestId(): string {
  return `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMimeType(mimeType?: string | null, fileName?: string | null): 'image/png' | 'image/jpeg' | 'image/webp' {
  const lowerMime = (mimeType || '').toLowerCase();
  if (lowerMime === 'image/png') return 'image/png';
  if (lowerMime === 'image/webp') return 'image/webp';
  if (lowerMime === 'image/jpeg' || lowerMime === 'image/jpg') return 'image/jpeg';

  const ext = (fileName || '').split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function extensionForMime(mime: 'image/png' | 'image/jpeg' | 'image/webp'): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function base64ToUint8Array(base64: string): Uint8Array {
  const atobFn = typeof globalThis.atob === 'function' ? globalThis.atob : null;
  if (!atobFn) {
    throw new FeedbackSubmissionError('Browser base64 decoder is unavailable.', 'screenshot_upload', false);
  }
  const binary = atobFn(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function pickFeedbackScreenshot(): Promise<FeedbackScreenshotAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.75,
    base64: Platform.OS === 'web',
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_SCREENSHOT_BYTES) {
    throw new FeedbackSubmissionError(
      'Screenshot must be 5 MB or smaller.',
      'validation',
      false
    );
  }

  return {
    uri: asset.uri,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    fileSize: asset.fileSize ?? null,
    base64: asset.base64 ?? null,
  };
}

export async function cleanupTemporaryScreenshot(uri?: string | null): Promise<void> {
  if (!uri || Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup only; never mask submission result.
  }
}

async function readScreenshotBytes(asset: FeedbackScreenshotAsset): Promise<Uint8Array> {
  if (asset.base64) {
    return base64ToUint8Array(asset.base64);
  }

  try {
    const file = new File(asset.uri);
    if (typeof file.bytes === 'function') {
      return await file.bytes();
    }
  } catch {
    // Fall back to fetch(uri) below.
  }

  const response = await fetch(asset.uri);
  if (!response.ok) {
    throw new FeedbackSubmissionError('Unable to read selected screenshot.', 'screenshot_upload', true);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function uploadFeedbackScreenshot(
  userId: string,
  clientRequestId: string,
  asset: FeedbackScreenshotAsset
): Promise<{ path: string; mimeType: string; sizeBytes: number }> {
  const mimeType = normalizeMimeType(asset.mimeType, asset.fileName);
  const ext = extensionForMime(mimeType);
  const bytes = await readScreenshotBytes(asset);

  if (bytes.byteLength > MAX_SCREENSHOT_BYTES) {
    throw new FeedbackSubmissionError('Screenshot exceeds the 5 MB upload limit.', 'validation', false);
  }

  const objectPath = `${userId}/${clientRequestId}.${ext}`;
  const { error } = await supabase.storage
    .from(FEEDBACK_BUCKET)
    .upload(objectPath, bytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new FeedbackSubmissionError(
      error.message || 'Screenshot upload failed. Please try again.',
      'screenshot_upload',
      true
    );
  }

  return {
    path: objectPath,
    mimeType,
    sizeBytes: bytes.byteLength,
  };
}

export async function submitFeedback(
  payload: FeedbackSubmissionPayload
): Promise<{ submission: FeedbackSubmissionRecord; id: string }> {
  const trimmedMessage = payload.message.trim();
  if (!trimmedMessage) {
    throw new FeedbackSubmissionError('Please enter a message before submitting.', 'validation', false);
  }
  if (trimmedMessage.length > MAX_FEEDBACK_MESSAGE_LENGTH) {
    throw new FeedbackSubmissionError(
      `Message must be ${MAX_FEEDBACK_MESSAGE_LENGTH} characters or fewer.`,
      'validation',
      false
    );
  }

  const trimmedSteps = payload.reproductionSteps?.trim() || null;
  if (trimmedSteps && trimmedSteps.length > MAX_REPRO_STEPS_LENGTH) {
    throw new FeedbackSubmissionError(
      `Reproduction steps must be ${MAX_REPRO_STEPS_LENGTH} characters or fewer.`,
      'validation',
      false
    );
  }

  if (!supabaseConfigured) {
    throw new FeedbackSubmissionError(
      'Feedback service is not configured in this build.',
      'config',
      false
    );
  }

  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    throw new FeedbackSubmissionError(
      'Please sign in again to submit feedback.',
      'auth',
      false
    );
  }

  const userId = userData.user.id;
  const clientRequestId = payload.clientRequestId || createClientRequestId();
  const attachmentMetadata: FeedbackAttachmentMetadata = {
    clientRequestId,
    ...(payload.routeName ? { routeName: redactSensitiveText(payload.routeName) } : {}),
  };

  let logsShared = false;
  if (payload.shareLogs) {
    const collected = collectSafeDiagnosticLogs(payload.routeName);
    logsShared = true;
    attachmentMetadata.logsRedacted = true;
    attachmentMetadata.logsByteLength = collected.byteLength;
    attachmentMetadata.logsTruncated = collected.truncated;
    attachmentMetadata.logsPreview = collected.logsText;
  }

  let screenshotIncluded = false;
  if (payload.includeScreenshot && payload.screenshotAsset) {
    const uploaded = await uploadFeedbackScreenshot(userId, clientRequestId, payload.screenshotAsset);
    screenshotIncluded = true;
    attachmentMetadata.screenshotPath = uploaded.path;
    attachmentMetadata.screenshotMimeType = uploaded.mimeType;
    attachmentMetadata.screenshotSizeBytes = uploaded.sizeBytes;
  }

  const defaultSubject =
    payload.category === 'report_issue'
      ? payload.subCategory || 'Issue report'
      : payload.category === 'share_idea'
        ? payload.subCategory
          ? `Idea: ${payload.subCategory}`
          : 'Feature idea'
        : 'Team appreciation';

  const insertRow = {
    user_id: userId,
    client_request_id: clientRequestId,
    category: payload.category,
    sub_category: payload.subCategory?.trim() || null,
    subject: (payload.subject?.trim() || defaultSubject).slice(0, 160),
    message: trimmedMessage,
    reproduction_steps: trimmedSteps,
    status: 'submitted' as FeedbackStatus,
    logs_shared: logsShared,
    screenshot_included: screenshotIncluded,
    attachment_metadata: attachmentMetadata,
    app_version: getAppVersionLabel(),
    platform: Platform.OS,
  };

  const { data, error } = await supabase
    .from('feedback_submissions')
    .insert(insertRow)
    .select('*')
    .single();

  if (error) {
    // Handle idempotent retry on duplicate client_request_id
    if (error.code === '23505') {
      const { data: existing, error: existingErr } = await supabase
        .from('feedback_submissions')
        .select('*')
        .eq('user_id', userId)
        .eq('client_request_id', clientRequestId)
        .maybeSingle();
      if (!existingErr && existing) {
        await cleanupTemporaryScreenshot(payload.screenshotAsset?.uri);
        return { submission: existing as FeedbackSubmissionRecord, id: (existing as FeedbackSubmissionRecord).id };
      }
    }

    throw new FeedbackSubmissionError(
      error.message || 'Could not submit feedback. Please check your connection and try again.',
      'submit',
      true
    );
  }

  await cleanupTemporaryScreenshot(payload.screenshotAsset?.uri);

  const record = data as FeedbackSubmissionRecord;
  return { submission: record, id: record.id };
}

export async function listMyFeedbackSubmissions(): Promise<FeedbackSubmissionRecord[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from('feedback_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message || 'Unable to load feedback history.');
  return (data ?? []) as FeedbackSubmissionRecord[];
}

export async function listAllFeedbackSubmissionsForAdmin(): Promise<FeedbackSubmissionRecord[]> {
  if (!supabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase
    .from('feedback_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message || 'Unable to load feedback submissions.');
  }
  return (data ?? []) as FeedbackSubmissionRecord[];
}

export async function updateFeedbackSubmissionAdmin(
  id: string,
  updates: {
    status: FeedbackStatus;
    adminResponse?: string;
    respondedBy?: string;
  }
): Promise<FeedbackSubmissionRecord> {
  if (!supabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const trimmedResponse = updates.adminResponse?.trim() || null;
  const { data, error } = await supabase
    .from('feedback_submissions')
    .update({
      status: updates.status,
      admin_response: trimmedResponse,
      responded_by: updates.respondedBy ?? null,
      responded_at: trimmedResponse ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to update feedback submission.');
  }
  return data as FeedbackSubmissionRecord;
}

export async function createFeedbackScreenshotSignedUrl(objectPath: string): Promise<string> {
  if (!supabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase.storage
    .from(FEEDBACK_BUCKET)
    .createSignedUrl(objectPath, 300);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Unable to open screenshot attachment.');
  }
  return data.signedUrl;
}
