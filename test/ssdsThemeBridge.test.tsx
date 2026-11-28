import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
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

const { StoreProvider, useStore } = require('../lib/store') as typeof import('../lib/store');
const { ThemeProvider: LegacyThemeProvider, useTheme: useLegacyTheme } =
  require('../lib/theme') as typeof import('../lib/theme');
const {
  computeBlendedBackground,
  mapSSDSAppearancePatchToStoreSettings,
  mapStoreSettingsToSSDSAppearance,
  SSDSThemeProvider,
  useSSDSTheme,
} = require('../lib/ssdsThemeBridge') as typeof import('../lib/ssdsThemeBridge');

function DualThemeProbe({
  onSnapshot,
}: {
  onSnapshot: (snap: {
    legacy: ReturnType<typeof useLegacyTheme>;
    ssds: ReturnType<typeof useSSDSTheme>;
    store: ReturnType<typeof useStore>;
  }) => void;
}) {
  const legacy = useLegacyTheme();
  const ssds = useSSDSTheme();
  const store = useStore();
  onSnapshot({ legacy, ssds, store });
  return <Text testID="probe">{ssds.tokens.mode}</Text>;
}

function Harness({
  onSnapshot,
}: {
  onSnapshot: (snap: {
    legacy: ReturnType<typeof useLegacyTheme>;
    ssds: ReturnType<typeof useSSDSTheme>;
    store: ReturnType<typeof useStore>;
  }) => void;
}) {
  const { state } = useStore();
  return (
    <LegacyThemeProvider
      mode={state.settings.themeMode}
      textScale={state.settings.textScale}
      accentColor={state.settings.accentColor}
      customAccentHex={state.settings.customAccentHex}
      highContrast={state.settings.highContrast}
      reduceMotion={state.settings.reduceMotion}
      animationIntensity={state.settings.animationIntensity}
      displayScaling={state.settings.displayScaling}
      layoutDensity={state.settings.layoutDensity}
      backgroundId={state.settings.backgroundId}
      backgroundOpacity={state.settings.backgroundOpacity}
      overlayIntensity={state.settings.overlayIntensity}
    >
      <SSDSThemeProvider>
        <DualThemeProbe onSnapshot={onSnapshot} />
      </SSDSThemeProvider>
    </LegacyThemeProvider>
  );
}

describe('SSDS Theme Bridge (Phase 1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
  });

  it('maps all 12 StoreProvider settings to SSDS AppearanceConfig deterministically', () => {
    const mapped = mapStoreSettingsToSSDSAppearance({
      themeMode: 'dark',
      language: 'en',
      dailyGoalMin: 180,
      textScale: 1.2,
      notifications: true,
      accentColor: 'teal',
      customAccentHex: null,
      highContrast: true,
      reduceMotion: false,
      animationIntensity: 'minimal',
      displayScaling: 110,
      layoutDensity: 'compact',
      backgroundId: 'warm-paper',
      backgroundOpacity: 80,
      overlayIntensity: 20,
      dashboardWidgets: {
        streakCard: true,
        dailyGoalRing: true,
        quickRevision: true,
        sakhaAiPrompt: true,
        upcomingTests: true,
      },
      dashboardQuickActions: [],
      focusDurationMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      meditationDurationMinutes: 10,
      focusAutoStartNextSession: false,
      focusThemeId: 'obsidian',
      focusAnimationIntensity: 'balanced',
      reduceFocusMotion: false,
      focusMusicId: 'pure_cosmic_waves',
      focusMusicVolume: 0.65,
      aiResponseLanguage: 'Bilingual (Hinglish)',
      aiResponseLength: 'Balanced',
      aiDetailLevel: 'Exam-Ready',
      aiLearningMode: 'Teacher Mode',
      aiSaveChatHistory: true,
      preferredSubjects: [],
      customSubjectPackages: [],
      activeSubjectPackageId: null,
      customActivities: [],
    });

    expect(mapped).toEqual({
      themeMode: 'dark',
      presetId: 'ocean',
      customColors: null,
      typographyScale: 1.32,
      density: 'compact',
      borderIntensity: 'strong',
      animationIntensity: 'subtle',
      reduceMotion: false,
    });
  });

  it('handles customAccentHex, rose fallback, and invalid hex gracefully', () => {
    const base = mapStoreSettingsToSSDSAppearance({
      themeMode: 'system',
      language: 'en',
      dailyGoalMin: 180,
      textScale: 1,
      notifications: true,
      accentColor: 'rose',
      customAccentHex: null,
      highContrast: false,
      reduceMotion: false,
      animationIntensity: 'balanced',
      displayScaling: 100,
      layoutDensity: 'comfortable',
      backgroundId: 'none',
      backgroundOpacity: 100,
      overlayIntensity: 0,
      dashboardWidgets: {
        streakCard: true,
        dailyGoalRing: true,
        quickRevision: true,
        sakhaAiPrompt: true,
        upcomingTests: true,
      },
      dashboardQuickActions: [],
      focusDurationMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      meditationDurationMinutes: 10,
      focusAutoStartNextSession: false,
      focusThemeId: 'obsidian',
      focusAnimationIntensity: 'balanced',
      reduceFocusMotion: false,
      focusMusicId: 'pure_cosmic_waves',
      focusMusicVolume: 0.65,
      aiResponseLanguage: 'Bilingual (Hinglish)',
      aiResponseLength: 'Balanced',
      aiDetailLevel: 'Exam-Ready',
      aiLearningMode: 'Teacher Mode',
      aiSaveChatHistory: true,
      preferredSubjects: [],
      customSubjectPackages: [],
      activeSubjectPackageId: null,
      customActivities: [],
    });
    expect(base.presetId).toBe('custom');
    expect(base.customColors).toEqual({ primary: '#e11d48' });

    const withCustomHex = mapStoreSettingsToSSDSAppearance({
      ...(base as any),
      themeMode: 'light',
      textScale: 1,
      displayScaling: 100,
      accentColor: 'indigo',
      customAccentHex: '#123456',
      highContrast: false,
      reduceMotion: true,
      animationIntensity: 'rich',
      layoutDensity: 'comfortable',
      backgroundId: 'none',
      backgroundOpacity: 100,
      overlayIntensity: 0,
    });
    expect(withCustomHex.presetId).toBe('custom');
    expect(withCustomHex.customColors).toEqual({ primary: '#123456' });
    expect(withCustomHex.animationIntensity).toBe('none');
  });

  it('reverse-maps SSDS appearance patches back to StoreProvider settings', () => {
    const current = {
      displayScaling: 110,
    } as any;

    const patch = mapSSDSAppearancePatchToStoreSettings(
      {
        themeMode: 'dark',
        presetId: 'forest',
        typographyScale: 1.32,
        density: 'spacious',
        animationIntensity: 'subtle',
        reduceMotion: true,
        borderIntensity: 'strong',
      },
      current,
    );

    expect(patch).toEqual({
      themeMode: 'dark',
      accentColor: 'emerald',
      customAccentHex: null,
      textScale: 1.2,
      layoutDensity: 'comfortable',
      animationIntensity: 'minimal',
      reduceMotion: true,
      highContrast: true,
    });
  });

  it('computes blended background matching legacy lib/theme.tsx formula', () => {
    expect(computeBlendedBackground('none', 50, 10, false)).toBeNull();
    expect(computeBlendedBackground('warm-paper', 80, 20, false)).toBe(
      `rgba(247,248,250,${1 - 0.8 * 0.8})`,
    );
    expect(computeBlendedBackground('deep-aurora', 50, 0, true)).toBe(
      'rgba(13,17,23,0.5)',
    );
  });

  it('never reads or writes ssds_appearance_v1 or ssds_custom_presets_v1 and ignores stale SSDS AsyncStorage', async () => {
    mockStorage.set(
      'ssds_appearance_v1',
      JSON.stringify({ themeMode: 'dark', presetId: 'warm', typographyScale: 1.4 }),
    );
    mockStorage.set(
      'ssds_custom_presets_v1',
      JSON.stringify([{ id: 'stale', name: 'Stale', config: {}, createdAt: 'today' }]),
    );

    let latest: any = null;
    render(
      <StoreProvider>
        <Harness
          onSnapshot={(snap) => {
            latest = snap;
          }}
        />
      </StoreProvider>,
    );

    await waitFor(() => {
      expect(latest?.store.state.hydrated).toBe(true);
    });

    expect(latest.ssds.isHydrated).toBe(true);
    expect(latest.ssds.appearance.themeMode).toBe('system');
    expect(latest.ssds.appearance.presetId).toBe('classic');
    expect(latest.ssds.savedPresets).toEqual([]);

    expect(mockGetItem).not.toHaveBeenCalledWith('ssds_appearance_v1');
    expect(mockGetItem).not.toHaveBeenCalledWith('ssds_custom_presets_v1');
    expect(mockSetItem).not.toHaveBeenCalledWith('ssds_appearance_v1', expect.anything());
    expect(mockSetItem).not.toHaveBeenCalledWith('ssds_custom_presets_v1', expect.anything());

    act(() => {
      latest.ssds.updateAppearance({
        themeMode: 'dark',
        presetId: 'ocean',
      });
    });

    await waitFor(() => {
      expect(latest.store.state.settings.themeMode).toBe('dark');
      expect(latest.store.state.settings.accentColor).toBe('teal');
      expect(latest.legacy.mode).toBe('dark');
      expect(latest.ssds.tokens.isDark).toBe(true);
    });

    act(() => {
      latest.store.dispatch({
        type: 'settings',
        patch: {
          highContrast: true,
          backgroundId: 'subtle-grid',
          backgroundOpacity: 50,
          overlayIntensity: 0,
        },
      });
    });

    await waitFor(() => {
      expect(latest.ssds.tokens.colors.border).toBe('#94a3b8');
      expect(latest.ssds.tokens.colors.background).toBe('rgba(13,17,23,0.5)');
      expect(latest.legacy.colors.border).toBe('#94a3b8');
      expect(latest.legacy.colors.bg).toBe('rgba(13,17,23,0.5)');
    });

    act(() => {
      latest.ssds.saveCustomPreset('My Preset');
      latest.ssds.resetCurrentTheme();
      latest.ssds.restoreDefaultAppearance();
    });

    expect(mockSetItem).not.toHaveBeenCalledWith('ssds_appearance_v1', expect.anything());
    expect(mockSetItem).not.toHaveBeenCalledWith('ssds_custom_presets_v1', expect.anything());
  });
});
