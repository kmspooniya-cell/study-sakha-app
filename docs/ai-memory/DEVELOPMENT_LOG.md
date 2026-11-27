# Development Log — Study Sakha

## 2026-11-27 — Left Drawer Removal, WhatsApp-Style Header Overflow Menu & Android Settings Navigation Fix
- **Left Drawer Removal (`App.tsx`, `lib/navigation.ts`, `components/Shell.tsx`, `screens/FocusCenterScreen.tsx`, `screens/GroupsScreen.tsx`):**
  - Removed `createDrawerNavigator`, `MainDrawerNavigator`, `CustomDrawerContent`, `executeDrawerTargetNavigation`, `DrawerParamList`, `AppDrawerContentProps`, `isAppDrawerOpen`, and the header hamburger (`menu-outline`) button.
  - Mounted `AuthenticatedStackNavigator` directly on Root Stack `Dashboard`, flattening `linking.config.screens.Dashboard` and `navigationRef.navigate('Dashboard', ...)` calls without `MainStack` nesting while preserving all 29 routes (`Profile`, `Settings`, `AppGuide`, `LibraryDownloads`, etc.).
- **Three-Dot Overflow Menu (`components/Shell.tsx`):**
  - Replaced the top-right circular Help button in `AppHeader` with an `ellipsis-vertical` button (`header-more-button`) opening a right-aligned, anchored dropdown (`Modal` with `animationType="none"`, `statusBarTranslucent`, `onRequestClose`, outside-tap backdrop, light/dark surface tokens, shadow, and status-bar/viewport clamping).
  - Menu displays the exact four options in order: `How to use the app` (`book-outline` -> `AppGuide`), `Settings` (`settings-outline` -> `Settings`), `Help` (`help-circle-outline` -> existing multi-step Help modal), and `Share with friends` (`share-social-outline` -> existing `Share.share` logic from `lib/shareLinks.ts`).
- **Android Repeated Settings Navigation Fix (`components/Shell.tsx`, `screens/SettingsScreen.tsx`):**
  - **Root Cause:** `Drawer.Navigator` (`MainDrawerNavigator`) previously delayed navigation until Reanimated `transitionEnd` / 350ms fallback across the drawer-to-stack boundary, and `components/Shell.tsx`'s `popToRoute` dispatched `StackActions.popTo(name)` unconditionally—which in React Navigation v7 `StackRouter` replaces `DashboardRoot` (`index === 0`) when `Settings` is not yet in the stack. Additionally, `SettingsScreen.tsx`'s `BackHandler` lacked an `isFocused()` guard when stacked behind other routes.
  - **Fix:** Eliminated the Drawer boundary, updated `navigateToRoute` in `components/Shell.tsx` to use `StackActions.popTo(name)` only when `name` already exists in `state.routes` and `nav.navigate(name)` otherwise (skipping when `currentRoute === name`), reset `menuVisible` on `blur` and before navigating, and added `navigation.isFocused()` guard to `SettingsScreen.tsx`'s `BackHandler`.
- **Verification:** `test/drawerSettingsNavigation.test.tsx`, `test/navigationLayoutFixes.test.tsx`, and `test/navigationBack.test.tsx` passed (3/3 suites, 18/18 tests, including 12 consecutive Android Settings cycles); `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` passed; `tsc --noEmit` reported 0 errors in all modified files. Physical Android device runtime remains not verified in Codespace.

## 2026-11-27 — Unified Study Data Flow & Focus Subject/Activity Integration
- Extended `FocusHistoryRecord` (`lib/focusHistory.ts`), `ActiveFocusSession` / `CompletionRecord` (`lib/focusSession.tsx`), `FocusSessionSetup` (`components/FocusSessionSetupModal.tsx`), `AppStackParamList` (`lib/navigation.ts`), and `State['settings']['customActivities']` (`lib/store.tsx`) to support unified `tagType?: 'subject' | 'activity'` and `activity?: string` across Subject Preferences, Study Planner, Focus Centre, Focus Completion, and Statistics.
- Redesigned Focus Session Setup → **Tag Manually** (`components/FocusSessionSetupModal.tsx`) into a bottom sheet with a horizontal `[ Subject ] [ Activity ]` tab bar, draft selection state preserved across tab switches, mutual exclusivity between Subject and Activity, `Confirm` / `Cancel` semantics, dynamic Subject Preferences list with empty state + direct `Settings` (`openDetail: 'preferred_subjects'`) navigation, and predefined + custom Activity selection (`lib/focusSetup.ts`).
- Removed the subject-selection dropdown and hardcoded `SUBJECTS` / `tagModalVisible` picker from `components/GeminiFocusTimer.tsx` and `screens/FocusCenterScreen.tsx`; active Focus Centre now displays the selected subject/activity (or `"No subject or activity selected"`) as non-interactive informational text.
- Updated `screens/FocusCompletionScreen.tsx` to replace `INITIAL_SUBJECTS` fallback with `getPreferredSubjectOptions` / `PREDEFINED_FOCUS_ACTIVITIES` and preserve `tagType: 'activity'` on reflection edits.
- Updated `lib/statistics.ts` and `screens/StatisticsScreen.tsx` to exclude `interrupted`/`abandoned` sessions, merge `state.focusHistory` with `AsyncStorage` history, separate **Subject-wise Analytics** from **Activity-wise Analytics**, and display `"No study data available yet"` empty states.

## 2026-11-27 — Subject Preferences Structure Redesign (Hierarchical Groups & Unified Custom Registry)
- Reorganized `lib/subjectRegistry.ts` into 4 parent groups (`General Studies – India`, `General Studies – Rajasthan`, `Science`, `RAS Mains Subjects`) and 5 independent subjects (`Technology`, `Environment`, `Mathematics`, `Reasoning`, `Current Affairs`), plus `buildUnifiedSubjectRegistry()` with stable IDs, case-insensitive deduplication across packages, and preservation of custom/legacy subjects.
- Simplified `PreferredSubjectsManager.tsx` and `SettingsScreen.tsx` top header to show ONLY the back arrow and `Subject Preferences` title (hiding the outer Settings search/title/avatar header on this view).
- Implemented single-open accordion parent groups (`Select All` / `Clear All`, `x/y` counts), direct independent/custom subject buttons, removable `Selected Subjects` chips, and search with parent group context.
- Connected `components/FocusSessionSetupModal.tsx` tag picker to `getPreferredSubjectOptions(preferredSubjects, customSubjectPackages)` so all selected and custom-package subjects are available in Focus Session Setup alongside Study Planner and individual Statistics tracking.

## 2026-11-27 — Preferred Subjects UI Redesign (Academic Preference Workspace)
- Redesigned `components/PreferredSubjectsManager.tsx` into a structured Academic Preference Workspace while preserving 100% of existing subject data (`lib/subjectRegistry.ts`), store persistence (`lib/store.tsx`), Study Planner sync, custom package CRUD, and bilingual localization.
- Added Section A Compact Header (`Subject Preferences`, `"Build your study focus"`, subject & category counts, search focus button, back navigation), Section B expandable Selected Subjects Summary (`Your Selected Subjects`, preview chips + `+N more` + `View All` / `Show Less` + `Clear All`), Section C Find Subjects (`"Search subjects..."` input + horizontal scrolling category tabs starting with `All Subjects`), Section D checkbox-based subject selection rows with `Select All` / `Clear All` per category, Section E compact Custom Packages section, and Section F docked Bottom Action Area (`{N} selected • Synced with Study Planner` + `Done`).
- Updated `screens/SettingsScreen.tsx` (`detailId === 'preferred_subjects'`) to render `PreferredSubjectsManager` directly in a `flex: 1` container with `onBack={goBack}` so the compact header and bottom action bar dock cleanly within `SafeAreaView` and `KeyboardAvoidingView` without overlapping scrollable content.
- Expanded `test/preferredSubjects.test.tsx` to cover header, summary expand/collapse, search + reset filters, horizontal category tabs, checkbox selection, custom package CRUD, and dark mode.

## 2026-11-27 — Groups header alignment patch
- Corrected the Groups main-screen header order to `Groups` on the left and notification/search controls on the right. No other Groups behavior or content changed.

## 2026-11-27 — Groups main screen redesign
- Reworked only the Groups main surface in `screens/GroupsScreen.tsx`: WhatsApp Channels-inspired header, joined-only list rows, Supabase-backed Explore screen, and floating create-group action.
- Main list now shows only avatar, group name, and total member count; removed the main-screen heading/subtitle, search, categories, recommended groups, activity metadata, progress, and card extras from rendered UI.
- Explore searches the existing backend-backed discovery set by group name, exam, or subject and reuses the existing permission-aware join flow. Group Details, notifications, create-group functionality, Focus Centre logic, and bottom navigation were preserved.
- Focused group regression validation passed: 4 suites, 25 tests. Expo lint passed; repository TypeScript remains blocked by existing Jest typing errors outside GroupsScreen.

## 2026-11-27 — Group Details tab-bar layout repair
- Restored all implemented Group Details tabs (Live Study, Chat, Goals, Learn Together, Events, Members, Insights) to one continuous horizontal tab strip in screens/GroupsScreen.tsx.
- Removed the More state, overflow button, and secondary menu. The strip remains horizontally scrollable on narrow Android screens and web widths, with active-tab auto-scroll and existing icons/indicators preserved.
- No Group Header or tab content was changed.
- Focused group/realtime tests passed: 2 suites, 8 tests. Expo lint passed; Android/web runtime visual verification remains unavailable.

## 2026-11-27 — Groups interface redesign, chat persistence repair, and Focus Centre separation
- Redesigned `screens/GroupsScreen.tsx` group detail header with compact avatar/name/member count, Join/Joined state, group overflow menu, Share Group entry, and Group Settings entry.
- Reduced the primary group detail rail to Live Study, Chat, Goals, and Learn Together; preserved Events, Members, and Insights in a More menu for backward compatibility.
- Reworked group chat presentation into left/right message bubbles with sender identity, timestamps, multiline wrapping, keyboard-aware composer, auto-scroll, and existing attachment/reply/report controls retained.
- Fixed the chat disappearance race: initial Supabase queries now merge with local/realtime inserts by server message id and `created_at`, so an older fetch cannot overwrite a just-sent message. Removed fabricated offline send fallback; failed sends restore the draft.
- Removed Groups-owned studying state. Group Hall presence remains separate while visible personal focus status is derived from `useOptionalFocusSession`; room focus controls delegate to Focus Centre.
- Made Silent Focus Hall's full card the direct-entry surface and retained no separate Enter Hall button.
- Verification: focused group/realtime suites passed (2 suites, 8 tests); Expo lint passed. Full Jest remains failing in four pre-existing focus/planner/notification suites (46/50 suites, 223/232 tests); no Android device/runtime available.

## 2026-11-27 — Study Sakha alarm module integration
- Added the supplied `src/modules/alarm/StudySakhaAlarmModule.tsx` as an independent typed `Alarm` route in the authenticated stack, with `alarm` deep-link mapping.
- Added `screens/StudySakhaAlarmScreen.tsx` as a thin host adapter using the existing `StoreProvider` and `ThemeProvider`; dark/light toggles persist through the existing settings reducer, and Study Planner opens through the existing `StudyPlanner` route.
- Kept alarm persistence isolated under `@study_sakha_alarm_module_v1`; no package installation was required because all requested packages were already installed.
- Restricted the module theme catalog to exactly Starry Sky, Cozy Study, Midnight Blue, and Obsidian. Repaired source encoding/template-literal corruption in the supplied file so it compiles without changing its UI structure or feature model.
- Validation: Expo lint passed; focused navigation tests passed (2 suites, 12 tests). Full Jest has 43 passing suites / 202 passing tests and 6 pre-existing failing suites / 21 failing tests.

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

## 2026-11-27 — Alarm Module Final Integration Audit
- Audited the current Home dashboard sources (`DashboardScreen`, `DashboardStudyTools`, `Shell`) and confirmed there is no Alarm card, label, icon, or handler in the checked-in source. No Home UI was changed; the screenshot is inconsistent with this source revision.
- Verified the Alarm route, typed navigation adapter, `alarm` deep-link path, back callback, Study Planner callback, and ThemeProvider dark/light bridge.
- Fixed an integration-only Jest regression: eager Alarm import caused Jest to parse `lucide-react-native` ESM while loading `App.tsx`. The adapter now lazy-loads the module only when the route opens.
- Full Jest after the fix: 44/49 suites passed, 208/229 tests passed; the drawer/navigation suite now passes. Expo lint passes; TypeScript remains blocked by unrelated existing errors.
- Added the missing Home Study Planner Alarm card using the existing dashboard action renderer. The card reads the Alarm Module's shared persisted storage, shows active count and next enabled alarm, and navigates to the existing typed `Alarm` route. The four dashboard tools now use the requested 2×2 layout.
- Completed a functional audit/repair pass: fresh Alarm state no longer displays prototype demo alarms/history/tasks; repeat-day and one-time scheduling calculations now share the storage summary logic; save/task time validation and snooze limits were added; fabricated analytics were replaced with persisted-history calculations; and focused storage tests were added.
- Confirmed no Alarm-specific Android `AlarmManager`, exact-alarm permission, notification scheduling, boot recovery, audio playback, camera/QR, motion, or pedometer implementation exists. Those capabilities remain explicitly partial/simulated or not implemented.

## 2026-11-27 — Native Android Alarm Engine Phase 2
- Added a separate CNG/config-plugin native engine under `native/alarm/android/` and `plugins/withAlarmEngine.js`; it registers `AlarmEnginePackage`, exact-alarm/boot/notification/vibration permissions, a stable-ID `AlarmManager` scheduler, alarm/time-change boot receiver, broadcast receiver, foreground playback service, and JS bridge events.
- Wired the existing Alarm store to synchronize minimal scheduling metadata after hydration, reschedule on CRUD/enable/disable/skip changes, consume pending alarms after process restart, stop native playback on dismiss, and schedule native snoozes. UI was not redesigned.
- CNG prebuild succeeded and generated all native Alarm files/manifest entries. Gradle compilation could not run because the environment has no Android SDK/`ANDROID_HOME`.
- Focused Alarm/navigation tests pass 4 suites / 21 tests. Full Jest with forced teardown: 46/50 suites passed, 223/232 tests passed; four existing unrelated suites remain failing.

## 2026-11-27 — SSDS v1.0 Native Master Bundle Extraction
- Located and fully parsed `Study Sakha Design System Native Bundle.md/Study Sakha Design System Native Bundle.md`.
- Extracted all 69 explicitly declared TypeScript/TSX modules across five batches into the independent `study-sakha-design-system-native/` package.
- Added package README, dependency inventory, conversion manifest, source mapping, organization report, and package-local `tsconfig.json`.
- No application integration, dependency installation, root configuration change, or application-source rewrite was performed.

## 2026-11-27 — Alarm Engine Phase 3 Build and Device Verification
- Ran Expo prebuild twice with `--no-install --platform android`; both runs passed and generated Alarm hashes were identical. Registration counts were one `AlarmEnginePackage`, two Alarm receivers, one playback service, and one each of the exact-alarm/full-screen permissions.
- Confirmed EAS authentication and submitted the configured `preview` Android APK build. EAS loaded the preview Supabase/API variables and uploaded the 227 MB archive, but rejected the build before compilation because the account's Android build quota is exhausted until 2026-12-01. No APK or build URL was produced.
- Local `:app:compileDebugKotlin` reached Expo/Gradle configuration but was blocked before Kotlin compilation because this environment has no Android SDK or `ANDROID_HOME`/`android/local.properties`.
- Final focused Alarm/navigation Jest checks passed (4 suites, 21 tests); Expo lint passed. Full TypeScript remains blocked by unrelated existing `GroupsScreen.tsx` and Jest typing errors. No `adb` executable or Android device/emulator is available, so runtime verification remains pending.

## 2026-11-27 — Sakha AI Chat UX, Action Safety & App Awareness Upgrade
- Inspected `SakhaAIScreen.tsx`, `Shell.tsx`, `lib/geminiChat.ts`, `lib/types.ts`, `server/gemini.js`, `server/appKnowledge.js`, `App.tsx`, `lib/store.tsx`, and navigation types before editing.
- Removed visible model controls, model badge, history banner, and large introductory blocks while preserving internal model selection, Gemini fallback, persistence, clear-chat, sources, chips, and navigation.
- Added Android keyboard-aware height behavior, safe-area bottom padding, bounded multiline auto-growth, keyboard-aware scrolling, and structured markdown/code/table rendering.
- Hardened server action parsing to strip every action tag, validate route/parameters against the allowlist, preserve legacy `action`, and return validated `actions` for clickable cards.
- Expanded the verified registry with Task Performance, Alarm, Downloads/Bookmarks, Focus Lock, richer data sources, related modules, and operational limits.
- **Verified in session:** Expo lint passed; focused Sakha/backend tests passed (2 suites, 11 tests). Full TypeScript/Jest remain blocked by existing unrelated test/focus/group/settings failures; Android/web runtime was not verified.

## 2026-11-27 — Complete Startup, Authentication & Navigation Audit
- Traced `index.ts` bootstrap, Expo splash/React splash, provider order, StoreProvider hydration, Supabase session restore, profile/admin enrichment, root navigation gating, Homepage entry, notifications, invites, sync, and secondary data loading.
- Confirmed the false-logout root cause: `getUser`/profile errors dispatched `authCheckFailed`, which cleared the user and reset hydrated data even for temporary network failures.
- Added explicit auth lifecycle statuses, transient failure classification, session-user fallback during temporary verification failure, non-destructive profile/admin failure handling, authenticated offline indicator, and immediate local manual logout.
- Added regression coverage for transient auth state preservation and network-vs-revoked-token classification.
- **Verified in session:** focused auth/backend Jest 2 suites / 12 tests passed; Expo lint passed; TypeScript passed; Expo public config passed. Full Jest: 44 suites passed / 7 existing suites failed, 233 tests passed / 12 failed. Android/live Supabase/release env verification remains blocked or unverified.


## 2026-11-27 — Fix GitHub Actions Android APK Build Failure (`withFocusLock` Resolution)
- **Root Cause:** `.github/workflows/main.yml` (`Build Study Sakha APK`) ran `eas build --platform android --profile preview --non-interactive --no-wait` directly after `actions/checkout@v4` and `expo/expo-github-action@v8` without installing project dependencies (`node_modules`). When `eas build` evaluated Expo config and loaded `./plugins/withFocusLock` (`plugins/withFocusLock.js`), `require('@expo/config-plugins')` failed with `MODULE_NOT_FOUND`, causing Expo/EAS to report `Verify that ./plugins/withFocusLock includes a config plugin.`.
- **Fix:** Updated `.github/workflows/main.yml` to set up `pnpm@12.16.1` (`pnpm/action-setup@v4`), Node.js 22 (`actions/setup-node@v4` with `cache: pnpm`), and run `pnpm install --frozen-lockfile` before `expo/expo-github-action@v8` and `eas build`. Preserved `plugins/withFocusLock.js`, `app.json`, `app.config.js`, and all native Focus Lock Android sources/manifest/service configuration unchanged.
- **Verification:** `expo config --type public --json`, `resolveConfigPluginFunction(process.cwd(), './plugins/withFocusLock')`, `expo prebuild --no-install --platform android` (non-destructive), `validate:release -- preview` (with placeholder preview env vars), `expo lint`, and focused Focus Jest suites (5/5 suites, 21/21 tests) passed. No Android APK was compiled in this environment (no Android SDK; EAS cloud build not triggered from CI here).
