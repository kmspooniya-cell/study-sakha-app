# Study Sakha — Design System Integration Blueprint

**Date:** 2026-11-28  
**Target Package:** `study-sakha-design-system-native/` (69 TypeScript/TSX modules)  
**Target Application:** Study Sakha (`App.tsx`, Expo SDK `~57.0.31`, React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3`)  
**Status:** Planning & Architecture Blueprint Only (Zero code changes performed)

---

## 1. Executive Architecture Overview

### Existing Study Sakha UI & State Architecture
- **Root Entry (`App.tsx`):** Wraps the app in `<GestureHandlerRootView>` -> `<SafeAreaProvider>` -> `<StoreProvider>` -> `<Themed />` -> `<FocusSessionProvider>` -> `<NavigationContainer>`.
- **Theme Engine (`lib/theme.tsx`):** A stateless, props-driven `ThemeProvider` receiving 12 settings from `StoreProvider` (`state.settings`) inside `App.tsx`: `mode`, `textScale`, `accentColor`, `customAccentHex`, `highContrast`, `reduceMotion`, `animationIntensity`, `displayScaling`, `layoutDensity`, `backgroundId`, `backgroundOpacity`, `overlayIntensity`. Currently imported by **54 files** across `screens/`, `components/`, and `App.tsx`.
- **Legacy UI Primitives (`components/ui.tsx` & `components/BottomSheet.tsx`):** `components/ui.tsx` exports 21 shared components (`Card`, `StitchCard`, `Txt`, `Button`, `Chip`, `Tag`, `SectionHeader`, `EmptyState`, `Skeleton`, `ProgressRing`, `ProgressBar`, `Field`, `Avatar`, `IconButton`, `Divider`, `PressableCard`, `StatCard`, `ListRow`, `FilterBar`, `ModalSheet`, `ConfirmDialog`, `InlineBanner`, `AsyncState`), currently imported by **18 files**. `components/BottomSheet.tsx` is referenced by **7 files**.
- **Persistence & Sync (`lib/store.tsx` + `lib/sync/syncEngine.ts`):** `StoreProvider` persists user-scoped state in `AsyncStorage` (`sakha-store-v1:user:<encodedUserId>`) and syncs `settings.<key>` fields to Supabase `account_sync_documents` via `AccountSyncEngine`.

### New Design System (`study-sakha-design-system-native/`)
- **Theme Engine (`src/theme/ThemeProvider.tsx`):** Self-contained `ThemeProvider` with 49 `ColorTokens`, 7 `THEME_PRESETS`, `spacing`, `radius`, `shadows`, `dimensions`, `motion`, `icons`, `typography`, plus `showToast`/`showSnackbar` and internal `AsyncStorage` persistence (`ssds_appearance_v1`, `ssds_custom_presets_v1`).
- **UI Layers:** 42 components across 10 categories (`src/components/`), 4 patterns (`src/patterns/`), and 4 screen templates (`src/templates/`).

---

## 2. Required Technical Analysis

### 2.1 ThemeProvider Compatibility & Theme State Ownership
- **Conflict:** `lib/theme.tsx` and `study-sakha-design-system-native/src/theme/ThemeProvider.tsx` both export `ThemeProvider`, `useTheme`, and `ThemeMode` with incompatible context shapes (`{ mode, scheme, colors, textScale, f, reduceMotion, animationIntensity, layoutDensity }` vs. `{ tokens, appearance, isHydrated, updateAppearance, ..., showToast, showSnackbar }`).
- **Ownership Rule:** `StoreProvider` + `AccountSyncEngine` **must remain the single source of truth** for user appearance settings so cross-device Supabase sync and existing `SettingsScreen` controls continue working without regression.
- **Bridge Design:** Mount SSDS `ThemeProvider` (aliased as `SSDSThemeProvider` or bridged via a new `lib/ssdsThemeBridge.tsx`) *inside* `StoreProvider` and sync `state.settings` -> SSDS `AppearanceConfig` via controlled props or `updateAppearance` synchronization, disabling SSDS's standalone `AsyncStorage` writes when managed by `StoreProvider`.

### 2.2 Mapping Existing `StoreProvider` Settings to SSDS `ThemeProvider`
| `StoreProvider` (`state.settings`) | SSDS `AppearanceConfig` | Mapping / Notes |
| --- | --- | --- |
| `themeMode` (`'light' \| 'dark' \| 'system'`) | `themeMode` | 1:1 match |
| `textScale` (`0.8`–`1.4`) & `displayScaling` (`%`) | `typographyScale` | `textScale * (displayScaling / 100)` |
| `accentColor` & `customAccentHex` | `presetId` & `customColors` | Map `accentColor` to nearest `ThemePreset` (`'classic'`/`'ocean'`/`'forest'` etc.) or `'custom'` with `{ primary: customAccentHex }` when `customAccentHex` is set |
| `reduceMotion` | `reduceMotion` | 1:1 match |
| `animationIntensity` (`'minimal' \| 'balanced' \| 'rich'`) | `animationIntensity` (`'none' \| 'subtle' \| 'standard'`) | Map `'minimal' -> 'subtle'` (or `'none'`), `'balanced' -> 'standard'`, `'rich' -> 'standard'` |
| `layoutDensity` (`'compact' \| 'comfortable'`) | `density` | 1:1 match (SSDS also supports `'spacious'`) |
| `highContrast` | *(No direct SSDS flag)* | **Unresolved gap:** Bridge must force `borderIntensity: 'strong'` and/or higher-contrast `textSecondary`/`border` overrides when `highContrast === true` |
| `backgroundId`, `backgroundOpacity`, `overlayIntensity` | *(No direct SSDS flag)* | **Unresolved gap:** Study Sakha custom screen wallpapers/opacity (`lib/theme.tsx` L269–276) have no equivalent in SSDS `ColorTokens`; bridge must preserve `blendedBackground` on `colors.background` when a custom wallpaper is active |

### 2.3 Component Naming Collision & Alias Strategy
Direct symbol collisions exist between `components/ui.tsx` / `components/BottomSheet.tsx` and `study-sakha-design-system-native/src/components/`:
- **Colliding names:** `Button`, `SectionHeader`, `EmptyState`, `Skeleton`, `ProgressBar`, `Avatar`, `IconButton`, `Divider`, `BottomSheet`, plus `ThemeProvider`, `useTheme`, `ThemeMode`.
- **Strategy:** Never perform a big-bang rename of `components/ui.tsx` (which breaks 18+ files). Instead:
  1. Import SSDS components from a dedicated barrel/alias (e.g., `@ssds` or `../study-sakha-design-system-native/src`) or re-export with `SSDS*` aliases in `lib/ssds.ts` during transition.
  2. Migrate screens one by one; only deprecate `components/ui.tsx` exports after all 18 consumers are migrated and verified.

### 2.4 `BottomSheet` Compatibility
- Legacy `components/BottomSheet.tsx` uses `{ isOpen: boolean, onClose, isDark: boolean, children }` with animated `translateY` + `PanResponder` swipe-to-dismiss.
- SSDS `BottomSheet.tsx` uses `{ open: boolean, onClose, title?: string, children }` with `Modal animationType="slide"` and `useTheme()`.
- **Impact:** Incompatible prop names (`isOpen` vs `open`, `isDark` removed) and swipe-to-dismiss behavior difference. Keep `components/BottomSheet.tsx` intact for the 7 existing consumers (e.g., `ChairDetailBottomSheet.tsx`) and adopt SSDS `BottomSheet` only in newly migrated screens or via a thin wrapper.

### 2.5 Safe-Area & Navigation Integration
- `App.tsx` already mounts `<SafeAreaProvider>` at the root, satisfying SSDS `ScreenContainer`, `ScreenHeader`, `PageLayout`, `BottomBar`, `BottomSheet`, and `ThemeProvider`.
- **Android Back Policy (`lib/navigation.ts`):** `getAndroidBackTarget` and React Navigation's `NativeStack` / `Drawer` remain authoritative. SSDS `AppHeader` / `ScreenHeader` / `BottomBar` are router-agnostic and must receive `navigation.goBack()` / route callbacks from screens rather than replacing `@react-navigation/*`.
- **`ActiveSessionBar` (`App.tsx` L499):** Renders globally above screens; ensure SSDS `ThemeProvider` toast/snackbar `zIndex` (`9998`/`9999`) and `BottomBar` insets do not collide visually with `ActiveSessionBar` or `FloatingFocusBar`.

### 2.6 Typography, Icons, Fonts & Asset Requirements
- **Fonts:** `App.tsx` loads `Inter_400Regular` through `Inter_800ExtraBold` via `@expo-google-fonts/inter`, while SSDS `typography.ts` defaults to platform `'System'`/`'sans-serif'`. During Phase 1, pass `Inter` font family names via `FontFamilyOverrides` (or keep `'sans-serif'` on Android for Hindi fallback) and evaluate installing `@expo-google-fonts/noto-sans-devanagari` if explicit Devanagari font bundling is required on Android.
- **Icons:** Both Study Sakha (`lucide-react-native: ^1.77.0`) and SSDS use `lucide-react-native` (`Icon.tsx` takes `LucideIcon`). Legacy screens using `@expo/vector-icons/Ionicons` can coexist without conflict.

### 2.7 `AsyncStorage` Ownership & Persistence Conflicts
- Legacy `StoreProvider` stores `sakha-store-v1:user:<encodedUserId>` (account-scoped) and `sakha-theme-mode` (for pre-auth fallback).
- SSDS `ThemeProvider` stores unscoped `ssds_appearance_v1` and `ssds_custom_presets_v1`.
- **Conflict:** Unscoped SSDS `AsyncStorage` keys would leak theme state across user sign-out/account switches and fight `StoreProvider` hydration.
- **Resolution:** In Phase 1, add an optional `controlledAppearance` / `disablePersistence` mode to the integration bridge so `StoreProvider` + `AccountSyncEngine` remain the sole persistence owners.

### 2.8 Dependency Compatibility (Expo SDK 57 / RN 0.86.3 / React 19.2.3)
All 6 runtime dependencies used by SSDS (`react 19.2.3`, `react-native 0.86.3`, `react-native-safe-area-context ~5.7.0`, `@react-native-async-storage/async-storage 2.2.0`, `lucide-react-native ^1.77.0`, `react-native-svg 15.15.4`) are **already installed at exact matching versions** in root `package.json`. Zero new packages are required for initial integration.

### 2.9 Import Strategy & Package Boundaries
- Configure `tsconfig.json` and `babel.config.js` (or relative imports / workspace path alias `@ssds/* -> ./study-sakha-design-system-native/src/*`) so Metro and `tsc --noEmit` resolve `study-sakha-design-system-native/src` cleanly.
- Keep `study-sakha-design-system-native/` free of any imports back into `lib/` or `screens/` (one-way dependency: App -> Bridge -> SSDS).

### 2.10 Rollback Strategy
- Because `lib/theme.tsx`, `components/ui.tsx`, and `components/BottomSheet.tsx` remain untouched during Phases 0–5, any regression in a migrated screen or phase can be rolled back per-file via `git checkout` or by toggling the screen's import back to `components/ui.tsx` / `lib/theme.tsx` without touching `StoreProvider`, navigation, or Supabase sync.

---

## 3. Phased Integration Plan

### Phase 0: Compatibility & Dependency Validation
- **Exact files to modify:** `tsconfig.json`, `babel.config.js` (if adding `@ssds` alias; verify Metro resolution).
- **Dependencies:** None.
- **Risks:** Root `tsconfig.json` `tsc --noEmit` may surface strict errors if Metro/Expo types differ from standalone `tsconfig.json`.
- **Acceptance criteria:** Root `pnpm run lint` (`tsc --noEmit`) and `pnpm run test:ci` pass with SSDS included in TypeScript scope.
- **Verification commands:** `pnpm run lint && pnpm run test:ci`
- **Rollback strategy:** Revert `tsconfig.json` / `babel.config.js` alias changes.

### Phase 1: Theme Infrastructure Integration
- **Exact files to modify:** Create `lib/ssdsThemeBridge.tsx` (adapter bridging `StoreProvider` `state.settings` to SSDS `ThemeProvider` without `ssds_appearance_v1` `AsyncStorage` conflict); update `App.tsx` (`Themed` component) to mount the bridged `SSDSThemeProvider` alongside legacy `ThemeProvider` (`lib/theme.tsx`).
- **Dependencies:** Phase 0.
- **Risks:** `highContrast` and custom `backgroundId`/`backgroundOpacity` parity; toast/snackbar `zIndex` interaction with `ActiveSessionBar`.
- **Acceptance criteria:** Both `useTheme()` (legacy) and `useSSDSTheme()` work simultaneously in `App.tsx`; toggling theme/accent/textScale/reduceMotion in `SettingsScreen` updates both providers and syncs via `AccountSyncEngine`.
- **Verification commands:** `pnpm run lint && pnpm run test:ci` + manual theme toggle smoke test.
- **Rollback strategy:** Remove `SSDSThemeProvider` wrapper from `App.tsx` `Themed` and delete `lib/ssdsThemeBridge.tsx`.

### Phase 2: Foundation Components
- **Exact files to modify:** Pilot adoption in 1–2 low-risk screens (e.g., `screens/AppGuideScreen.tsx`, `screens/MoreScreen.tsx`) replacing `Txt` / `Divider` / `Card` with SSDS `Text`, `Icon`, `Divider`, `Surface`, `Spacer`.
- **Dependencies:** Phase 1.
- **Risks:** Typography size/lineHeight differences between legacy `lib/theme.tsx` `f()` and SSDS `TypographyVariant` specs.
- **Acceptance criteria:** Visual parity verified on web/simulator; `hindi` prop renders Devanagari cleanly.
- **Verification commands:** `pnpm run lint && pnpm run test:ci`
- **Rollback strategy:** Revert pilot screen imports back to `components/ui.tsx`.

### Phase 3: Buttons, Forms & Overlays
- **Exact files to modify:** Incremental adoption in form/dialog screens (e.g., `screens/SignInScreen.tsx`, `screens/SignUpScreen.tsx`, `screens/SettingsScreen.tsx`) using SSDS `Button`, `IconButton`, `TextInput`, `Select`, `Switch`, `Checkbox`, `Radio`, `Slider`, `Dialog`, `BottomSheet`.
- **Dependencies:** Phase 2.
- **Risks:** `BottomSheet` prop mismatch (`isOpen` vs `open`), `Dialog` TalkBack modal focus trapping, `KeyboardAvoidingView` behavior with `FormScreen`/`TextInput`.
- **Acceptance criteria:** All auth/settings form validations, password toggles, and modal dismissals (including Android hardware back) function without regression.
- **Verification commands:** `pnpm run lint && pnpm run test:ci`
- **Rollback strategy:** Revert individual screen commits; keep `components/BottomSheet.tsx` and `components/ui.tsx` intact.

### Phase 4: Layout, Navigation & Data-Display Components
- **Exact files to modify:** Adopt `ScreenContainer`, `ScreenHeader`, `SectionHeader`, `PageLayout`, `TabBar`, `ProgressBar`, `CircularProgress`, `ListItem`, `StatItem`, `Badge`, `Avatar`, `Thumbnail` in content screens (e.g., `screens/StatisticsScreen.tsx`, `screens/ProfileScreen.tsx`, `screens/LibraryScreen.tsx`).
- **Dependencies:** Phase 3.
- **Risks:** `CircularProgress` `<Circle rotation="-90" />` rendering on Android `react-native-svg`; `ScreenHeader` safe-area double-padding if wrapped inside React Navigation headers (keep `headerShown: false`).
- **Acceptance criteria:** Progress rings, stats cards, and list rows render without clipping across light/dark modes and `textScale` `0.85`–`1.35`.
- **Verification commands:** `pnpm run lint && pnpm run test:ci`
- **Rollback strategy:** Revert migrated screen files individually.

### Phase 5: Patterns & Screen Templates
- **Exact files to modify:** Adopt `SearchFilterPattern`, `SectionPattern`, `EmptyContentPattern`, `ConfirmationPattern`, `StandardScreen`, `ListingScreen`, `DetailScreen`, `FormScreen` in `screens/SearchScreen.tsx`, `screens/CurrentAffairsScreen.tsx`, `screens/PYQScreen.tsx`.
- **Dependencies:** Phase 4.
- **Risks:** `ListingScreen` `FlatList` performance on large PYQ/library datasets; `FormScreen` footer keyboard behavior on Android.
- **Acceptance criteria:** Pull-to-refresh, search/category filtering, empty/error states, and confirmation dialogs work end-to-end.
- **Verification commands:** `pnpm run lint && pnpm run test:ci`
- **Rollback strategy:** Revert screen template usage to `ScreenContainer` + `FlatList`.

### Phase 6: Existing Screen Migration & Legacy Cleanup
- **Exact files to modify:** Remaining screens (`DashboardScreen.tsx`, `FocusCenterScreen.tsx`, `GroupsScreen.tsx`, `StudyPlannerScreen.tsx`, `TestsScreen.tsx`, `SakhaAIScreen.tsx`, `AdminScreen.tsx`, etc.); gradually retire unused exports in `components/ui.tsx` and `lib/theme.tsx` once consumer count reaches `0`.
- **Dependencies:** Phase 5.
- **Risks:** Complex domain screens (`DashboardScreen`, `FocusCenterScreen`, `VirtualStudyHall`) have custom Skia/Reanimated/chart styling that should not be forced into generic templates.
- **Acceptance criteria:** Zero remaining consumers of deprecated `components/ui.tsx` primitives; all 34+ Jest test suites updated and passing.
- **Verification commands:** `pnpm run lint && pnpm run test:ci && pnpm run build:web`
- **Rollback strategy:** Migrate in per-screen PRs so any single screen can be reverted independently.

### Phase 7: Full Regression & Android Device Testing
- **Exact files to modify:** Test suites in `test/` and Maestro flows in `.maestro/` as needed for updated `testID`s / accessibility labels.
- **Dependencies:** Phase 6 (or executed as a gate at the end of each screen batch).
- **Risks:** Untested Android-only behaviors (TalkBack modal focus, Devanagari bold weights, `CircularProgress` rotation, dashed borders, `KeyboardAvoidingView` + `softwareKeyboardLayoutMode: "resize"`).
- **Acceptance criteria:**
  - `pnpm run lint`, `pnpm run test:ci`, `pnpm exec expo lint`, `pnpm run build:web` all pass.
  - Physical/emulator Android APK (`eas build` / `expo run:android`) passes manual & Maestro E2E checks across light/dark/system, Hindi/English, TalkBack, and landscape/notch layouts.
- **Verification commands:** `pnpm run lint && pnpm run test:ci && pnpm exec expo lint && pnpm run build:web` (plus Maestro / physical Android device testing).
- **Rollback strategy:** Hold release tag; revert offending screen PRs prior to EAS production build.
