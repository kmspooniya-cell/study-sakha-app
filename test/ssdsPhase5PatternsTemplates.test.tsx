import React, { useState } from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { BookOpen } from 'lucide-react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStorage = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => mockStorage.get(key) ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => {
  mockStorage.set(key, value);
});

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
  getItem: mockGetItem,
  setItem: mockSetItem,
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

const { SafeAreaProvider } = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context');
const { StoreProvider } = require('../lib/store') as typeof import('../lib/store');
const { ThemeProvider: LegacyThemeProvider } = require('../lib/theme') as typeof import('../lib/theme');
const {
  SSDSConfirmationPattern,
  SSDSDetailScreen,
  SSDSEmptyContentPattern,
  SSDSFormScreen,
  SSDSListingScreen,
  SSDSSearchFilterPattern,
  SSDSSectionPattern,
  SSDSStandardScreen,
  SSDSThemeProvider,
} = require('../lib/ssds') as typeof import('../lib/ssds');

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <StoreProvider>
        <LegacyThemeProvider mode="light">
          <SSDSThemeProvider>{children}</SSDSThemeProvider>
        </LegacyThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

describe('SSDS Phase 5 Patterns & Screen Templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
  });

  it('supports SearchFilterPattern, SectionPattern, EmptyContentPattern, and ConfirmationPattern', () => {
    const onSectionAction = jest.fn();
    const onEmptyAction = jest.fn();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    function PatternHarness() {
      const [query, setQuery] = useState('');
      const [category, setCategory] = useState('All');
      const [confirmOpen, setConfirmOpen] = useState(true);

      return (
        <>
          <SSDSSearchFilterPattern
            searchQuery={query}
            onSearchChange={setQuery}
            searchPlaceholder="Filter subjects"
            categories={['All', 'Polity', 'History']}
            activeCategory={category}
            onCategoryChange={setCategory}
          />
          <SSDSSectionPattern
            title="Recent Notes"
            actionLabel="View All"
            onAction={onSectionAction}
          >
            <Text>{`${category}:${query}`}</Text>
          </SSDSSectionPattern>
          <SSDSEmptyContentPattern
            icon={BookOpen}
            title="No Items"
            description="Add your first item"
            primaryAction={{ label: 'Create', onPress: onEmptyAction }}
          />
          <SSDSConfirmationPattern
            open={confirmOpen}
            title="Delete Item"
            description="This cannot be undone"
            confirmLabel="Delete"
            cancelLabel="Keep"
            variant="danger"
            onCancel={() => {
              onCancel();
              setConfirmOpen(false);
            }}
            onConfirm={onConfirm}
          />
        </>
      );
    }

    const screen = render(
      <Providers>
        <PatternHarness />
      </Providers>,
    );

    fireEvent.changeText(screen.getByPlaceholderText('Filter subjects'), 'Writs');
    fireEvent.press(screen.getByText('Polity'));
    expect(screen.getByText('Polity:Writs')).toBeTruthy();

    fireEvent.press(screen.getByText('View All'));
    expect(onSectionAction).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Create'));
    expect(onEmptyAction).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Keep'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('supports StandardScreen, ListingScreen, DetailScreen, and FormScreen templates with states and callbacks', () => {
    const onBack = jest.fn();
    const onRetry = jest.fn();
    const onPrimaryCta = jest.fn();
    const onSubmit = jest.fn();

    const standardError = render(
      <Providers>
        <SSDSStandardScreen
          title="Standard"
          subtitle="Error test"
          onBackPress={onBack}
          error="Network timeout"
          onRetry={onRetry}
        />
      </Providers>,
    );
    expect(standardError.getByText('Network timeout')).toBeTruthy();
    fireEvent.press(standardError.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);

    const listing = render(
      <Providers>
        <SSDSListingScreen
          title="PYQ Bank"
          subtitle="Previous year questions"
          onBackPress={onBack}
          data={[
            { id: '1', title: 'UPSC Prelims 2024' },
            { id: '2', title: 'SSC CGL Tier 1' },
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          searchQuery=""
          onSearchChange={jest.fn()}
          categories={['All', 'UPSC']}
          activeCategory="All"
          onCategoryChange={jest.fn()}
        />
      </Providers>,
    );
    expect(listing.getByText('UPSC Prelims 2024')).toBeTruthy();
    expect(listing.getByText('SSC CGL Tier 1')).toBeTruthy();

    const detail = render(
      <Providers>
        <SSDSDetailScreen
          title="Article 32"
          subtitle="Constitutional Remedies"
          onBackPress={onBack}
          primaryCtaLabel="Start Practice"
          onPrimaryCtaPress={onPrimaryCta}
        >
          <Text>Detail body</Text>
        </SSDSDetailScreen>
      </Providers>,
    );
    expect(detail.getByText('Detail body')).toBeTruthy();
    fireEvent.press(detail.getByText('Start Practice'));
    expect(onPrimaryCta).toHaveBeenCalledTimes(1);

    const form = render(
      <Providers>
        <SSDSFormScreen
          title="Edit Goal"
          subtitle="Daily study target"
          onBackPress={onBack}
          submitLabel="Save Goal"
          onSubmit={onSubmit}
        >
          <Text>Form fields</Text>
        </SSDSFormScreen>
      </Providers>,
    );
    expect(form.getByText('Form fields')).toBeTruthy();
    fireEvent.press(form.getByText('Save Goal'));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    expect(mockGetItem).not.toHaveBeenCalledWith('ssds_appearance_v1');
    expect(mockSetItem).not.toHaveBeenCalledWith('ssds_appearance_v1', expect.anything());
  });
});
