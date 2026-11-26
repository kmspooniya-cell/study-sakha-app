# Development Log — Study Sakha

## 2026-11-26 — Runtime loop and Expo Go notification hardening
- Made `FocusSessionProvider.setCurrentRouteName` idempotent so repeated React Navigation route callbacks cannot update focus context for the same route.
- Added Expo Go detection using Expo SDK 57 `Constants.executionEnvironment`; Android channel creation and `channelId` are skipped in Expo Go while local scheduling remains enabled through the fallback channel.
- Added channel initialization serialization, repeated planner-sync deduplication, and regression coverage for repeated route reports and notification synchronization.
- Focused Jest validation passed: 2 suites, 12 tests. Full suite currently has unrelated pre-existing failures; physical Expo Go verification is blocked because this workspace has no connected Android device/adb.

## 2026-11-26 — Focus Completion Navigation Priority from Group Hall
- **Focus Completion Direct Navigation (`screens/FocusCenterScreen.tsx`, `screens/GroupsScreen.tsx`):**
  - Guarded `navigateToCompletion` with `navigatingToCompletionRef` to prevent duplicate `FocusCompletion` navigation, set `returningToOrigin.current = true`, and cleared stale `roomFocus` route params before calling `navigation.replace('FocusCompletion', payload)`.
  - Ensured `GroupsScreen.handleStartFocusSessionInRoom` calls `setRoomMinimized(true)` when re-entering `FocusCenter` for an active room focus session so the Group Hall modal does not remain open behind/over `FocusCompletion`.
  - Preserved the 2-minute (`120s`) completion eligibility rule (`shouldPromptToSaveFocusSession`) and `< 2 minute` early-exit discard behavior.
- **Verification:**
  - Added `test/focusCompletionNavigation.test.tsx`. Ran `pnpm test -- test/focusCompletionNavigation.test.tsx test/focusUnifiedRefactor.test.tsx test/groupChatAndFocusDecoupling.test.tsx --runInBand`.

## 2026-11-26 — Preferred Subjects & Custom Package Management + Study Planner Integration
- **Centralized Subject & Package Registry (`lib/subjectRegistry.ts`):**
  - Replaced flat subject list with 11 organized categories (`Rajasthan Studies`, `Indian History`, `Indian Geography`, `Indian Polity`, `Indian Economy`, `Science & Technology`, `Environment`, `Current Affairs`, `Reasoning & Aptitude`, `Languages`, `Ethics & Administration`).
  - Added `CustomSubjectPackage` model and helpers (`normalizeSubjectList`, `normalizeCustomPackages`, `toggleCategorySubjects`, `isPackageFullySelected`, `getPreferredSubjectOptions`).
- **Global Store & Sync (`lib/store.tsx`):**
  - Added `preferredSubjects`, `customSubjectPackages`, and `activeSubjectPackageId` to `State['settings']`, `initialState.settings`, and `normalizeSettings` (automatically persisted to user-scoped `AsyncStorage` and synced via `account_sync_documents`).
- **Reusable Subject & Package Manager UI (`components/PreferredSubjectsManager.tsx`, `screens/SettingsScreen.tsx`):**
  - Built expandable category accordions with per-category `Select All` / `Clear All`, selected subject count & chips, and full Custom Package CRUD (create, rename, add/edit/remove unlimited subjects, delete, select/deselect entire package).
  - Integrated into `SettingsScreen` (`preferred_subjects` detail view) and synced `applyStudyPreset` to `state.settings.preferredSubjects`.
- **Dynamic Study Planner Integration (`screens/StudyPlannerScreen.tsx`):**
  - Removed hardcoded `SUBJECT_OPTIONS` and connected Task, Class, and Exam subject dropdowns dynamically to `state.settings.preferredSubjects` via `getPreferredSubjectOptions`, preserving existing saved planner entries.
- **Verification:**
  - Added `test/preferredSubjects.test.tsx`. Ran `pnpm test -- test/preferredSubjects.test.tsx test/settingsScreen.test.tsx test/studyPlannerFilters.test.tsx --runInBand` (3/3 suites, 10/10 tests passed).

## 2026-11-26 — Group Hall Bottom Banner Removal, Direct Entry, Focus Decoupling & Group Chat Realtime Sync
- **1. Remove Group Hall-Specific Banner While Preserving Personal ActiveSessionBar (`components/ActiveSessionBar.tsx`):**
  - Restored personal Focus Mode `ActiveSessionBar` functionality (timer, status, task/subject, pause/resume, `Back to Focus` navigation) across all screens except `FocusCenter` and `FocusCompletion`.
  - Removed only the Group Study Hall-specific banner (`showHallOnly`, `Return to Hall` button, `hall.roomName`, `hall.groupName`, `context === 'hall'` dock) and decoupled bar visibility from `activeHallContext` (`hall?.isInsideHall`), so personal Focus Mode remains visible independently of Group Hall membership.
- **2. Silent Focus Hall – Direct Entry (`screens/GroupsScreen.tsx`):**
  - Removed the separate "Join room" button from the Silent Focus Hall card and made the entire card directly clickable with accessible role and labels. Clicking anywhere on the card directly triggers `handleJoinRoom` or restores a minimized session.
- **3. Decouple Group Membership from Personal Focus Activity (`screens/GroupsScreen.tsx`):**
  - Decoupled member focus presence from entering/leaving group rooms. The authoritative personal focus session (`useOptionalFocusSession`) governs the user's status (`focusing`, `paused`, `available`).
  - Removed `endGroupRoomFocus` from `clearRoomSession` so leaving or closing a Group Hall preserves the active personal focus session.
- **4. Group Chat Visibility and Realtime Synchronization (`lib/groupRooms.ts`, `screens/GroupsScreen.tsx`, `supabase/migrations/202611260002_study_group_chat_messages.sql`):**
  - Added `study_group_messages` table with group/channel indexing, foreign keys, and RLS policies (`public.is_study_group_member(group_id)`) for SELECT and INSERT.
  - Added `study_group_messages` to `supabase_realtime` publication.
  - Implemented `getStudyGroupMessages` and `sendStudyGroupMessage` in `lib/groupRooms.ts`.
  - Added Realtime channel subscription in `screens/GroupsScreen.tsx` with deduplicated live message appending, optimistic update, sender identity mapping, and persistent history across channel navigation.
- **Verification:**
  - Added `test/groupChatAndFocusDecoupling.test.tsx` verifying banner removal, direct entry structure, decoupled status mapping, DB migration schema, RLS, and realtime queries. All 4 targeted test suites passed (22/22 tests).


## 2026-11-26 — Drawer Settings Navigation, Profile Hero Card & Share with Friends Fixes
- **1. Drawer Settings Navigation Reliability (`App.tsx`):**
  - **Root Cause:** On Android (`Platform.OS !== 'web'`), `CustomDrawerContent.navigateToMainStack` waited exclusively on `Drawer.Navigator` `screenListeners.transitionEnd` (`e.data.closing === true`) before calling `executeDrawerTargetNavigation`. If Reanimated's `withSpring` close callback in `Drawer.native.tsx` was interrupted (`finished === false`) or `transitionEnd` was not emitted, `pendingTargetRef.current` was never flushed and Settings did nothing.
  - **Fix:** Added a deterministic 350ms fallback timer (`pendingTimerRef`) in `MainDrawerNavigator` alongside `transitionEnd` (`flushPendingTarget()`), passed `navigation` and `state` directly into `handlePendingTargetChange`, and cleared pending targets/timers on `transitionStart` (`!e.data.closing`), drawer `open`, and unmount.
- **2. Profile Blue Hero Card Layout (`screens/ProfileScreen.tsx`):**
  - **Root Cause:** `styles.heroCard` had `elevation: 4`, `borderRadius: 26`, and `overflow: 'hidden'` without an explicit `backgroundColor`, relying on `<Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>` inside a `ScrollView`. On Android, `elevation` on a transparent `View` with `<Svg style={StyleSheet.absoluteFill}>` causes background/bounds clipping; additionally `heroName`, `heroEmail`, `heroFocusText`, and `heroMetricLabel` had `numberOfLines={1}` without scaling/wrapping on narrow phones.
  - **Fix:** Added explicit `backgroundColor` (`#0F172A` / `#1E3A8A`) to `heroCard`, replaced the `<Svg>` background with native `expo-linear-gradient` (`LinearGradient` with `StyleSheet.absoluteFill` and `pointerEvents="none"`), removed unused SVG gradient imports, allowed `numberOfLines={2}` on `heroName`, `heroEmail`, and `heroFocusText`, added `adjustsFontSizeToFit minimumFontScale={0.78}` on `heroMetricLabel`, and tightened compact phone horizontal padding (`12`/`14`).
- **3. Functional Drawer "Share with Friends" (`lib/shareLinks.ts`, `App.tsx`):**
  - **Root Cause:** `getAppShareUrl()` returned `null` in standalone Android APKs whenever `EXPO_PUBLIC_APP_DISTRIBUTION_URL` was unset, causing the drawer's "Share with friends" button to show a "Study Sakha is not published yet" alert instead of opening the native share sheet.
  - **Fix:** Updated `getAppShareUrl()` to reuse `resolveGroupInviteBaseUrl()` (same origin resolution as `getGroupInviteUrl`, with `studysakha://` fallback and no group tokens), updated `getDistributionLinkMessage()` for standalone builds, and updated `App.tsx` to invoke `Share.share(...)` with `Platform.OS === 'ios'` `url` handling and `Share.dismissedAction` cancellation handling.

## 2026-11-26 — Four Targeted UI & Form Fixes
- **1. Remove Group Hall Label (`components/ActiveSessionBar.tsx`):**
  - Updated `ActiveSessionBar` (`context === 'global'`) to return `null` whenever `route === 'FocusCenter'`, completely removing the persistent Group Hall banner (room/group name and `Return to Hall` button) from Focus Center after leaving Group Hall or across navigation/restarts.
- **2. Remove Duplicate Information Panel (`screens/GroupsScreen.tsx`):**
  - Removed the duplicate `<ActiveSessionBar context="hall" />` strip from `GroupsScreen.tsx` inside `silent-focus` Group Hall, preserving `SmartStudyRoomScreen`'s bottom status strip (`footerOuter`) and `ChairDetailBottomSheet` popup opened via table/member cards.
- **3. Fix Profile Blue Card Layout (`screens/ProfileScreen.tsx`):**
  - Updated `heroCard` and its internal flex containers (`heroTopRow`, `heroIdentityGroup`, `heroNameRow`, `heroFocusPill`, `heroQuickEditBtn`, `heroMetricsStrip`, `heroMetricItem`, `heroMetricValueRow`) with `minWidth: 0`, `flexShrink: 0` on fixed controls, `flexWrap: 'wrap'` on the name/role row, `maxWidth: '100%'` + `numberOfLines={1}` on the focus pill, `adjustsFontSizeToFit` on metric values, `pointerEvents="none"` on the background `<Svg>`, and compact-phone padding adjustments (`profileViewportWidth < 380`).
- **4. Fix Study Planner Forms (`screens/StudyPlannerScreen.tsx`):**
  - Replaced the single shared form state with independent per-category state (`formStatesByCategory` via `createInitialCategoryFormState` / `createAllCategoryFormStates`) for `task`, `class`, `exam`, `vacation`, and `activity` so switching tabs or opening forms never leaks data across categories.
  - Removed the manual Duration control (Minus button, Plus button, and duration input) from Task and Class forms (`renderStandardWhenSection`) and auto-calculated `durationMinutes` / `duration` from `Start Time` and `End Time` (`computeMinutesBetween`) while preserving existing scheduling and saved data compatibility.

## 2026-11-26 — Focus Centre & Group Hall Unified Experience Refactor
- **Part 1 — Inline Custom Duration Input (`components/FocusSessionSetupModal.tsx`):**
  - Replaced the separate `CUSTOM DURATION (MINUTES)` section below the 4-box duration row with an inline editable numeric `TextInput` inside the 4th `Custom` box (`15m`, `25m`, `40m`, `Custom`/`[ N | min ]`).
  - Auto-focuses on selection, opens `number-pad`, validates `1..360` integer minutes with concise inline feedback, clears custom input state when a preset is tapped, dismisses keyboard on preset/close/continue/submit, and auto-fills remaining planned duration from `Add from Schedule` without modifying Study Planner data.
- **Part 2 — Offline-First Group Sync & Red Banner Removal (`lib/groupSyncErrors.ts`, `lib/groupRoomRealtime.ts`, `lib/groupActivitySync.ts`, `lib/focusSession.tsx`, `screens/FocusCenterScreen.tsx`):**
  - Removed the persistent red `presenceWarning` banner from `FocusCenterScreen.tsx`.
  - Added `classifySyncError` and deduplicated `logStructuredSyncEvent` in `lib/groupSyncErrors.ts` to differentiate `temporary_network`, `slow_network`, `auth_failure`, `permission_rls`, and `server_error`.
  - Transient network/timeout failures are logged without disruptive UI banners and retried in the background (`useGroupFocusPresence` heartbeat, `AppState` foreground, and web `online` listener), while local focus sessions and `AsyncStorage` activity queues continue uninterrupted.
- **Part 3 — Focus Centre Top Controls (`components/GeminiFocusTimer.tsx`):**
  - Removed the `App` button and `Explore Study Sakha` quick-navigation modal from the Focus Centre top control row, leaving only `Group` (left) and `Hide` (right).
- **Part 4 & 5 — Unified ActiveSessionBar & Non-Destructive Group Hall Exit (`components/ActiveSessionBar.tsx`, `components/FloatingFocusBar.tsx`, `components/RoomHeader.tsx`, `screens/SmartStudyRoomScreen.tsx`, `screens/GroupsScreen.tsx`, `App.tsx`, `lib/focusSession.tsx`):**
  - Created `components/ActiveSessionBar.tsx` driven by authoritative `FocusSessionProvider` state (`session`, `activeHallContext`, `currentRouteName`, `openActiveHall`), replacing `FloatingFocusBar`, `GroupsScreen`'s minimized room bar, and `GroupsScreen`'s duplicate `LIVE FOCUS TIMER` modal overlay.
  - Removed the top-right `LogOut` Leave button from `RoomHeader.tsx` and `ExitConfirmModal` (`Leave Silent Focus Hall?`) from `SmartStudyRoomScreen.tsx`, replacing it with non-destructive back navigation (`Back from Silent Focus Hall`) that minimizes the Hall view while preserving group membership, room session, and active focus session.

## 2026-11-26 — Group Study Rooms Cross-Account Sync, Secure Invitations, Deep Linking & Hall Navigation Fix
- **Cross-Account Discovery & Sync (`supabase/migrations/202611260001_group_invites_discovery_and_realtime.sql`, `lib/groupRooms.ts`, `screens/GroupsScreen.tsx`):**
  - **Root Cause:** `GroupsScreen` only queried `getActiveStudyGroups` (`study_group_memberships`), never discovering public `study_groups`, hardcoded `privacy: 'Private'` / `joinMethod: 'Leader Approval'` on dynamic groups, lacked pull-to-refresh / screen-focus refresh / Realtime sync on `study_groups` and `study_group_memberships`, and `Disband Group` only updated local state.
  - **Fix:** Added `list_discoverable_study_groups()`, `leave_study_group()`, `disband_study_group()` (with `archived_at`), and added `study_groups` + `study_group_memberships` to `supabase_realtime`. Updated `GroupsScreen` to use `listDiscoverableStudyGroups` as the source of truth with `useFocusEffect` refresh, `RefreshControl`, and Realtime subscriptions.
- **Secure Expiring/Revocable Invitations & Web Landing Page (`lib/shareLinks.ts`, `server/invitePage.js`, `server.js`, `app.config.js`):**
  - **Root Cause:** `getGroupInviteUrl` returned `null` when `EXPO_PUBLIC_GROUP_INVITE_BASE_URL` was unset ("Invite link unavailable"), put raw `groupId` in URLs with no token/expiry/revocation, and lacked an HTML mobile landing page.
  - **Fix:** Added `study_group_invites` table and rate-limited `create_study_group_invite`, `list_study_group_invites`, `revoke_study_group_invite`, `get_study_group_invite_preview`, and `join_study_group_by_invite` RPCs. Updated `lib/shareLinks.ts` to resolve `EXPO_PUBLIC_GROUP_INVITE_BASE_URL` -> `EXPO_PUBLIC_API_BASE_URL` -> `window.location.origin` -> `studysakha://`, added `server/invitePage.js` (`GET /api/invite/:token`, `GET /groups/invite/:token`), and injected Android App Link `intentFilters` in `app.config.js`.
- **Cross-Device Deep Linking & Group Hall Navigation (`App.tsx`, `lib/navigation.ts`, `screens/GroupsScreen.tsx`):**
  - **Root Cause:** `GroupsScreen` never read `inviteGroupId`/`inviteToken`, `App.tsx` dropped deep links when unauthenticated, and `openGroupRoomParam` `useEffect` could re-trigger mid-flight.
  - **Fix:** Added `Linking.getInitialURL()` + `Linking.addEventListener('url', ...)` + `AsyncStorage` pending invite preservation across `SignIn`/`SignUp` in `App.tsx`, server-side invite preview & join modal in `GroupsScreen`, Android `Share.share` fix, and deterministic `openGroupRoomKey` handling.
- **Verified in session:** Focused Jest suites (`test/groupInvitesAndSync.test.tsx`, `test/groupRooms.join.test.tsx`, `test/focusSessionSetup.test.tsx`, `test/groupActivitySync.test.tsx`: **4/4 suites, 42/42 tests PASS**), `expo config --type public --json` (**PASS**), and `tsc --noEmit` (**0 errors** in all modified/added files; 66 pre-existing errors in `test/focusImprovements.test.tsx`).

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
