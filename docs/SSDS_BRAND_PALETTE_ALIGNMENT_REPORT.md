# Study Sakha — Authoritative Brand Palette Alignment Report

**Date:** 2026-11-28  
**Scope:** Brand palette alignment across SSDS tokens, legacy `lib/theme.tsx`, `lib/ssdsThemeBridge.tsx`, `screens/SettingsScreen.tsx`, `screens/DashboardScreen.tsx`, and `components/Charts.tsx` (without beginning Phase 2 component migration).

---

## 1. Exact Files Changed (and Preserved)

| File | Status | Purpose |
|---|---|---|
| `study-sakha-design-system-native/src/theme/tokens/colors.ts` | **Inspected & Preserved** | `BASE_LIGHT_COLORS`, `BASE_DARK_COLORS`, and `THEME_PRESETS[0]` (`classic`) already matched the authoritative Blue–Teal–Amber Light & Dark palettes. Kept as the single source of truth. |
| `lib/store.tsx` | **Inspected & Preserved** | `initialState.settings.accentColor` (`'indigo'`) already maps to SSDS `'classic'` (`#2B4C7E` / `#6B9CE8`) and `lib/theme.tsx` default brand primary. No changes required. |
| `lib/theme.tsx` | **Modified** | Aligned `brand`, `lightPalette`, `darkPalette`, `accentValues.indigo`, `info` preservation, `primaryLight`, `chartPrimary`/`chartSecondary`/`chartTertiary`, and wallpaper blending bases (`#F7F8FA` / `#0D1117`). |
| `lib/ssdsThemeBridge.tsx` | **Modified** | Updated `computeBlendedBackground` base colors from `rgba(242,242,247,...)` / `rgba(12,18,32,...)` to `rgba(247,248,250,...)` (`#F7F8FA`) and `rgba(13,17,23,...)` (`#0D1117`). |
| `screens/SettingsScreen.tsx` | **Modified** | Updated `ACCENT_PALETTES.indigo` (`Study Sakha Blue`, `#2B4C7E`) and default `customBrandHex` / `hexDraft` / placeholder values from `#4f46e5` to `#2B4C7E`, preserving all other accent presets. |
| `screens/DashboardScreen.tsx` | **Modified** | Replaced local hardcoded `LIGHT_PALETTE` and `DARK_PALETTE` with `buildDashboardPalette(colors, isDark)` driven by central `useTheme().colors` tokens without altering layout, typography, spacing, radius, shadows, or workflows. |
| `components/Charts.tsx` | **Modified** | Updated `BarChart`, `LineChart`, and `HeatMap` defaults to use `colors.chartPrimary` (`#2B4C7E` / `#6B9CE8`) and `colors.chartSecondary` (`#2E6F6B` / `#4FB0A8`). |
| `test/theme.test.tsx` | **Modified** | Added unit assertions verifying all 15 authoritative Light & Dark palette tokens in `lightPalette` and `darkPalette`. |
| `test/ssdsThemeBridge.test.tsx` | **Modified** | Updated wallpaper blending assertions (`rgba(247,248,250,...)` and `rgba(13,17,23,0.5)`) to match the aligned `#F7F8FA` / `#0D1117` base colors. |

---

## 2. Old vs. New Token Mappings

### Light Mode (`lib/theme.tsx` `lightPalette`)

| Token | Old Value | New Authoritative Value |
|---|---|---|
| `brandPrimary`, `blue`, `focus`, `selected` | `#007AFF` (or `#4f46e5` via `accentValues.indigo`) | `#2B4C7E` |
| `primaryLight`, `tint`, `selectedSurface` | `rgba(0,122,255,0.08)` | `#EBF1FA` |
| `brandSecondary`, `teal` | `#34C759` / `#5AC8FA` | `#2E6F6B` |
| `brandAccent`, `amber` | `#AF52DE` / `#F5A524` | `#B87314` |
| `bg`, `surfaceBase` | `#F2F2F7` | `#F7F8FA` |
| `surface`, `surfaceRaised` | `#FFFFFF` | `#FFFFFF` |
| `text`, `textPrimary`, `dark` | `#1C1C1E` | `#111827` |
| `border` | `#E5E5EA` | `#E2E7EF` |
| `success`, `green` | `#34C759` | `#1E7E4E` |
| `warning`, `orange` | `#FF9500` | `#B4690E` |
| `danger`, `red` | `#FF3B30` | `#C63636` |
| `info` | `#007AFF` (previously overwritten by `accent`) | `#1F639B` (preserved independently) |
| `chartPrimary` | *(absent)* | `#2B4C7E` |
| `chartSecondary` | *(absent)* | `#2E6F6B` |
| `chartTertiary` | *(absent)* | `#B87314` |

### Dark Mode (`lib/theme.tsx` `darkPalette`)

| Token | Old Value | New Authoritative Value |
|---|---|---|
| `brandPrimary`, `blue`, `focus`, `selected` | `#6F95FF` | `#6B9CE8` |
| `primaryLight`, `tint`, `selectedSurface` | `rgba(111,149,255,0.15)` | `#1B283D` |
| `brandSecondary`, `teal` | `#2BD69B` / `#5AC8FA` | `#4FB0A8` |
| `brandAccent`, `amber` | `#9A82FF` / `#F5A524` | `#E09F3E` |
| `bg`, `surfaceBase` | `#0C1220` | `#0D1117` |
| `surface`, `surfaceRaised` | `#141C2E` | `#161C26` / `#1F2735` |
| `text`, `textPrimary`, `dark` | `#EDF1F8` | `#F1F5F9` |
| `border` | `#253049` | `#263040` |
| `success`, `green` | `#2BD69B` | `#3FB97C` |
| `warning`, `orange` | `#FFB84D` | `#E5A13E` |
| `danger`, `red` | `#FF6B70` | `#E86161` |
| `info` | `#6F95FF` (previously overwritten by `accent`) | `#5AA4E8` (preserved independently) |
| `chartPrimary` | *(absent)* | `#6B9CE8` |
| `chartSecondary` | *(absent)* | `#4FB0A8` |
| `chartTertiary` | *(absent)* | `#E09F3E` |

---

## 3. Preserved Customizations & Design Constraints

- **User-Selected `accentColor` & `customAccentHex`:** `ThemeProvider` in `lib/theme.tsx` and `SSDSThemeProvider` in `lib/ssdsThemeBridge.tsx` apply `customAccentHex` when valid and non-default `accentColor` presets (`amber`, `emerald`, `rose`, `violet`, `teal`, `slate`) without overwriting them on theme mode changes.
- **Independent `info` Colors:** `ThemeProvider` no longer overwrites `colors.info` with the selected accent color (`#1F639B` light / `#5AA4E8` dark).
- **Settings Presets:** All existing `ACCENT_PALETTES` presets in `screens/SettingsScreen.tsx` (`emerald`, `amber`, `rose`, `teal`, `slate`) were preserved; only the default `indigo` preset (`Study Sakha Blue`, `#2B4C7E`) and default custom hex placeholder (`#2B4C7E`) were updated.
- **High Contrast, Wallpaper & Sync:** `highContrast` border overrides (`#334155` light / `#94a3b8` dark), `backgroundOpacity` / `overlayIntensity` blending, and `AccountSyncEngine` synchronization remain intact.
- **Strict Design Preservation:** Zero changes were made to spacing, typography, font sizes, radius, shadows, component dimensions, layouts, animations, or existing workflows.

---

## 4. Verification Results

| Check | Command | Result | Notes |
|---|---|---|---|
| **SSDS Package TypeScript** | `pnpm exec tsc --noEmit -p study-sakha-design-system-native/tsconfig.json` | **PASS** (exit 0) | 0 errors. |
| **Scoped Application TypeScript** | `pnpm exec tsc --noEmit --pretty false \| grep -E "^(lib/theme\.tsx\|...)"` | **PASS** | 0 errors in all scoped files (`lib/theme.tsx`, `lib/ssdsThemeBridge.tsx`, `lib/store.tsx`, `screens/DashboardScreen.tsx`, `screens/SettingsScreen.tsx`, `components/Charts.tsx`, `test/theme.test.tsx`). |
| **Expo ESLint (Core Theme & Test Files)** | `EXPO_NO_TELEMETRY=1 pnpm exec expo lint lib/theme.tsx lib/ssdsThemeBridge.tsx components/Charts.tsx test/theme.test.tsx test/ssdsThemeBridge.test.tsx` | **PASS** (exit 0) | 0 errors, 6 pre-existing warnings (`unused-vars` in `lib/theme.tsx` L281 and `no-require-imports` in `test/ssdsThemeBridge.test.tsx`). |
| **Theme, Store, Sync, SSDS Bridge, Dashboard & Settings Jest** | `pnpm test -- test/theme.test.tsx test/ssdsThemeBridge.test.tsx test/store.reducer.test.tsx test/store.persistence.test.tsx test/accountSync.test.tsx test/dashboardHomepageRedesign.test.tsx test/settingsScreen.test.tsx --runInBand --forceExit` | **PASS** (7/7 suites, 26/26 tests) | All tests passed after final edits. |
| **Hardcoded Old Brand Color Search** | `grep -rn -i -E "4f46e5\|007AFF\|F2F2F7\|1C1C1E\|E5E5EA\|0C1220\|141C2E\|6F95FF\|F6F8FB\|12101D\|1C182D\|19C5B5"` across all 7 scoped files | **PASS** | 0 brand-token occurrences remain; only 1 unrelated category icon badge (`MAIN_CATEGORIES` `account` in `screens/SettingsScreen.tsx` L135) remains. |

---

## 5. Unresolved Issues

1. **Physical Android Device Verification:** Not performed in this session (no Android SDK or connected device/emulator in Codespace).
2. **Pre-existing ESLint Findings in `DashboardScreen.tsx` & `SettingsScreen.tsx`:** Unrelated pre-existing `react-hooks/set-state-in-effect` and `react-hooks/refs` lint errors exist in untouched sections of `screens/DashboardScreen.tsx` and `screens/SettingsScreen.tsx`.
