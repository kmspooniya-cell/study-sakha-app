# Testing Status — Study Sakha

## Left Drawer Removal & Header Three-Dot Menu — 2026-11-27
- Focused Jest suites (`test/drawerSettingsNavigation.test.tsx`, `test/navigationLayoutFixes.test.tsx`, `test/navigationBack.test.tsx`): **PASS** — 3 suites, 18 tests passed (including 12 consecutive Android Settings navigation cycles, overflow menu options, outside tap, and Help/Share actions). `test/settingsScreen.test.tsx` failed on pre-existing missing `useRoute` mock in that test file.
- Expo lint (`EXPO_NO_TELEMETRY=1 pnpm exec expo lint`): **PASS**.
- TypeScript (`tsc --noEmit`): **0 errors** in all modified files (`App.tsx`, `components/Shell.tsx`, `lib/navigation.ts`, `screens/FocusCenterScreen.tsx`, `screens/GroupsScreen.tsx`, `screens/SettingsScreen.tsx`, `test/drawerSettingsNavigation.test.tsx`); repository-wide `tsc` still has pre-existing diagnostics in other test/screen files.
- Physical Android device/tablet runtime: **NOT VERIFIED** (no connected Android device/emulator in Codespace).

## Unified Study Data Flow & Focus Subject/Activity Integration — 2026-11-27
- Focused Jest suites (`test/unifiedStudyDataFlow.test.tsx`, `test/focusSessionSetupModal.test.tsx`, `test/focusUnifiedRefactor.test.tsx`, `test/focusUiSurface.test.tsx`, `test/focusHistory.test.tsx`, `test/statistics.test.tsx`, `test/focusCompletionScreen.test.tsx`, `test/focusCompletionNavigation.test.tsx`, `test/preferredSubjects.test.tsx`, `test/store.reducer.test.tsx`): **PASS** (re-verified after final test import fix).
- Expo lint (`EXPO_NO_TELEMETRY=1 pnpm exec expo lint`): **PASS**.
- TypeScript (`tsc --noEmit`): **0 errors** in all modified/added files; repository-wide `tsc` still has pre-existing unrelated diagnostics in `screens/GroupsScreen.tsx` and other test files.
- Android/web visual runtime: **NOT VERIFIED** (no connected Android device/emulator in Codespace).

## Subject Preferences Structure Redesign — 2026-11-27
- Focused Jest suites (`test/preferredSubjects.test.tsx`, `test/settingsScreen.test.tsx`, `test/studyPlannerFilters.test.tsx`, `test/focusSessionSetupModal.test.tsx`): **PASS** — 4 suites, 16 tests passed.
- Expo lint (`EXPO_NO_TELEMETRY=1 pnpm exec expo lint`): **PASS** — 0 errors, 0 warnings.
- TypeScript (`tsc --noEmit`): **0 errors** in `lib/subjectRegistry.ts`, `components/PreferredSubjectsManager.tsx`, `components/FocusSessionSetupModal.tsx`, `screens/SettingsScreen.tsx`, and `test/preferredSubjects.test.tsx`; repository-wide `tsc` still fails on pre-existing unrelated diagnostics in `screens/GroupsScreen.tsx` and other test files.
- Android/web visual runtime: **NOT VERIFIED** (no connected device/emulator in Codespace).

## Preferred Subjects UI Redesign — 2026-11-27
- Focused Jest suites (`test/preferredSubjects.test.tsx`, `test/settingsScreen.test.tsx`, `test/studyPlannerFilters.test.tsx`): **PASS** — 3 suites, 13 tests passed.
- Expo lint (`EXPO_NO_TELEMETRY=1 pnpm exec expo lint`): **PASS** — 0 errors, 0 warnings.
- TypeScript (`tsc --noEmit`): **0 errors** in `components/PreferredSubjectsManager.tsx`, `screens/SettingsScreen.tsx`, and `test/preferredSubjects.test.tsx`; repository-wide `tsc` still fails on pre-existing unrelated diagnostics in `screens/GroupsScreen.tsx` and other test files.
- Android phone/tablet/web visual runtime: **NOT VERIFIED** (no connected device/emulator in Codespace).

## Groups header alignment patch — 2026-11-27
- Expo lint: **PASS**.
- `git diff --check`: **PASS**.

## Groups main screen redesign — 2026-11-27

| Check | Result | Notes |
|---|---|---|
| Focused Groups regression tests | **PASS** | 4 suites, 25 tests passed. Existing icon-font `act(...)` warnings only. |
| Expo lint | **PASS** | No reported errors/warnings. |
| TypeScript | **FAIL (repository baseline)** | No GroupsScreen diagnostics; existing Jest typing errors remain in test files. |
| Android/tablet/web visual runtime | **NOT VERIFIED** | No device/emulator/browser capture available. |

## Group Details tab-bar repair — 2026-11-27

| Check | Result | Notes |
|---|---|---|
| Focused Groups tests | **PASS** | 2 suites, 8 tests passed. |
| Expo lint | **PASS** | No reported errors/warnings. |
| TypeScript | **FAIL (repository baseline)** | No GroupsScreen diagnostics; existing Jest typing errors remain elsewhere. |
| Android/tablet/web visual runtime | **NOT VERIFIED** | No device/emulator/browser capture was available in this environment. |

## Groups redesign validation — 2026-11-27

| Check | Result | Notes |
|---|---|---|
| Focused Groups/chat tests | **PASS** | `pnpm test -- test/groupChatAndFocusDecoupling.test.tsx test/groupRealtimeSubscription.test.tsx --runInBand --forceExit`; 2 suites, 8 tests passed. |
| Expo lint | **PASS** | `EXPO_NO_TELEMETRY=1 pnpm exec expo lint`; no reported errors/warnings. |
| TypeScript | **FAIL (repository baseline)** | GroupsScreen has no remaining diagnostics; `pnpm run lint` still fails on existing Jest global/type errors in test files. |
| Full Jest | **FAIL (repository baseline)** | `pnpm run test:ci`: 46/50 suites passed, 223/232 tests passed. Four existing focus-session setup, planner-focus integration, and notification lifecycle failures remain. |
| Android/Expo Go runtime | **NOT VERIFIED** | No `adb`, emulator, or physical Android device is available. |
| Live Supabase multi-client/restart | **NOT VERIFIED** | Requires authenticated live accounts and deployed Realtime/RLS environment. |

## Alarm Module Integration — 2026-11-27
- TypeScript (`pnpm run lint`): **FAIL / pre-existing workspace errors** in `screens/GroupsScreen.tsx` and untracked test typings; no errors remain from alarm files or route integration.
- Expo lint (`EXPO_NO_TELEMETRY=1 pnpm exec expo lint`): **PASS** — 0 errors, 0 warnings.
- Focused Jest: **PASS** — 2 suites, 12 tests.
- Full Jest (`pnpm run test:ci`): **FAIL** — 43 suites passed, 6 failed; 202 tests passed, 21 failed. Existing focus/group/planner/notification/stability suites failed.
- Device/runtime navigation, alarm scheduling/ringing, CRUD persistence, dark/light behavior, and four-theme visual checks: **NOT VERIFIED** — no connected Android device/emulator in Codespace.

## Preferred Subjects & Study Planner Integration — 2026-11-26

- Focused Jest suites (`test/preferredSubjects.test.tsx`, `test/settingsScreen.test.tsx`, `test/studyPlannerFilters.test.tsx`): **PASS** — **3/3 suites passed, 10/10 tests passed**.
- TypeScript (`pnpm run lint` / `tsc --noEmit`): **0 errors** in all modified/created files (`lib/subjectRegistry.ts`, `lib/store.tsx`, `components/PreferredSubjectsManager.tsx`, `screens/SettingsScreen.tsx`, `screens/StudyPlannerScreen.tsx`, `test/preferredSubjects.test.tsx`); overall `tsc` fails only on pre-existing uncommitted `test/notifications.test.tsx`.

## Group Hall Banner Removal, Direct Entry, Focus Decoupling & Group Chat Realtime Sync — 2026-11-26

- Focused Jest suites (`test/groupChatAndFocusDecoupling.test.tsx`, `test/focusUnifiedRefactor.test.tsx`, `test/globalFocusBar.test.tsx`, `test/fourFixesRegression.test.tsx`, `test/groupInvitesAndSync.test.tsx`) & ESLint (`components/ActiveSessionBar.tsx`): **PASS** — **5/5 suites passed, 25/25 tests passed**, 0 lint errors.
  - Personal Focus Mode `ActiveSessionBar` visibility, timer/pause/resume/`Back to Focus` controls, and decoupling from Group Hall membership verified.
  - Group Hall-specific banner (`Return to Hall`, room/group name) verified absent across screens.
  - Silent Focus Hall card clickability and separate "Join room" button removal verified.
  - Group Room exit decoupling from personal focus session verified.
  - Group Chat database migration, RLS policies, message RPCs, and Realtime event handling verified.


## Drawer Settings, Profile Hero Card & Share with Friends Validation — 2026-11-26

- Focused Jest suites (`test/drawerSettingsNavigation.test.tsx`, `test/profileLayout.test.tsx`, `test/fourFixesRegression.test.tsx`, `test/navigationLayoutFixes.test.tsx`): **PASS** — **4/4 suites, 13/13 tests** (includes new Android fallback timer and Share with friends tests).
- Android APK build & physical device runtime: **BLOCKED** in Codespace (`ANDROID_HOME` unset, no Android SDK, no connected Android device/emulator, `eas whoami` unconfigured, and `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `EXPO_PUBLIC_API_BASE_URL` missing in container `.env`).

## Four Targeted UI & Form Fixes Validation — 2026-11-26

- Focused Jest suites (`test/fourFixesRegression.test.tsx`, `test/focusUnifiedRefactor.test.tsx`, `test/profileLayout.test.tsx`, `test/plannerRecovery.test.tsx`, `test/studyPlannerFilters.test.tsx`, `test/groupInvitesAndSync.test.tsx`): **PASS** — **6/6 suites, 32/32 tests**.

## Focus Centre & Group Hall Unified Refactor Validation — 2026-11-26

- `npx tsc --noEmit`: **PASS** on all modified/created files (**0 errors** in `App.tsx`, `components/ActiveSessionBar.tsx`, `components/FloatingFocusBar.tsx`, `components/FocusSessionSetupModal.tsx`, `components/GeminiFocusTimer.tsx`, `components/RoomHeader.tsx`, `lib/focusSession.tsx`, `lib/groupActivitySync.ts`, `lib/groupRoomRealtime.ts`, `lib/groupSyncErrors.ts`, `screens/FocusCenterScreen.tsx`, `screens/GroupsScreen.tsx`, `screens/SmartStudyRoomScreen.tsx`, `test/focusUnifiedRefactor.test.tsx`); **FAIL** overall due to 66 pre-existing errors in `test/focusImprovements.test.tsx`.
- Focused ESLint (`components/FocusSessionSetupModal.tsx`, `components/GeminiFocusTimer.tsx`, `components/ActiveSessionBar.tsx`, `components/FloatingFocusBar.tsx`, `components/RoomHeader.tsx`, `lib/groupSyncErrors.ts`, `lib/groupRoomRealtime.ts`, `lib/groupActivitySync.ts`, `screens/FocusCenterScreen.tsx`): **PASS** (**0 errors, 0 warnings**). `lib/focusSession.tsx` has 3 pre-existing React Compiler lint errors (`react-hooks/refs`, `react-hooks/set-state-in-effect`).
- Focused Jest suites (`test/focusUnifiedRefactor.test.tsx`, `test/focusSessionSetupModal.test.tsx`, `test/focusSessionSetup.test.tsx`, `test/focusUiSurface.test.tsx`, `test/globalFocusBar.test.tsx`, `test/groupActivitySync.test.tsx`, `test/groupInvitesAndSync.test.tsx`, `test/groupRooms.join.test.tsx`, `test/navigationLayoutFixes.test.tsx`, `test/drawerSettingsNavigation.test.tsx`, `test/navigationBack.test.tsx`): **PASS** (**11/11 suites**, **73/73 tests** — `test/focusUnifiedRefactor.test.tsx` 8/8 after final edit; other 10 suites 65/65).
- Expo public config (`EXPO_NO_TELEMETRY=1 pnpm exec expo config --type public --json`): **PASS**.
- Release config validator (`pnpm run validate:release -- preview`): **FAIL** (missing `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_BASE_URL` in container `.env`).
- Maestro E2E / Physical Android device / Live offline-to-online Supabase toggle: **NOT VERIFIED** (no Android SDK or connected device/emulator in Codespace).

## Study Groups Audit & Fix Validation — 2026-11-26

- Focused Jest suites (`test/groupInvitesAndSync.test.tsx`, `test/groupRooms.join.test.tsx`, `test/focusSessionSetup.test.tsx`, `test/groupActivitySync.test.tsx`): **PASS** — **4 suites passed, 4 total; 42 tests passed, 42 total**.
- `npx tsc --noEmit`: **PASS** on all modified/created files (**0 errors** in `App.tsx`, `app.config.js`, `lib/groupRooms.ts`, `lib/navigation.ts`, `lib/shareLinks.ts`, `screens/GroupsScreen.tsx`, `test/groupInvitesAndSync.test.tsx`, `test/focusSessionSetup.test.tsx`); **FAIL** overall due to 66 pre-existing errors in `test/focusImprovements.test.tsx`.
- Expo public config (`EXPO_NO_TELEMETRY=1 pnpm exec expo config --type public --json`): **PASS**.
- Live Supabase migration `202611260001_group_invites_discovery_and_realtime.sql` deployment & two-device APK deep link test: **NOT VERIFIED** (requires live Supabase push & EAS build on Android devices).

## Bottom Nav, Dashboard Cleanup & Drawer-Settings Navigation Validation — 2026-11-26

- `npx tsc --noEmit`: **PASS** on all modified/created files (**0 errors** in `App.tsx`, `components/Shell.tsx`, `screens/*`, `test/navigationLayoutFixes.test.tsx`, `test/drawerSettingsNavigation.test.tsx`); **FAIL** overall due to 66 pre-existing errors in untracked `test/focusImprovements.test.tsx`.
- Focused ESLint (`components/Shell.tsx`, `screens/ProfileScreen.tsx`, `screens/PYQScreen.tsx`, `screens/NotificationsScreen.tsx`, `screens/StatisticsScreen.tsx`): **PASS** (0 errors, 0 warnings). `App.tsx` has 0 errors in modified drawer logic (1 pre-existing `react-hooks/set-state-in-effect` error on line 496 `openNotificationRoute()`). `test/navigationLayoutFixes.test.tsx` and `test/drawerSettingsNavigation.test.tsx`: **0 errors** (require-import warnings only).
- Focused Jest suites (`test/navigationLayoutFixes.test.tsx`, `test/drawerSettingsNavigation.test.tsx`, `test/navigationBack.test.tsx`, `test/settingsScreen.test.tsx`, `test/profileLayout.test.tsx`): **PASS** — **5 suites passed, 5 total; 18 tests passed, 18 total**.
- Full Jest suite (`pnpm test -- --runInBand --forceExit`): **39 suites passed, 3 failed (42 total); 186 tests passed, 4 failed (190 total)**. All 3 failing suites (`test/studyPlannerFocusIntegration.test.tsx`, `test/notificationLifecycle.test.tsx`, `test/globalFocusBar.test.tsx`) are pre-existing untracked tests from prior workspace work.
- Expo public config (`EXPO_NO_TELEMETRY=1 pnpm exec expo config --type public --json`): **PASS**.
- Release config validator (`pnpm run validate:release -- preview`): **FAIL** (exit 1 — missing `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_BASE_URL` in container `.env`, expected per `ISSUE-003`).
- Android device runtime & physical touch/scroll checks: **NOT VERIFIED** (no Android SDK or connected device/emulator in Codespace).

## Study Planner Recovery & Normalization Validation — 2026-11-26

- `npx tsc --noEmit`: **PASS** (0 errors).
- `EXPO_NO_TELEMETRY=1 npx expo lint`: **PASS** (0 errors, 0 warnings).
- `pnpm test -- --runInBand --forceExit`: **PASS** — **36 suites passed, 36 total; 167 tests passed, 167 total** (includes 11 new regression tests in `test/plannerRecovery.test.tsx`).

## Production deployment validation — 2026-11-25

- Production deployment and schema/RLS verification: PASS. Applied 202611250001 through 202611250003; final history has 17 migrations; schema lint has no errors.
- Live Account Sync concurrency/isolation: PASS. Owner versioning succeeded, stale/retry rejected, cross-user read returned 0, and no test rows persisted.
- Focused Account Sync tests: PASS — 1 suite, 4 tests.
- Expo config validation: PASS with pnpm exec expo config --type public --json. expo-doctor is unavailable in this workspace.

Last verified: 2026-11-25

## Alarm Integration Audit — 2026-11-27

| Check | Command | Result | Notes |
|---|---|---|---|
| TypeScript | `pnpm run lint` | **FAIL** | Existing errors in `screens/GroupsScreen.tsx` and test typing; no Alarm/App/navigation errors reported. |
| Expo lint | `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` | **PASS** | 0 warnings/errors. |
| Focused navigation regression | `pnpm test -- test/drawerSettingsNavigation.test.tsx test/navigationBack.test.tsx test/navigationLayoutFixes.test.tsx --runInBand` | **PASS** — 3 suites, 18 tests | Includes the suite that previously failed from the Alarm import. |
| Full Jest | `pnpm run test:ci` | **FAIL** — 44/49 suites passed, 208/229 tests passed | Five existing suites remain failing. |

Alarm-specific CRUD/storage/theme/history/statistics/mission behavior was source-audited; no dedicated Alarm Jest suite exists. Device/runtime behavior remains unverified without a running build/device.

## Complete Alarm Audit — 2026-11-27

| Check | Result | Notes |
|---|---|---|
| Alarm persistence/schedule tests | **PASS** — 1 suite, 3 tests | Empty state, enabled/skipped filtering, next alarm selection, repeat days, and past one-time handling. |
| Focused navigation regression tests | **PASS** — 3 suites, 18 tests | Drawer, back navigation, and layout regression coverage. |
| Expo lint | **PASS** — 0 errors/warnings | Current Alarm/dashboard changes included. |
| Full Jest | **INCOMPLETE / FAILING** — summary reached 46/50 suites passed, 223/232 tests passed before the process was terminated for persistent open-handle logging | Four unrelated suites failed: focus improvements, planner focus integration, focus session setup, notification lifecycle. Alarm storage suite passed; no Alarm failure was reported. |
| Android runtime | **NOT VERIFIED** | No emulator/device available. Static audit found no Alarm-specific native scheduling implementation. |

## Native Alarm Engine — 2026-11-27

| Check | Result | Notes |
|---|---|---|
| Expo CNG prebuild | **PASS** | `npx expo prebuild --no-install --platform android`; generated Alarm Kotlin sources, manifest permissions/components, and `AlarmEnginePackage` registration. |
| Native Gradle compile | **BLOCKED** | `android/gradlew :app:compileDebugKotlin` reached Gradle configuration but failed because `ANDROID_HOME`/Android SDK is unavailable. |
| Full Jest | **FAIL** — 46/50 suites, 223/232 tests passed | Executed with `pnpm exec jest --runInBand --forceExit`; four unrelated existing suites failed. |
| Focused Alarm/navigation Jest | **PASS** — 4 suites, 21 tests | Alarm storage/scheduling, drawer regression, back navigation, and layout tests. |

## SSDS v1.0 Native Bundle Extraction — 2026-11-27

| Check | Command / scope | Result | Notes |
|---|---|---|---|
| Bundle inventory | Complete Master Bundle parser | **PASS** | 69 declarations, 69 fenced source blocks, 69 unique paths. |
| Destination parity | Non-empty destination check | **PASS** | No missing or empty extracted source files. |
| Internal imports | Relative resolver across `.ts`, `.tsx`, and barrels | **PASS** | No unresolved internal imports or path adjustments. |
| Package TypeScript | `tsc --noEmit -p study-sakha-design-system-native/tsconfig.json` | **PASS** | Standalone package scope passed with existing installed dependencies. |
| Runtime/device validation | Not run | **NOT VERIFIED** | Explicitly outside this source-organization task; no integration performed. |

## Current-session root checks — 2026-11-27

- `pnpm run lint`: **FAIL** (exit 2) on pre-existing application/test errors in `screens/GroupsScreen.tsx` and several test files; the standalone package check passed independently.
- `pnpm run test:ci`: **FAIL** — Jest reported 4 failing suites, 9 failing tests, 45 passing suites, and 220 passing tests; failures are in existing focus/planner/notification tests and are unrelated to the extracted package. The test process also reported existing asynchronous open-handle logging after completion.

Last verified: 2026-11-27

## Home Alarm Entry — 2026-11-27

The Alarm card implementation was validated with Expo lint (**PASS**) and focused navigation tests (**3 suites / 18 tests PASS**). `pnpm run lint` still fails only on pre-existing `GroupsScreen.tsx` and test typing errors; no dashboard, storage-summary, or Alarm-module errors remain.

## Executed & Verified in Current Session (2026-11-26)

| Check | Command | Result | Scope / Notes |
|---|---|---|---|
| Focus/notification regressions | `pnpm test -- test/notifications.test.tsx test/focusUnifiedRefactor.test.tsx --runInBand` | **PASS** — 2 suites, 12 tests | Covers repeated route reports, Expo Go channel omission, local scheduling, supported channel creation, and repeated identical sync. |
| Full Jest suite | `pnpm run test:ci` | **FAIL** — 44/49 suites passed, 218/228 tests passed | Existing failures in focus session setup, planner focus integration, and missing `shouldPromptToSaveFocusSession` export; no failure in the focused suites. |
| Fresh Expo tunnel | `npx expo start --tunnel --clear` | **PASS (Metro/tunnel)** | Tunnel connected and QR/URL emitted. Device runtime logs unavailable: no `adb` or connected Android device. React Native DevTools optional binary also lacks `libgtk-3.so.0`. |
| TypeScript | `pnpm run lint` | **FAIL / existing workspace errors** | Existing unrelated errors in preferred-subject UI, GroupsScreen, and test typing; no runtime conclusion inferred. |

Physical Android notification and render-loop verification remains **BLOCKED**, not claimed as PASS.

## Executed & Verified in Current Session (2026-11-25)

| Check | Command | Result | Scope / Notes |
|---|---|---|---|
| **TypeScript Typecheck** | `pnpm run lint` (`tsc --noEmit`) | **PASS** (exit 0) | Full project typecheck after all current working-tree edits. |
| **Full Jest + RNTL Suite** | `pnpm run test:ci` (`jest --runInBand`) | **PASS** — **35 suites passed, 35 total; 156 tests passed, 156 total** (19.825 s) | Ran in current session against current working tree. |
| **Remote Supabase Read-Only Inspection** | `pnpm exec supabase migration list --remote` & `db query --remote --read-only` | **PASS** | Verified remote `edjazjfylnpvqykpdtiq` state for `docs/SUPABASE_MIGRATION_RECOVERY_PLAN.md` with zero remote writes. |

## Previously Executed Checks (From `docs/` Audits — Not Re-run in This Session)

| Check | Source Report | Previous Result | Notes |
|---|---|---|---|
| **Expo Doctor** | `docs/EXPO_DEPENDENCY_COMPATIBILITY_AUDIT.md` (2026-11-24) | **PASS** (21/21 checks) | Re-verify if dependencies change. |
| **Web Production Export** | `docs/PRELAUNCH_TESTING_REPORT.md` (2026-11-24) | **PASS** (`pnpm run build:web`) | Exports to `dist/`. |
| **Release Config Validator** | `docs/ANDROID_RELEASE_READINESS.md` (2026-11-24) | **PASS** (with placeholder HTTPS env) / **FAIL** (when `EXPO_PUBLIC_API_BASE_URL` omitted, as expected) | `pnpm run validate:release -- preview`. |
| **Focused ESLint** | `docs/PRELAUNCH_TESTING_REPORT.md` / `docs/GLOBAL_STORE_STATE_AUDIT.md` | **PASS** on CI-scoped files; **FAIL** on `lib/store.tsx` | See `BUG_TRACKER.md` (`ISSUE-004`). |

## Unverified / Blocked Areas

## Alarm Engine Phase 3 Verification — 2026-11-27

| Check | Command | Result | Scope / Notes |
|---|---|---|---|
| **CNG prebuild** | `npx expo prebuild --no-install --platform android` twice | **PASS** | Both runs succeeded; generated Alarm source/manifest/MainApplication hashes were identical. |
| **EAS preview APK submission** | `npx eas-cli@latest build --platform android --profile preview --non-interactive` | **BLOCKED** | Archive uploaded; EAS rejected before build because the account exhausted its Android build quota until 2026-12-01. No APK URL. |
| **Local Gradle/Kotlin** | `cd android && ./gradlew :app:compileDebugKotlin` | **BLOCKED** | Android SDK missing; failure occurred during project configuration before Alarm Kotlin compilation. |
| **Expo lint** | `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` | **PASS** | Exit 0. |
| **Alarm/navigation focused Jest** | `pnpm test -- test/alarmStorage.test.tsx test/drawerSettingsNavigation.test.tsx test/navigationBack.test.tsx test/navigationLayoutFixes.test.tsx --runInBand` | **PASS** | 4 suites, 21 tests. |
| **TypeScript** | `pnpm run lint` | **FAIL (unrelated)** | Existing `screens/GroupsScreen.tsx` errors and Jest global/type errors; no Alarm-specific diagnostics. |
| **ADB/device discovery** | `adb devices` | **NOT VERIFIED** | `adb` is not installed; no emulator or physical device available. |

Previous full Jest run with forced teardown: 46/50 suites passed, 223/232 tests passed; four unrelated Focus/notification suites remained failing. No Alarm-specific suite failure was observed.

| Area | Status | Blocker / Requirement |
|---|---|---|
| **Android Native Gradle Build (`:app:assembleRelease`)** | **BLOCKED** | No Android SDK / `ANDROID_HOME` in Codespace. Use EAS cloud build. |
| **Maestro E2E (`.maestro/`, 12 flows)** | **BLOCKED** | 0 connected Android devices/emulators. |
| **Flashlight Performance Baseline** | **BLOCKED** | Requires connected Android device. |
| **Android Monkey Stress Test** | **BLOCKED** | Requires `adb` + APK + device. |

## Sakha AI Chat Upgrade — 2026-11-27

| Check | Result | Notes |
|---|---|---|
| Focused backend/chat Jest | **PASS** — 2 suites, 11 tests | Covers API retry/error contracts, registry retrieval, and multi-action parsing with invalid-action stripping. |
| Expo lint | **PASS** | `EXPO_NO_TELEMETRY=1 pnpm exec expo lint`; no reported errors/warnings. |
| TypeScript | **FAIL (repository baseline)** | `pnpm run lint` reports existing Jest global/type errors and focus/group test typing issues; no Sakha AI diagnostics were reported. |
| Full Jest | **FAIL (repository baseline)** | Existing Focus Session Setup, Focus Improvements, Four Fixes, and Settings test failures; no Sakha-focused failure reported. |
| Web export | **NOT VERIFIED** | `pnpm run build:web` started Metro but did not complete within the tool window. |
| Android physical/tablet/small-screen runtime | **NOT VERIFIED** | No `adb`, emulator, or physical Android device is available. |
| Live Gemini/native API | **NOT VERIFIED** | Requires deployed HTTPS API base URL and configured server Gemini key. |

## Startup & Authentication Audit — 2026-11-27

| Check | Result | Notes |
|---|---|---|
| Focused auth/backend Jest | **PASS** — 2 suites, 12 tests | Includes transient auth preservation and network-vs-revoked-token classification. |
| TypeScript | **PASS** | `pnpm exec tsc --noEmit --pretty false` passed in this session. |
| Expo lint | **PASS** | 0 reported errors/warnings. |
| Expo public config | **PASS** | `pnpm exec expo config --type public --json`. |
| Full Jest | **FAIL / existing baseline** | 44 suites passed, 7 existing suites failed; 233 tests passed, 12 failed. Failures are focus/group/four-fixes test-environment paths, not auth regression tests. |
| Release config | **BLOCKED** | Preview Supabase/API environment variables are absent in the workspace. |
| Android runtime | **BLOCKED** | No `adb`, emulator, or physical device. |
| Live Supabase token/revocation behavior | **NOT VERIFIED** | Requires deployed authenticated environment. |
| **MobSF Static/Dynamic APK Security Scan** | **BLOCKED** | Requires built release APK. |
| **Live Supabase Migrations & Multi-Device Sync / Realtime** | **NOT VERIFIED** | Requires live Supabase deployment + authenticated test accounts. |
| **Live Sakha AI (`/api/chat`) on Native** | **NOT VERIFIED** | Requires deployed HTTPS `EXPO_PUBLIC_API_BASE_URL` + server `GEMINI_API_KEY`. |
| **Physical Android Focus Lock & Notifications** | **NOT VERIFIED** | Requires dev/release APK on Android 13/14/15 device. |


## GitHub Actions `Build Study Sakha APK` (`withFocusLock`) — 2026-11-27

| Check | Command | Result | Notes |
|---|---|---|---|
| Plugin resolution | `resolveConfigPluginFunction(process.cwd(), './plugins/withFocusLock')` | **PASS** | Resolved `withFocusLock` function cleanly. |
| Expo public config | `EXPO_NO_TELEMETRY=1 pnpm exec expo config --type public --json` | **PASS** | Validated with and without `EAS_BUILD=true EAS_BUILD_PLATFORM=android EAS_BUILD_ID=test-build` (with placeholder env vars). |
| Release config validator | `pnpm run validate:release -- preview` (placeholder HTTPS env vars) | **PASS** | Exits 1 when env vars are unset in local `.env` (expected per `ISSUE-003`). |
| Expo Android prebuild | `EXPO_NO_TELEMETRY=1 pnpm exec expo prebuild --no-install --platform android` | **PASS** | Non-destructive; generated `FocusLockPackage`, `FocusLockAccessibilityService`, `FocusLockBlockingActivity`, `FocusLockAlarm$Receiver`, `FocusLockBootReceiver`, and Kotlin/XML files. |
| Expo lint | `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` | **PASS** | Exit 0. |
| Focused Focus Jest | `pnpm test -- test/focusHistory.test.tsx test/focusTimerAccounting.test.tsx test/focusCompletionNavigation.test.tsx test/focusCompletionScreen.test.tsx test/focusUiSurface.test.tsx --runInBand` | **PASS** | 5 suites, 21 tests passed. |
| APK compilation | Not run | **NOT VERIFIED** | No Android SDK in Codespace and GitHub Actions EAS build was not triggered from here. |
