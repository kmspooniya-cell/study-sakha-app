import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
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

jest.mock('../components/Shell', () => ({
  useLayout: () => ({ isMobile: true, isDesktop: false, width: 390 }),
  Shell: ({ title, children }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(View, null, React.createElement(Text, null, title), children);
  },
}));

jest.mock('../lib/store', () => ({
  useStore: () => ({
    state: {
      hydrated: true,
      user: { id: 'u1', role: 'student' },
      managedContent: [],
      notes: [
        {
          id: 'n-custom',
          title: 'Writs Quick Notes',
          folder: 'Polity',
          tags: ['Article 32'],
          body: 'Habeas Corpus and Mandamus',
          exam: 'upsc',
          updatedAt: '2026-11-28',
        },
      ],
      progress: {},
      bookmarks: ['pyq1'],
      results: [
        {
          id: 'res-1',
          testId: 't1',
          score: 84.5,
          total: 100,
          accuracy: 85,
          at: '2026-11-28',
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
    },
    dispatch: mockDispatch,
  }),
}));

const { SafeAreaProvider } = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context');
const { ThemeProvider: LegacyThemeProvider } = require('../lib/theme') as typeof import('../lib/theme');
const { SSDSThemeProvider } = require('../lib/ssds') as typeof import('../lib/ssds');
const SearchScreen = require('../screens/SearchScreen').default as typeof import('../screens/SearchScreen').default;
const CurrentAffairsScreen = require('../screens/CurrentAffairsScreen').default as typeof import('../screens/CurrentAffairsScreen').default;
const PYQScreen = require('../screens/PYQScreen').default as typeof import('../screens/PYQScreen').default;
const TestsScreen = require('../screens/TestsScreen').default as typeof import('../screens/TestsScreen').default;

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

describe('Phase 6 Batch 2 Screen Migrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockRouteParams = {};
  });

  it('SearchScreen filters by category, navigates on hit, and routes empty query to SakhaAI', () => {
    const screen = render(
      <Providers>
        <SearchScreen />
      </Providers>,
    );

    fireEvent.press(screen.getByText('My notes'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Search everything in Study Sakha…'),
      'Writs',
    );
    expect(screen.getByText('Writs Quick Notes')).toBeTruthy();

    fireEvent.press(screen.getByText('Writs Quick Notes'));
    expect(mockNavigate).toHaveBeenCalledWith('NoteEditor', { noteId: 'n-custom' });

    fireEvent.changeText(
      screen.getByPlaceholderText('Search everything in Study Sakha…'),
      'zzznomatch',
    );
    fireEvent.press(screen.getByText('Ask Sakha AI'));
    expect(mockNavigate).toHaveBeenCalledWith('SakhaAI', { prompt: 'zzznomatch' });
  });

  it('CurrentAffairsScreen launches daily quiz, expands story, and resets empty filters', () => {
    const screen = render(
      <Providers>
        <CurrentAffairsScreen />
      </Providers>,
    );

    fireEvent.press(screen.getByText("Take today's current affairs quiz"));
    expect(mockNavigate).toHaveBeenCalledWith('TestPlayer', { testId: 't4' });

    fireEvent.press(screen.getAllByText('Read key points')[0]);
    expect(screen.getByText('Ask Sakha')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Search current affairs…'), 'zzznomatch');
    expect(screen.getByText('No stories match')).toBeTruthy();
    fireEvent.press(screen.getByText('Reset'));
    expect(screen.queryByText('No stories match')).toBeNull();
  });

  it('PYQScreen toggles bookmark, reveals answer, clears filters, and navigates to Tests', () => {
    const screen = render(
      <Providers>
        <PYQScreen />
      </Providers>,
    );

    const bookmarkButtons = screen.getAllByLabelText(/Bookmark question|Remove bookmark/);
    fireEvent.press(bookmarkButtons[0]);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'toggleBookmark' }),
    );

    fireEvent.press(screen.getAllByText('Reveal answer')[0]);
    expect(screen.getByText('Explanation')).toBeTruthy();

    fireEvent.press(screen.getByText('Practise this set as a timed quiz'));
    expect(mockNavigate).toHaveBeenCalledWith('Tests', { headerBrand: undefined });

    fireEvent.changeText(
      screen.getByPlaceholderText('Search questions, topics, explanations…'),
      'zzznomatch',
    );
    expect(screen.getByText('No questions match these filters')).toBeTruthy();
    fireEvent.press(screen.getByText('Clear filters'));
    expect(screen.queryByText('No questions match these filters')).toBeNull();
  });

  it('TestsScreen selects category and navigates to TestPlayer and TestResult', () => {
    mockRouteParams = { headerBrand: 'SakhaAI' };
    const screen = render(
      <Providers>
        <TestsScreen />
      </Providers>,
    );

    fireEvent.press(screen.getByText('UPSC'));
    fireEvent.press(screen.getByText('Re-attempt'));
    expect(mockNavigate).toHaveBeenCalledWith('TestPlayer', {
      testId: 't1',
      headerBrand: 'SakhaAI',
    });

    fireEvent.press(screen.getByText('Last result'));
    expect(mockNavigate).toHaveBeenCalledWith('TestResult', {
      resultId: 'res-1',
      headerBrand: 'SakhaAI',
    });
  });
});
