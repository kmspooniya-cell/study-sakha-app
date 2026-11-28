# Study Sakha Design System v1.0 — P2 & P3 Remediation Report

**Date:** 2026-11-28  
**Package:** `study-sakha-design-system-native/`  
**Scope:** Implementation of the 8 **Must Fix Before Integration** findings and 6 **Recommended Improvements** findings from `docs/P2_P3_REVIEW.md`. All 7 **Safe to Defer** findings were intentionally excluded, and the existing Study Sakha application was not modified.

---

## Summary

- **Must Fix Before Integration (8/8):** Fixed
- **Recommended Improvements (6/6):** Fixed
- **Safe to Defer (7):** Intentionally untouched
- **P1 Fixes Preserved (5/5):** Verified intact (`ThemeProvider.tsx`, `typography.ts`, `Slider.tsx`, `Switch.tsx`, `Thumbnail.tsx`)
- **Package-scoped TypeScript (`tsc --noEmit`):** **Passed (0 errors)**
- **Unit Tests:** Not executed (standalone package has no test runner/suite)
- **Android Device Verification:** Not performed

---

## Findings Implemented

### Must Fix Before Integration (8)

| # | File(s) Modified | Status | Summary of Fix | API Changes |
| --- | --- | --- | --- | --- |
| 1.1 | `src/components/buttons/Button.tsx` | Fixed | Forwarded `flex`/`alignSelf` and optional `containerStyle` to outer `Animated.View`; added `flexShrink: 1` on `RNText`; used `#C63636` with `#FFFFFF` in dark `destructive` for >= 4.5:1 contrast. | Additive optional `containerStyle?: StyleProp<ViewStyle>` |
| 1.2 | `src/components/forms/TextInput.tsx` | Fixed | Defaulted `accessibilityLabel={rest.accessibilityLabel ?? label}`; scaled multiline `minHeight` by `tokens.typography.scale`; increased password toggle `hitSlop={14}`; added `inputStyle`. | Additive optional `inputStyle?: StyleProp<TextStyle>` |
| 1.3 | `src/components/layout/SectionHeader.tsx` | Fixed | Replaced dual collapsible focus stops (`Pressable` + `IconButton`) with a single `Pressable` (`minHeight: 44`) containing `leftContent` and chevron `Icon`. | None |
| 1.4 | `src/templates/ListingScreen.tsx` | Fixed | Replaced root `<View>` with `<SafeAreaView edges={['left', 'right']}>` and forwarded `FlatList` props (`refreshing`, `onRefresh`, `onEndReached`, `onEndReachedThreshold`, `ListHeaderComponent`, `ListFooterComponent`, `numColumns`, `style`). | Additive optional props only |
| 1.5 | `src/components/layout/PageLayout.tsx` (fixes `FormScreen.tsx`) | Fixed | Moved `KeyboardAvoidingView` to wrap both `ScreenContainer` (`keyboardAvoiding={false}`) and `footer` when `keyboardAvoiding` is enabled. | None |
| 1.6 | `src/components/overlays/Dialog.tsx`, `BottomSheet.tsx`, `src/components/forms/Select.tsx` | Fixed | Added `accessible={false}` on backdrop `Pressable` and `accessibilityViewIsModal` on modal cards/sheets; added `ScrollView` + `flexWrap: 'wrap'` in `Dialog`; switched `Select` `FlatList` to `contentContainerStyle` and added `errorText`/`required`. | Additive optional `errorText`, `required` on `Select` |
| 1.7 | `src/components/forms/Checkbox.tsx`, `Radio.tsx`, `SegmentedControl.tsx`, `src/components/navigation/TabBar.tsx` | Fixed | Enforced `minHeight: 44` (and `hitSlop={12}` on `Checkbox`/`Radio`); scaled `SegmentedControl` `fontSize` by `tokens.typography.scale`; added `accessibilityRole="tablist"` and `truncate` to `TabBar`. | None |
| 1.8 | `src/components/data-display/CircularProgress.tsx` | Fixed | Moved `-90deg` rotation to `<Circle rotation="-90" origin={...} />`; clamped `r = Math.max(1, (size - strokeWidth) / 2)`; scaled label `fontSize` by `tokens.typography.scale`. | None |

### Recommended Improvements (6)

| # | File(s) Modified | Status | Summary of Fix | API Changes |
| --- | --- | --- | --- | --- |
| 2.1 | `src/theme/ThemeProvider.tsx`, `src/components/feedback/Toast.tsx`, `Snackbar.tsx` | Fixed | Removed duplicated `NativeToastItem` and inline snackbar JSX in `ThemeProvider.tsx` by rendering `Toast` and `Snackbar` directly; scaled text with `tokens.typography.scale`; set close `hitSlop={14}`; used semantic color tokens. | None |
| 2.2 | `src/theme/ThemeProvider.tsx` | Fixed | Changed `DEFAULT_APPEARANCE.themeMode` to `'system'`; removed `brandGradientEnd` overwrite for non-custom presets; added `darkenHex` (`primaryDark`) and luminance-based `textInverse` for custom `primary`. | Default `DEFAULT_APPEARANCE.themeMode` changed from `'light'` to `'system'` |
| 2.3 | `src/components/layout/ScreenContainer.tsx` | Fixed | Set Android `KeyboardAvoidingView` `behavior` to `undefined` (avoiding double-resize with `softwareKeyboardLayoutMode: "resize"`) and added `keyboardVerticalOffset`. | Additive optional `keyboardVerticalOffset?: number` |
| 2.4 | `src/components/feedback/Badge.tsx` | Fixed | Scaled `fontSize` (`11`/`12`) by `tokens.typography.scale`. | None |
| 2.5 | `src/components/media/Avatar.tsx` | Fixed | Added `imgError` fallback to initials reset on `sourceKey` change, `accessibilityLabel={name}` on `<Image>`, and scaled initials `fontSize` by `tokens.typography.scale`. | None |
| 2.6 | `src/components/forms/SearchInput.tsx` | Fixed | Extended `Omit<RNTextInputProps, 'style' | 'value' | 'onChangeText'>`, spread `...rest` before controlled handlers, and defaulted `accessibilityRole="search"`. | Widening/additive `RNTextInputProps` support |

---

## Remaining Concerns & Verification Status

1. **TypeScript Check:** `pnpm exec tsc -p study-sakha-design-system-native/tsconfig.json --noEmit` passed with **0 errors** after all edits.
2. **Runtime & Android Device Verification:** Not yet executed. TalkBack focus traversal inside `Modal` overlays (`Dialog`, `BottomSheet`, `Select`), `CircularProgress` `<Circle rotation="-90" />` rendering on Android, `KeyboardAvoidingView` behavior with `FormScreen`, and `ThemeProvider` toast/snackbar rendering require runtime and physical/emulator Android testing.
3. **Study Sakha Integration:** Package remains completely independent; integration still requires bridging `ThemeProvider` and colliding component names with `lib/theme.tsx`, `StoreProvider`, and `components/ui.tsx`.
