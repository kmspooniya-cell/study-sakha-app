# Study Sakha Design System v1.0 — Comprehensive Technical Review

**Package Path:** `study-sakha-design-system-native/`  
**Target Runtime:** Expo SDK 57 (`~57.0.31`) / React Native `0.86.3` / React `19.2.3` / TypeScript (`strict: true`)  
**Review Scope:** Static architectural, TypeScript, React Native/Android compatibility, accessibility, dependency, and integration readiness inspection (read-only; zero source modifications performed).

---

## 1. Executive Summary

The extracted `study-sakha-design-system-native/` package is a well-organized, self-contained React Native design system comprising **69 TypeScript/TSX modules** across five batches: design tokens and theme infrastructure (`src/theme/`), 40+ UI components across 10 categories (`src/components/`), 4 interaction patterns (`src/patterns/`), 4 screen templates (`src/templates/`), and 4 public barrel files.

A package-scoped TypeScript check (`pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit`) with `strict: true` completed with **0 errors** against the workspace dependencies. Static inspection confirms **zero browser-only DOM/web leaks** (`window`, `document`, `localStorage`, `HTMLElement`, `onClick`, `className` are absent). All internal relative imports resolve cleanly.

However, the package is **not yet ready for direct drop-in production integration** without targeted fixes and an explicit integration adapter:
1. **No runtime, Jest, or Android device tests** have been executed on the extracted modules.
2. **Several P1 (High) issues** exist around `ThemeProvider` safe-area coupling and timer cleanup, missing Devanagari font package vs. hardcoded `'NotoSansDevanagari_400Regular'`, accessibility gaps (`Slider` missing `accessibilityActions`, `Switch` track-only press target), unsafe `Thumbnail` `style as never` cast, and **direct symbol/architecture collisions** with Study Sakha's existing `lib/theme.tsx`, `components/ui.tsx`, and `StoreProvider`-backed theme persistence.
3. **Several P2/P3 polish items** affect touch target sizes (`< 44dp` on `Checkbox`, `Radio`, `SegmentedControl`, `TabBar`, and icon close buttons), hardcoded font sizes/colors bypassing tokens, duplicated `Toast`/`Snackbar` rendering in `ThemeProvider.tsx`, and `Animated.View` wrapper style forwarding in `Button`/`FloatingButton`.

---

## 2. Package Structure Assessment

### Verification Summary
- **Batch coverage:** All 5 batches documented in `docs/CONVERSION_MANIFEST.md` are present.
- **Module count:** Exactly **69** `.ts`/`.tsx` source modules exist under `study-sakha-design-system-native/src/`.
- **Folder organization:** Logical separation into `src/theme/{tokens,themes}`, `src/components/{foundation,buttons,cards,layout,forms,feedback,navigation,data-display,overlays,media}`, `src/patterns/`, and `src/templates/`.
- **Naming conventions:** Consistent PascalCase for component/pattern/template files and camelCase for token/theme utility files.
- **Export structure:** Root barrel `src/index.ts` re-exports `./theme`, `./components`, `./patterns`, and `./templates`. Each category has a clean `index.ts`.
- **Package manifest:** Intentionally omitted (`package.json` does not exist inside `study-sakha-design-system-native/`) as this is an extracted source package; future workspace or npm consumption will require a `package.json` with explicit `peerDependencies` or direct source aliasing.
- **Duplication:** One notable functional duplication exists between `src/theme/ThemeProvider.tsx` (`NativeToastItem` and inline snackbar JSX) and `src/components/feedback/Toast.tsx` / `src/components/feedback/Snackbar.tsx`.

---

## 3. Design Token Assessment

Inspected all 8 token files in `src/theme/tokens/`:

| File | Assessment | Notes |
| --- | --- | --- |
| `colors.ts` | Strong | 49 semantic tokens in `ColorTokens`, 7 curated `THEME_PRESETS` with light/dark parity, `CustomColorOverrides`, and `hexToRgba` helper. |
| `typography.ts` | Good with P1 caveat | 21 semantic `TypographyVariant` specs, `resolveFontFamilies`, and `resolveTypographyStyle` with `hindi` line-height/padding support. Hardcodes `'NotoSansDevanagari_400Regular'` without checking font availability. |
| `spacing.ts` | Strong | `SPACING_SCALE` (`2`–`64`) + semantic tokens (`screenPadding`, `sectionSpacing`, `cardPadding`, etc.) scaled by `ContentDensity` (`compact` `0.8x`, `comfortable` `1x`, `spacious` `1.2x`). |
| `radius.ts` | Strong | `RADIUS_SCALE` (`none` to `full`) scaled by `RadiusMode` (`sharp` `0.5x`, `default` `1x`, `soft` `1.35x`). |
| `shadows.ts` | Good | `elevation0`–`elevation5` with `Platform.select` separating Android `elevation`/`shadowColor` and iOS `shadowOffset`/`shadowOpacity`/`shadowRadius`, scaled by `ShadowIntensity`. |
| `dimensions.ts` | Good | Centralized `DIMENSIONS` constants + `useResponsiveLayout()` hook using `useWindowDimensions()`. |
| `motion.ts` | Good | `buildMotionTokens` computes durations (`120`/`200`/`320`ms), `Easing.bezier`, `pressScale`, and `reducedMotion`. |
| `icons.ts` | Strong | `ICON_TOKENS` (`iconXS`: 14 through `icon2XL`: 44, `iconStrokeWidth`: 1.75) and `IconSizeKey`. |

### Key Token Observations
- **Light/Dark parity:** `BASE_LIGHT_COLORS` and `BASE_DARK_COLORS` implement all 49 `ColorTokens` keys.
- **Missing semantic tokens:** No dedicated `backdrop` / `scrim` token (modals hardcode `'rgba(10, 15, 25, 0.52)'` / `'rgba(10, 15, 25, 0.5)'`), and no `snackbarBackground` / `snackbarText` / `snackbarAction` tokens (leading to hardcoded `#182230`, `#FFFFFF`, `#94A3B8`, `#7AA8EE` in `Snackbar.tsx` and `ThemeProvider.tsx`).
- **Preset override behavior:** In `ThemeProvider.tsx` (lines 273–281), non-custom presets overwrite `colors.brandGradientEnd = colors.secondary`, discarding `BASE_LIGHT_COLORS.brandGradientEnd` (`#3D649E`) and `BASE_DARK_COLORS.brandGradientEnd` (`#2B4C7E`).
- **Custom color overrides:** When `presetId === 'custom'`, `colors.primaryDark` is set to `c.primary` (not darkened), and `textInverse` is not recalculated against custom `primary` luminance.

---

## 4. Theme Architecture Assessment

Inspected `light.ts`, `dark.ts`, `system.ts`, and `ThemeProvider.tsx`:

- **Context & Hook:** `ThemeProvider` exposes `tokens`, `appearance`, `isHydrated`, `updateAppearance`, `resetCurrentTheme`, `restoreDefaultAppearance`, `savedPresets`, `saveCustomPreset`, `deleteCustomPreset`, `showToast`, and `showSnackbar`. `useTheme()` throws if called outside `ThemeProvider`.
- **Theme Resolution:** `resolveThemeMode(preference, systemScheme)` maps `'system'` via `useColorScheme()` (`'dark'` -> `'dark'`, otherwise `'light'`).
- **Default Theme:** `DEFAULT_APPEARANCE.themeMode` is `'light'` (not `'system'`), `presetId` is `'classic'`.
- **Persistence:** Hydrates from `AsyncStorage` (`ssds_appearance_v1`, `ssds_custom_presets_v1`) asynchronously; `isHydrated` starts `false`. On initial mount before hydration completes, components render with `DEFAULT_APPEARANCE` (potential light-to-dark flash if persisted mode is dark — inferred from async `useEffect` pattern, not runtime-verified).
- **OS Reduce Motion:** Subscribes to `AccessibilityInfo.isReduceMotionEnabled()` and `'reduceMotionChanged'` event with proper `sub.remove()` cleanup.
- **Provider Lifecycle Risks:**
  - `useSafeAreaInsets()` is called unconditionally inside `ThemeProvider` (line 174). Mounting `ThemeProvider` without an ancestor `SafeAreaProvider` will throw at runtime.
  - `showToast` and `showSnackbar` schedule `setTimeout` callbacks; `snackbarTimerRef` is cleared on subsequent `showSnackbar` calls, but **neither toast timers nor `snackbarTimerRef` are cleared on provider unmount**.

---

## 5. Component API Assessment

### Foundation (`src/components/foundation/`)
- **`Text.tsx`**: Extends `RNTextProps`. Supports `variant`, `color` (semantic key or raw string), `align`, `truncate`, `maxLines`, `mono`, `hindi`. Clean API.
- **`Icon.tsx`**: Wraps `LucideIcon` with `size` (`IconSizeKey | number`), `color`, `active`, `strokeWidth`, `style`. Returns `null` if `icon` is undefined.
- **`Divider.tsx`**: Supports `orientation` (`horizontal | vertical`), `variant` (`subtle | strong`), `inset`, `style`. Properly sets `accessible={false}`.
- **`Surface.tsx`**: Extends `ViewProps`. Variants `flat | elevated | outlined | filled | selected`, `padding`, `radius`.
- **`Spacer.tsx`**: `size` (`keyof SpacingTokens | number`), `horizontal`. Properly sets `accessible={false}` and `importantForAccessibility="no"`.

### Buttons (`src/components/buttons/`)
- **`Button.tsx`**: Variants `primary | secondary | tertiary | outline | ghost | text | destructive`; sizes `small | medium | large`; `leadingIcon`, `trailingIcon`, `fullWidth`, `loading`, `disabled`.
  - *Issues:* `style` is applied to inner `Pressable` while outer `Animated.View` has `alignSelf: 'flex-start'` (breaks `flex: 1` or margin passed via `style`). `RNText` has `numberOfLines={1}` without `flexShrink: 1`. `destructive` hardcodes `#A82929` and `#FFFFFF`.
- **`IconButton.tsx`**: Variants `ghost | primary | secondary | outline`; sizes `small | medium | large`; required `label` for `accessibilityLabel`; computes `hitSlop` to reach 44dp. Well-structured.
- **`FloatingButton.tsx`**: Same `Animated.View` outer wrapper `style` forwarding issue as `Button.tsx`.

### Cards (`src/components/cards/`)
- **`BaseCard.tsx`**: Wraps `Surface` (and `Pressable` when `interactive || onPress`). Does not forward `accessibilityLabel` when non-interactive.
- **`StatisticCard.tsx`**: Clean composition of `BaseCard`, `Text`, `Icon`, `Badge`. Scales compact `StatisticValue` font size by `tokens.typography.scale`.
- **`ProgressCard.tsx`**: Composes `BaseCard`, `Badge`, `ProgressBar`. Does not clamp `progress` in its own footer text (`${progress}%` can display `<0%` or `>100%` if out-of-range `progress` is passed).
- **`FeatureCard.tsx`**: Composes `BaseCard`, `Icon`, `Badge`. Hardcodes `fontSize: 13` on `actionText`, bypassing `tokens.typography.scale`.

### Layout (`src/components/layout/`)
- **`ScreenContainer.tsx`**: Uses `SafeAreaView` (`edges`), optional `ScrollView` or `View`, optional `KeyboardAvoidingView` (`behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`). Missing `keyboardVerticalOffset` and `refreshControl` pass-through.
- **`ScreenHeader.tsx`**: Calls `useSafeAreaInsets()` when `safeTop` is true (always called unconditionally). Good `accessibilityRole="header"` on title.
- **`SectionHeader.tsx`**: Supports `collapsible`, `collapsed`, `onToggleCollapse`, `actionLabel`, `accentIndicator`. *Issue:* When `collapsible` is true, both the title `Pressable` and the right `IconButton` trigger `onToggleCollapse`, creating duplicate screen-reader focus stops for one action.
- **`SectionContainer.tsx`**: Simple margin wrapper using `tokens.spacing.sectionSpacing`.
- **`PageLayout.tsx`**: Composes `header`, `ScreenContainer`, and safe-area-padded `footer`. Calls `useSafeAreaInsets()` unconditionally.

### Forms (`src/components/forms/`)
- **`TextInput.tsx`**: Supports `type` (`text | email | password | numeric`), `errorText`, `successText`, `helperText`, `required`, `disabled`, `readOnly`, `multiline`, `rows`, `leadingIcon`, `trailingIcon`.
  - *Issues:* Does not set `accessibilityLabel` on `RNTextInput` (so sibling `label` is not announced by TalkBack/VoiceOver); `multiline` `minHeight: rows * 22 + 20` does not scale with `tokens.typography.scale`; password toggle `hitSlop={8}` yields ~33x33 touch target (`< 44dp`); no `inputStyle` prop.
- **`SearchInput.tsx`**: Controlled `value` + `onChangeText` + `onClear`. Does not extend `RNTextInputProps` (cannot pass `autoFocus`, `onSubmitEditing`, `testID`, etc.) and lacks `accessibilityRole="search"`.
- **`Select.tsx`**: Modal-based picker with `FlatList`.
  - *Issues:* Missing `errorText` and `required` props (inconsistent with `TextInput`); `FlatList` applies `padding: 8` on `style` instead of `contentContainerStyle`; nested `Pressable` backdrop (`onPress={() => undefined}` on inner sheet) lacks `accessible={false}` on backdrop.
- **`Checkbox.tsx` & `Radio.tsx`**: `hitSlop={6}` on 20x20 indicator gives 32x32 touch target when no label is present (`< 44dp`); `accessibilityLabel` is `undefined` if `label` is omitted. `Checkbox` uses `onChange`, `Radio` uses `onPress`.
- **`Switch.tsx`**: `Pressable` wraps only the 44x24 track (`hitSlop={8}` -> 40dp height `< 44dp`), not the label/row; hardcodes `elevation: 1` and `#FFFFFF` on thumb.
- **`SegmentedControl.tsx`**: Generic `T extends string | number`. `minHeight: 34` (`< 44dp` touch target), hardcodes `fontSize: 13`, lacks `disabled` prop.
- **`Slider.tsx`**: Pure RN `PanResponder` implementation. `touchArea` height is `36` (`< 44dp`), lacks `accessibilityActions` (`increment`/`decrement`) and `onAccessibilityAction` for `accessibilityRole="adjustable"`.

### Feedback (`src/components/feedback/`)
- **`Badge.tsx`**: 12 semantic variants, `sm | md` sizes, optional dot. Hardcodes `fontSize: 11 | 12` bypassing `tokens.typography.scale`.
- **`Toast.tsx` & `Snackbar.tsx`**: Standalone components duplicating `ThemeProvider.tsx`'s internal toast/snackbar UI. Close buttons have `hitSlop={8}` on 15px/16px icons (`< 44dp`). `Snackbar` hardcodes `#182230`, `#FFFFFF`, `#94A3B8`, `#7AA8EE`, and font sizes `13.5`/`13`.
- **`EmptyState.tsx` & `ErrorState.tsx`**: Clean composition. `EmptyState` uses `borderStyle: 'dashed'`. `ErrorState` sets `accessibilityRole="alert"`.
- **`Skeleton.tsx`**: Uses `Animated.loop` opacity pulse, respects `tokens.motion.reducedMotion`, sets `accessible={false}` and `importantForAccessibility="no"`.

### Navigation (`src/components/navigation/`)
- **`AppHeader.tsx`**: Thin wrapper around `ScreenHeader` with `safeTop = true` default.
- **`BottomBar.tsx`**: Uses `useSafeAreaInsets()`, `accessibilityRole="tablist"` / `"tab"`, `minHeight: 44`.
- **`TabBar.tsx`**: `underline` and `pill` variants with optional `count` badge. Missing `accessibilityRole="tablist"` on container, `minHeight: 40` (`< 44dp`), and `truncate` on tab label.

### Data Display (`src/components/data-display/`)
- **`ProgressBar.tsx`**: Clamps `value` to `0..100`, sets `accessibilityRole="progressbar"` and `accessibilityValue`.
- **`CircularProgress.tsx`**: Uses `react-native-svg` (`Svg`, `Circle`). Applies `transform: [{ rotate: '-90deg' }]` on `<Svg>`, does not guard `size <= strokeWidth` (`r <= 0`), and hardcodes `fontSize`.
- **`ListItem.tsx`**: `minHeight: 48`, `leading`/`trailing` slots, optional `divider`. Missing `disabled` prop.
- **`StatItem.tsx`**: Text wrapper `<View>` lacks `flex: 1, minWidth: 0` for wrapping in narrow layouts.

### Overlays (`src/components/overlays/`)
- **`Dialog.tsx`**: `Modal` with `variant` (`default | danger | success | info`), `primaryAction`, `secondaryAction`. Footer lacks `flexWrap: 'wrap'`; `DialogAction` lacks `disabled`; no `ScrollView` for tall content; nested `Pressable` backdrop lacks `accessibilityViewIsModal`.
- **`BottomSheet.tsx`**: `Modal` with `useSafeAreaInsets()`, `ScrollView`, drag handle visual. Hardcodes `maxWidth: 540` instead of `tokens.dimensions.modalMaxWidth`.
- **`ActionMenu.tsx`**: Composes `BottomSheet` with `ActionMenuItem[]`. Calls `onClose()` before `item.onPress()`.

### Media (`src/components/media/`)
- **`Avatar.tsx`**: Initials fallback or `Image` + optional `status` dot. Hardcodes `fontSize: Math.round(size * 0.36)`; lacks `onError` fallback and `accessibilityLabel` on `Image`.
- **`Thumbnail.tsx`**: Handles `loading` (`Skeleton`), `source` (`Image`), and `broken`/`imgError` fallback. Uses unsafe `style as never` cast on `<Image>` and never resets `imgError` when `source` changes.
- **`ImagePlaceholder.tsx`**: Simple placeholder box with `icon`, `label`, `height`, `radius`.

---

## 6. React Native Compatibility

Target: **Expo SDK 57 / React Native 0.86.3 / React 19.2.3 / TypeScript**.

- **Browser/DOM APIs:** None found. Zero occurrences of `window`, `document`, `localStorage`, `sessionStorage`, `HTMLElement`, `onClick`, or `className`.
- **Styling & Layout:** All styles use `StyleSheet.create` and React Native `ViewStyle`/`TextStyle`/`ImageStyle` properties (except `Thumbnail.tsx` casting `ViewStyle` `as never` onto `Image`).
- **Animation:** Uses core `Animated` (`Button`, `FloatingButton`, `Switch`, `Skeleton`) with `useNativeDriver: true` for transforms and opacity — fully compatible with RN 0.86.3 without requiring `react-native-reanimated`.
- **Safe Area & Keyboard:** Uses `react-native-safe-area-context` (`SafeAreaView`, `useSafeAreaInsets`) and `KeyboardAvoidingView`.
- **SVG:** `CircularProgress.tsx` uses `react-native-svg` (`Svg`, `Circle`), which is installed (`15.15.4`).

---

## 7. Android Compatibility

Static inspection identified the following Android-specific concerns (none verified on an Android device yet):

1. **Missing Devanagari Font Asset (`typography.ts`):** `resolveFontFamilies` returns `'NotoSansDevanagari_400Regular'` for `fontFamilyHindi` on Android and when `fontStyle === 'devanagari'`. `@expo-google-fonts/noto-sans-devanagari` is **not installed** in `package.json`, and `App.tsx` only loads `Inter_*` fonts. Furthermore, applying `fontWeight: '600'` or `'700'` on top of a single-weight font family string like `'NotoSansDevanagari_400Regular'` on Android can cause Android's font matcher to fall back to Roboto.
2. **SVG Rotation on `<Svg>` (`CircularProgress.tsx`):** `style={{ transform: [{ rotate: '-90deg' }] }}` on `<Svg>` can behave inconsistently on some Android `react-native-svg` builds compared to `rotation="-90"` + `origin` on `<Circle>` or wrapping `<View>`.
3. **`KeyboardAvoidingView` `behavior="height"` (`ScreenContainer.tsx`):** Combined with `app.json`'s `"softwareKeyboardLayoutMode": "resize"` on Android, `behavior="height"` can double-adjust or leave layout artifacts.
4. **Dashed Borders (`EmptyState.tsx`):** `borderStyle: 'dashed'` with `borderWidth: 1` on Android requires `borderRadius` (present here) and should be visually verified on Android.
5. **Nested `Pressable` + `ScrollView` (`BottomSheet.tsx`):** Wrapping a `ScrollView` inside a `Pressable` (`onPress={() => undefined}`) requires Android touch-scroll verification to ensure vertical scrolling isn't blocked or jittery.
6. **Hardware Back Button:** `Modal` components (`Select`, `Dialog`, `BottomSheet`) properly wire `onRequestClose` for Android hardware back button dismissal.

---

## 8. Accessibility Assessment

Cannot claim WCAG 2.2 AA compliance from static inspection alone, as contrast ratios with custom presets and TalkBack/VoiceOver focus order require runtime verification. Static findings:

- **Good Foundations:**
  - `IconButton` requires `label` and computes `hitSlop` to meet 44dp.
  - `ScreenHeader` and `SectionHeader` use `accessibilityRole="header"`.
  - `ThemeProvider` listens to OS `AccessibilityInfo` `reduceMotionChanged`.
  - `Divider` and `Spacer` and `Skeleton` hide decorative elements from screen readers (`accessible={false}`).
  - `ProgressBar` and `CircularProgress` expose `accessibilityRole="progressbar"` and `accessibilityValue`.
- **WCAG / Screen Reader Gaps Identified:**
  - **`Slider.tsx`:** `accessibilityRole="adjustable"` without `accessibilityActions` (`increment`/`decrement`) and `onAccessibilityAction` is non-functional for TalkBack/VoiceOver users.
  - **`TextInput.tsx`:** `RNTextInput` does not receive `accessibilityLabel={label}` when `label` is rendered as a sibling `<Text>`.
  - **Touch Targets `< 44dp`:** `Checkbox` (32x32 with `hitSlop={6}`), `Radio` (32x32 with `hitSlop={6}`), `Switch` track (60x40 with `hitSlop={8}`), `SegmentedControl` (`minHeight: 34`), `TabBar` (`minHeight: 40`), `Slider` (`touchArea` height `36`), `TextInput` password toggle (33x33), `Toast`/`Snackbar` close buttons (31x31 / 32x32).
  - **Dark Mode Destructive Button Contrast:** `Button.tsx` `destructive` variant uses `#FFFFFF` text on `BASE_DARK_COLORS.danger` (`#E86161`), which computes to ~3.45:1 contrast ratio — below the 4.5:1 WCAG AA minimum for normal text.
  - **Collapsible `SectionHeader`:** Renders two separate focusable buttons for the same collapse/expand action.
  - **Modals (`Dialog`, `BottomSheet`, `Select`):** Missing `accessibilityViewIsModal={true}` on modal content and `accessible={false}` on backdrop `Pressable`.

---

## 9. Dependency Analysis

### External Dependencies
Verified against root `package.json`:
- `react` (`19.2.3`) — Present
- `react-native` (`0.86.3`) — Present
- `react-native-safe-area-context` (`~5.7.0`) — Present
- `@react-native-async-storage/async-storage` (`2.2.0`) — Present
- `lucide-react-native` (`^1.77.0`) — Present
- `react-native-svg` (`15.15.4`) — Present
- `@expo-google-fonts/noto-sans-devanagari` — **Missing** from root `package.json` (accurately noted in `docs/DEPENDENCIES.md`, but actively referenced by string name in `src/theme/tokens/typography.ts`).

### Internal Dependency Map & Circular Risk
- **Layering:**
  - `tokens/*` & `themes/*` -> zero component imports (`dimensions.ts`, `motion.ts`, `shadows.ts`, `typography.ts`, `system.ts` import only `react-native`).
  - `ThemeProvider.tsx` -> imports `tokens/*`, `themes/*`, `AsyncStorage`, `react-native-safe-area-context`, `lucide-react-native`.
  - `components/foundation/*` -> imports `ThemeProvider`, `tokens/*`.
  - `components/{buttons,cards,layout,forms,feedback,navigation,data-display,overlays,media}` -> imports `ThemeProvider` and `components/foundation/*` (plus cross-category imports such as `ProgressCard` -> `ProgressBar` & `Badge`; `FeatureCard` -> `Badge`; `ScreenHeader` -> `IconButton`; `SectionHeader` -> `Button` & `IconButton`; `Dialog` -> `Button` & `IconButton`; `ActionMenu` -> `BottomSheet`; `Thumbnail` -> `Skeleton`).
  - `patterns/*` -> imports `components/*`.
  - `templates/*` -> imports `components/*` and `patterns/SearchFilterPattern` (in `ListingScreen`).
- **Circular Dependencies:** None detected. Dependency graph is strictly acyclic (DAG).
- **Documentation Verification (`docs/DEPENDENCIES.md`):** Accurate regarding all external packages and the missing Devanagari font package.

---

## 10. Patterns and Templates Assessment

### Patterns (`src/patterns/`)
- **`SearchFilterPattern.tsx`**: Composes `SearchInput` + horizontal `Button` chips. Genuinely reusable and app-agnostic.
- **`SectionPattern.tsx`**: Stateful wrapper around `SectionContainer` + `SectionHeader` for collapsible sections. Reusable, though inherits `SectionHeader`'s dual-button accessibility issue.
- **`EmptyContentPattern.tsx`**: Switches between `EmptyState` and `ErrorState`. Reusable.
- **`ConfirmationPattern.tsx`**: Thin wrapper around `Dialog`. Reusable.

### Templates (`src/templates/`)
- **`StandardScreen.tsx`**: Composes `PageLayout`, `ScreenHeader`, `Skeleton`, `ErrorState`, `EmptyState`. Reusable, but lacks `style` / `contentContainerStyle` / `refreshControl` pass-through.
- **`ListingScreen.tsx`**: Composes `ScreenHeader`, `SearchFilterPattern`, `FlatList`.
  - *Limitations:* Uses `<View>` instead of `<SafeAreaView>` (misses horizontal safe-area insets in landscape/notch); `FlatList` does not expose `refreshing`, `onRefresh`, `onEndReached`, `ListHeaderComponent`, `ListFooterComponent`, or `numColumns`.
- **`DetailScreen.tsx`**: Composes `PageLayout`, `ScreenHeader`, `Button` footer, `Skeleton`, `ErrorState`. Clean and reusable.
- **`FormScreen.tsx`**: Composes `PageLayout` (`keyboardAvoiding`) + `ScreenHeader` + footer `Button`s.
  - *Limitation:* Because `PageLayout` renders `footer` *outside* `ScreenContainer` (`KeyboardAvoidingView`), the submit/cancel footer may not animate cleanly above the keyboard on all platforms.

---

## 11. Existing Study Sakha Integration Readiness

Inspected `package.json`, `app.json`, `App.tsx`, `lib/theme.tsx`, `components/ui.tsx`, and `components/BottomSheet.tsx` without modifying any files:

- **SDK & Runtime Alignment:** Exact match (`expo ~57.0.31`, `react-native 0.86.3`, `react 19.2.3`). All 6 required runtime libraries are already installed.
- **Root Provider Compatibility:** `App.tsx` already wraps the app in `<SafeAreaProvider>` -> `<StoreProvider>` -> `<ThemeProvider>` (from `lib/theme.tsx`).
- **Critical Architecture & Naming Conflicts:**
  1. **ThemeProvider Conflict:** Study Sakha's `lib/theme.tsx` is a stateless, props-driven `ThemeProvider` fed by `StoreProvider` (`state.settings`) and synced via `AccountSyncEngine` (`lib/sync/`). SSDS's `ThemeProvider` manages its own `AsyncStorage` keys (`ssds_appearance_v1`, `ssds_custom_presets_v1`) and exports colliding names (`ThemeProvider`, `useTheme`, `ThemeMode`).
  2. **Component Name Collisions:** `components/ui.tsx` exports `Button`, `SectionHeader`, `EmptyState`, `Skeleton`, `ProgressBar`, `Avatar`, `IconButton`, `Divider`, and `components/BottomSheet.tsx` exports `BottomSheet` — all identical to SSDS exports.
- **Integration Strategy Assessment:**
  - **Independent adoption:** Token files (`colors.ts`, `spacing.ts`, `radius.ts`, `shadows.ts`, `motion.ts`, `icons.ts`, `dimensions.ts`) and stateless primitives (`Spacer`, `Divider`, `ProgressBar`, etc. once wired to a unified theme context) can be adopted incrementally.
  - **Requires adaptation:** `ThemeProvider.tsx` must either be bridged to `StoreProvider` + `lib/theme.tsx` (or mounted/aliased carefully) so user theme settings continue syncing across devices via `AccountSyncEngine`, and colliding component imports must be namespaced or migrated screen-by-screen.

---

## 12. Critical Findings (P0)

No **P0** (build-breaking, type-failing, or unrecoverable) findings were identified in static inspection or package-scoped TypeScript verification.

---

## 13. High Priority Findings (P1)

1. **Severity:** `P1`  
   **File Path:** `study-sakha-design-system-native/src/theme/ThemeProvider.tsx` (lines 174, 323–325, 337–339)  
   **Component/Function:** `ThemeProvider`, `showToast`, `showSnackbar`  
   **Technical Explanation:** `ThemeProvider` calls `useSafeAreaInsets()` unconditionally (crashing if mounted outside `SafeAreaProvider`), and `showToast`/`showSnackbar` create `setTimeout` timers without cleanup on unmount.  
   **Potential Impact:** Runtime crash if `ThemeProvider` is placed above `SafeAreaProvider` in a root tree or test harness; React state-update-on-unmounted-component warnings and leaked timers.  
   **Recommended Action:** Document/guard `SafeAreaProvider` requirement (or use `SafeAreaInsetsContext` safely with fallback `{ top: 0, bottom: 0, left: 0, right: 0 }`) and track/clear all active toast and snackbar timers in a `useEffect` unmount cleanup.

2. **Severity:** `P1`  
   **File Path:** `study-sakha-design-system-native/src/theme/tokens/typography.ts` (lines 85–98, 114–127)  
   **Component/Function:** `resolveFontFamilies`, `resolveTypographyStyle`  
   **Technical Explanation:** Hardcodes `'NotoSansDevanagari_400Regular'` when `fontStyle === 'devanagari'` or `hindi === true` on Android, but `@expo-google-fonts/noto-sans-devanagari` is not installed or loaded in `App.tsx`. Additionally, `resolveTypographyStyle` combines `'NotoSansDevanagari_400Regular'` with `fontWeight: '600' | '700'` from `TYPOGRAPHY_SPECS`.  
   **Potential Impact:** Hindi/Devanagari text silently falls back to Android system font or fails bold weight resolution.  
   **Recommended Action:** Install and load `@expo-google-fonts/noto-sans-devanagari` (including bold/medium weights if needed) during integration, or map weights to separate loaded font family names on Android.

3. **Severity:** `P1`  
   **File Path:** `study-sakha-design-system-native/src/components/forms/Slider.tsx` (lines 98–105, 152–155)  
   **Component/Function:** `Slider`  
   **Technical Explanation:** Declares `accessibilityRole="adjustable"` and `accessibilityValue` but omits `accessibilityActions` (`[{ name: 'increment' }, { name: 'decrement' }]`) and `onAccessibilityAction`. Touch area height is `36` (`< 44dp`).  
   **Potential Impact:** Screen reader users (TalkBack / VoiceOver) cannot adjust the slider value.  
   **Recommended Action:** Implement `accessibilityActions` and `onAccessibilityAction` stepping by `step`, and increase `touchArea` height (or add `hitSlop`) to at least `44dp`.

4. **Severity:** `P1`  
   **File Path:** `study-sakha-design-system-native/src/components/forms/Switch.tsx` (lines 40–75)  
   **Component/Function:** `Switch`  
   **Technical Explanation:** The `Pressable` wraps only the 44x24 `track` (`hitSlop={8}` -> 40dp vertical target `< 44dp`) rather than the entire row containing `label` and `description`.  
   **Potential Impact:** Tapping the switch label does not toggle the switch; vertical touch target is under 44dp.  
   **Recommended Action:** Move `Pressable` (or make the row pressable) around the full row with `minHeight: 44`, or increase vertical `hitSlop` to `10`.

5. **Severity:** `P1`  
   **File Path:** `study-sakha-design-system-native/src/components/media/Thumbnail.tsx` (lines 44, 65)  
   **Component/Function:** `Thumbnail`  
   **Technical Explanation:** Casts `style` (`StyleProp<ViewStyle>`) `as never` onto `<Image>` (line 65), bypassing TypeScript `ImageStyle` safety. Also `imgError` state is never reset if `source` prop changes.  
   **Potential Impact:** Passing `ViewStyle`-only properties can cause runtime warnings/errors on `<Image>`; changing `source` after a failed load stays stuck in error state.  
   **Recommended Action:** Wrap `<Image>` in a `<View style={style}>` or type image styles cleanly, and reset `imgError` in a `useEffect` when `source` changes.

6. **Severity:** `P1`  
   **File Path:** `study-sakha-design-system-native/src/theme/ThemeProvider.tsx`, `src/components/index.ts` vs. root `lib/theme.tsx`, `components/ui.tsx`, `components/BottomSheet.tsx`  
   **Component/Function:** `ThemeProvider`, `useTheme`, `ThemeMode`, `Button`, `SectionHeader`, `EmptyState`, `Skeleton`, `ProgressBar`, `Avatar`, `IconButton`, `Divider`, `BottomSheet`  
   **Technical Explanation:** Direct symbol name collisions and conflicting state ownership (`AsyncStorage` vs. `StoreProvider` + `AccountSyncEngine`).  
   **Potential Impact:** Importing both systems without an adapter/namespacing will break existing synced theme preferences or cause ambiguous imports.  
   **Recommended Action:** Design an integration adapter bridging `StoreProvider` settings into SSDS `ThemeProvider` (or vice versa) and plan incremental component migration.

---

## 14. Medium Priority Findings (P2)

1. **Severity:** `P2` | **File:** `src/components/buttons/Button.tsx` (L175–208), `FloatingButton.tsx` (L61–84) | **Component:** `Button`, `FloatingButton`  
   `style` prop is applied to inner `Pressable` while outer `Animated.View` has `alignSelf: 'flex-start'`, preventing `flex: 1` or outer layout margins from working. Also `Button` `RNText` lacks `flexShrink: 1` and `destructive` dark mode (`#FFFFFF` on `#E86161`) has ~3.45:1 contrast (`< 4.5:1`).
2. **Severity:** `P2` | **File:** `src/theme/ThemeProvider.tsx` (L439–628), `src/components/feedback/Toast.tsx`, `Snackbar.tsx` | **Component:** `NativeToastItem`, `Snackbar`, `Toast`  
   Duplicated Toast/Snackbar rendering logic with hardcoded colors (`#182230`, `#FFFFFF`, `#94A3B8`, `#7AA8EE`) and hardcoded font sizes bypassing `typography.scale`.
3. **Severity:** `P2` | **File:** `src/components/forms/TextInput.tsx` (L103–169) | **Component:** `TextInput`  
   Missing `accessibilityLabel={label}` on `RNTextInput`; `multiline` `minHeight` does not scale with `tokens.typography.scale`; password toggle `hitSlop={8}` yields ~33x33 touch target (`< 44dp`); no `inputStyle` prop.
4. **Severity:** `P2` | **File:** `src/components/layout/SectionHeader.tsx` (L73–105) | **Component:** `SectionHeader`  
   Collapsible mode renders two separate `Pressable` buttons (`leftContent` and `IconButton`) for the same `onToggleCollapse` action, duplicating screen-reader focus stops.
5. **Severity:** `P2` | **File:** `src/components/overlays/Dialog.tsx`, `BottomSheet.tsx`, `src/components/forms/Select.tsx` | **Component:** `Dialog`, `BottomSheet`, `Select`  
   Nested `Pressable` modal backdrops lack `accessible={false}` / `accessibilityViewIsModal`; `Select` lacks `errorText`/`required` and uses `FlatList` `style={{ padding: 8 }}` instead of `contentContainerStyle`; `Dialog` footer lacks `flexWrap: 'wrap'` and `ScrollView` for tall content.
6. **Severity:** `P2` | **File:** `src/components/data-display/CircularProgress.tsx` (L33, L47, L76) | **Component:** `CircularProgress`  
   `<Svg>` uses `style={{ transform: [{ rotate: '-90deg' }] }}` (Android `react-native-svg` quirk); unguarded `r <= 0` if `size <= strokeWidth`; hardcoded `fontSize`.
7. **Severity:** `P2` | **File:** `src/components/forms/Checkbox.tsx`, `Radio.tsx`, `SegmentedControl.tsx`, `src/components/navigation/TabBar.tsx`, `src/components/feedback/Badge.tsx` | **Component:** Multiple  
   Touch targets below `44dp` (`32x32` on `Checkbox`/`Radio` without label, `34` on `SegmentedControl`, `40` on `TabBar`); `SegmentedControl` and `Badge` hardcode `fontSize` bypassing `typography.scale`; `TabBar` lacks `accessibilityRole="tablist"`.
8. **Severity:** `P2` | **File:** `src/templates/ListingScreen.tsx`, `src/templates/FormScreen.tsx`, `src/components/layout/ScreenContainer.tsx` | **Component:** Templates & Layout  
   `ListingScreen` uses `View` instead of `SafeAreaView` and omits `refreshing`/`onRefresh`/`onEndReached`/`ListHeaderComponent`; `FormScreen` places `footer` outside `KeyboardAvoidingView`; `ScreenContainer` uses `behavior="height"` on Android without `keyboardVerticalOffset`.
9. **Severity:** `P2` | **File:** `src/theme/ThemeProvider.tsx` (L144, L253, L280) | **Component:** `ThemeProvider`  
   `DEFAULT_APPEARANCE.themeMode` defaults to `'light'` instead of `'system'`; non-custom presets overwrite `brandGradientEnd` with `colors.secondary`; `customColors` sets `primaryDark = c.primary` without darkening or adjusting `textInverse`.

---

## 15. Low Priority Findings (P3)

1. **Severity:** `P3` | **File:** `src/components/cards/ProgressCard.tsx` (L62–65) — Footer displays unclamped `${progress}%` even though `ProgressBar` clamps `0..100`.
2. **Severity:** `P3` | **File:** `src/components/cards/FeatureCard.tsx` (L123) — `actionText` hardcodes `fontSize: 13` instead of scaling with `tokens.typography.scale`.
3. **Severity:** `P3` | **File:** `src/components/media/Avatar.tsx` (L59–88) — Missing `onError` fallback to initials, missing `accessibilityLabel`, hardcoded `fontSize: Math.round(size * 0.36)`.
4. **Severity:** `P3` | **File:** `src/components/data-display/StatItem.tsx` (L38) — Text `<View>` lacks `flex: 1, minWidth: 0`.
5. **Severity:** `P3` | **File:** `src/components/data-display/ListItem.tsx` (L12–21) — Missing `disabled` prop.
6. **Severity:** `P3` | **File:** `src/components/forms/SearchInput.tsx` (L19–25) — Does not extend `RNTextInputProps` (`autoFocus`, `onSubmitEditing`, `testID`).
7. **Severity:** `P3` | **File:** `src/components/overlays/BottomSheet.tsx` (L89) — Hardcodes `maxWidth: 540` instead of `tokens.dimensions.modalMaxWidth`.
8. **Severity:** `P3` | **File:** `src/components/forms/Radio.tsx` vs `Checkbox.tsx`/`Switch.tsx` — Callback naming inconsistency (`onPress` vs `onChange`).

---

## 16. Recommended Fixes

1. **Before or during integration:**
   - Guard `useSafeAreaInsets` / `SafeAreaInsetsContext` in `ThemeProvider` and clean up toast/snackbar timers on unmount; reuse `Toast` and `Snackbar` components rather than duplicating them in `ThemeProvider.tsx`.
   - Decide on `@expo-google-fonts/noto-sans-devanagari` installation or update `resolveFontFamilies` / `resolveTypographyStyle` so Android does not request an unloaded font family or combine single-weight font names with bold `fontWeight`.
   - Fix `Slider` accessibility (`accessibilityActions` + `onAccessibilityAction`), `Switch` full-row press target, `TextInput` `accessibilityLabel` forwarding, and `Thumbnail` `style as never` cast + `source` error reset.
   - Standardize touch targets (`>= 44dp`) across `Checkbox`, `Radio`, `SegmentedControl`, `TabBar`, `Slider`, and icon close buttons.
   - Move `style` onto `Animated.View` (or split `containerStyle`) in `Button` and `FloatingButton`, and darken `BASE_DARK_COLORS.danger` (or use dark `textInverse`) for WCAG AA contrast on `destructive` buttons.
   - Build a thin bridge between `StoreProvider` (`lib/store.tsx`) and the design system theme so Study Sakha's existing synced appearance settings remain authoritative.

---

## 17. Testing Evidence

| Check Type | Executed? | Result / Notes |
| --- | --- | --- |
| **Static Inspection** | Yes | All 69 `.ts`/`.tsx` modules, `tsconfig.json`, `docs/*`, and root integration points (`package.json`, `app.json`, `App.tsx`, `lib/theme.tsx`, `components/ui.tsx`) inspected directly. |
| **TypeScript Verification** | Yes | `pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit` exited with code `0` and 0 errors (`strict: true`, `skipLibCheck: true`, resolved against root `node_modules`). |
| **Browser API Grep** | Yes | `grep -rnE "\b(window\|document\|localStorage\|sessionStorage\|HTMLElement\|onClick\|className)\b" study-sakha-design-system-native/src/` returned `NONE_FOUND`. |
| **Unit Test Verification** | No | No unit test suite exists inside `study-sakha-design-system-native/`. Root Jest suite was not run per review-only scope. |
| **Runtime Verification** | No | Not executed; rendering, hydration flash, keyboard avoidance, and modal transitions are not runtime-verified. |
| **Android Device Verification** | No | Not executed; Devanagari font rendering, SVG rotation, dashed borders, and TalkBack behavior require physical/emulator Android testing. |

---

## 18. Final Readiness Verdict

| Dimension | Rating | Rationale |
| --- | --- | --- |
| **Source Organization** | `READY` | All 69 modules across 5 batches are cleanly structured with zero circular dependencies and valid barrel exports. |
| **TypeScript Quality** | `READY WITH MINOR ISSUES` | `tsc --noEmit` (`strict: true`) passes with 0 errors; one unsafe `as never` cast exists in `Thumbnail.tsx`. |
| **React Native Compatibility** | `READY WITH MINOR ISSUES` | Zero browser/DOM leaks; minor RN layout/gesture caveats (`Animated.View` wrapper `style`, `ListingScreen` safe area, `FormScreen` footer). |
| **Theme Architecture** | `NEEDS IMPROVEMENT` | Clean token model, but `ThemeProvider` has unconditional `useSafeAreaInsets()`, uncleaned timers, duplicated Toast/Snackbar UI, and unloaded Devanagari font references. |
| **Component API Consistency** | `READY WITH MINOR ISSUES` | Generally cohesive props, with minor gaps (`errorText`/`required` on `Select`, `onPress` vs `onChange` on `Radio`, missing `disabled` on `ListItem`/`SegmentedControl`). |
| **Accessibility** | `NEEDS IMPROVEMENT` | Several controls fall below 44dp touch targets, `Slider` lacks `accessibilityActions`, `TextInput` omits `accessibilityLabel` forwarding, and dark `destructive` button contrast is below 4.5:1. |
| **Android Readiness** | `NOT VERIFIED` | No Android runtime/device execution performed; static inspection flagged unloaded Devanagari font, `CircularProgress` `<Svg>` transform, and `KeyboardAvoidingView` `behavior="height"`. |
| **Future Study Sakha Integration** | `NEEDS IMPROVEMENT` | Direct symbol collisions (`ThemeProvider`, `useTheme`, `Button`, `SectionHeader`, `EmptyState`, `Skeleton`, `ProgressBar`, `Avatar`, `IconButton`, `Divider`, `BottomSheet`) and `StoreProvider` sync bridge must be resolved before adoption. |

**Overall Conclusion:** The extracted package is a solid, cleanly typed React Native design system foundation, but **should not be declared production-ready** until the P1 accessibility/theme/font fixes are applied, an integration bridge with `lib/theme.tsx` / `StoreProvider` is designed, and unit + Android device verification are completed.

---

## P1 FIX IMPLEMENTATION STATUS

All five code-level P1 findings identified in Section 13 (items 1–5) have been resolved in `study-sakha-design-system-native/` without modifying the existing Study Sakha application. (Item 6, the architectural/naming collision with `lib/theme.tsx` and `components/ui.tsx`, remains an integration-phase task by design.)

### 1. ThemeProvider Safe Area & Timer Cleanup
- **Original Issue:** Unconditional `useSafeAreaInsets()` crash risk outside `SafeAreaProvider`, and unmanaged `setTimeout` timers in `showToast` / `showSnackbar` without unmount cleanup.
- **File Modified:** `study-sakha-design-system-native/src/theme/ThemeProvider.tsx`
- **Fix Implemented:** Replaced `useSafeAreaInsets()` with `useContext(SafeAreaInsetsContext) ?? ZERO_INSETS`. Added `isMountedRef`, `toastTimersRef` (`Map<number, Timeout>`), `dismissToast`, `dismissSnackbar`, eviction timer cleanup, and unmount `useEffect` cleanup for all pending timers.
- **Technical Approach:** Uses React `useContext` unconditionally on `SafeAreaInsetsContext` (safe fallback to zero insets when no provider exists, full insets when `SafeAreaProvider` is present) and centralized timer tracking.
- **Validation Performed:** Static inspection + `pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit` (0 errors).
- **Remaining Limitation:** Not runtime-tested in a mounted React tree or on an Android device.

### 2. Devanagari Font Configuration & Weight Fallback
- **Original Issue:** `resolveFontFamilies` hardcoded `'NotoSansDevanagari_400Regular'` when `@expo-google-fonts/noto-sans-devanagari` is not installed, and combined that single-weight font name with bold `fontWeight` values.
- **File Modified:** `study-sakha-design-system-native/src/theme/tokens/typography.ts`
- **Fix Implemented:** Switched Android default sans/Hindi fallback to `'sans-serif'` (which supports `400`–`700` weights and system Devanagari glyph fallback) and iOS Hindi fallback to `'Devanagari Sangam MN'`, while adding `FontFamilyOverrides` parameter to `resolveFontFamilies` for future explicit custom font loading.
- **Technical Approach:** Platform-supported system font fallback with extensible override interface and documented limitation.
- **Validation Performed:** Static inspection + `pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit` (0 errors).
- **Remaining Limitation:** Custom Noto Sans Devanagari font rendering and Hindi bold weight appearance are not visually verified on an Android device.

### 3. Slider Accessibility Actions & Touch Target
- **Original Issue:** `Slider` declared `accessibilityRole="adjustable"` without `accessibilityActions` / `onAccessibilityAction`, and had a `36dp` touch area height.
- **File Modified:** `study-sakha-design-system-native/src/components/forms/Slider.tsx`
- **Fix Implemented:** Added `accessible`, `accessibilityState={{ disabled }}`, `accessibilityActions` (`increment` / `decrement`), and `onAccessibilityAction` respecting `step`, `min`, and `max`. Expanded `touchArea` height from `36` to `44`.
- **Technical Approach:** Standard React Native `AccessibilityActionEvent` handler with floating-point rounding (`Math.round(next * 1000) / 1000`) and boundary clamping.
- **Validation Performed:** Static inspection + `pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit` (0 errors).
- **Remaining Limitation:** TalkBack / VoiceOver gesture behavior and drag interaction are not runtime-verified on a device.

### 4. Switch Full-Row Interactive Target
- **Original Issue:** `Switch` wrapped only the `44x24` track in `Pressable`, leaving the label and description non-interactive and vertical height below `44dp`.
- **File Modified:** `study-sakha-design-system-native/src/components/forms/Switch.tsx`
- **Fix Implemented:** Replaced the outer `View` with a single `Pressable` (with `minHeight: 44`, `hitSlop={10}`, `accessibilityRole="switch"`, `accessibilityLabel={label}`, `accessibilityState={{ checked, disabled }}`) and converted the inner track to a non-interactive `View`.
- **Technical Approach:** Single-pressable row pattern prevents duplicate callbacks from nested pressables while making the entire label row interactive.
- **Validation Performed:** Static inspection + `pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit` (0 errors).
- **Remaining Limitation:** Not runtime-tested with TalkBack or touch events.

### 5. Thumbnail Image Style Typing & Stale Error State
- **Original Issue:** `Thumbnail` cast `style` (`StyleProp<ViewStyle>`) `as never` onto `<Image>`, and never reset `imgError` when `source` changed.
- **File Modified:** `study-sakha-design-system-native/src/components/media/Thumbnail.tsx`
- **Fix Implemented:** Wrapped `<Image>` in a `<View>` receiving `style` (plus border, `borderRadius`, `aspectRatio`, `overflow: 'hidden'`), removed `as never`, and added a `useEffect` keyed on a stable `sourceKey` to reset `imgError` only when `imgError` is `true` and the source changes.
- **Technical Approach:** Avoids `ViewStyle` vs `ImageStyle` mismatch and avoids infinite error-reset loops when callers pass inline `{ uri }` objects.
- **Validation Performed:** Static inspection + `pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit` (0 errors).
- **Remaining Limitation:** Image load/error lifecycle is not runtime-verified.

---

## P2 / P3 REMEDIATION STATUS

All 8 **Must Fix Before Integration** findings and all 6 **Recommended Improvements** findings from `docs/P2_P3_REVIEW.md` have been implemented in `study-sakha-design-system-native/` (see `docs/P2_P3_FIX_REPORT.md` for full file-by-file details). All 7 **Safe to Defer** findings were intentionally deferred, and all 5 **P1** fixes remain intact.

- **TypeScript Verification:** `pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit` exited with code `0` (0 errors).
- **Updated Readiness Notes:** `Theme Architecture`, `Component API Consistency`, `Accessibility`, and `React Native Compatibility` P2/P3 code gaps are resolved statically; **runtime and Android device verification remain `NOT VERIFIED`**, and **Future Study Sakha Integration** still requires the `lib/theme.tsx` / `StoreProvider` adapter.

