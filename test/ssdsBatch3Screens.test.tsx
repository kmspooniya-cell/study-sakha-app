import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockStorage = new Map<string, string>();
let mockRouteParams: Record<string, any> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
    goBack: mockGoBack,
  }),
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => cb(), [cb]);
  },
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

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
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

jest.mock('../components/Charts', () => ({
  Donut: () => null,
  HBar: ({ label }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, label);
  },
  SvgLegend: () => null,
}));

jest.mock('../components/Shell', () => ({
  useLayout: () => ({ isMobile: true, isDesktop: false, width: 390 }),
  useSmartAndroidBack: jest.fn(),
  DetailHeader: ({ title, subtitle, onBack, right }: any) => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');
    return React.createElement(
      View,
      null,
      React.createElement(
        Pressable,
        { onPress: onBack, accessibilityLabel: 'Back' },
        React.createElement(Text, null, title),
      ),
      subtitle ? React.createElement(Text, null, subtitle) : null,
      right,
    );
  },
  Shell: ({ title, children }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(View, null, React.createElement(Text, null, title), children);
  },
}));

const mockState: any = {
  hydrated: true,
  user: { id: 'u1', role: 'student', exam: 'upsc' },
  managedContent: [],
  notes: [
    {
      id: 'n-edit',
      title: 'Existing Polity Note',
      folder: 'My Revision',
      tags: ['Article 32'],
      body: 'Article 32 guarantees constitutional remedies.\nMandamus commands a public duty.',
      exam: 'upsc',
      subject: 'Polity',
      updatedAt: 1700000000000,
    },
  ],
  progress: {},
  starred: [],
  bookmarks: [],
  plannerTasks: [
    {
      id: 'pt-1',
      title: 'Revise Writs',
      category: 'Polity',
      date: '2026-11-28',
      scheduledDate: '2026-11-28',
      plannedMinutes: 45,
      completed: true,
      completionDate: '2026-11-28',
    },
  ],
  plannerScheduleItems: [],
  plannerScheduleCompletions: {},
  plannerDeletedDefaults: [],
  plannerDefaultOverrides: {},
  planDone: {},
  plannerTaskStudySeconds: {},
  studyLogs: [],
  focusHistory: [],
  results: [
    {
      id: 'res-1',
      testId: 't1',
      title: 'UPSC GS Mock 1',
      score: 120.5,
      maxScore: 200,
      accuracy: 78,
      percentile: 88.4,
      rank: 412,
      totalAspirants: 5000,
      comparisonStatus: 'measured',
      correct: 65,
      wrong: 18,
      skipped: 17,
      timeTakenSec: 3600,
      answers: { q1: 0 },
      bySubject: [
        { subject: 'Polity', correct: 15, total: 20 },
        { subject: 'History', correct: 8, total: 20 },
      ],
    },
  ],
  settings: {
    themeMode: 'light',
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
  getUserScopedStorageKey: (base: string, uid?: string) => `${base}:${uid ?? 'anon'}`,
  useStore: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
}));

const { SafeAreaProvider } = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context');
const { ThemeProvider: LegacyThemeProvider } = require('../lib/theme') as typeof import('../lib/theme');
const { SSDSThemeProvider } = require('../lib/ssds') as typeof import('../lib/ssds');
const BookReaderScreen = require('../screens/BookReaderScreen').default as typeof import('../screens/BookReaderScreen').default;
const NoteEditorScreen = require('../screens/NoteEditorScreen').default as typeof import('../screens/NoteEditorScreen').default;
const TaskPerformanceScreen = require('../screens/TaskPerformanceScreen').default as typeof import('../screens/TaskPerformanceScreen').default;
const TestResultScreen = require('../screens/TestResultScreen').default as typeof import('../screens/TestResultScreen').default;

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

describe('Phase 6 Batch 3 Screen Migrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockRouteParams = {};
  });

  it('BookReaderScreen toggles star, enters reader mode, turns pages, and opens PYQs', () => {
    const screen = render(
      <Providers>
        <BookReaderScreen />
      </Providers>,
    );

    fireEvent.press(screen.getByLabelText('Star book'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'toggleStar' }),
    );

    fireEvent.press(screen.getByText('Start reading'));
    expect(screen.getByText(/Page 1 of/)).toBeTruthy();

    fireEvent.press(screen.getByText('Next page'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'progress' }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'study', minutes: 2 }),
    );
  });

  it('NoteEditorScreen saves edited note, switches AI tools, and deletes note', () => {
    mockRouteParams = { noteId: 'n-edit' };
    const screen = render(
      <Providers>
        <NoteEditorScreen />
      </Providers>,
    );

    fireEvent.changeText(
      screen.getByPlaceholderText('E.g. Fundamental Rights quick recall'),
      'Updated Polity Note',
    );
    fireEvent.press(screen.getByText('Save'));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'saveNote',
        note: expect.objectContaining({ id: 'n-edit', title: 'Updated Polity Note' }),
      }),
    );

    fireEvent.press(screen.getByText('Summarise'));
    expect(screen.getByText(/Article 32 guarantees/)).toBeTruthy();

    fireEvent.press(screen.getByText('Delete this note'));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'deleteNote', id: 'n-edit' });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('TaskPerformanceScreen loads focus history, filters tasks, and opens details modal', async () => {
    mockRouteParams = { startDate: '2026-11-22', endDate: '2026-11-28' };
    const screen = render(
      <Providers>
        <TaskPerformanceScreen />
      </Providers>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Revise Fundamental Rights (Art. 12–35)').length).toBeGreaterThan(0);
    });

    fireEvent.press(
      screen.getAllByLabelText('View details for Revise Fundamental Rights (Art. 12–35)')[0],
    );
    expect(screen.getByText('Related Focus Sessions')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close task details'));
  });

  it('TestResultScreen displays score, switches to Review tab, and triggers Retake', () => {
    mockRouteParams = { resultId: 'res-1', headerBrand: 'SakhaAI' };
    const screen = render(
      <Providers>
        <TestResultScreen />
      </Providers>,
    );

    expect(screen.getByText('120.5')).toBeTruthy();
    expect(screen.getByText('of 200')).toBeTruthy();

    fireEvent.press(screen.getByText(/Review \(/));
    expect(screen.getAllByText(/Why:/).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText('Retake'));
    expect(mockReplace).toHaveBeenCalledWith('TestPlayer', {
      testId: 't1',
      headerBrand: 'SakhaAI',
    });
  });
});
