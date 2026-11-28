import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockSaveManagedContent = jest.fn(async () => ({ ok: true }));
const mockDeleteManagedContent = jest.fn(async () => ({ ok: true }));
const mockSaveProfile = jest.fn(async () => ({ ok: true }));
const mockSignOut = jest.fn(async () => ({ ok: true }));
const mockListFeedback = jest.fn(async () => []);
const mockStorage = new Map<string, string>();
let mockRouteParams: Record<string, any> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, prop) => (props: any) =>
        React.createElement(View, { ...props, accessibilityLabel: String(prop) }),
    },
  );
});

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(async () => ({ exists: false })),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
  getAllKeys: jest.fn(async () => [...mockStorage.keys()]),
}));

jest.mock('../lib/supabase', () => ({
  STUDENT_CONTENT_BUCKET: 'Student-content',
  supabaseConfigured: false,
  createStudentContentSignedUrl: jest.fn(async () => 'https://example.com/file.pdf'),
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    realtime: {
      setAuth: jest.fn(async () => undefined),
    },
  },
}));

jest.mock('../lib/feedback', () => ({
  FEEDBACK_STATUS_OPTIONS: ['submitted', 'received', 'in_progress', 'resolved', 'closed'],
  listAllFeedbackSubmissionsForAdmin: () => mockListFeedback(),
  updateFeedbackSubmissionAdmin: jest.fn(),
  createFeedbackScreenshotSignedUrl: jest.fn(),
}));

jest.mock('../lib/resourceDownloads', () => ({
  getResourceDownloads: jest.fn(async () => []),
  downloadResourceFile: jest.fn(),
  removeResourceDownload: jest.fn(),
}));

jest.mock('../components/Charts', () => ({
  BarChart: () => null,
  Donut: () => null,
  HBar: ({ label }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, label);
  },
  SvgLegend: () => null,
}));

jest.mock('../components/Popup', () => ({
  Popup: ({ visible, children }: any) => (visible ? children : null),
}));

jest.mock('../components/Shell', () => ({
  useLayout: () => ({ isMobile: true, isDesktop: false, isTablet: false, width: 390 }),
  Shell: ({ title, children }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(View, null, React.createElement(Text, null, title), children);
  },
}));

const mockUser = {
  id: 'u1',
  role: 'student' as 'student' | 'admin',
  exam: 'upsc',
  name: 'Riya Verma',
  email: 'riya@example.in',
  birthday: '',
  phoneNumber: '',
  currentCity: '',
  examFocus: 'UPSC',
  photoUri: undefined as string | undefined,
};
const mockState: any = {
  hydrated: true,
  get user() {
    return mockUser;
  },
  managedContent: [],
  managedContentError: null,
  starred: [],
  progress: {},
  studyLog: {},
  results: [],
  announcements: [],
  learners: [
    {
      id: 'l1',
      name: 'Riya Verma',
      email: 'riya@example.in',
      exam: 'upsc',
      plan: 'Pro',
      status: 'active',
      joined: '2026-01-10',
      streak: 7,
      tests: 12,
      avgScore: 82,
    },
  ],
  queue: [
    {
      id: 'q1',
      title: 'Polity Short Notes',
      type: 'note',
      exam: 'upsc',
      author: 'Aarav',
      submitted: 'today',
      status: 'pending',
    },
  ],
  settings: {
    themeMode: 'light',
    language: 'en',
    textScale: 1,
    accentColor: 'indigo',
    customAccentHex: null,
    highContrast: false,
    reduceMotion: false,
    animationIntensity: 'balanced',
    displayScaling: 100,
    layoutDensity: 'comfortable',
    backgroundId: 'none',
    backgroundOpacity: 100,
    overlayIntensity: 0,
  },
};

jest.mock('../lib/store', () => ({
  dayKey: () => '2026-11-28',
  getDisplayName: (user: any) => user?.name ?? user?.email ?? 'Learner',
  useStore: () => ({
    state: mockState,
    dispatch: mockDispatch,
    saveManagedContent: mockSaveManagedContent,
    deleteManagedContent: mockDeleteManagedContent,
    saveProfile: mockSaveProfile,
    signOut: mockSignOut,
    badges: [],
    todayMinutes: 36,
    streak: 5,
  }),
}));

const { SafeAreaProvider } = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context');
const { ThemeProvider: LegacyThemeProvider } = require('../lib/theme') as typeof import('../lib/theme');
const { SSDSThemeProvider } = require('../lib/ssds') as typeof import('../lib/ssds');
const LibraryScreen = require('../screens/LibraryScreen').default as typeof import('../screens/LibraryScreen').default;
const AdminScreen = require('../screens/AdminScreen').default as typeof import('../screens/AdminScreen').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Load after screen mocks are registered.
const ProfileScreen = require('../screens/ProfileScreen').default as typeof import('../screens/ProfileScreen').default;

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <LegacyThemeProvider mode="light">
        <SSDSThemeProvider>{children}</SSDSThemeProvider>
      </LegacyThemeProvider>
    </SafeAreaProvider>
  );
}

describe('Phase 6 Batch 4 Screen Migrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockRouteParams = {};
    mockUser.role = 'student';
    mockSaveProfile.mockClear();
    mockSignOut.mockClear();
  });

  it('LibraryScreen renders all 6 sections and navigates to Notes and Tests', () => {
    const screen = render(
      <Providers>
        <LibraryScreen />
      </Providers>,
    );

    expect(screen.getByText('Notes')).toBeTruthy();
    expect(screen.getByText('Books & PDFs')).toBeTruthy();
    expect(screen.getByText('PYQ Sets')).toBeTruthy();
    expect(screen.getByText('Tests')).toBeTruthy();
    expect(screen.getByText('Starred')).toBeTruthy();
    expect(screen.getByText('Downloads')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Open Notes'));
    expect(mockNavigate).toHaveBeenCalledWith('LibraryNotes', {});

    fireEvent.press(screen.getByLabelText('Open Tests'));
    expect(mockNavigate).toHaveBeenCalledWith('Tests', undefined);
  });

  it('AdminScreen blocks non-admin users and navigates to Profile', () => {
    mockUser.role = 'student';
    const screen = render(
      <Providers>
        <AdminScreen />
      </Providers>,
    );

    expect(screen.getByText('Administrator access required')).toBeTruthy();
    expect(screen.queryByText('Manage Content')).toBeNull();

    fireEvent.press(screen.getByText('Go to profile'));
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('ProfileScreen saves the edit draft through the existing profile callback', async () => {
    const screen = render(
      <Providers>
        <ProfileScreen />
      </Providers>,
    );

    fireEvent.press(screen.getByLabelText('Edit Profile'));
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockSaveProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Riya Verma',
          email: 'riya@example.in',
          examFocus: 'UPSC',
        }),
      );
    });
  });

  it('ProfileScreen switches between Overview, Statistics, and Account without unmounting panels', () => {
    const screen = render(
      <Providers>
        <ProfileScreen />
      </Providers>,
    );

    const flattenStyle = (styleProp: unknown) => {
      const list = Array.isArray(styleProp) ? styleProp : [styleProp];
      return Object.assign({}, ...list.filter(Boolean));
    };

    // Initially Overview is visible and Statistics/Account stay mounted with display: 'none'
    expect(flattenStyle(screen.getByTestId('profile-tab-panel-overview').props.style).display).toBeUndefined();
    expect(flattenStyle(screen.getByTestId('profile-tab-panel-stats', { includeHiddenElements: true }).props.style).display).toBe('none');
    expect(flattenStyle(screen.getByTestId('profile-tab-panel-account', { includeHiddenElements: true }).props.style).display).toBe('none');

    // Switch repeatedly: Statistics -> Account -> Overview
    fireEvent.press(screen.getByText('Statistics'));
    expect(flattenStyle(screen.getByTestId('profile-tab-panel-stats').props.style).display).toBeUndefined();
    expect(flattenStyle(screen.getByTestId('profile-tab-panel-overview', { includeHiddenElements: true }).props.style).display).toBe('none');

    fireEvent.press(screen.getByText('Account'));
    expect(flattenStyle(screen.getByTestId('profile-tab-panel-account').props.style).display).toBeUndefined();
    expect(flattenStyle(screen.getByTestId('profile-tab-panel-stats', { includeHiddenElements: true }).props.style).display).toBe('none');

    fireEvent.press(screen.getByText('Overview'));
    expect(flattenStyle(screen.getByTestId('profile-tab-panel-overview').props.style).display).toBeUndefined();
    expect(flattenStyle(screen.getByTestId('profile-tab-panel-account', { includeHiddenElements: true }).props.style).display).toBe('none');
  });

  it('AdminScreen allows admin users to manage learners, approvals, announcements, and feedback', async () => {
    mockUser.role = 'admin';
    const screen = render(
      <Providers>
        <AdminScreen />
      </Providers>,
    );

    expect(screen.getByText('Active learners')).toBeTruthy();

    fireEvent.press(screen.getByText('Learners'));
    expect(screen.getByText('Riya Verma')).toBeTruthy();
    fireEvent.press(screen.getByText('Suspend'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'learnerStatus',
      id: 'l1',
      status: 'suspended',
    });

    fireEvent.press(screen.getByText('Approvals'));
    fireEvent.press(screen.getByText('Approve'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'reviewContent',
      id: 'q1',
      status: 'approved',
    });

    fireEvent.press(screen.getByText('Feedback'));
    await waitFor(() => {
      expect(mockListFeedback).toHaveBeenCalledTimes(1);
    });
  });
});
