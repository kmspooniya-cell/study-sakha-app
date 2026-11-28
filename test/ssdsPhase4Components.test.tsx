import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BookOpen, Home, Plus, Settings, TrendingUp } from 'lucide-react-native';
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
  SSDSActionMenu,
  SSDSAppHeader,
  SSDSAvatar,
  SSDSBottomBar,
  SSDSEmptyState,
  SSDSErrorState,
  SSDSFeatureCard,
  SSDSFloatingButton,
  SSDSImagePlaceholder,
  SSDSListItem,
  SSDSProgressCard,
  SSDSScreenHeader,
  SSDSSkeleton,
  SSDSStatItem,
  SSDSStatisticCard,
  SSDSTabBar,
  SSDSThemeProvider,
  SSDSThumbnail,
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

function Phase4Showcase({
  onBack,
  onRetry,
  onEmptyAction,
  onListItemPress,
  onFeaturePress,
  onFabPress,
  onBottomNav,
}: {
  onBack: () => void;
  onRetry: () => void;
  onEmptyAction: () => void;
  onListItemPress: () => void;
  onFeaturePress: () => void;
  onFabPress: () => void;
  onBottomNav: (id: string) => void;
}) {
  const [tab, setTab] = useState('notes');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <SSDSAppHeader title="Study Sakha" subtitle="UPSC Prep" />
      <SSDSScreenHeader title="Library" subtitle="All study resources" onBack={onBack} />
      <SSDSTabBar
        tabs={[
          { id: 'notes', label: 'Notes', count: 12 },
          { id: 'pyq', label: 'PYQs', count: 8 },
        ]}
        activeId={tab}
        onChange={setTab}
      />
      <SSDSAvatar name="Aarav Sharma" status="online" />
      <SSDSThumbnail title="Polity" subtitle="PDF" />
      <SSDSImagePlaceholder label="Cover Preview" />
      <SSDSStatItem label="Focus Today" value="2h 15m" icon={TrendingUp} />
      <SSDSStatisticCard label="Weekly Hours" value="18.5h" delta="+12%" />
      <SSDSProgressCard
        title="Indian Polity"
        subtitle="12 of 20 chapters"
        progress={60}
        badge={{ label: 'On Track', variant: 'success' }}
      />
      <SSDSFeatureCard
        title="Mock Tests"
        description="Timed UPSC & SSC practice sets"
        icon={BookOpen}
        actionLabel="Start Practice"
        onPress={onFeaturePress}
      />
      <SSDSListItem
        title="Fundamental Rights"
        subtitle="Article 12–35"
        onPress={onListItemPress}
        divider
      />
      <SSDSSkeleton height={20} />
      <SSDSEmptyState
        title="No Starred Notes"
        description="Star notes to see them here."
        primaryAction={{ label: 'Browse Notes', onPress: onEmptyAction }}
      />
      <SSDSErrorState
        title="Sync Interrupted"
        description="Check your connection."
        onRetry={onRetry}
      />
      <SSDSFloatingButton icon={Plus} label="Add Note" onPress={onFabPress} />
      <SSDSActionMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[{ id: 'settings', label: 'Settings', icon: Settings, onPress: jest.fn() }]}
      />
      <SSDSBottomBar
        items={[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'library', label: 'Library', icon: BookOpen },
        ]}
        activeId="home"
        onChange={onBottomNav}
      />
    </>
  );
}

describe('SSDS Phase 4 Layout, Navigation & Data Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
  });

  it('renders and interacts with all Phase 4 layout, navigation, media, and data-display components', () => {
    const onBack = jest.fn();
    const onRetry = jest.fn();
    const onEmptyAction = jest.fn();
    const onListItemPress = jest.fn();
    const onFeaturePress = jest.fn();
    const onFabPress = jest.fn();
    const onBottomNav = jest.fn();

    const screen = render(
      <Providers>
        <Phase4Showcase
          onBack={onBack}
          onRetry={onRetry}
          onEmptyAction={onEmptyAction}
          onListItemPress={onListItemPress}
          onFeaturePress={onFeaturePress}
          onFabPress={onFabPress}
          onBottomNav={onBottomNav}
        />
      </Providers>,
    );

    expect(screen.getByText('Study Sakha')).toBeTruthy();
    expect(screen.getByText('AS')).toBeTruthy();
    expect(screen.getByText('Weekly Hours')).toBeTruthy();
    expect(screen.getByText('18.5h')).toBeTruthy();
    expect(screen.getByText('Indian Polity')).toBeTruthy();
    expect(screen.getByText('On Track')).toBeTruthy();

    fireEvent.press(screen.getByText('PYQs'));
    fireEvent.press(screen.getByText('Start Practice'));
    expect(onFeaturePress).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Fundamental Rights'));
    expect(onListItemPress).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Browse Notes'));
    expect(onEmptyAction).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Add Note'));
    expect(onFabPress).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getAllByText('Library')[1]);
    expect(onBottomNav).toHaveBeenCalledWith('library');

    expect(mockGetItem).not.toHaveBeenCalledWith('ssds_appearance_v1');
    expect(mockSetItem).not.toHaveBeenCalledWith('ssds_appearance_v1', expect.anything());
  });
});
