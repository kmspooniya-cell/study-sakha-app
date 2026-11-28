import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Home } from 'lucide-react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStorage = new Map<string, string>();

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

const { SafeAreaProvider } = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../lib/store') as typeof import('../lib/store');
const { ThemeProvider: LegacyThemeProvider, useTheme: useLegacyTheme } =
  require('../lib/theme') as typeof import('../lib/theme');
const {
  SSDSBaseCard,
  SSDSColumn,
  SSDSDivider,
  SSDSIcon,
  SSDSPageLayout,
  SSDSRow,
  SSDSScreenContainer,
  SSDSSectionContainer,
  SSDSSectionHeader,
  SSDSSpacer,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  SSDSThemeProvider,
  useSSDSTheme,
} = require('../lib/ssds') as typeof import('../lib/ssds');
const { AppGuideContent } =
  require('../screens/AppGuideScreen') as typeof import('../screens/AppGuideScreen');

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

function FoundationProbe({
  onTheme,
}: {
  onTheme?: (snap: {
    ssds: ReturnType<typeof useSSDSTheme>;
    legacy: ReturnType<typeof useLegacyTheme>;
    store: ReturnType<typeof useStore>;
  }) => void;
}) {
  const ssds = useSSDSTheme();
  const legacy = useLegacyTheme();
  const store = useStore();
  onTheme?.({ ssds, legacy, store });

  return (
    <SSDSPageLayout>
      <SSDSScreenContainer>
        <SSDSSectionContainer>
          <SSDSSectionHeader title="Foundation" subtitle="Phase 2" icon={Home} />
          <SSDSSurface variant="outlined" padding="md">
            <SSDSStack gap={8}>
              <SSDSRow gap={8}>
                <SSDSIcon icon={Home} size="md" color="primary" />
                <SSDSText variant="CardTitle">Heading</SSDSText>
              </SSDSRow>
              <SSDSDivider />
              <SSDSColumn gap={4}>
                <SSDSText variant="BodyPrimary">Body copy</SSDSText>
                <SSDSText variant="BodySecondary">Secondary copy</SSDSText>
              </SSDSColumn>
              <SSDSSpacer size={8} />
              <SSDSBaseCard>
                <SSDSText variant="Caption">Card content</SSDSText>
              </SSDSBaseCard>
            </SSDSStack>
          </SSDSSurface>
        </SSDSSectionContainer>
      </SSDSScreenContainer>
    </SSDSPageLayout>
  );
}

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

describe('SSDS Phase 2 Foundation Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
  });

  it('exposes the approved default Study Sakha brand palette and renders foundation primitives', async () => {
    let latest: any = null;
    const screen = render(
      <Providers>
        <FoundationProbe onTheme={(snap) => (latest = snap)} />
      </Providers>,
    );

    await waitFor(() => {
      expect(latest?.store.state.hydrated).toBe(true);
    });

    const { colors } = latest.ssds.tokens;
    expect(colors.primary).toBe('#2B4C7E');
    expect(colors.primaryLight).toBe('#EBF1FA');
    expect(colors.secondary).toBe('#2E6F6B');
    expect(colors.accent).toBe('#B87314');
    expect(colors.background).toBe('#F7F8FA');
    expect(colors.surface).toBe('#FFFFFF');
    expect(colors.textPrimary).toBe('#111827');
    expect(colors.border).toBe('#E2E7EF');
    expect(colors.success).toBe('#1E7E4E');
    expect(colors.warning).toBe('#B4690E');
    expect(colors.danger).toBe('#C63636');
    expect(colors.info).toBe('#1F639B');
    expect(colors.chartPrimary).toBe('#2B4C7E');
    expect(colors.chartSecondary).toBe('#2E6F6B');
    expect(colors.chartTertiary).toBe('#B87314');

    expect(screen.getByText('Foundation')).toBeTruthy();
    expect(screen.getByText('Heading')).toBeTruthy();
    expect(screen.getByText('Body copy')).toBeTruthy();
    expect(screen.getByText('Card content')).toBeTruthy();

    act(() => {
      latest.ssds.updateAppearance({ themeMode: 'dark' });
    });

    await waitFor(() => {
      expect(latest.ssds.tokens.isDark).toBe(true);
      expect(latest.store.state.settings.themeMode).toBe('dark');
    });
  });

  it('renders AppGuideContent using SSDS foundation components and preserves navigation callbacks', () => {
    const onOpen = jest.fn();
    const screen = render(
      <Providers>
        <AppGuideContent onOpen={onOpen} />
      </Providers>,
    );

    expect(screen.getByText('App Sections')).toBeTruthy();
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Library')).toBeTruthy();
    expect(screen.getByText('Practice')).toBeTruthy();
    expect(screen.getByText('Sakha AI')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Open Library'));
    expect(onOpen).toHaveBeenCalledWith('Library');
  });
});
