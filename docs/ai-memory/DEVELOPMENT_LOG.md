# Development Log — Study Sakha

## 2026-11-26 — Bottom Navigation Flex Layout, Dashboard Focus Lock Cleanup & Drawer-to-Settings Navigation Fix
- **Bottom Navigation Overlap Fix (`components/Shell.tsx`, `screens/*`):**
  - **Root Cause:** `AppBottomNav` used `position: 'absolute', left: 0, right: 0, bottom: 0` while `Shell` mobile `scroll={false}` rendered `<View style={{ flex: 1, paddingBottom: 0 }}>` underneath it, causing bottom content/CTAs (`ProfileScreen` "Open Full Statistics", `SakhaAIScreen` input bar, `LibraryScreen`/`PYQScreen`/`CurrentAffairsScreen`/`FocusLockScreen`/`GroupsScreen`) to render behind `AppBottomNav`.
  - **Fix:** Moved `AppBottomNav` into normal flex flow at the bottom of `Shell`'s mobile column (`paddingBottom: Math.max(insets.bottom, 6)`), hid `AppBottomNav` while the native soft keyboard is open (`Keyboard.addListener`), tightened `Shell` `scroll={true}` `paddingBottom` (`20`/`24`) and redundant large `paddingBottom` / inner `SafeAreaView` / double `insets.bottom` across `DashboardScreen.tsx`, `ProfileScreen.tsx`, `StatisticsScreen.tsx`, `LibraryScreen.tsx`, `PYQScreen.tsx`, `CurrentAffairsScreen.tsx`, `NotificationsScreen.tsx`, `FocusLockScreen.tsx`, `StudyPlannerScreen.tsx`, `StudyPlanner.tsx`, and `GroupsScreen.tsx`.
- **Dashboard Duplicate Focus Lock Removal (`screens/DashboardScreen.tsx`):**
  - Removed the redundant standalone `focusLockCard` above `CustomStudyPlan` (`Study Planner`) while preserving the `Focus Lock` button inside `Study Planner`, `FocusLockScreen`, and all native Focus Lock functionality.
- **Drawer-to-Settings Repeated Tap Reliability (`App.tsx`, `screens/SettingsScreen.tsx`):**
  - **Root Cause:** `CustomDrawerContent` waited on `InteractionManager.runAfterInteractions`, which in React Native `0.86.3` is a deprecated stub (`InteractionManagerStub`) executing `setImmediate` immediately (0ms) while `Drawer.native.tsx`'s Reanimated `withSpring` close transition and `Overlay` (`pointerEvents: 'auto'`) were still active, colliding with Android `ScreenStack` transitions. Additionally, `SettingsScreen` `goHome()` called `setNavLevel(1)` + `navigation.popTo('DashboardRoot')` synchronously before `navLevel` updated, allowing `beforeRemove` to intercept and block exiting from nested levels, and called `LayoutAnimation.configureNext` during unmount.
  - **Fix:** Replaced `InteractionManager.runAfterInteractions` with `MainDrawerNavigator` `screenListeners` (`transitionStart` / `transitionEnd`) synchronization, deduplicated/popped existing stack routes via `StackActions.popTo` when already present, added `keyboardShouldPersistTaps="handled"` and `collapsable={false}` to drawer items, memoized `drawerContent`, and fixed `SettingsScreen.tsx` `goBack` memoization + `navLevelRef` + `bypassBeforeRemoveRef` + `toastTimerRef` cleanup.
- **Verified in session:** Focused Jest suites (`test/navigationLayoutFixes.test.tsx`, `test/drawerSettingsNavigation.test.tsx`, `test/navigationBack.test.tsx`, `test/settingsScreen.test.tsx`, `test/profileLayout.test.tsx`: **5/5 suites, 18/18 tests PASS**), `tsc --noEmit` (**0 errors** in all modified/added files; 66 pre-existing errors in untracked `test/focusImprovements.test.tsx`), `expo config --type public --json` (**PASS**), and full Jest suite (**39/42 suites, 186/190 tests PASS**; 3 pre-existing untracked test suites failed).

## 2026-11-26 — Study Planner Invalid Saved Entries Root Cause Fix & Lossless Recovery
- **Root Cause Identified:** `buildSeedPlans()` (`seed_3`, `seed_7` with `endTime: ''`) and `handleFormSubmit()` (`time: ''`, `endTime: ''` for exams, `''` for optional date/whereMode fields) in `screens/StudyPlannerScreen.tsx` emitted empty strings that failed `migratePlannerScheduleItem()`'s strict `HH:mm` / `YYYY-MM-DD` / enum checks on hydration, quarantining 2 seed exams (`endTime is not a valid 24-hour time`) and 3 user-created items (`time is not a valid 24-hour time`). Also fixed `TimePickerModal.parseParts()` shifting `00:xx` midnight to `09:xx`.
- **Canonical Normalization Layer (`lib/plannerSchedule.ts`):** Extracted and enhanced `normalizePlannerTime`, `normalizePlannerDate`, `normalizePlannerCategory`, `migratePlannerScheduleItem`, `plannerScheduleIssue`, `describePlannerRecoveryIssue`, `buildPlannerRecoveryEntry`, and `stripInvalidTimeFromRecord`. Normalizes unambiguous legacy 12h/24h times to `HH:mm`, omits `null`/empty optional fields without inventing times, normalizes `timeSlots`, and strictly rejects malformed values.
- **Canonical Writes & Crash-Safe Recovery (`lib/store.tsx`, `screens/StudyPlannerScreen.tsx`, `screens/StudyPlanner.tsx`, `components/NativeSchedulePickers.tsx`):** Enforced normalization across reducer actions (`hydrate`, `addPlannerScheduleItem`, `updatePlannerScheduleItem`, `importLegacyLearningData`), `accountSyncStateFromDocument`, and all planner creation/editing forms. Added `pendingArchiveCommit` ordering so quarantine records are never deleted before `sakha-store-v1` persistence succeeds, plus `resolvePlannerRecoveryEntry` / `discardPlannerRecoveryEntry`.
- **Recovery UI (`screens/StudyPlannerScreen.tsx`):** Added `plannerRecoveredCount` + `plannerRecoveryCount` banners, human-readable guidance, and a Review Saved Entries modal with `Edit & Restore`, safe one-tap time-clearing/copy-restoration, and `Remove`.
- **Verified in session:** `npx tsc --noEmit` (0 errors), `EXPO_NO_TELEMETRY=1 npx expo lint` (0 errors, 0 warnings), and `pnpm test -- --runInBand --forceExit` (**36/36 suites, 167/167 tests** including 11 new tests in `test/plannerRecovery.test.tsx`).

## 2026-11-25 — Production Supabase Deployment Executed
- Verified linked production project edjazjfylnpvqykpdtiq as ACTIVE_HEALTHY, connected to PostgreSQL 17.11, and created a 77,934-byte schema backup before writes.
- Repaired only verified migration history entries; no --include-all or destructive operation was used.
- Applied 202611250001, 202611250002, and forward-only RPC repair 202611250003.
- Live verification passed for migration history, Account Sync RLS/ACLs, Auth and Storage objects, room objects, Realtime publication entries, and optimistic concurrency.

Chronological record of significant development work. **Append new entries; do not overwrite history.**

---

## 2026-11-24 — Pre-Launch Audits, Android Remediation, Backend Repairs & Testing Infrastructure
*(Observed from git history and `docs/` audit reports)*
- **Expo SDK 57 Compatibility (`docs/EXPO_DEPENDENCY_COMPATIBILITY_AUDIT.md`):** Aligned 7 Expo package patch versions via `npx expo install`; `expo-doctor` reported 21/21 checks passed.
- **Navigation & Store & Auth Audits (`docs/NAVIGATION_ARCHITECTURE.md`, `docs/GLOBAL_STORE_STATE_AUDIT.md`, `docs/AUTHENTICATION_SESSION_AUDIT.md`):**
  - Fixed `authCheckFailed` in `lib/store.tsx` to clear stale authenticated identity via `authResolved(null)`.
  - Fixed scheduled focus time indexing in `lib/store.tsx` to record elapsed seconds under both `taskId` and `scheduleOccurrenceId`.
- **Supabase Backend Repairs (`docs/SUPABASE_BACKEND_ERROR_AUDIT.md`, `supabase/migrations/202611240003_production_backend_repairs.sql`):**
  - Expanded `ExamId` (`lib/types.ts`, `lib/examCatalog.ts`, `lib/data.ts`) to include `ras` and `rpsc_rssb`.
  - Created corrective migration seeding `exams` and repairing `create_study_group` and `get_study_room_insights` RPCs.
- **Android Release & Native Focus Lock (`docs/ANDROID_RELEASE_READINESS.md`, `docs/FOCUS_LOCK_NATIVE.md`, `plugins/withFocusLock.js`):**
  - Configured `allowBackup: false`, blocked `SYSTEM_ALERT_WINDOW`, added `expo-notifications`, `app.config.js` EAS env checks, `scripts/validate-release-config.cjs`, and `.github/workflows/mobile-quality.yml` + `main.yml`.
  - Implemented Android native Focus Lock module (`native/focus-lock/android/`) and Expo config plugin (`plugins/withFocusLock.js`).
- **Pre-Launch Testing Setup (`docs/PRELAUNCH_TESTING_REPORT.md`):**
  - Added `test/mocks/native.ts`, expanded Jest + RNTL suite, added 12 Maestro E2E flows in `.maestro/`.

## 2026-11-25 (Commit `680cee4`) — Cross-Device Account Sync, Audio Lifecycle & UI/AI Refinements
*(Observed from `git show --stat 680cee4`)*
- Implemented cross-device account sync (`lib/sync/` engine, conflict resolver, queue, repository, types) and migration `supabase/migrations/202611250001_account_sync_documents.sql` (`docs/account-sync-audit.md`).
- Added `lib/audioPlayerLifecycle.ts`, `lib/shareLinks.ts`, `lib/profileLayout.ts`, and `components/Popup.tsx` responsive updates.
- Updated `server/appKnowledge.js`, `server/gemini.js`, `lib/geminiChat.ts`, `lib/notifications.ts`, `lib/store.tsx`, `screens/GroupsScreen.tsx`, `components/GeminiFocusTimer.tsx`, and added tests (`test/accountSync.test.tsx`, `test/audioPlayerLifecycle.test.tsx`, `test/responsivePopup.test.tsx`, etc.).

## 2026-11-25 (Uncommitted Working Tree) — Post-Commit Refinements & Memory System Setup
*(Observed from `git status` and `git diff`)*
- **Uncommitted code edits in working tree (not yet committed):**
  - Deleted 5 obsolete `.bak`/`.backup` files (`lib/groupRoomFocusBridge.ts.bak`, `screens/FocusCenterScreen.tsx.bak`, `screens/GroupsScreen.mixed-backup.tsx.bak`, `screens/GroupsScreen.tsx.backup`, `screens/GroupsScreen.tsx.bak`).
  - `App.tsx`: Added `FocusCenter: 'focus/center'` to deep linking config.
  - `components/Charts.tsx`: Memoized `Donut` arcs (`buildDonutArcs`) and `HeatMap` grid columns.
  - `hooks/useProceduralPicture.ts`: Added `themeId` to effect dependency array.
  - `lib/focusLockSnapshot.ts`, `lib/supabase.ts`, `lib/theme.tsx`: Minor safety/refinement edits.
  - `native/focus-lock/android/java/com/anonymous/agonpreview/*.kt`: Guarded `recordBlockedAttemptGlobal` with `runCatching` and refined `FocusLockAlarm`, `FocusLockBlockingActivity`, `FocusLockBootReceiver`, `FocusLockModule`.
  - `screens/CurrentAffairsScreen.tsx`, `screens/DashboardScreen.tsx`, `screens/FocusCenterScreen.tsx`, `screens/NotificationsScreen.tsx`, `screens/SearchScreen.tsx`, `screens/SettingsScreen.tsx`: UI/safe-area/cleanup edits.
  - `scripts/run-jest.cjs`: Resolved local `node_modules/.bin/jest` directly.
  - `server.js`: Added error handling on audio `fs.statSync` / `createReadStream`, `/api` 404 JSON fallback, and Express error handler.
- **Project Memory System:** Created comprehensive root `AGENTS.md` and `docs/ai-memory/` (`PROJECT_CONTEXT.md`, `FEATURE_STATUS.md`, `DEVELOPMENT_LOG.md`, `BUG_TRACKER.md`, `NEXT_TASK.md`, `DECISIONS.md`, `TESTING_STATUS.md`).
- **Verified in session:** `pnpm run lint` (`tsc --noEmit`) passed; `pnpm run test:ci` (`jest --runInBand`) passed (34 suites, 144 tests).

## 2026-11-25 — Production Supabase Migration Reconciliation & Recovery Plan
- Re-verified remote `study-sakha-app` (`edjazjfylnpvqykpdtiq`) schema, RLS policies, RPCs, triggers, storage policies, and `supabase_realtime` publication via read-only `supabase migration list --remote` and `supabase db query --remote --read-only`.
- Confirmed `202611240002` and `202611240003` are 100% applied on remote; confirmed `202611020001` and `202611200001` have missing objects (including `get_study_room_member_profiles(text, uuid[])`, `study_room_break_messages`, `study_room_reports`, `handle_new_study_sakha_user()`, `study_sakha_create_profile_and_learner_role`, `is_published_student_content_object(text)`, 8 `storage.objects` policies, and `supabase_realtime` publication entries).
- Verified `202611250001_account_sync_documents.sql` compatibility with `lib/sync/` and `lib/store.tsx`.
- Created [docs/SUPABASE_MIGRATION_RECOVERY_PLAN.md](file:///workspaces/study-sakha-app/docs/SUPABASE_MIGRATION_RECOVERY_PLAN.md) (no remote changes or corrective `.sql` file created yet; awaiting explicit user approval).
- **Verified in session:** `pnpm run lint` passed; `pnpm run test:ci` passed (35 suites, 156 tests).
