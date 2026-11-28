# SSDS Theme Bridge — Contract Validation

**Date:** 2026-11-28  
**Scope:** Read-only architecture validation of the future bridge between Study Sakha's `StoreProvider` / `AccountSyncEngine` / `lib/theme.tsx` and `study-sakha-design-system-native/src/theme/`. No code was modified.

---

## 1. Ownership & Authority Rules

1. **Single Source of Truth:** `StoreProvider` (`lib/store.tsx`) + `AccountSyncEngine` (`lib/sync/syncEngine.ts`) **own all persisted user appearance settings** (`state.settings`).
2. **Account-Scoped Persistence:** Only `StoreProvider` writes to `AsyncStorage` (`sakha-store-v1:user:<encodedUserId>` and `sakha-theme-mode` for pre-auth fallback) and pushes `settings.<key>` deltas to Supabase `account_sync_documents`.
3. **SSDS as Derived Presentation Layer:** SSDS `ThemeProvider` must act as a **derived, controlled presentation layer** inside `App.tsx` (`Themed`), never as an independent persistence store.

---

## 2. Complete 12-Setting Mapping Table

| # | `StoreProvider` Field (`state.settings`) | SSDS Destination Field / Token | Transformation Logic (Store -> SSDS) | Reverse Update Behavior (SSDS -> Store) | Persistence Owner | Fallback Behavior |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `themeMode` (`'light' \| 'dark' \| 'system'`) | `appearance.themeMode` | 1:1 pass-through | `updateAppearance({ themeMode })` must dispatch `settings({ themeMode })` to `StoreProvider` | `StoreProvider` + `AccountSyncEngine` | `'system'` |
| 2 | `textScale` (`0.8`–`1.4`, default `1`) | `appearance.typographyScale` | Combined: `round2(textScale * (displayScaling / 100))` | Bridge splits or updates `textScale` via `StoreProvider` `settings` action | `StoreProvider` + `AccountSyncEngine` | `1` |
| 3 | `displayScaling` (`90`–`115`, default `100`) | `appearance.typographyScale` | Combined with `textScale` above (no separate SSDS `displayScaling` field) | Reverse-map only via `SettingsScreen` (`displayScaling` stays owned by `StoreProvider`) | `StoreProvider` + `AccountSyncEngine` | `100` |
| 4 | `accentColor` (`'indigo' \| 'amber' \| 'emerald' \| 'rose' \| 'violet' \| 'teal' \| 'slate'`) | `appearance.presetId` + `appearance.customColors` | When `customAccentHex` is `null`: if `accentColor === 'indigo'`, use `'classic'` (or map `'teal' -> 'ocean'`, `'emerald' -> 'forest'`, `'amber' -> 'warm'`, `'slate' -> 'graphite'`, `'violet' -> 'lavender'`, `'rose'` -> `'custom'` with `#e11d48`) | `updateAppearance({ presetId })` maps back to `accentColor` / clears `customAccentHex` in `StoreProvider` | `StoreProvider` + `AccountSyncEngine` | `'classic'` (`'indigo'`) |
| 5 | `customAccentHex` (`#RRGGBB \| null`) | `appearance.presetId = 'custom'` + `customColors.primary` | When valid `/^#[0-9a-f]{6}$/i`, set `presetId: 'custom'` and `customColors: { primary: customAccentHex }` | `updateAppearance({ customColors })` dispatches `customAccentHex` to `StoreProvider` | `StoreProvider` + `AccountSyncEngine` | `null` (use `accentColor`) |
| 6 | `highContrast` (`boolean`, default `false`) | *(No direct SSDS field)* -> `appearance.borderIntensity` + token override | Map `true` -> `borderIntensity: 'strong'`, and override `tokens.colors.border` (`#94a3b8` dark / `#334155` light) + darken/lighten `textSecondary` in bridge | Managed via `StoreProvider` (`settings({ highContrast })`) | `StoreProvider` + `AccountSyncEngine` | `false` (`borderIntensity: 'default'`) |
| 7 | `reduceMotion` (`boolean`, default `false`) | `appearance.reduceMotion` | 1:1 pass-through (SSDS also ORs with OS `AccessibilityInfo` `reduceMotionChanged`) | `updateAppearance({ reduceMotion })` dispatches `settings({ reduceMotion })` | `StoreProvider` + `AccountSyncEngine` | `false` |
| 8 | `animationIntensity` (`'minimal' \| 'balanced' \| 'rich'`) | `appearance.animationIntensity` (`'none' \| 'subtle' \| 'standard'`) | `'minimal' -> 'subtle'` (or `'none'` if `reduceMotion`), `'balanced' -> 'standard'`, `'rich' -> 'standard'` | Reverse-map `'none' \| 'subtle' -> 'minimal'`, `'standard' -> 'balanced'` | `StoreProvider` + `AccountSyncEngine` | `'standard'` (`'balanced'`) |
| 9 | `layoutDensity` (`'compact' \| 'comfortable'`) | `appearance.density` (`'compact' \| 'comfortable' \| 'spacious'`) | 1:1 pass-through (`'compact'` or `'comfortable'`) | Reverse-map `'spacious' -> 'comfortable'` if ever selected, else 1:1 | `StoreProvider` + `AccountSyncEngine` | `'comfortable'` |
| 10 | `backgroundId` (`'none' \| 'subtle-grid' \| 'warm-paper' \| 'royal-jaipur' \| 'deep-aurora'`) | *(No direct SSDS field)* -> `customColors.background` / `tokens.colors.background` | When `!== 'none'`, compute `blendedBackground` using `lib/theme.tsx` formula (`1 - opacity * (1 - overlay)`) and pass into SSDS `background` token override | Owned exclusively by `StoreProvider` | `StoreProvider` + `AccountSyncEngine` | `'none'` (use preset `background`) |
| 11 | `backgroundOpacity` (`10`–`100`, default `100`) | *(No direct SSDS field)* -> `blendedBackground` alpha | Combined with `backgroundId` & `overlayIntensity` in bridge | Owned exclusively by `StoreProvider` | `StoreProvider` + `AccountSyncEngine` | `100` |
| 12 | `overlayIntensity` (`0`–`85`, default `0`) | *(No direct SSDS field)* -> `blendedBackground` alpha | Combined with `backgroundId` & `backgroundOpacity` in bridge | Owned exclusively by `StoreProvider` | `StoreProvider` + `AccountSyncEngine` | `0` |

---

## 3. Data Flow Architecture

```mermaid
flowchart LR
  S["StoreProvider (lib/store.tsx)"] -->|settings| B["Bridge (lib/ssdsThemeBridge.tsx)"]
  S <-->|account_sync_documents| A["AccountSyncEngine (lib/sync/)"]
  B -->|derived props| LT["Legacy ThemeProvider (lib/theme.tsx)"]
  B -->|controlled AppearanceConfig| ST["SSDS ThemeProvider (no AsyncStorage)"]
  LT -->|useTheme()| LC["54 Legacy Consumers"]
  ST -->|useSSDSTheme()| SC["Migrated SSDS Screens"]
  SC -->|updateAppearance patch| B
  B -->|dispatch settings| S
```

---

## 4. Critical Validation Checks

### Check 1: Can SSDS `ThemeProvider` operate without independent `AsyncStorage` writes?
- **Current State:** **No, not without a small Phase 1 enhancement.** Currently `ThemeProvider.tsx` unconditionally runs `AsyncStorage.getItem(STORAGE_KEY_APPEARANCE)` on mount (L189–192) and `AsyncStorage.setItem(STORAGE_KEY_APPEARANCE, ...)` on every `appearance` change after `isHydrated` (L230–235), plus `STORAGE_KEY_PRESETS` on `saveCustomPreset`/`deleteCustomPreset`.
- **Required Bridge Contract:** Add optional `controlledAppearance?: Partial<AppearanceConfig>`, `onAppearanceChange?: (patch: Partial<AppearanceConfig>) => void`, and `disablePersistence?: boolean` props to SSDS `ThemeProvider` in Phase 1 so `App.tsx` disables SSDS `AsyncStorage` reads/writes while preserving standalone persistence for non-Study-Sakha usage.

### Check 2: Every Path That Could Create Duplicate Theme State
1. **Unscoped `ssds_appearance_v1` in `AsyncStorage`:** Would overwrite or diverge from `StoreProvider`'s `sakha-store-v1:user:<id>` on account switch or cloud sync.
2. **Unscoped `ssds_custom_presets_v1` in `AsyncStorage`:** Custom presets saved via SSDS `saveCustomPreset` would not sync via `AccountSyncEngine` or clear on user sign-out.
3. **Dual `useState` inside SSDS `ThemeProvider`:** If `StoreProvider` updates `state.settings` (e.g., from Supabase Realtime sync) while SSDS `ThemeProvider` holds internal `useState<AppearanceConfig>`, the two states diverge unless synced via `controlledAppearance` or a `useEffect` that does not echo back.
4. **Pre-auth `sakha-theme-mode` (`lib/store.tsx` L2001–2005):** `StoreProvider` already persists `themeMode` separately for signed-out `SignIn`/`SignUp`; SSDS must not also read `ssds_appearance_v1` before sign-in.

### Check 3: How `system` / `light` / `dark` Mode Is Resolved
- Both `lib/theme.tsx` (`resolveThemeScheme`) and SSDS `src/theme/themes/system.ts` (`resolveThemeMode`) use identical logic:
  - `'system'` -> `useColorScheme() === 'dark' ? 'dark' : 'light'` (treating `'unspecified'` / `null` / `undefined` as `'light'`).
  - `'light'` -> `'light'`, `'dark'` -> `'dark'`.
- `app.json` sets `"userInterfaceStyle": "automatic"`, and both `lib/store.tsx` and SSDS `DEFAULT_APPEARANCE` default `themeMode` to `'system'`.

### Check 4: Preserving Custom Wallpaper & High Contrast
- **`highContrast`:** SSDS `AppearanceConfig` has no `highContrast` boolean. The bridge must pass `borderIntensity: 'strong'` when `highContrast === true` AND apply a post-preset `ColorTokens` override (`border: isDark ? '#94a3b8' : '#334155'`) matching `lib/theme.tsx` L287.
- **Custom Wallpaper (`backgroundId`, `backgroundOpacity`, `overlayIntensity`):** SSDS has no wallpaper blending tokens. When `backgroundId !== 'none'`, the bridge must compute `blendedBackground` using `lib/theme.tsx` L269–276 (`rgba(12,18,32, alpha)` in dark / `rgba(242,242,247, alpha)` in light) and inject it into `tokens.colors.background` (or `customColors.background`) so screen containers remain translucent over the user's wallpaper.

### Check 5: Keeping Existing `useTheme()` Consumers Compatible
- **54 files** import `{ useTheme }` from `lib/theme.tsx`.
- During Phases 1–6, `lib/theme.tsx` remains mounted and untouched. SSDS `ThemeProvider` is exposed via `lib/ssdsThemeBridge.tsx` as `SSDSThemeProvider` / `useSSDSTheme` (or `@ssds` barrel), preventing any breaking change to the 54 existing consumers.

### Check 6: `BottomSheet` API Adapter Behavior (`isOpen`/`isDark` vs `open`/`title`)
- Legacy `components/BottomSheet.tsx` props: `{ isOpen: boolean; onClose: () => void; isDark: boolean; children: React.ReactNode }` (with `PanResponder` swipe-to-dismiss).
- SSDS `BottomSheet.tsx` props: `{ open: boolean; onClose: () => void; title?: string; children?: React.ReactNode }` (uses `Modal animationType="slide"`, reads `isDark` from SSDS `useTheme()`).
- **Adapter Rule:** Keep `components/BottomSheet.tsx` intact for its 7 existing consumers (`ChairDetailBottomSheet.tsx`, etc.). If a shared adapter is needed during migration, map `isOpen -> open` and drop `isDark` (derived from `SSDSThemeProvider`), noting that SSDS `BottomSheet` does not support swipe-down-to-dismiss without a future gesture enhancement.

### Check 7: Missing Devanagari Font Dependencies & Android Configuration
- **Font Package:** `@expo-google-fonts/noto-sans-devanagari` is **not installed** in `package.json`. `App.tsx` only loads `@expo-google-fonts/inter` (`400`–`800`) on native (web injects a Google Fonts `<link>` including `Noto Sans Devanagari`).
- **Android Behavior:** SSDS `typography.ts` safely falls back to `'sans-serif'` on Android (supporting `400`–`700` weights and system Devanagari glyph fallback). If explicit bundled Devanagari fonts are required on Android in the future, install `@expo-google-fonts/noto-sans-devanagari`, load it in `App.tsx` `useFonts()`, and pass it via `FontFamilyOverrides`.

---

## 5. Edge Cases & Acceptance Criteria

### Edge Cases
- **Sign-out / Account Switch:** `StoreProvider` resets `state.settings` to defaults or the next user's stored settings; the bridge must immediately propagate that reset to SSDS `ThemeProvider` with zero stale `ssds_appearance_v1` leakage.
- **Remote Sync Update (`AccountSyncEngine`):** When `settings` arrive from Supabase Realtime, `StoreProvider` updates `state.settings` -> bridge updates SSDS `ThemeProvider` without triggering a redundant `settings` dispatch back to `StoreProvider`.
- **Invalid `customAccentHex`:** If `customAccentHex` is malformed, fall back to `accentColor` preset (`'classic'` for `'indigo'`).

### Contract Acceptance Criteria
1. SSDS `ThemeProvider` performs **zero** `AsyncStorage` reads/writes when mounted inside Study Sakha's `Themed` wrapper.
2. All 12 `StoreProvider` `settings` fields produce deterministic, matching visual state in both `lib/theme.tsx` and SSDS `ThemeProvider`.
3. `highContrast` and `backgroundId`/`backgroundOpacity`/`overlayIntensity` continue functioning identically on both legacy and SSDS-migrated screens.
4. `pnpm run lint` and `pnpm run test:ci` pass with zero regressions, followed by physical Android device verification in Phase 7.
