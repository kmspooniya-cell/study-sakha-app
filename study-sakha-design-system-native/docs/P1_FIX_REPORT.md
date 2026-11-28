# Study Sakha Design System v1.0 — P1 Fix Report

**Date:** 2026-11-28  
**Package:** `study-sakha-design-system-native/`  
**Scope:** Resolution of the 5 code-level P1 findings from `docs/TECHNICAL_REVIEW.md` without modifying the existing Study Sakha application.

---

## Summary

- **Code-level P1 issues targeted:** 5
- **Code-level P1 issues fixed:** 5
- **Files modified (5):**
  1. `study-sakha-design-system-native/src/theme/ThemeProvider.tsx`
  2. `study-sakha-design-system-native/src/theme/tokens/typography.ts`
  3. `study-sakha-design-system-native/src/components/forms/Slider.tsx`
  4. `study-sakha-design-system-native/src/components/forms/Switch.tsx`
  5. `study-sakha-design-system-native/src/components/media/Thumbnail.tsx`
- **Documentation updated/created:**
  - Updated `study-sakha-design-system-native/docs/TECHNICAL_REVIEW.md` (`P1 FIX IMPLEMENTATION STATUS` section)
  - Created `study-sakha-design-system-native/docs/P1_FIX_REPORT.md`
- **Root Study Sakha application files modified:** None (`App.tsx`, `lib/theme.tsx`, `components/ui.tsx`, `package.json`, lockfiles, and all app screens remain untouched).

---

## Fix Details

### 1. `ThemeProvider.tsx` — Safe Area & Timer Lifecycle
- **A. Safe Area:** Replaced `useSafeAreaInsets()` with `useContext(SafeAreaInsetsContext) ?? ZERO_INSETS` (`{ top: 0, right: 0, bottom: 0, left: 0 }`). `ThemeProvider` no longer crashes if mounted outside `SafeAreaProvider`, while preserving full safe-area inset support when `SafeAreaProvider` is present.
- **B. Timer Cleanup:** Added `isMountedRef` and `toastTimersRef` (`Map<number, ReturnType<typeof setTimeout>>`), plus `dismissToast` and `dismissSnackbar` helpers. Cleared evicted toast timers, cleared active snackbar timers on replacement/dismissal, and cleared all pending toast/snackbar timers on provider unmount.

### 2. `typography.ts` — Devanagari & Platform Font Fallbacks
- Removed the unloaded `'NotoSansDevanagari_400Regular'` string from `resolveFontFamilies`.
- Set Android default sans and Hindi fallback to `'sans-serif'` (supporting `400`–`700` weights and Android system Devanagari fallback) and iOS Hindi fallback to `'Devanagari Sangam MN'`.
- Added `FontFamilyOverrides` optional parameter to `resolveFontFamilies(fontStyle, overrides?)` so consuming apps that load custom fonts (e.g. `@expo-google-fonts/noto-sans-devanagari`) can inject them explicitly without breaking standalone usage.

### 3. `Slider.tsx` — Accessibility Actions & Touch Target
- Added `accessible`, `accessibilityState={{ disabled }}`, `accessibilityActions` (`increment`, `decrement`), and `onAccessibilityAction` respecting `step`, `min`, and `max` with boundary clamping.
- Expanded `styles.touchArea` height from `36` to `44` dp while preserving existing visual track/thumb dimensions and `PanResponder` drag behavior.

### 4. `Switch.tsx` — Full-Row Pressable Interaction
- Moved `Pressable` from the inner `track` to the outer row container with `minHeight: 44`, `hitSlop={10}`, `accessibilityRole="switch"`, `accessibilityLabel={label}`, and `accessibilityState={{ checked, disabled }}`.
- Converted the inner track to a plain `View` so tapping either the label/description or the track toggles the switch once without duplicate callbacks.

### 5. `Thumbnail.tsx` — Image Style Typing & Error Reset
- Wrapped `<Image>` in a `<View>` that receives `style`, border, `borderRadius`, `aspectRatio`, and `overflow: 'hidden'`, removing the unsafe `style as never` cast.
- Computed a stable `sourceKey` from `source` and added a `useEffect` that resets `imgError` to `false` when `sourceKey` changes (only updating state when `imgError` is `true`).

---

## Validation Results

| Check | Status | Details |
| --- | --- | --- |
| **Package-scoped TypeScript (`tsc`)** | Passed (0 errors) | Executed `pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit` after all 5 fixes. |
| **Git diff / scope check** | Passed | `git status --short study-sakha-design-system-native/` confirmed only the 5 target source files + docs were touched. |
| **Unit Tests** | Not Executed | No unit test suite exists in `study-sakha-design-system-native/`. |
| **Android / Runtime Verification** | Not Verified | Not executed in this task; requires integration or standalone Expo/Android device testing. |

---

## Remaining Blockers Before Integration
1. **Integration Adapter (Architectural P1 #6):** Bridge SSDS `ThemeProvider` / colliding component names (`ThemeProvider`, `useTheme`, `Button`, `SectionHeader`, `EmptyState`, `Skeleton`, `ProgressBar`, `Avatar`, `IconButton`, `Divider`, `BottomSheet`) with Study Sakha's `lib/theme.tsx` and `StoreProvider`.
2. **Runtime & Android Device Testing:** Verify TalkBack (`Slider` adjustable actions, `Switch` row toggle), `Thumbnail` error recovery, `ThemeProvider` toast/snackbar timers, and Hindi/Devanagari rendering on Android.
