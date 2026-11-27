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
  Pressable,
  StyleSheet,
  Text as RNText,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react-native';

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
  themeMode: 'light',
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

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [appearance, setAppearance] = useState<AppearanceConfig>(DEFAULT_APPEARANCE);
  const [savedPresets, setSavedPresets] = useState<SavedCustomPreset[]>([]);
  const [osReduceMotion, setOsReduceMotion] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarRecord | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
  }, []);

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
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_APPEARANCE, JSON.stringify(appearance)).catch(
      () => undefined
    );
  }, [appearance, isHydrated]);

  const resolvedMode = resolveThemeMode(appearance.themeMode, systemColorScheme);
  const isDark = resolvedMode === 'dark';

  const tokens = useMemo<ThemeTokens>(() => {
    const base: ColorTokens = isDark ? { ...DARK_THEME_COLORS } : { ...LIGHT_THEME_COLORS };
    const preset =
      THEME_PRESETS.find((p) => p.id === appearance.presetId) ?? THEME_PRESETS[0];
    const presetOverrides = isDark ? preset.dark : preset.light;

    const colors: ColorTokens = { ...base, ...presetOverrides };

    if (appearance.presetId === 'custom' && appearance.customColors) {
      const c = appearance.customColors;
      if (c.primary) {
        colors.primary = c.primary;
        colors.primaryLight = hexToRgba(c.primary, isDark ? 0.18 : 0.1);
        colors.primaryDark = c.primary;
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
      colors.brandGradientEnd = colors.secondary;
    }

    if (appearance.borderIntensity === 'subtle') {
      colors.border = colors.borderSubtle;
    } else if (appearance.borderIntensity === 'strong') {
      colors.border = colors.borderStrong;
    }

    const spacing = buildSpacingTokens(appearance.density);
    const radius = buildRadiusTokens(appearance.radiusMode);
    const shadows = buildShadowTokens(isDark, appearance.shadowIntensity);
    const motion = buildMotionTokens(
      appearance.animationIntensity,
      appearance.reduceMotion || osReduceMotion
    );

    const fontFamilies = resolveFontFamilies(appearance.fontStyle);
    const typography: TypographyTokens = {
      ...fontFamilies,
      scale: appearance.typographyScale,
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
      cardAppearance: appearance.cardAppearance,
    };
  }, [appearance, isDark, osReduceMotion, resolvedMode]);

  const showToast = useCallback(
    ({ type = 'info', title, message, duration = 3200 }: ToastPayload) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-2), { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const showSnackbar = useCallback(
    ({ message, actionLabel, onAction, duration = 4000 }: SnackbarPayload) => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
      const id = Date.now();
      setSnackbar({ id, message, actionLabel, onAction, duration });
      snackbarTimerRef.current = setTimeout(() => {
        setSnackbar((prev) => (prev?.id === id ? null : prev));
      }, duration);
    },
    []
  );

  const updateAppearance = useCallback((patch: Partial<AppearanceConfig>) => {
    setAppearance((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetCurrentTheme = useCallback(() => {
    setAppearance((prev) => ({
      ...DEFAULT_APPEARANCE,
      themeMode: prev.themeMode,
      presetId: prev.presetId === 'custom' ? 'classic' : prev.presetId,
    }));
    showToast({
      type: 'info',
      title: 'Theme reset',
      message: 'Current theme settings restored to preset defaults.',
    });
  }, [showToast]);

  const restoreDefaultAppearance = useCallback(() => {
    setAppearance(DEFAULT_APPEARANCE);
    showToast({
      type: 'success',
      title: 'Defaults restored',
      message: 'Study Sakha Classic default appearance applied.',
    });
  }, [showToast]);

  const saveCustomPreset = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const newPreset: SavedCustomPreset = {
        id: `saved_${Date.now()}`,
        name: trimmed,
        config: { ...appearance },
        createdAt: new Date().toLocaleDateString(),
      };
      setSavedPresets((prev) => {
        const next = [newPreset, ...prev].slice(0, 6);
        AsyncStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(next)).catch(
          () => undefined
        );
        return next;
      });
      showToast({
        type: 'success',
        title: 'Preset saved',
        message: `"${trimmed}" saved to your custom themes.`,
      });
    },
    [appearance, showToast]
  );

  const deleteCustomPreset = useCallback((id: string) => {
    setSavedPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      AsyncStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(next)).catch(
        () => undefined
      );
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      tokens,
      appearance,
      isHydrated,
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
      appearance,
      isHydrated,
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
            <NativeToastItem
              key={toast.id}
              toast={toast}
              tokens={tokens}
              onClose={() =>
                setToasts((prev) => prev.filter((item) => item.id !== toast.id))
              }
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
          <View
            accessibilityRole="alert"
            style={[
              styles.snackbar,
              tokens.shadows.elevation4,
              {
                backgroundColor: tokens.isDark
                  ? tokens.colors.surfaceElevated
                  : '#182230',
                borderRadius: tokens.radius.md,
                borderColor: tokens.isDark ? tokens.colors.borderStrong : 'transparent',
              },
            ]}
          >
            <RNText style={styles.snackbarMessage} numberOfLines={2}>
              {snackbar.message}
            </RNText>
            {snackbar.actionLabel && (
              <Pressable
                onPress={() => {
                  snackbar.onAction?.();
                  setSnackbar(null);
                }}
                hitSlop={8}
                style={styles.snackbarActionBtn}
              >
                <RNText style={styles.snackbarActionText}>
                  {snackbar.actionLabel}
                </RNText>
              </Pressable>
            )}
            <Pressable
              onPress={() => setSnackbar(null)}
              accessibilityLabel="Dismiss notification"
              hitSlop={8}
            >
              <X size={16} color="#94A3B8" />
            </Pressable>
          </View>
        </View>
      )}
    </ThemeContext.Provider>
  );
}

function NativeToastItem({
  toast,
  tokens,
  onClose,
}: {
  toast: ToastRecord;
  tokens: ThemeTokens;
  onClose: () => void;
}) {
  const configMap = {
    success: { Icon: CheckCircle2, color: tokens.colors.success },
    warning: { Icon: AlertTriangle, color: tokens.colors.warning },
    danger: { Icon: AlertCircle, color: tokens.colors.danger },
    info: { Icon: Info, color: tokens.colors.info },
  };
  const cfg = configMap[toast.type ?? 'info'];
  const IconComp = cfg.Icon;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.toastItem,
        tokens.shadows.elevation3,
        {
          backgroundColor: tokens.colors.surfaceElevated,
          borderColor: tokens.colors.border,
          borderLeftColor: cfg.color,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <IconComp size={18} color={cfg.color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {!!toast.title && (
          <RNText
            style={{
              fontSize: 13.5,
              fontWeight: '600',
              color: tokens.colors.textPrimary,
            }}
          >
            {toast.title}
          </RNText>
        )}
        {!!toast.message && (
          <RNText
            style={{
              fontSize: 12.5,
              color: tokens.colors.textSecondary,
              marginTop: 2,
            }}
          >
            {toast.message}
          </RNText>
        )}
      </View>
      <Pressable onPress={onClose} accessibilityLabel="Close toast" hitSlop={8}>
        <X size={15} color={tokens.colors.textTertiary} />
      </Pressable>
    </View>
  );
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
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  snackbarMessage: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  snackbarActionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  snackbarActionText: {
    color: '#7AA8EE',
    fontWeight: '600',
    fontSize: 13,
  },
});
