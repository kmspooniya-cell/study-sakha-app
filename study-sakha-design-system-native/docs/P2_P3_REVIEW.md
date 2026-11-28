# Study Sakha Design System v1.0 — P2 & P3 Focused Review

**Date:** 2026-11-28  
**Package:** `study-sakha-design-system-native/`  
**Source Baseline:** `study-sakha-design-system-native/docs/TECHNICAL_REVIEW.md` (Sections 14 & 15)  
**Scope:** Read-only assessment of all remaining P2 and P3 findings, plus verification that the five P1 fixes remain intact.  
**Remediation Status:** All 8 **Must Fix Before Integration** items and all 6 **Recommended Improvements** were subsequently implemented; see `docs/P2_P3_FIX_REPORT.md`. All 7 **Safe to Defer** items remain deferred.

---

## P1 Fix Integrity Verification

Verified prior to this review:
- **Modified P1 files intact:** `ThemeProvider.tsx`, `typography.ts`, `Slider.tsx`, `Switch.tsx`, and `Thumbnail.tsx` remain in their post-fix state.
- **TypeScript Check:** `pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit` exited with code `0` and **0 errors**.

---

## Summary Matrix

| Group | Count | Findings Included |
| --- | --- | --- |
| **Must Fix Before Integration** | 8 | `Button.tsx` (layout + dark contrast), `TextInput.tsx` (a11y + multiline scaling + touch target), `SectionHeader.tsx` (duplicate collapsible focus stops), `ListingScreen.tsx` (safe area + FlatList props), `FormScreen.tsx` (footer outside `KeyboardAvoidingView`), `Dialog.tsx` / `BottomSheet.tsx` / `Select.tsx` (modal a11y + `Select` FlatList/validation), `Checkbox.tsx` / `Radio.tsx` / `SegmentedControl.tsx` / `TabBar.tsx` (<44dp touch targets), `CircularProgress.tsx` (Android SVG rotation + `r <= 0` guard) |
| **Recommended Improvements** | 6 | `ThemeProvider.tsx` vs `Toast.tsx` / `Snackbar.tsx` (duplication + hardcoded colors), `ThemeProvider.tsx` (default `themeMode`, `brandGradientEnd`, `customColors`), `ScreenContainer.tsx` (`behavior="height"` + `keyboardVerticalOffset`), `Badge.tsx` (hardcoded `fontSize`), `Avatar.tsx` (`onError` + `accessibilityLabel` + `fontSize`), `SearchInput.tsx` (extend `RNTextInputProps`) |
| **Safe to Defer** | 6 | `FloatingButton.tsx` (wrapper `style` forwarding), `ProgressCard.tsx` (unclamped footer `%`), `FeatureCard.tsx` (hardcoded `actionText` `fontSize`), `StatItem.tsx` (missing `flex: 1, minWidth: 0`), `ListItem.tsx` (missing `disabled` prop), `BottomSheet.tsx` (`maxWidth: 540` vs token), `Radio.tsx` (`onPress` vs `onChange` naming) |

*(Note: Grouped items in `TECHNICAL_REVIEW.md` are broken out per file/concern below for actionable triage.)*

---

## Group 1: Must Fix Before Integration

### 1.1 `Button.tsx` — Outer `Animated.View` Style Trap, Text Truncation & Dark Destructive Contrast
1. **Exact File Path:** `study-sakha-design-system-native/src/components/buttons/Button.tsx` (lines 138–139, 175–208, 224–238)
2. **Technical Issue:** `style` is applied to the inner `Pressable` while the outer `Animated.View` hardcodes `alignSelf: 'flex-start'` (when `fullWidth` is false). `RNText` has `numberOfLines={1}` without `flexShrink: 1`. In dark mode, `destructive` renders `#FFFFFF` text on `tokens.colors.danger` (`#E86161`).
3. **Severity & Justification:** `P2 (Medium)` — Breaks flex/grid layouts (e.g. `flex: 1` buttons in rows) and fails WCAG 2.2 AA contrast (~3.45:1) on dark destructive buttons.
4. **User-Facing or Runtime Impact:** Buttons passed `style={{ flex: 1 }}` collapse to content width; long Hindi/English labels with icons can overflow horizontally; dark-mode destructive labels have low legibility.
5. **Recommended Fix:** Forward layout-affecting `style` (or move `alignSelf` / `flex` / margins) to `Animated.View` (or add `containerStyle`), add `flexShrink: 1` to `RNText`, and use a higher-contrast danger fill or dark `textInverse` for dark-mode `destructive`.
6. **API Impact:** Non-breaking if `style` continues to accept `StyleProp<ViewStyle>` (optional `containerStyle` would be purely additive).
7. **Necessary Before Integration:** **Yes** — `Button` is the highest-frequency interactive primitive across all screens.

### 1.2 `TextInput.tsx` — Missing `accessibilityLabel`, Unscaled Multiline Height & Small Toggle Target
1. **Exact File Path:** `study-sakha-design-system-native/src/components/forms/TextInput.tsx` (lines 103–105, 128–169)
2. **Technical Issue:** `RNTextInput` does not receive `accessibilityLabel={label}`. `multiline` `minHeight: rows * 22 + 20` does not scale with `tokens.typography.scale`. Password visibility `Pressable` uses `hitSlop={8}` on a 17px icon (~33x33 touch target). No `inputStyle` prop exists.
3. **Severity & Justification:** `P2 (Medium)` — Directly impacts TalkBack/VoiceOver form usability and dynamic font scaling.
4. **User-Facing or Runtime Impact:** Screen readers do not announce the field's label; large `typographyScale` settings can clip multiline text; password toggle is harder to tap.
5. **Recommended Fix:** Default `accessibilityLabel={rest.accessibilityLabel ?? label}` on `RNTextInput`, scale multiline `minHeight` by `tokens.typography.scale`, increase password toggle `hitSlop` to `14` (or `minWidth: 44, minHeight: 44`), and optionally add `inputStyle`.
6. **API Impact:** Non-breaking (purely additive `inputStyle` if added).
7. **Necessary Before Integration:** **Yes** — Auth, Profile, Settings, and Note forms rely on accessible text inputs.

### 1.3 `SectionHeader.tsx` — Duplicate Focus Stops in Collapsible Mode
1. **Exact File Path:** `study-sakha-design-system-native/src/components/layout/SectionHeader.tsx` (lines 73–105)
2. **Technical Issue:** When `collapsible={true}`, both the left title `Pressable` and the right `IconButton` call `onToggleCollapse`.
3. **Severity & Justification:** `P2 (Medium)` — Creates redundant, confusing screen-reader navigation stops for a single action.
4. **User-Facing or Runtime Impact:** TalkBack/VoiceOver users encounter two consecutive buttons that toggle the same section.
5. **Recommended Fix:** Make the entire header row a single `Pressable` (with the chevron rendered as a decorative `Icon` inside it), or mark the chevron `IconButton` `accessible={false}` / `importantForAccessibility="no"` when the title `Pressable` handles the toggle.
6. **API Impact:** None — `SectionHeaderProps` remains unchanged.
7. **Necessary Before Integration:** **Yes** — Used in `SectionPattern` and dashboard/settings sections.

### 1.4 `ListingScreen.tsx` — Missing `SafeAreaView` & Essential `FlatList` Props
1. **Exact File Path:** `study-sakha-design-system-native/src/templates/ListingScreen.tsx` (lines 15–36, 63, 102–118)
2. **Technical Issue:** Root container uses `<View>` instead of `<SafeAreaView edges={['left', 'right']}>` (unlike `ScreenContainer`). `FlatList` does not expose `refreshing`, `onRefresh`, `onEndReached`, `ListHeaderComponent`, `ListFooterComponent`, or `numColumns`.
3. **Severity & Justification:** `P2 (Medium)` — Landscape/notch devices lack horizontal safe-area insets, and real Study Sakha list screens (Library, PYQs, Tests, Notifications) require pull-to-refresh and pagination.
4. **User-Facing or Runtime Impact:** Content may sit under display cutouts in landscape; screens cannot use `ListingScreen` without pull-to-refresh or pagination hooks.
5. **Recommended Fix:** Wrap root in `SafeAreaView` (`edges={['left', 'right']}`) and forward optional `refreshing`, `onRefresh`, `onEndReached`, `ListHeaderComponent`, `ListFooterComponent`, `numColumns`.
6. **API Impact:** Additive optional props only; 100% backwards-compatible.
7. **Necessary Before Integration:** **Yes** (if `ListingScreen` template is adopted for app lists).

### 1.5 `FormScreen.tsx` — Footer Outside `KeyboardAvoidingView`
1. **Exact File Path:** `study-sakha-design-system-native/src/templates/FormScreen.tsx` (lines 40–75) and `src/components/layout/PageLayout.tsx` (lines 39–61)
2. **Technical Issue:** `FormScreen` passes `keyboardAvoiding` to `PageLayout`, which places `KeyboardAvoidingView` inside `ScreenContainer` while rendering `footer` *outside* `ScreenContainer`.
3. **Severity & Justification:** `P2 (Medium)` — On iOS (and depending on Android `windowSoftInputMode`), the primary Submit/Cancel footer remains hidden behind the keyboard or detached from the form flow.
4. **User-Facing or Runtime Impact:** Users filling long forms may not see or reach the Submit button while the keyboard is open.
5. **Recommended Fix:** Allow `PageLayout` to wrap both `ScreenContainer` and `footer` inside `KeyboardAvoidingView` when `keyboardAvoiding` is enabled.
6. **API Impact:** None — `FormScreenProps` and `PageLayoutProps` remain unchanged.
7. **Necessary Before Integration:** **Yes** (if `FormScreen` template is adopted).

### 1.6 `Dialog.tsx`, `BottomSheet.tsx` & `Select.tsx` — Modal Accessibility, `Select` Validation & `FlatList` Padding
1. **Exact File Path:** `study-sakha-design-system-native/src/components/overlays/Dialog.tsx` (L53–66, L88–118), `BottomSheet.tsx` (L37–51), `src/components/forms/Select.tsx` (L30–39, L103–131)
2. **Technical Issue:**
   - Nested `Pressable` backdrops (`onPress={() => undefined}` on inner container) lack `accessible={false}` on backdrop / `accessibilityViewIsModal={true}` on modal content.
   - `Dialog` footer lacks `flexWrap: 'wrap'` and body lacks `ScrollView` for tall content / large font scaling.
   - `Select` lacks `errorText` and `required` props (inconsistent with `TextInput`) and applies `padding: 8` on `FlatList` `style` instead of `contentContainerStyle`.
3. **Severity & Justification:** `P2 (Medium)` — Impacts TalkBack focus trapping inside modals, Hindi/scaled button wrapping in `Dialog`, and `Select` scroll clipping/form parity.
4. **User-Facing or Runtime Impact:** Screen readers may focus background views behind open modals; long Hindi dialog buttons can clip off-screen; `Select` cannot display validation errors.
5. **Recommended Fix:** Add `accessibilityViewIsModal` on modal cards/sheets, `accessible={false}` on backdrop `Pressable` (or separate backdrop `Pressable` from sibling content), `flexWrap: 'wrap'` + `ScrollView` in `Dialog`, `contentContainerStyle` in `Select`, and optional `errorText`/`required` on `Select`.
6. **API Impact:** Additive optional props (`errorText`, `required`) on `Select` only; non-breaking.
7. **Necessary Before Integration:** **Yes** — Modals and selectors are core interactive surfaces.

### 1.7 `Checkbox.tsx`, `Radio.tsx`, `SegmentedControl.tsx` & `TabBar.tsx` — Touch Targets Below 44dp & `TabBar` Role
1. **Exact File Path:** `study-sakha-design-system-native/src/components/forms/Checkbox.tsx` (L35), `Radio.tsx` (L32), `SegmentedControl.tsx` (L75–81, L106), `src/components/navigation/TabBar.tsx` (L55–61, L128)
2. **Technical Issue:**
   - `Checkbox` and `Radio` have `hitSlop={6}` on 20x20 boxes (32x32 target when label is omitted) and no `minHeight: 44`.
   - `SegmentedControl` has `minHeight: 34` and hardcodes `fontSize: 13` (bypassing `tokens.typography.scale`).
   - `TabBar` has `minHeight: 40`, omits `accessibilityRole="tablist"`, and omits `truncate` on tab labels.
3. **Severity & Justification:** `P2 (Medium)` — Fails 44dp minimum touch target guidance and `TabBar` screen-reader tablist semantics.
4. **User-Facing or Runtime Impact:** Harder to tap accurately on mobile; `SegmentedControl` ignores user font-scale preferences; TalkBack does not announce `TabBar` as a tab list.
5. **Recommended Fix:** Enforce `minHeight: 44` (or `hitSlop` to reach 44dp) on all four controls, add `accessibilityRole="tablist"` to `TabBar`, add `truncate` to `TabBar` text, and scale `SegmentedControl` font size via `tokens.typography.scale`.
6. **API Impact:** None.
7. **Necessary Before Integration:** **Yes** — Touch target and font-scaling compliance are core mobile requirements.

### 1.8 `CircularProgress.tsx` — Android `<Svg>` Rotation Quirk & Zero/Negative Radius Guard
1. **Exact File Path:** `study-sakha-design-system-native/src/components/data-display/CircularProgress.tsx` (lines 33, 47, 76)
2. **Technical Issue:** `<Svg>` uses `style={{ transform: [{ rotate: '-90deg' }] }}` instead of `rotation="-90"` / `origin` on `<Circle>` (or outer `<View>`). Radius `r = (size - strokeWidth) / 2` is not clamped (`Math.max(0, ...)`). Label `fontSize` is hardcoded without `tokens.typography.scale`.
3. **Severity & Justification:** `P2 (Medium)` — `transform` on `<Svg>` has known Android `react-native-svg` rendering inconsistencies, and `size <= strokeWidth` produces negative SVG radius.
4. **User-Facing or Runtime Impact:** Progress arc start angle may misalign on Android; small `size` values can throw or render invalid SVG paths.
5. **Recommended Fix:** Move rotation to `<Circle rotation="-90" origin={`${size / 2}, ${size / 2}`} />` (or wrap `<Svg>` in `<View style={{ transform: [{ rotate: '-90deg' }] }}>`), clamp `r = Math.max(1, (size - strokeWidth) / 2)`, and scale label `fontSize` with `tokens.typography.scale`.
6. **API Impact:** None.
7. **Necessary Before Integration:** **Yes** — Used for study progress rings on Android.

---

## Group 2: Recommended Improvements

### 2.1 `ThemeProvider.tsx`, `Toast.tsx` & `Snackbar.tsx` — Duplicated UI & Hardcoded Colors/Sizes
1. **Exact File Path:** `study-sakha-design-system-native/src/theme/ThemeProvider.tsx` (L439–628), `src/components/feedback/Toast.tsx` (L46–97), `src/components/feedback/Snackbar.tsx` (L28–82)
2. **Technical Issue:** `ThemeProvider` defines `NativeToastItem` and inline snackbar JSX duplicating `Toast.tsx` and `Snackbar.tsx`. Both `Snackbar.tsx` and `ThemeProvider.tsx` hardcode `#182230`, `#FFFFFF`, `#94A3B8`, `#7AA8EE`, and font sizes `13.5`/`13` bypassing `tokens.typography.scale`. Close buttons have `hitSlop={8}` on 15px/16px icons (<44dp).
3. **Severity & Justification:** `P2 (Medium)` — Maintenance drift risk and inconsistent font scaling.
4. **User-Facing or Runtime Impact:** Toast/Snackbar text does not scale with `typographyScale`; close icons have small tap areas.
5. **Recommended Fix:** Render `Toast` and `Snackbar` directly inside `ThemeProvider` (removing `NativeToastItem` duplication), add semantic snackbar tokens (or derive from `tokens.colors`), scale text via `tokens.typography.scale`, and increase close button `hitSlop` to `14`.
6. **API Impact:** None.
7. **Necessary Before Integration:** Recommended, though not a hard blocker if `ThemeProvider` is bridged first.

### 2.2 `ThemeProvider.tsx` — Default `themeMode`, `brandGradientEnd` Overwrite & `customColors` Luminance
1. **Exact File Path:** `study-sakha-design-system-native/src/theme/ThemeProvider.tsx` (lines 144, 250–281)
2. **Technical Issue:** `DEFAULT_APPEARANCE.themeMode` is `'light'` instead of `'system'`. Non-custom presets overwrite `colors.brandGradientEnd = colors.secondary`. `customColors` sets `primaryDark = c.primary` without darkening and does not adjust `textInverse`.
3. **Severity & Justification:** `P2 (Medium)` — Causes unexpected gradient colors and potential contrast issues when custom primary colors are bright.
4. **User-Facing or Runtime Impact:** First-launch users with system dark mode start in light mode until toggled; custom light primary colors with white `textInverse` could have low contrast.
5. **Recommended Fix:** Consider `'system'` default if matching `app.json` (`userInterfaceStyle: "automatic"`), preserve `brandGradientEnd` or derive it intentionally, and compute contrast-safe `textInverse` for custom `primary`.
6. **API Impact:** Behavior change on default `DEFAULT_APPEARANCE.themeMode` if changed.
7. **Necessary Before Integration:** Recommended during `StoreProvider` theme bridge design (where `StoreProvider` supplies `themeMode`).

### 2.3 `ScreenContainer.tsx` — Android `KeyboardAvoidingView` Behavior & Missing Offset
1. **Exact File Path:** `study-sakha-design-system-native/src/components/layout/ScreenContainer.tsx` (lines 75–81)
2. **Technical Issue:** Uses `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` without `keyboardVerticalOffset` prop. Combined with `app.json`'s `"softwareKeyboardLayoutMode": "resize"` on Android, `behavior="height"` can double-shrink or leave bottom gaps.
3. **Severity & Justification:** `P2 (Medium)` — Platform-specific keyboard layout quirk.
4. **User-Facing or Runtime Impact:** Forms inside `ScreenContainer` may jump or leave excess space when the Android soft keyboard opens.
5. **Recommended Fix:** Default Android `behavior` to `undefined` (or `'padding'` only when needed) when `softwareKeyboardLayoutMode: "resize"` is active, and expose optional `keyboardVerticalOffset?: number`.
6. **API Impact:** Additive optional prop only.
7. **Necessary Before Integration:** Recommended before migrating form-heavy screens.

### 2.4 `Badge.tsx` — Hardcoded `fontSize` Bypassing `typography.scale`
1. **Exact File Path:** `study-sakha-design-system-native/src/components/feedback/Badge.tsx` (lines 77–86)
2. **Technical Issue:** Overrides `Text` `Caption` size with hardcoded `fontSize: size === 'sm' ? 11 : 12`.
3. **Severity & Justification:** `P2 (Medium)` — Ignores user `typographyScale` accessibility setting.
4. **User-Facing or Runtime Impact:** Badges stay fixed size when users increase text scale.
5. **Recommended Fix:** Multiply `11`/`12` by `tokens.typography.scale` (and adjust `lineHeight` proportionally).
6. **API Impact:** None.
7. **Necessary Before Integration:** Recommended.

### 2.5 `Avatar.tsx` — Missing `onError` Fallback, `accessibilityLabel` & Scaled Font Size
1. **Exact File Path:** `study-sakha-design-system-native/src/components/media/Avatar.tsx` (lines 59–88)
2. **Technical Issue:** `<Image>` lacks `onError` fallback to initials and `accessibilityLabel`. Initials `fontSize: Math.round(size * 0.36)` ignores `tokens.typography.scale`.
3. **Severity & Justification:** `P3 (Low)` — Graceful degradation when remote avatar URLs fail.
4. **User-Facing or Runtime Impact:** Broken avatar URLs render blank circles instead of user initials.
5. **Recommended Fix:** Track `imgError` state (resetting on `source` change) to fall back to initials, and add `accessibilityLabel={name}` on `<Image>`.
6. **API Impact:** None.
7. **Necessary Before Integration:** Recommended.

### 2.6 `SearchInput.tsx` — Extend `RNTextInputProps` & Add `accessibilityRole="search"`
1. **Exact File Path:** `study-sakha-design-system-native/src/components/forms/SearchInput.tsx` (lines 19–25, 50–66)
2. **Technical Issue:** `SearchInputProps` does not extend `RNTextInputProps`, blocking `autoFocus`, `onSubmitEditing`, `editable`, and `testID`. Also omits `accessibilityRole="search"`.
3. **Severity & Justification:** `P3 (Low)` — Limits keyboard submit and E2E `testID` hooks.
4. **User-Facing or Runtime Impact:** Search screens cannot auto-focus or handle keyboard "Search" submit without modifying the component.
5. **Recommended Fix:** Extend `Omit<RNTextInputProps, 'style' | 'value' | 'onChangeText'>` and spread `...rest` onto `RNTextInput`.
6. **API Impact:** Additive/widening (100% backwards-compatible).
7. **Necessary Before Integration:** Recommended.

---

## Group 3: Safe to Defer

### 3.1 `FloatingButton.tsx` — Outer `Animated.View` `style` Forwarding
1. **Exact File Path:** `study-sakha-design-system-native/src/components/buttons/FloatingButton.tsx` (lines 61–84)
2. **Technical Issue:** Same `Animated.View` wrapper pattern as `Button.tsx` (`style` applied to inner `Pressable`, outer `Animated.View` has `alignSelf: 'flex-start'`).
3. **Severity & Justification:** `P2 (Medium)` — Lower urgency than `Button.tsx` because `FloatingButton` is typically positioned via an outer container `View` with `position: 'absolute'`.
4. **User-Facing or Runtime Impact:** Passing `position: 'absolute'` directly in `FloatingButton`'s `style` prop would apply to the inner `Pressable` rather than the outer `Animated.View`.
5. **Recommended Fix:** Forward positioning/margin `style` to `Animated.View` or add `containerStyle`.
6. **API Impact:** None (if `containerStyle` is additive) or minor layout behavior alignment.
7. **Necessary Before Integration:** Safe to defer if positioned inside a wrapper `View`, though easy to fix alongside `Button.tsx`.

### 3.2 `ProgressCard.tsx` — Unclamped `progress` Text in Footer
1. **Exact File Path:** `study-sakha-design-system-native/src/components/cards/ProgressCard.tsx` (lines 62–65)
2. **Technical Issue:** `ProgressBar` clamps `value` to `0..100`, but `ProgressCard` renders `${progress}%` directly in its footer.
3. **Severity & Justification:** `P3 (Low)` — Edge case only when callers pass `< 0` or `> 100`.
4. **User-Facing or Runtime Impact:** Could display `120%` next to a 100%-filled bar.
5. **Recommended Fix:** Clamp `const clamped = Math.max(0, Math.min(100, progress))` before rendering.
6. **API Impact:** None.
7. **Necessary Before Integration:** Safe to defer.

### 3.3 `FeatureCard.tsx` — Hardcoded `actionText` `fontSize: 13`
1. **Exact File Path:** `study-sakha-design-system-native/src/components/cards/FeatureCard.tsx` (line 123)
2. **Technical Issue:** `styles.actionText` sets `fontSize: 13`, overriding `Caption` scaling.
3. **Severity & Justification:** `P3 (Low)` — Minor typography scaling inconsistency.
4. **User-Facing or Runtime Impact:** Action label doesn't scale with `typographyScale`.
5. **Recommended Fix:** Use `Math.round(13 * tokens.typography.scale)` or `variant="InputLabel"`.
6. **API Impact:** None.
7. **Necessary Before Integration:** Safe to defer.

### 3.4 `StatItem.tsx` — Missing `flex: 1, minWidth: 0` on Text Container
1. **Exact File Path:** `study-sakha-design-system-native/src/components/data-display/StatItem.tsx` (line 38)
2. **Technical Issue:** Right `<View>` wrapping `value` and `label` has no `flex: 1, minWidth: 0`.
3. **Severity & Justification:** `P3 (Low)` — Only manifests in narrow multi-column cards with long labels.
4. **User-Facing or Runtime Impact:** Long stat labels may push outside narrow parent containers instead of wrapping.
5. **Recommended Fix:** Add `style={{ flex: 1, minWidth: 0 }}` to the text `<View>`.
6. **API Impact:** None.
7. **Necessary Before Integration:** Safe to defer.

### 3.5 `ListItem.tsx` — Missing `disabled` Prop
1. **Exact File Path:** `study-sakha-design-system-native/src/components/data-display/ListItem.tsx` (lines 12–21, 55–57)
2. **Technical Issue:** `ListItemProps` supports `onPress` but has no `disabled?: boolean` prop.
3. **Severity & Justification:** `P3 (Low)` — Feature completeness gap.
4. **User-Facing or Runtime Impact:** Callers must conditionally omit `onPress` and manually dim `style` to disable a row.
5. **Recommended Fix:** Add `disabled?: boolean` to `ListItemProps`, pass to `Pressable` with `accessibilityState={{ disabled }}` and reduced opacity.
6. **API Impact:** Additive optional prop only.
7. **Necessary Before Integration:** Safe to defer.

### 3.6 `BottomSheet.tsx` — Hardcoded `maxWidth: 540`
1. **Exact File Path:** `study-sakha-design-system-native/src/components/overlays/BottomSheet.tsx` (line 89)
2. **Technical Issue:** `styles.sheet` hardcodes `maxWidth: 540` instead of `tokens.dimensions.modalMaxWidth` (`480`).
3. **Severity & Justification:** `P3 (Low)` — Minor token consistency item on tablets.
4. **User-Facing or Runtime Impact:** Negligible on phones (`width < 480`); slightly wider sheet on tablets.
5. **Recommended Fix:** Use `tokens.dimensions.modalMaxWidth` (or add a `sheetMaxWidth` token).
6. **API Impact:** None.
7. **Necessary Before Integration:** Safe to defer.

### 3.7 `Radio.tsx` — Callback Naming Inconsistency (`onPress` vs `onChange`)
1. **Exact File Path:** `study-sakha-design-system-native/src/components/forms/Radio.tsx` (line 13)
2. **Technical Issue:** `Checkbox` and `Switch` use `onChange?: (checked: boolean) => void`, while `Radio` uses `onPress?: () => void`.
3. **Severity & Justification:** `P3 (Low)` — Ergonomic/API naming difference (reasonable for radio items, since unchecking a single radio directly isn't standard).
4. **User-Facing or Runtime Impact:** None at runtime; minor developer ergonomics consideration.
5. **Recommended Fix:** Keep `onPress` (or optionally alias `onChange` if desired, though `onPress` is idiomatic for individual `Radio` items).
6. **API Impact:** Changing `onPress` to `onChange` would be breaking — **do not break**.
7. **Necessary Before Integration:** Safe to defer.
