/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/theme/ThemeProvider.tsx
 * Target: Expo SDK 57 / React Native 0.86.3 / React 19.2.3 / TypeScript
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Toast } from '../components/feedback/Toast';
import { Snackbar } from '../components/feedback/Snackbar';

import {
  ColorTokens,
  CustomColorOverrides,
  hexToRgba,
  THEME_PRESETS,
} from './tokens/colors';
import { LIGHT_THEME_COLORS } from './themes/light';
import { DARK_THEME_COLORS } from './themes/dark';
import { ResolvedThemeMode, resolveThemeMode, ThemeMode } from './themes/system';
import {
  FontStylePreference,
  resolveFontFamilies,
  TYPOGRAPHY_SPECS,
  TypographyTokens,
} from './tokens/typography';
import { buildSpacingTokens, ContentDensity, SpacingTokens } from './tokens/spacing';
import { buildRadiusTokens, RadiusMode, RadiusTokens } from './tokens/radius';
import { buildShadowTokens, ShadowIntensity, ShadowTokens } from './tokens/shadows';
import { DIMENSIONS, DimensionTokens } from './tokens/dimensions';
import { AnimationIntensity, buildMotionTokens, MotionTokens } from './tokens/motion';
import { ICON_TOKENS, IconTokens } from './tokens/icons';

export type CardAppearance = 'outlined' | 'elevated' | 'filled';
export type BorderIntensity = 'subtle' | 'default' | 'strong';
export type PresetId =
  | 'classic'
  | 'ocean'
  | 'midnight'
  | 'forest'
  | 'warm'
  | 'graphite'
  | 'lavender'
  | 'custom';

export interface AppearanceConfig {
  themeMode: ThemeMode;
  presetId: PresetId;
  customColors: CustomColorOverrides | null;
  typographyScale: number;
  fontStyle: FontStylePreference;
  density: ContentDensity;
  radiusMode: RadiusMode;
  cardAppearance: CardAppearance;
  borderIntensity: BorderIntensity;
  shadowIntensity: ShadowIntensity;
  animationIntensity: AnimationIntensity;
  reduceMotion: boolean;
}

export interface SavedCustomPreset {
  id: string;
  name: string;
  config: AppearanceConfig;
  createdAt: string;
}

export interface ToastPayload {
  type?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  message?: string;
  duration?: number;
}

interface ToastRecord extends ToastPayload {
  id: number;
}

export interface SnackbarPayload {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface SnackbarRecord extends SnackbarPayload {
  id: number;
}

export interface ThemeTokens {
  mode: ResolvedThemeMode;
  isDark: boolean;
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  dimensions: DimensionTokens;
  motion: MotionTokens;
  icons: IconTokens;
  typography: TypographyTokens;
  cardAppearance: CardAppearance;
}

export interface ThemeContextValue {
  tokens: ThemeTokens;
  appearance: AppearanceConfig;
  isHydrated: boolean;
  updateAppearance: (patch: Partial<AppearanceConfig>) => void;
  resetCurrentTheme: () => void;
  restoreDefaultAppearance: () => void;
  savedPresets: SavedCustomPreset[];
  saveCustomPreset: (name: string) => void;
  deleteCustomPreset: (id: string) => void;
  showToast: (payload: ToastPayload) => void;
  showSnackbar: (payload: SnackbarPayload) => void;
}

const STORAGE_KEY_APPEARANCE = 'ssds_appearance_v1';
const STORAGE_KEY_PRESETS = 'ssds_custom_presets_v1';

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  themeMode: 'system',
  presetId: 'classic',
  customColors: null,
  typographyScale: 1,
  fontStyle: 'inter',
  density: 'comfortable',
  radiusMode: 'default',
  cardAppearance: 'outlined',
  borderIntensity: 'default',
  shadowIntensity: 'subtle',
  animationIntensity: 'standard',
  reduceMotion: false,
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  controlledAppearance?: Partial<AppearanceConfig>;
  onAppearanceChange?: (patch: Partial<AppearanceConfig>) => void;
  disablePersistence?: boolean;
  resolveColorTokens?: (
    colors: ColorTokens,
    context: { isDark: boolean; appearance: AppearanceConfig }
  ) => Partial<ColorTokens> | undefined;
}

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

export function ThemeProvider({
  children,
  controlledAppearance,
  onAppearanceChange,
  disablePersistence = false,
  resolveColorTokens,
}: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const insets = useContext(SafeAreaInsetsContext) ?? ZERO_INSETS;

  const [appearance, setAppearance] = useState<AppearanceConfig>(DEFAULT_APPEARANCE);
  const [savedPresets, setSavedPresets] = useState<SavedCustomPreset[]>([]);
  const [osReduceMotion, setOsReduceMotion] = useState(false);
  const [isHydrated, setIsHydrated] = useState(Boolean(disablePersistence));
  const effectiveIsHydrated = disablePersistence || isHydrated;

  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarRecord | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const toastTimers = toastTimersRef.current;
    return () => {
      isMountedRef.current = false;
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
        snackbarTimerRef.current = null;
      }
      toastTimers.forEach((timer) => clearTimeout(timer));
      toastTimers.clear();
    };
  }, []);

  useEffect(() => {
    if (disablePersistence) {
      return;
    }
    let mounted = true;
    async function hydrate() {
      try {
        const [rawAppearance, rawPresets] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_APPEARANCE),
          AsyncStorage.getItem(STORAGE_KEY_PRESETS),
        ]);
        if (!mounted) return;
        if (rawAppearance) {
          const parsed = JSON.parse(rawAppearance) as Partial<AppearanceConfig>;
          setAppearance({ ...DEFAULT_APPEARANCE, ...parsed });
        }
        if (rawPresets) {
          const parsedPresets = JSON.parse(rawPresets) as SavedCustomPreset[];
          if (Array.isArray(parsedPresets)) {
            setSavedPresets(parsedPresets);
          }
        }
      } catch {
        // Fallback silently to Study Sakha Classic defaults
      } finally {
        if (mounted) setIsHydrated(true);
      }
    }
    hydrate();
    return () => {
      mounted = false;
    };
  }, [disablePersistence]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setOsReduceMotion)
      .catch(() => undefined);

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setOsReduceMotion
    );
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (disablePersistence || controlledAppearance || !isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_APPEARANCE, JSON.stringify(appearance)).catch(
      () => undefined
    );
  }, [appearance, controlledAppearance, disablePersistence, isHydrated]);

  const effectiveAppearance = useMemo<AppearanceConfig>(
    () =>
      controlledAppearance
        ? { ...DEFAULT_APPEARANCE, ...controlledAppearance }
        : appearance,
    [appearance, controlledAppearance]
  );

  const resolvedMode = resolveThemeMode(effectiveAppearance.themeMode, systemColorScheme);
  const isDark = resolvedMode === 'dark';

  const tokens = useMemo<ThemeTokens>(() => {
    const base: ColorTokens = isDark ? { ...DARK_THEME_COLORS } : { ...LIGHT_THEME_COLORS };
    const preset =
      THEME_PRESETS.find((p) => p.id === effectiveAppearance.presetId) ?? THEME_PRESETS[0];
    const presetOverrides = isDark ? preset.dark : preset.light;

    const colors: ColorTokens = { ...base, ...presetOverrides };

    if (effectiveAppearance.presetId === 'custom' && effectiveAppearance.customColors) {
      const c = effectiveAppearance.customColors;
      if (c.primary) {
        colors.primary = c.primary;
        colors.primaryLight = hexToRgba(c.primary, isDark ? 0.18 : 0.1);
        colors.primaryDark = darkenHex(c.primary, 0.2);
        colors.textInverse = isLightHex(c.primary) ? '#111827' : '#FFFFFF';
        colors.borderFocused = c.primary;
        colors.borderSelected = c.primary;
        colors.textLink = c.primary;
        colors.chartPrimary = c.primary;
        colors.brandGradientStart = c.primary;
      }
      if (c.secondary) {
        colors.secondary = c.secondary;
        colors.secondaryLight = hexToRgba(c.secondary, isDark ? 0.18 : 0.1);
        colors.chartSecondary = c.secondary;
      }
      if (c.accent) {
        colors.accent = c.accent;
        colors.accentSoft = hexToRgba(c.accent, isDark ? 0.18 : 0.12);
        colors.chartTertiary = c.accent;
      }
      if (c.background) colors.background = c.background;
      if (c.surface) colors.surface = c.surface;
    } else {
      colors.borderFocused = colors.primary;
      colors.borderSelected = colors.primary;
      colors.textLink = colors.primary;
      colors.chartPrimary = colors.primary;
      colors.chartSecondary = colors.secondary;
      colors.chartTertiary = colors.accent;
      colors.brandGradientStart = colors.primary;
    }

    if (effectiveAppearance.borderIntensity === 'subtle') {
      colors.border = colors.borderSubtle;
    } else if (effectiveAppearance.borderIntensity === 'strong') {
      colors.border = colors.borderStrong;
    }

    const extraColors = resolveColorTokens?.(colors, {
      isDark,
      appearance: effectiveAppearance,
    });
    if (extraColors) {
      Object.assign(colors, extraColors);
    }

    const spacing = buildSpacingTokens(effectiveAppearance.density);
    const radius = buildRadiusTokens(effectiveAppearance.radiusMode);
    const shadows = buildShadowTokens(isDark, effectiveAppearance.shadowIntensity);
    const motion = buildMotionTokens(
      effectiveAppearance.animationIntensity,
      effectiveAppearance.reduceMotion || osReduceMotion
    );

    const fontFamilies = resolveFontFamilies(effectiveAppearance.fontStyle);
    const typography: TypographyTokens = {
      ...fontFamilies,
      scale: effectiveAppearance.typographyScale,
      styles: TYPOGRAPHY_SPECS,
    };

    return {
      mode: resolvedMode,
      isDark,
      colors,
      spacing,
      radius,
      shadows,
      dimensions: DIMENSIONS,
      motion,
      icons: ICON_TOKENS,
      typography,
      cardAppearance: effectiveAppearance.cardAppearance,
    };
  }, [effectiveAppearance, isDark, osReduceMotion, resolveColorTokens, resolvedMode]);

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    if (!isMountedRef.current) return;
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = 'info', title, message, duration = 3200 }: ToastPayload) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => {
        const evicted = prev.length >= 3 ? prev.slice(0, prev.length - 2) : [];
        evicted.forEach((item) => {
          const oldTimer = toastTimersRef.current.get(item.id);
          if (oldTimer) {
            clearTimeout(oldTimer);
            toastTimersRef.current.delete(item.id);
          }
        });
        return [...prev.slice(-2), { id, type, title, message }];
      });
      const timer = setTimeout(() => {
        toastTimersRef.current.delete(id);
        if (!isMountedRef.current) return;
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
      toastTimersRef.current.set(id, timer);
    },
    []
  );

  const dismissSnackbar = useCallback(() => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
      snackbarTimerRef.current = null;
    }
    if (!isMountedRef.current) return;
    setSnackbar(null);
  }, []);

  const showSnackbar = useCallback(
    ({ message, actionLabel, onAction, duration = 4000 }: SnackbarPayload) => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
        snackbarTimerRef.current = null;
      }
      const id = Date.now();
      setSnackbar({ id, message, actionLabel, onAction, duration });
      snackbarTimerRef.current = setTimeout(() => {
        snackbarTimerRef.current = null;
        if (!isMountedRef.current) return;
        setSnackbar((prev) => (prev?.id === id ? null : prev));
      }, duration);
    },
    []
  );

  const updateAppearance = useCallback(
    (patch: Partial<AppearanceConfig>) => {
      onAppearanceChange?.(patch);
      if (!controlledAppearance) {
        setAppearance((prev) => ({ ...prev, ...patch }));
      }
    },
    [controlledAppearance, onAppearanceChange]
  );

  const resetCurrentTheme = useCallback(() => {
    const nextPresetId =
      effectiveAppearance.presetId === 'custom'
        ? 'classic'
        : effectiveAppearance.presetId;
    const resetPatch: AppearanceConfig = {
      ...DEFAULT_APPEARANCE,
      themeMode: effectiveAppearance.themeMode,
      presetId: nextPresetId,
    };
    onAppearanceChange?.(resetPatch);
    if (!controlledAppearance) {
      setAppearance(resetPatch);
    }
    showToast({
      type: 'info',
      title: 'Theme reset',
      message: 'Current theme settings restored to preset defaults.',
    });
  }, [
    controlledAppearance,
    effectiveAppearance.presetId,
    effectiveAppearance.themeMode,
    onAppearanceChange,
    showToast,
  ]);

  const restoreDefaultAppearance = useCallback(() => {
    onAppearanceChange?.(DEFAULT_APPEARANCE);
    if (!controlledAppearance) {
      setAppearance(DEFAULT_APPEARANCE);
    }
    showToast({
      type: 'success',
      title: 'Defaults restored',
      message: 'Study Sakha Classic default appearance applied.',
    });
  }, [controlledAppearance, onAppearanceChange, showToast]);

  const saveCustomPreset = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const newPreset: SavedCustomPreset = {
        id: `saved_${Date.now()}`,
        name: trimmed,
        config: { ...effectiveAppearance },
        createdAt: new Date().toLocaleDateString(),
      };
      setSavedPresets((prev) => {
        const next = [newPreset, ...prev].slice(0, 6);
        if (!disablePersistence) {
          AsyncStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(next)).catch(
            () => undefined
          );
        }
        return next;
      });
      showToast({
        type: 'success',
        title: 'Preset saved',
        message: `"${trimmed}" saved to your custom themes.`,
      });
    },
    [disablePersistence, effectiveAppearance, showToast]
  );

  const deleteCustomPreset = useCallback(
    (id: string) => {
      setSavedPresets((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (!disablePersistence) {
          AsyncStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(next)).catch(
            () => undefined
          );
        }
        return next;
      });
    },
    [disablePersistence]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      tokens,
      appearance: effectiveAppearance,
      isHydrated: effectiveIsHydrated,
      updateAppearance,
      resetCurrentTheme,
      restoreDefaultAppearance,
      savedPresets,
      saveCustomPreset,
      deleteCustomPreset,
      showToast,
      showSnackbar,
    }),
    [
      tokens,
      effectiveAppearance,
      effectiveIsHydrated,
      updateAppearance,
      resetCurrentTheme,
      restoreDefaultAppearance,
      savedPresets,
      saveCustomPreset,
      deleteCustomPreset,
      showToast,
      showSnackbar,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}

      {toasts.length > 0 && (
        <View
          pointerEvents="box-none"
          style={[
            styles.toastContainer,
            { top: Math.max(insets.top + 12, 16) },
          ]}
        >
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              type={toast.type}
              title={toast.title}
              message={toast.message}
              onClose={() => dismissToast(toast.id)}
              style={styles.toastItem}
            />
          ))}
        </View>
      )}

      {snackbar && (
        <View
          pointerEvents="box-none"
          style={[
            styles.snackbarWrapper,
            { bottom: Math.max(insets.bottom + 16, 20) },
          ]}
        >
          <Snackbar
            message={snackbar.message}
            actionLabel={snackbar.actionLabel}
            onAction={() => {
              snackbar.onAction?.();
              dismissSnackbar();
            }}
            onDismiss={dismissSnackbar}
            style={styles.snackbar}
          />
        </View>
      )}
    </ThemeContext.Provider>
  );
}

function parseHexRgb(hex: string): [number, number, number] | null {
  if (!hex || !hex.startsWith('#')) return null;
  const clean = hex.slice(1);
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean;
  if (full.length !== 6) return null;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function isLightHex(hex: string): boolean {
  const rgb = parseHexRgb(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35;
}

function darkenHex(hex: string, amount: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const factor = Math.max(0, Math.min(1, 1 - amount));
  const [r, g, b] = rgb.map((v) =>
    Math.max(0, Math.min(255, Math.round(v * factor)))
      .toString(16)
      .padStart(2, '0')
  );
  return `#${r}${g}${b}`;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
    alignItems: 'center',
  },
  toastItem: {
    width: '100%',
    maxWidth: 400,
  },
  snackbarWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9998,
    alignItems: 'center',
  },
  snackbar: {
    width: '100%',
    maxWidth: 440,
  },
});
