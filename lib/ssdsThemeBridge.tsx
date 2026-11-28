import React, { useCallback, useMemo } from 'react';
import {
  ThemeProvider as RawSSDSThemeProvider,
  useTheme as useRawSSDSTheme,
  type AppearanceConfig,
  type ColorTokens,
  type PresetId,
  type ThemeContextValue,
} from '../study-sakha-design-system-native/src/theme/ThemeProvider';
import { useStore, type State } from './store';

const VALID_HEX_REGEX = /^#[0-9a-f]{6}$/i;
const ROSE_ACCENT_HEX = '#e11d48';

const ACCENT_TO_PRESET: Record<string, PresetId> = {
  indigo: 'classic',
  teal: 'ocean',
  emerald: 'forest',
  amber: 'warm',
  slate: 'graphite',
  violet: 'lavender',
  rose: 'custom',
};

const PRESET_TO_ACCENT: Record<Exclude<PresetId, 'custom'>, string> = {
  classic: 'indigo',
  midnight: 'indigo',
  ocean: 'teal',
  forest: 'emerald',
  warm: 'amber',
  graphite: 'slate',
  lavender: 'violet',
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeBlendedBackground(
  backgroundId: string,
  backgroundOpacity: number,
  overlayIntensity: number,
  isDark: boolean,
): string | null {
  if (!backgroundId || backgroundId === 'none') {
    return null;
  }
  const opacity = clamp(backgroundOpacity / 100, 0.1, 1);
  const overlay = clamp(overlayIntensity / 100, 0, 0.85);
  const alpha = 1 - opacity * (1 - overlay);
  return isDark
    ? `rgba(13,17,23,${alpha})`
    : `rgba(247,248,250,${alpha})`;
}

export function mapStoreSettingsToSSDSAppearance(
  settings: State['settings'],
): Partial<AppearanceConfig> {
  const hasValidCustomHex =
    typeof settings.customAccentHex === 'string' &&
    VALID_HEX_REGEX.test(settings.customAccentHex);

  let presetId: PresetId = 'classic';
  let customColors: AppearanceConfig['customColors'] = null;

  if (hasValidCustomHex) {
    presetId = 'custom';
    customColors = { primary: settings.customAccentHex! };
  } else if (settings.accentColor === 'rose') {
    presetId = 'custom';
    customColors = { primary: ROSE_ACCENT_HEX };
  } else {
    presetId = ACCENT_TO_PRESET[settings.accentColor] ?? 'classic';
  }

  const textScale = Number.isFinite(settings.textScale) ? settings.textScale : 1;
  const displayScaling = Number.isFinite(settings.displayScaling)
    ? settings.displayScaling
    : 100;
  const typographyScale = round2(textScale * (displayScaling / 100));

  const animationIntensity: AppearanceConfig['animationIntensity'] = settings.reduceMotion
    ? 'none'
    : settings.animationIntensity === 'minimal'
      ? 'subtle'
      : 'standard';

  return {
    themeMode: settings.themeMode ?? 'system',
    presetId,
    customColors,
    typographyScale,
    density: settings.layoutDensity === 'compact' ? 'compact' : 'comfortable',
    borderIntensity: settings.highContrast ? 'strong' : 'default',
    animationIntensity,
    reduceMotion: Boolean(settings.reduceMotion),
  };
}

export function mapSSDSAppearancePatchToStoreSettings(
  patch: Partial<AppearanceConfig>,
  currentSettings: State['settings'],
): Partial<State['settings']> {
  const next: Partial<State['settings']> = {};

  if (patch.themeMode !== undefined) {
    next.themeMode = patch.themeMode;
  }

  if (patch.typographyScale !== undefined && Number.isFinite(patch.typographyScale)) {
    const displayFactor =
      (Number.isFinite(currentSettings.displayScaling)
        ? currentSettings.displayScaling
        : 100) / 100;
    const safeFactor = displayFactor > 0 ? displayFactor : 1;
    next.textScale = clamp(round2(patch.typographyScale / safeFactor), 0.8, 1.4);
  }

  if (patch.customColors !== undefined) {
    if (
      patch.customColors?.primary &&
      VALID_HEX_REGEX.test(patch.customColors.primary)
    ) {
      next.customAccentHex = patch.customColors.primary;
    } else if (patch.customColors === null) {
      next.customAccentHex = null;
    }
  }

  if (patch.presetId !== undefined) {
    if (patch.presetId === 'custom') {
      if (
        patch.customColors?.primary &&
        VALID_HEX_REGEX.test(patch.customColors.primary)
      ) {
        next.customAccentHex = patch.customColors.primary;
      }
    } else {
      next.accentColor = PRESET_TO_ACCENT[patch.presetId] ?? 'indigo';
      next.customAccentHex = null;
    }
  }

  if (patch.borderIntensity !== undefined) {
    next.highContrast = patch.borderIntensity === 'strong';
  }

  if (patch.reduceMotion !== undefined) {
    next.reduceMotion = patch.reduceMotion;
  }

  if (patch.animationIntensity !== undefined) {
    next.animationIntensity =
      patch.animationIntensity === 'none' || patch.animationIntensity === 'subtle'
        ? 'minimal'
        : 'balanced';
  }

  if (patch.density !== undefined) {
    next.layoutDensity = patch.density === 'compact' ? 'compact' : 'comfortable';
  }

  return next;
}

export function SSDSThemeProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useStore();
  const { settings } = state;

  const controlledAppearance = useMemo(
    () => mapStoreSettingsToSSDSAppearance(settings),
    [settings],
  );

  const handleAppearanceChange = useCallback(
    (patch: Partial<AppearanceConfig>) => {
      const storePatch = mapSSDSAppearancePatchToStoreSettings(patch, settings);
      if (Object.keys(storePatch).length > 0) {
        dispatch({ type: 'settings', patch: storePatch });
      }
    },
    [dispatch, settings],
  );

  const resolveColorTokens = useCallback(
    (
      _colors: ColorTokens,
      { isDark }: { isDark: boolean; appearance: AppearanceConfig },
    ): Partial<ColorTokens> | undefined => {
      const overrides: Partial<ColorTokens> = {};

      if (settings.highContrast) {
        overrides.border = isDark ? '#94a3b8' : '#334155';
        overrides.textSecondary = isDark ? '#cbd5e1' : '#374151';
      }

      const blendedBackground = computeBlendedBackground(
        settings.backgroundId,
        settings.backgroundOpacity,
        settings.overlayIntensity,
        isDark,
      );
      if (blendedBackground) {
        overrides.background = blendedBackground;
      }

      return Object.keys(overrides).length > 0 ? overrides : undefined;
    },
    [
      settings.backgroundId,
      settings.backgroundOpacity,
      settings.highContrast,
      settings.overlayIntensity,
    ],
  );

  return (
    <RawSSDSThemeProvider
      controlledAppearance={controlledAppearance}
      onAppearanceChange={handleAppearanceChange}
      disablePersistence
      resolveColorTokens={resolveColorTokens}
    >
      {children}
    </RawSSDSThemeProvider>
  );
}

export const SSDSThemeBridgeProvider = SSDSThemeProvider;

export function useSSDSTheme(): ThemeContextValue {
  return useRawSSDSTheme();
}
