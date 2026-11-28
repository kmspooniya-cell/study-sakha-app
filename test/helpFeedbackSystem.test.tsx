import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockGetUser = jest.fn<any>();
const mockInsert = jest.fn<any>();
const mockSelect = jest.fn<any>();
const mockSingle = jest.fn<any>();
const mockOrder = jest.fn<any>();
const mockLimit = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockEq = jest.fn<any>();
const mockStorageUpload = jest.fn<any>();
const mockCreateSignedUrl = jest.fn<any>();
const mockLaunchImageLibraryAsync = jest.fn<any>();
const mockFileDelete = jest.fn<any>();

let mockUserRole: 'learner' | 'admin' = 'learner';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    clear: jest.fn(async () => undefined),
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3' } },
}));
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    exists: true,
    delete: mockFileDelete,
    bytes: jest.fn(async () => new Uint8Array([137, 80, 78, 71])),
  })),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));
jest.mock('@react-navigation/native', () => ({
  StackActions: { popTo: (name: string) => ({ type: 'POP_TO', payload: { name } }) },
  useNavigation: () => ({
    navigate: jest.fn(),
    dispatch: jest.fn(),
    getState: () => ({ index: 0, routes: [{ key: 'dash-1', name: 'DashboardRoot' }] }),
    getParent: () => ({ getState: () => ({ history: [], routes: [] }) }),
    addListener: () => () => undefined,
  }),
  useRoute: () => ({ name: 'DashboardRoot', params: undefined }),
  useFocusEffect: () => undefined,
}));
jest.mock('../lib/store', () => ({
  dayKey: () => '2026-11-28',
  useStore: () => ({
    state: {
      user: { id: 'user-123', name: 'Aspirant', email: 'test@example.com', role: mockUserRole, exam: 'upsc' },
      unread: 0,
      settings: { language: 'en', themeMode: 'light' },
      learners: [{ id: 'l1', name: 'A', email: 'a@b.c', exam: 'upsc', status: 'active', avgScore: 70, tests: 3 }],
      queue: [],
      managedContent: [],
      managedContentError: null,
      announcements: [],
      studyLog: {},
    },
    unread: 0,
    syncStatus: 'synced',
    dispatch: jest.fn(),
    saveManagedContent: jest.fn(),
    deleteManagedContent: jest.fn(),
  }),
}));
jest.mock('../lib/theme', () => ({
  fonts: { regular: 'System', medium: 'System', semiBold: 'System', bold: 'System', extraBold: 'System', display: 'System' },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { sm: 8, md: 12, lg: 16, xl: 20, dialog: 24 },
  brand: { teal: '#0D9488', blue: '#2563EB' },
  shadow: () => ({}),
  useTheme: () => ({
    mode: 'light',
    scheme: 'light',
    f: (n: number) => n,
    colors: {
      bg: '#F8F9FA',
      surface: '#FFFFFF',
      surfaceAlt: '#F1F3F5',
      surfaceInteractive: '#E9ECEF',
      border: '#DEE2E6',
      borderSubtle: '#E9ECEF',
      text: '#111827',
      textMuted: '#6B7280',
      textFaint: '#9CA3AF',
      blue: '#2563EB',
      teal: '#0D9488',
      violet: '#7C3AED',
      warning: '#D97706',
      danger: '#DC2626',
      success: '#16A34A',
    },
  }),
}));
jest.mock('../lib/supabase', () => ({
  supabaseConfigured: true,
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: () => ({
      insert: (...args: unknown[]) => mockInsert(...args),
      select: (...args: unknown[]) => mockSelect(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    }),
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockStorageUpload(...args),
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      }),
    },
  },
}));

import { AppHeader } from '../components/Shell';
import { HelpFeedbackModal } from '../components/HelpFeedbackModal';
import AdminScreen from '../screens/AdminScreen';
import {
  collectSafeDiagnosticLogs,
  MAX_LOG_BYTES,
  recordFeedbackBreadcrumb,
  redactSensitiveText,
} from '../lib/feedback';

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

describe('Help & Feedback System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRole = 'learner';
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockSingle.mockResolvedValue({
      data: {
        id: 'fb-uuid-001',
        user_id: 'user-123',
        category: 'report_issue',
        status: 'submitted',
        created_at: '2026-11-28T05:00:00Z',
      },
      error: null,
    });
    mockSelect.mockReturnValue({
      single: mockSingle,
      order: mockOrder,
    });
    mockInsert.mockReturnValue({
      select: mockSelect,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      select: mockSelect,
    });
    mockStorageUpload.mockResolvedValue({ data: { path: 'user-123/fb.png' }, error: null });
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/fb.png' }, error: null });
  });

  it('opens Help modal from AppHeader three-dot menu', () => {
    const screen = render(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <AppHeader />
      </SafeAreaProvider>
    );

    fireEvent.press(screen.getByTestId('header-more-button'));
    fireEvent.press(screen.getByTestId('header-menu-help'));
    expect(screen.getByTestId('help-feedback-modal')).toBeTruthy();
  });

  it('submits Report an issue with reproduction steps, logs, and screenshot, then shows Reference ID', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/screenshot.png',
          fileName: 'screenshot.png',
          mimeType: 'image/png',
          fileSize: 2048,
        },
      ],
    });

    const onClose = jest.fn();
    const screen = render(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <HelpFeedbackModal visible onClose={onClose} routeName="DashboardRoot" />
      </SafeAreaProvider>
    );

    // Logs and screenshot default to opt-in false
    expect(screen.getByTestId('help-share-logs-checkbox').props.accessibilityState.checked).toBe(false);
    expect(screen.getByTestId('help-include-screenshot-checkbox').props.accessibilityState.checked).toBe(false);

    // Enable logs and pick screenshot
    fireEvent.press(screen.getByTestId('help-share-logs-checkbox'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('help-include-screenshot-checkbox'));
    });
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledTimes(1);

    // Step 1 -> Step 2
    fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
    fireEvent.press(screen.getByTestId('help-subcategory-App crashing'));

    // Step 2 -> Step 3
    fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
    expect(screen.getByText(/Report an issue/)).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('help-feedback-message-input'), 'Test issue submission');
    fireEvent.changeText(screen.getByTestId('help-feedback-repro-input'), '1. Open Focus\n2. Tap Start');

    await act(async () => {
      fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('help-feedback-success')).toBeTruthy();
    });
    expect(screen.getByText('fb-uuid-001')).toBeTruthy();
    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'report_issue',
        sub_category: 'App crashing',
        message: 'Test issue submission',
        reproduction_steps: '1. Open Focus\n2. Tap Start',
        logs_shared: true,
        screenshot_included: true,
      })
    );
    expect(mockFileDelete).toHaveBeenCalledTimes(1);
  });

  it('submits Share an idea with selected feature category', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: 'fb-idea-002', category: 'share_idea', status: 'submitted' },
      error: null,
    });

    const screen = render(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <HelpFeedbackModal visible onClose={jest.fn()} routeName="StudyPlanner" />
      </SafeAreaProvider>
    );

    fireEvent.press(screen.getByTestId('help-category-share_idea'));
    fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
    fireEvent.press(screen.getByTestId('help-subcategory-Study Planner'));
    fireEvent.press(screen.getByTestId('help-modal-continue-submit'));

    fireEvent.changeText(screen.getByTestId('help-feedback-message-input'), 'Add weekly revision heatmap');
    await act(async () => {
      fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
    });

    await waitFor(() => {
      expect(screen.getByText('fb-idea-002')).toBeTruthy();
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'share_idea',
        sub_category: 'Study Planner',
        message: 'Add weekly revision heatmap',
        logs_shared: false,
        screenshot_included: false,
      })
    );
  });

  it('submits Appreciate the team directly from Step 1 to Step 3', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: 'fb-love-003', category: 'appreciate_team', status: 'submitted' },
      error: null,
    });

    const screen = render(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <HelpFeedbackModal visible onClose={jest.fn()} routeName="DashboardRoot" />
      </SafeAreaProvider>
    );

    fireEvent.press(screen.getByTestId('help-category-appreciate_team'));
    fireEvent.press(screen.getByTestId('help-modal-continue-submit'));

    expect(screen.getByText('Appreciate the team')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('help-feedback-message-input'), 'Great focus timer and PYQ bank!');

    await act(async () => {
      fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
    });

    await waitFor(() => {
      expect(screen.getByText('fb-love-003')).toBeTruthy();
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'appreciate_team',
        message: 'Great focus timer and PYQ bank!',
      })
    );
  });

  it('validates empty messages and prevents duplicate submissions while in flight', async () => {
    let resolveInsert!: (value: unknown) => void;
    mockSingle.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInsert = resolve;
        })
    );

    const screen = render(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <HelpFeedbackModal visible onClose={jest.fn()} routeName="DashboardRoot" />
      </SafeAreaProvider>
    );

    fireEvent.press(screen.getByTestId('help-category-appreciate_team'));
    fireEvent.press(screen.getByTestId('help-modal-continue-submit'));

    // Empty submit fails validation
    fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
    expect(screen.getByTestId('help-feedback-validation-error')).toBeTruthy();
    expect(mockInsert).not.toHaveBeenCalled();

    // Valid submit + rapid double-tap only inserts once
    fireEvent.changeText(screen.getByTestId('help-feedback-message-input'), 'Testing duplicate prevention');
    await act(async () => {
      fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
      fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveInsert({ data: { id: 'fb-dedup-004' }, error: null });
    });
    await waitFor(() => {
      expect(screen.getByTestId('help-feedback-success')).toBeTruthy();
    });
  });

  it('preserves form on backend error and succeeds on Retry', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { message: 'Network timeout' } })
      .mockResolvedValueOnce({ data: { id: 'fb-retry-005' }, error: null });

    const screen = render(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <HelpFeedbackModal visible onClose={jest.fn()} routeName="DashboardRoot" />
      </SafeAreaProvider>
    );

    fireEvent.press(screen.getByTestId('help-category-appreciate_team'));
    fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
    fireEvent.changeText(screen.getByTestId('help-feedback-message-input'), 'Retryable message');

    await act(async () => {
      fireEvent.press(screen.getByTestId('help-modal-continue-submit'));
    });

    expect(screen.getByTestId('help-feedback-submit-error')).toBeTruthy();
    expect(screen.queryByTestId('help-feedback-success')).toBeNull();
    expect(screen.getByTestId('help-feedback-message-input').props.value).toBe('Retryable message');

    await act(async () => {
      fireEvent.press(screen.getByTestId('help-feedback-retry-button'));
    });

    await waitFor(() => {
      expect(screen.getByText('fb-retry-005')).toBeTruthy();
    });
  });

  it('handles Android Back navigation across steps', () => {
    const onClose = jest.fn();
    const screen = render(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <HelpFeedbackModal visible onClose={onClose} routeName="DashboardRoot" />
      </SafeAreaProvider>
    );

    fireEvent.press(screen.getByTestId('help-modal-continue-submit')); // Step 2
    fireEvent.press(screen.getByTestId('help-modal-continue-submit')); // Step 3
    expect(screen.getByTestId('help-feedback-message-input')).toBeTruthy();

    fireEvent.press(screen.getByTestId('help-modal-back')); // Back to Step 2
    expect(screen.getByTestId('help-subcategory-Subscription Issue')).toBeTruthy();

    fireEvent.press(screen.getByTestId('help-modal-back')); // Back to Step 1
    expect(screen.getByTestId('help-category-report_issue')).toBeTruthy();

    fireEvent.press(screen.getByTestId('help-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('redacts sensitive tokens, API keys, passwords, and emails from diagnostic logs and caps size', () => {
    const raw =
      'Bearer secretToken123 eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig AIzaSyDummyKey1234567890 sb_publishable_abc12345 password=mysecret user@example.com';
    const redacted = redactSensitiveText(raw);

    expect(redacted).not.toContain('secretToken123');
    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(redacted).not.toContain('AIzaSyDummyKey1234567890');
    expect(redacted).not.toContain('sb_publishable_abc12345');
    expect(redacted).not.toContain('mysecret');
    expect(redacted).not.toContain('user@example.com');

    for (let i = 0; i < 60; i += 1) {
      recordFeedbackBreadcrumb('test', `entry-${i}-${'x'.repeat(220)}`);
    }
    const collected = collectSafeDiagnosticLogs('DashboardRoot');
    expect(collected.byteLength).toBeLessThanOrEqual(MAX_LOG_BYTES);
  });

  it('enforces admin access control in AdminScreen and RLS in migration SQL', () => {
    mockUserRole = 'learner';
    const learnerScreen = render(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <AdminScreen />
      </SafeAreaProvider>
    );
    expect(learnerScreen.getByText('Administrator access required')).toBeTruthy();

    const migrationSql = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'migrations', '202611280001_feedback_submissions.sql'),
      'utf8'
    );
    expect(migrationSql).toContain('public.is_admin()');
    expect(migrationSql).toContain('user_id = (select auth.uid())');
    expect(migrationSql).toContain('public = false');
  });
});
