# Study Sakha SSDS — Phase 6 Screen Migration Inventory

**Date:** 2026-11-28  
**Mode:** Read-Only Inspection & Migration Planning (Zero source files modified)  
**Scope:** All 30 files in `screens/`, legacy primitives in `components/ui.tsx` & `components/BottomSheet.tsx`, SSDS barrel `lib/ssds.ts` (Phases 1–5), `lib/theme.tsx`, `lib/store.tsx`, `lib/navigation.ts`.

---

## 1. Executive Summary & Dependency Analysis

### Current Consumer Footprint
- **Total screen files in `screens/`:** `30` (28 mounted routes in `App.tsx`, 1 embedded sub-screen `SmartStudyRoomScreen.tsx`, 1 unmounted legacy file `StudyPlanner.tsx`).
- **Already Piloted (Phases 2–3):** `screens/AppGuideScreen.tsx` (`SSDSText`, `SSDSIcon`, `SSDSSurface`, `SSDSStack`, `SSDSRow`, `SSDSColumn`, `SSDSSectionHeader`, `SSDSButton`, `useSSDSTheme`).
- **Legacy `lib/theme.tsx` (`useTheme()`) consumers:** `39` files across `screens/`, `components/`, and `App.tsx`.
- **Legacy `components/ui.tsx` consumers:** `17` files across `screens/` and `components/`.
- **Legacy `components/BottomSheet.tsx` consumers:** `7` files (swipe-to-dismiss `PanResponder` sheet).

### Screens That Must Retain Specialized Layouts (Do Not Force Into Generic Templates)
1. **`DashboardScreen.tsx`** — Custom cardless editorial homepage with `GoalDial` SVG, `statsStrip`, 2x2 bento grid, `FocusSessionSetupModal`, native `focusLockNative` status, and `readAlarmSummary()`. Migrate **only** token/text/icon primitives if needed; keep custom layout.
2. **`FocusCenterScreen.tsx`** — Procedural Skia/Canvas2D timer themes (`GeminiFocusTimer`), `expo-audio` playback lifecycle, `KeepAwake`, and `FocusMusicSelection`. Retain custom full-screen layout.
3. **`FocusCompletionScreen.tsx`** — Gradient reflection card, `react-native-view-shot` share capture, and `expo-sharing`. Retain custom layout; optionally adopt `SSDSSurface`/`SSDSText`/`SSDSButton`.
4. **`GroupsScreen.tsx` & `SmartStudyRoomScreen.tsx`** — Full-screen WhatsApp-inspired chat (`FlatList`, `GroupChatComposer`, `MessageActionSheet`, `ChannelSelectorSheet`, `VirtualStudyHall` SVG chairs, `expo-audio`, Supabase Realtime). Retain custom chat/hall layout; migrate inner rows/dialogs incrementally.
5. **`StudyPlannerScreen.tsx`** — Complex custom timeline/calendar SVG, occurrence engine (`lib/planner.ts`), quarantine recovery UI, and `NativeSchedulePickers`. Retain custom planner layout.
6. **`StudySakhaAlarmScreen.tsx`** — Thin host adapter wrapping `src/modules/alarm/StudySakhaAlarmModule.tsx` and `AppBottomNav`. Retain adapter isolation (`DEC-012`).
7. **`TestPlayerScreen.tsx`** — Timed exam engine with `AppState` persistence, question palette modal, and auto-submit. Retain custom exam layout; optionally adopt `SSDSProgressBar`, `SSDSButton`, `SSDSDialog`.

---

## 2. Risk Classification & Batch Ordering

| Batch | Target Screens | Risk | Rationale |
| --- | --- | --- | --- |
| **Batch 0 (Done)** | `AppGuideScreen.tsx` | Low | Already piloted in Phases 2–3. |
| **Batch 1** | `MoreScreen.tsx`, `SignInScreen.tsx`, `SignUpScreen.tsx` | **Low** | Smallest surface area, minimal state, clear `SSDSFormScreen` / `SSDSTextInput` / `SSDSButton` / `SSDSSurface` mapping. |
| **Batch 2** | `SearchScreen.tsx`, `CurrentAffairsScreen.tsx`, `PYQScreen.tsx`, `TestsScreen.tsx` | **Low–Medium** | Ideal candidates for `SSDSListingScreen`, `SSDSSearchFilterPattern`, `SSDSEmptyContentPattern`, `SSDSFeatureCard`, `SSDSBadge`. |
| **Batch 3** | `BookReaderScreen.tsx`, `NoteEditorScreen.tsx`, `TaskPerformanceScreen.tsx`, `TestResultScreen.tsx` | **Medium** | Detail/Form/Result views mapping to `SSDSDetailScreen`, `SSDSFormScreen`, `SSDSProgressCard`, `SSDSStatisticCard` (preserving `Charts.tsx` SVGs). |
| **Batch 4** | `LibraryScreen.tsx`, `StatisticsScreen.tsx`, `ProfileScreen.tsx`, `AdminScreen.tsx` | **Medium–High** | Multi-tab/multi-modal screens with file downloads, image picker, charts, and admin CRUD/feedback. |
| **Batch 5** | `NotificationsScreen.tsx`, `NotificationSettingsScreen.tsx`, `SettingsScreen.tsx`, `SakhaAIScreen.tsx`, `FocusLockScreen.tsx` | **High** | Reanimated swipe rows, native Android FocusLock/notification channels, 12-setting theme controls, and keyboard-aware AI markdown/actions. |
| **Batch 6 (Specialized)** | `DashboardScreen.tsx`, `FocusCenterScreen.tsx`, `FocusCompletionScreen.tsx`, `GroupsScreen.tsx`, `SmartStudyRoomScreen.tsx`, `StudyPlannerScreen.tsx`, `StudySakhaAlarmScreen.tsx`, `TestPlayerScreen.tsx` | **Specialized** | Retain custom domain layouts; adopt `SSDS*` tokens/buttons/dialogs only where non-disruptive. |
| **Retire Check** | `StudyPlanner.tsx` (unmounted) | **Low** | Verify zero references before archiving/removing in Phase 6 cleanup. |

---

## 3. Complete Screen Migration Matrix (All 30 Files)

### Batch 0 & Batch 1 (Low Risk)

#### 1. `AppGuideScreen` — `screens/AppGuideScreen.tsx` *(Piloted in Phases 2–3)*
- **Existing UI:** `Shell`, `SSDSStack`, `SSDSRow`, `SSDSColumn`, `SSDSSurface`, `SSDSText`, `SSDSIcon`, `SSDSSectionHeader`, `SSDSButton`.
- **SSDS Target:** Complete for Phase 2–3 primitives; optionally replace `Shell` only if global navigation chrome is unified later.
- **Navigation:** `useNavigation<AppNavigation>()`, `CommonActions.navigate(route)`, `nav.navigate('Settings')`.
- **StoreProvider:** None directly (inherits via `Shell` / `SSDSThemeProvider`).
- **Backend/API:** None.
- **Interactions/Callbacks:** `onOpen(route)` for 5 guide sections, `Back to Settings`.
- **Risk Level:** Low (Piloted).
- **Required Regression Tests:** `test/ssdsFoundationComponents.test.tsx`, `test/drawerSettingsNavigation.test.tsx`, `test/navigationBack.test.tsx`.
- **Batch:** Batch 0 (Complete).

#### 2. `MoreScreen` — `screens/MoreScreen.tsx`
- **Existing UI:** `Shell`, `MoreOptionsGrid`.
- **SSDS Target:** `SSDSStandardScreen` / `SSDSFeatureCard` / `SSDSListItem` (if `MoreOptionsGrid` is retained inside `Shell`, keep `Shell`).
- **Navigation:** `useNavigation<AppNavigation>()`, `nav.navigate(...)`.
- **StoreProvider:** `useStore()` -> `state.user?.role === 'admin'`, `unread`.
- **Backend/API:** None.
- **Interactions/Callbacks:** `onGo(route)` mapping `'Dashboard' -> 'DashboardRoot'`.
- **Risk Level:** Low.
- **Required Regression Tests:** `test/navigationLayoutFixes.test.tsx`, `test/navigationBack.test.tsx`.
- **Batch:** Batch 1.

#### 3. `SignInScreen` — `screens/SignInScreen.tsx`
- **Existing UI:** `SafeAreaView`, `KeyboardAvoidingView`, `ScrollView`, `LinearGradient`, `Logo`, `Button`, `Card`, `Field`, `Txt` (`components/ui.tsx`), `useLayout` (`Shell.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSFormScreen` (or `SSDSScreenContainer` + `SSDSSurface`), `SSDSTextInput` (`type="email"`, `type="password"`), `SSDSButton`, `SSDSText`, `SSDSIcon`.
- **Navigation:** `useNavigation<AuthNavigation>()` -> `SignUp`.
- **StoreProvider:** `useStore()` -> auth sign-in action & auth status.
- **Backend/API:** Supabase Auth via `StoreProvider` + `validateSignInCredentials` (`lib/authValidation.ts`).
- **Interactions/Callbacks:** Email/password validation, password visibility toggle, submit loading state, navigate to `SignUp`.
- **Risk Level:** Low.
- **Required Regression Tests:** `test/authValidation.test.tsx`, new `SignInScreen` RNTL test.
- **Batch:** Batch 1.

#### 4. `SignUpScreen` — `screens/SignUpScreen.tsx`
- **Existing UI:** `SafeAreaView`, `KeyboardAvoidingView`, `ScrollView`, `Logo`, `Button`, `Card`, `Chip`, `Field`, `Txt` (`components/ui.tsx`), `useLayout`, `Ionicons`.
- **SSDS Target:** `SSDSFormScreen`, `SSDSTextInput`, `SSDSButton`, `SSDSSelect` / `SSDSSegmentedControl` (for `EXAMS` selection), `SSDSText`.
- **Navigation:** `useNavigation<AuthNavigation>()` -> `SignIn`.
- **StoreProvider:** `useStore()` -> sign-up action.
- **Backend/API:** Supabase Auth via `StoreProvider`, `EXAMS` (`lib/data.ts`).
- **Interactions/Callbacks:** Name/email/password/exam selection, validation, submit loading, back to `SignIn`.
- **Risk Level:** Low.
- **Required Regression Tests:** `test/authValidation.test.tsx`, new `SignUpScreen` RNTL test.
- **Batch:** Batch 1.

---

### Batch 2 (Low–Medium Risk — Listing & Search Screens)

#### 5. `SearchScreen` — `screens/SearchScreen.tsx`
- **Existing UI:** `Shell`, `useLayout`, `Card`, `Chip`, `EmptyState`, `Field`, `SectionHeader`, `Tag`, `Txt` (`components/ui.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSSearchFilterPattern`, `SSDSSectionPattern`, `SSDSListItem`, `SSDSBadge`, `SSDSEmptyContentPattern`, `SSDSText` (inside `Shell`).
- **Navigation:** `useNavigation<AppNavigation>()` -> `NoteEditor`, `BookReader`, `PYQ`, `Tests`, `CurrentAffairs`.
- **StoreProvider:** `useStore()` -> `state.notes`, `state.settings`.
- **Backend/API:** `getCurrentAffairs`, `getResources`, `getTests`, `PYQS` (`lib/data.ts`).
- **Interactions/Callbacks:** Live search query, category filter chips, result row navigation.
- **Risk Level:** Low–Medium.
- **Required Regression Tests:** `test/navigationBack.test.tsx`, new `SearchScreen` filter/navigation test.
- **Batch:** Batch 2.

#### 6. `CurrentAffairsScreen` — `screens/CurrentAffairsScreen.tsx`
- **Existing UI:** `Shell`, `useLayout`, `FlatList`, `RefreshControl`, `Button`, `Card`, `Chip`, `EmptyState`, `Field`, `Tag`, `Txt` (`components/ui.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSSearchFilterPattern`, `SSDSSurface`/`SSDSBaseCard`, `SSDSBadge`, `SSDSEmptyContentPattern`, `SSDSButton`, `SSDSText` (inside `Shell`).
- **Navigation:** `useNavigation<AppNavigation>()`.
- **StoreProvider:** `useStore()` -> `state.user`, `state.bookmarks` / `toggleBookmark`.
- **Backend/API:** `EXAMS`, `getCurrentAffairs` (`lib/data.ts`), `Linking.openURL`.
- **Interactions/Callbacks:** Exam filter, search, pull-to-refresh, external link open, bookmark toggle.
- **Risk Level:** Low–Medium.
- **Required Regression Tests:** `test/navigationLayoutFixes.test.tsx`, new `CurrentAffairsScreen` test.
- **Batch:** Batch 2.

#### 7. `PYQScreen` — `screens/PYQScreen.tsx`
- **Existing UI:** `Shell`, `useLayout`, `FlatList`, `RefreshControl`, `Button`, `Card`, `Chip`, `EmptyState`, `Field`, `Tag`, `Txt` (`components/ui.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSSearchFilterPattern`, `SSDSBaseCard`, `SSDSBadge`, `SSDSEmptyContentPattern`, `SSDSButton`, `SSDSText` (preserving `Shell` & `route.params`).
- **Navigation:** `useNavigation<AppNavigation>()`, `useRoute<AppRoute<'PYQ'>>()`.
- **StoreProvider:** `useStore()` -> `state.user`, `state.starred`, `state.settings`.
- **Backend/API:** `EXAMS`, `PYQS`, `SUBJECTS` (`lib/data.ts`).
- **Interactions/Callbacks:** Exam/subject filter, search, answer reveal, star toggle, pull-to-refresh.
- **Risk Level:** Low–Medium.
- **Required Regression Tests:** `test/navigationLayoutFixes.test.tsx`, `test/navigationBack.test.tsx`.
- **Batch:** Batch 2.

#### 8. `TestsScreen` — `screens/TestsScreen.tsx`
- **Existing UI:** `Shell`, `Button`, `Card`, `EmptyState`, `SectionHeader`, `Tag`, `Txt` (`components/ui.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSSectionPattern`, `SSDSProgressCard`, `SSDSFeatureCard`, `SSDSBadge`, `SSDSEmptyContentPattern`, `SSDSButton`, `SSDSText`.
- **Navigation:** `useNavigation<AppNavigation>()`, `useRoute<AppRoute<'Tests'>>()` -> `TestPlayer`, `TestResult`.
- **StoreProvider:** `useStore()` -> `state.testResults`, `state.user`.
- **Backend/API:** `EXAMS`, `getTests` (`lib/data.ts`).
- **Interactions/Callbacks:** Exam filter, start test (`TestPlayer`), view result (`TestResult`).
- **Risk Level:** Low–Medium.
- **Required Regression Tests:** `test/navigationBack.test.tsx`, new `TestsScreen` test.
- **Batch:** Batch 2.

---

### Batch 3 (Medium Risk — Detail, Editor & Result Screens)

#### 9. `BookReaderScreen` — `screens/BookReaderScreen.tsx`
- **Existing UI:** `SafeAreaView`, `ScrollView`, `DetailHeader`, `useLayout`, `useSmartAndroidBack`, `Button`, `Card`, `EmptyState`, `ProgressBar`, `SectionHeader`, `Tag`, `Txt` (`components/ui.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSDetailScreen` (or `SSDSPageLayout` + `SSDSScreenHeader` preserving `useSmartAndroidBack`), `SSDSProgressBar`, `SSDSSectionHeader`, `SSDSBadge`, `SSDSEmptyState`, `SSDSButton`, `SSDSText`.
- **Navigation:** `useNavigation<AppNavigation>()`, `useRoute<AppRoute<'BookReader'>>()`.
- **StoreProvider:** `useStore()` -> `state.readingProgress`, `state.starred`, `dispatch({ type: 'progress' })`.
- **Backend/API:** `getResources`, `createStudentContentSignedUrl` (`lib/supabase.ts`), `Linking`.
- **Interactions/Callbacks:** Signed PDF URL open, reading progress update, star toggle, Android smart back.
- **Risk Level:** Medium.
- **Required Regression Tests:** `test/navigationBack.test.tsx`, new `BookReaderScreen` test.
- **Batch:** Batch 3.

#### 10. `NoteEditorScreen` — `screens/NoteEditorScreen.tsx`
- **Existing UI:** `SafeAreaView`, `KeyboardAvoidingView`, `ScrollView`, `DetailHeader`, `useLayout`, `useSmartAndroidBack`, `Button`, `Card`, `Chip`, `Field`, `SectionHeader`, `Tag`, `Txt` (`components/ui.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSFormScreen`, `SSDSTextInput`, `SSDSSelect`, `SSDSButton`, `SSDSBadge`, `SSDSText` (preserving `useSmartAndroidBack`).
- **Navigation:** `useNavigation<AppNavigation>()`, `useRoute<AppRoute<'NoteEditor'>>()`.
- **StoreProvider:** `useStore()` -> `state.notes`, `dispatch({ type: 'saveNote' | 'deleteNote' })`.
- **Backend/API:** `getResources`, `createStudentContentSignedUrl` (`lib/supabase.ts`).
- **Interactions/Callbacks:** Title/body/tags/exam editing, save note, delete note confirmation (`SSDSConfirmationPattern`), Android smart back.
- **Risk Level:** Medium.
- **Required Regression Tests:** `test/store.reducer.test.tsx`, `test/accountSync.test.tsx`, `test/navigationBack.test.tsx`.
- **Batch:** Batch 3.

#### 11. `TaskPerformanceScreen` — `screens/TaskPerformanceScreen.tsx`
- **Existing UI:** `Shell`, `useLayout`, `ScrollView`, `Modal`, `Button`, `Card`, `Chip`, `EmptyState`, `SectionHeader`, `Txt` (`components/ui.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSSectionPattern`, `SSDSStatisticCard`, `SSDSListItem`, `SSDSEmptyState`, `SSDSDialog`, `SSDSButton`, `SSDSText` (inside `Shell`).
- **Navigation:** `useFocusEffect`, `useRoute<AppRoute<'TaskPerformance'>>()`.
- **StoreProvider:** `useStore()` -> `state.plannerTasks`, `state.studyLogs`, `getUserScopedStorageKey`.
- **Backend/API:** `AsyncStorage` scoped planner/focus performance metrics.
- **Interactions/Callbacks:** Date range filter, task breakdown modal, empty state.
- **Risk Level:** Medium.
- **Required Regression Tests:** `test/statistics.test.tsx`, `test/navigationBack.test.tsx`.
- **Batch:** Batch 3.

#### 12. `TestResultScreen` — `screens/TestResultScreen.tsx`
- **Existing UI:** `SafeAreaView`, `ScrollView`, `LinearGradient`, `DetailHeader`, `useLayout`, `useSmartAndroidBack`, `Donut`, `HBar`, `SvgLegend` (`Charts.tsx`), `Button`, `Card`, `EmptyState`, `ProgressRing`, `SectionHeader`, `Tag`, `Txt` (`components/ui.tsx`).
- **SSDS Target:** `SSDSDetailScreen` (or `SSDSPageLayout` + `SSDSScreenHeader`), `SSDSCircularProgress`, `SSDSStatisticCard`, `SSDSSectionHeader`, `SSDSBadge`, `SSDSButton`, `SSDSText` (retaining `Charts.tsx` SVGs).
- **Navigation:** `useNavigation<AppNavigation>()`, `useRoute<AppRoute<'TestResult'>>()`.
- **StoreProvider:** `useStore()` -> `state.testResults`.
- **Backend/API:** `getTests` (`lib/data.ts`).
- **Interactions/Callbacks:** Score breakdown, question review, retake test (`TestPlayer`), Android smart back.
- **Risk Level:** Medium.
- **Required Regression Tests:** `test/navigationBack.test.tsx`, `test/notificationCentre.test.tsx`.
- **Batch:** Batch 3.

---

### Batch 4 (Medium–High Risk — Multi-Tab & Media/Admin Screens)

#### 13. `LibraryScreen` — `screens/LibraryScreen.tsx`
- **Existing UI:** `Shell`, `useLayout`, `FlatList`, `RefreshControl`, `Button`, `Chip`, `EmptyState`, `Field`, `ProgressBar`, `Skeleton`, `StitchCard`, `Tag`, `Txt` (`components/ui.tsx`), `Popup` (`components/Popup.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSTabBar`, `SSDSSearchFilterPattern`, `SSDSProgressCard` / `SSDSListItem`, `SSDSProgressBar`, `SSDSSkeleton`, `SSDSEmptyContentPattern`, `SSDSBadge`, `SSDSButton`, `SSDSText` (inside `Shell`).
- **Navigation:** `useNavigation<AppNavigation>()`, `useRoute<AppRoute<'Library'>>()` -> `LibraryNotes`, `LibraryBooks`, `LibraryPYQSets`, `LibraryStarred`, `LibraryDownloads`, `NoteEditor`, `BookReader`.
- **StoreProvider:** `useStore()` -> `state.notes`, `state.starred`, `state.bookmarks`, `state.readingProgress`.
- **Backend/API:** `getResources`, `downloadResourceFile`, `getResourceDownloads`, `removeResourceDownload`, `createStudentContentSignedUrl`, `expo-sharing`, `expo-file-system`.
- **Interactions/Callbacks:** Sub-route filtering (`LibraryNotes`..`LibraryDownloads`), offline download/remove, share, search/exam/subject filters.
- **Risk Level:** Medium–High.
- **Required Regression Tests:** `test/navigationBack.test.tsx`, `test/navigationLayoutFixes.test.tsx`, `test/store.persistence.test.tsx`.
- **Batch:** Batch 4.

#### 14. `StatisticsScreen` — `screens/StatisticsScreen.tsx`
- **Existing UI:** `Shell`, `useTheme`, `AsyncStorage`, `react-native-svg`, custom cards/charts.
- **SSDS Target:** `SSDSTabBar`, `SSDSStatisticCard`, `SSDSStatItem`, `SSDSProgressCard`, `SSDSSectionHeader`, `SSDSEmptyState`, `SSDSText` (retaining custom SVG charts & `Shell`).
- **Navigation:** `useFocusEffect`, `useNavigation<AppNavigation>()` -> `TaskPerformance`, `AppGuide`.
- **StoreProvider:** `useStore()` -> `state.studyLogs`, `state.focusHistory`, `state.testResults`, `state.settings`.
- **Backend/API:** `lib/statistics.ts`, `lib/focusHistory.ts`, `AsyncStorage`.
- **Interactions/Callbacks:** Subject-wise vs Activity-wise analytics, period switching, empty states (`"No study data available yet"`).
- **Risk Level:** Medium–High.
- **Required Regression Tests:** `test/statistics.test.tsx`, `test/unifiedStudyDataFlow.test.tsx`, `test/focusHistory.test.tsx`.
- **Batch:** Batch 4.

#### 15. `ProfileScreen` — `screens/ProfileScreen.tsx`
- **Existing UI:** `Shell`, `useLayout`, `LinearGradient`, `Svg`, `ImagePicker`, `FileSystem`, custom hero/profile cards.
- **SSDS Target:** `SSDSAvatar`, `SSDSSurface`, `SSDSStatisticCard`, `SSDSListItem`, `SSDSButton`, `SSDSTextInput`, `SSDSSelect`, `SSDSText` (inside `Shell`).
- **Navigation:** `useNavigation<AppNavigation>()` -> `Settings`, `AppGuide`, `LibraryDownloads`, `Statistics`.
- **StoreProvider:** `useStore()` -> `state.user`, `saveProfile`, `signOut`, `streak`, `todayMinutes`.
- **Backend/API:** `expo-image-picker`, `expo-file-system`, `EXAM_ID_BY_FOCUS`, Supabase profile update.
- **Interactions/Callbacks:** Photo upload, exam/profile editing, sign out confirmation (`SSDSConfirmationPattern`), quick links.
- **Risk Level:** Medium–High.
- **Required Regression Tests:** `test/profileLayout.test.tsx`, `test/navigationLayoutFixes.test.tsx`, `test/fourFixesRegression.test.tsx`.
- **Batch:** Batch 4.

#### 16. `AdminScreen` — `screens/AdminScreen.tsx`
- **Existing UI:** `Shell`, `useLayout`, `Modal`, `BarChart`/`Donut`/`HBar` (`Charts.tsx`), `Avatar`, `Button`, `Card`, `Chip`, `EmptyState`, `Field`, `SectionHeader`, `Tag`, `Txt` (`components/ui.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSTabBar`, `SSDSAvatar`, `SSDSButton`, `SSDSBaseCard`, `SSDSTextInput`, `SSDSSectionHeader`, `SSDSEmptyState`, `SSDSBadge`, `SSDSDialog`, `SSDSText` (inside `Shell`, retaining `Charts.tsx`).
- **Navigation:** `useNavigation<AppNavigation>()`.
- **StoreProvider:** `useStore()` -> `state.user` (`is_admin()`), managed content actions.
- **Backend/API:** Supabase `managed_content`, `feedback_submissions`, `feedback-attachments`, `expo-document-picker`, `expo-file-system`.
- **Interactions/Callbacks:** Content upload/delete, Feedback status/response updates, signed screenshot preview.
- **Risk Level:** Medium–High.
- **Required Regression Tests:** `test/helpFeedbackSystem.test.tsx`, `test/supabasePersistence.test.tsx`.
- **Batch:** Batch 4.

---

### Batch 5 (High Risk — Complex Interactive & System-Integrated Screens)

#### 17. `NotificationsScreen` — `screens/NotificationsScreen.tsx`
- **Existing UI:** Custom immersive layout (`shouldHideAppShell`), `NotificationHeader`, `AnnouncementCard`, `NotificationFilters`, `NotificationRow` (Reanimated swipe), `NotificationActionMenu`, `NotificationSkeleton`, `NotificationEmptyState`, `NotificationErrorState`, `UndoSnackbar`, `Button`, `Txt` (`components/ui.tsx`).
- **SSDS Target:** Replace `Button`/`Txt` and align tokens with `SSDSButton`, `SSDSText`, `SSDSSkeleton`, `SSDSEmptyState`, `SSDSErrorState`, `SSDSSnackbar`, `SSDSActionMenu` incrementally while preserving Reanimated swipe gestures and safe areas.
- **Navigation:** `useFocusEffect`, `useNavigation<AppNavigation>()` -> `NotificationSettings`, `NotificationRouter`.
- **StoreProvider:** `useStore()` -> `state.notifications`, `state.announcements`, `unread`.
- **Backend/API:** `lib/notifications/*`, Supabase Realtime `notifications`.
- **Interactions/Callbacks:** 5 smart filters, swipe-to-archive/read, multi-select bulk actions, Undo snackbar.
- **Risk Level:** High.
- **Required Regression Tests:** `test/notificationCentre.test.tsx`, `test/notificationLifecycle.test.tsx`, `test/notifications.test.tsx`.
- **Batch:** Batch 5.

#### 18. `NotificationSettingsScreen` — `screens/NotificationSettingsScreen.tsx`
- **Existing UI:** Immersive layout (`shouldHideAppShell`), `SafeAreaView`, `Button`, `Txt` (`components/ui.tsx`), custom expandable preference sections.
- **SSDS Target:** `SSDSStandardScreen` / `SSDSScreenHeader`, `SSDSSwitch`, `SSDSSectionHeader` (collapsible), `SSDSButton`, `SSDSText`, `SSDSBanner`/`SSDSSurface`.
- **Navigation:** `useNavigation<AppNavigation>()`.
- **StoreProvider:** `useStore()` + `useNotificationPreferences`.
- **Backend/API:** Supabase `notification_preferences`, `push_tokens`, `expo-notifications`.
- **Interactions/Callbacks:** General/Study/Social/Updates/Quiet Hours toggles, OS permission banner, optimistic rollback.
- **Risk Level:** High.
- **Required Regression Tests:** `test/notificationCentre.test.tsx`, `test/notifications.test.tsx`.
- **Batch:** Batch 5.

#### 19. `SettingsScreen` — `screens/SettingsScreen.tsx`
- **Existing UI:** `SafeAreaView`, `AsyncStorage`, custom control center sections, `PreferredSubjectsManager`, `HelpFeedbackModal`, `Ionicons`.
- **SSDS Target:** `SSDSListItem`, `SSDSSwitch`, `SSDSSlider`, `SSDSSelect`, `SSDSSegmentedControl`, `SSDSDialog`, `SSDSText` — **keeping** `StoreProvider` `dispatch({ type: 'settings' })` as the single persistence owner for all 12 appearance settings.
- **Navigation:** `useNavigation<AppNavigation>()`, `useRoute<AppRoute<'Settings'>>()`, `BackHandler` (`navigation.isFocused()`).
- **StoreProvider:** `useStore()` -> all `state.settings`, `saveProfile`, `signOut`.
- **Backend/API:** `focusLockNative`, `requestNotificationPermission`, Supabase Auth.
- **Interactions/Callbacks:** All 12 theme/accessibility/wallpaper controls, Preferred Subjects sub-view, Help/Feedback modal, sign out.
- **Risk Level:** High.
- **Required Regression Tests:** `test/settingsScreen.test.tsx`, `test/drawerSettingsNavigation.test.tsx`, `test/preferredSubjects.test.tsx`, `test/ssdsThemeBridge.test.tsx`.
- **Batch:** Batch 5.

#### 20. `SakhaAIScreen` — `screens/SakhaAIScreen.tsx`
- **Existing UI:** `Shell`, `useLayout`, `useSafeAreaInsets`, `LogoMark`, `Avatar`, `Button`, `Card`, `Chip`, `ConfirmDialog`, `InlineBanner`, `Txt` (`components/ui.tsx`), `Ionicons`.
- **SSDS Target:** `SSDSAvatar`, `SSDSButton`, `SSDSSurface`, `SSDSConfirmationPattern`, `SSDSText`, `SSDSIcon` (preserving `Shell`, Android `measureInWindow` keyboard overlap logic, markdown/table renderer, and action cards).
- **Navigation:** `CommonActions`, `useNavigation<AppNavigation>()`, `useRoute<AppRoute<'SakhaAI'>>()`.
- **StoreProvider:** `useStore()` -> `state.chat`, `state.user`, `state.settings`.
- **Backend/API:** `askGemini` (`lib/geminiChat.ts` -> `POST /api/chat`).
- **Interactions/Callbacks:** Starter prompts, multiline composer, structured action-card navigation, clear chat confirmation.
- **Risk Level:** High.
- **Required Regression Tests:** `test/geminiChat.test.tsx`, `test/alarmAndSakhaProductionFixes.test.tsx`, `test/navigationLayoutFixes.test.tsx`.
- **Batch:** Batch 5.

#### 21. `FocusLockScreen` — `screens/FocusLockScreen.tsx`
- **Existing UI:** `Shell`, `LinearGradient`, `Svg`, `AsyncStorage`, custom cards/modals for Blocking Profiles, Discipline Controls, App Selection, Strict Mode PIN, and Android Protection Readiness.
- **SSDS Target:** `SSDSSurface`, `SSDSListItem`, `SSDSSwitch`, `SSDSButton`, `SSDSDialog`, `SSDSBottomSheet`, `SSDSText` (preserving all native `focusLockNative` and `focusLockUsageLimits` logic).
- **Navigation:** `useNavigation` via `Shell`.
- **StoreProvider:** `useStore()` -> `state.user`, `dayKey`, `getUserScopedStorageKey`.
- **Backend/API:** `focusLockNative`, `focusLockUsageLimits`, `focusLockPin`, `expo-notifications`, `AsyncStorage`.
- **Interactions/Callbacks:** Profile CRUD, app selection & daily usage limits, reminder suspension, 5-min Emergency Pass, Strict Mode PIN.
- **Risk Level:** High.
- **Required Regression Tests:** `test/focusLockRealBlocking.test.tsx`, `test/focusLockCleanup.test.tsx`, `test/focusLockP1Fixes.test.tsx`, `test/focusLockP2Fixes.test.tsx`, `test/focusLockP3Hardening.test.tsx`.
- **Batch:** Batch 5.

---

### Batch 6 (Specialized Domain Layouts — Retain Custom Architecture)

| # | Screen & Path | Existing UI | SSDS Adoption Scope | Navigation & Store Dependencies | Backend / Native Dependencies | Risk / Batch | Required Tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 22 | `DashboardScreen` (`screens/DashboardScreen.tsx`) | `Shell`, custom SVG `GoalDial`, `statsStrip`, 2x2 bento grid, `FocusSessionSetupModal` | **Token/primitive only** (already aligned to central palette via `buildDashboardPalette`); retain custom layout | `useFocusEffect`, `useNavigation`, `useStore()`, `useOptionalFocusSession()` | `focusLockNative`, `readAlarmSummary()` | Specialized / Batch 6 | `dashboardHomepageRedesign`, `navigationLayoutFixes` |
| 23 | `FocusCenterScreen` (`screens/FocusCenterScreen.tsx`) | `GeminiFocusTimer`, `FocusMusicSelection`, `Button`, `Txt`, `useSafeAreaInsets` | Replace `Button`/`Txt` with `SSDSButton`/`SSDSText`; retain Skia/Canvas2D timer & full-screen layout | `useFocusEffect`, `useNavigation`, `useRoute`, `useStore()`, `FocusSessionContext` | `expo-audio`, `expo-keep-awake`, `focusTimerAccounting`, `groupRoomFocusBridge` | Specialized / Batch 6 | `focusUnifiedRefactor`, `focusUiSurface`, `focusTimerAccounting` |
| 24 | `FocusCompletionScreen` (`screens/FocusCompletionScreen.tsx`) | `Shell`, `LinearGradient`, `Svg`, `BlurView`, custom reflection UI | `SSDSButton`, `SSDSSurface`, `SSDSText` for reflection controls; retain share-card capture | `useNavigation`, `useRoute`, `useStore()` | `expo-sharing`, `react-native-view-shot`, `lib/focusHistory.ts` | Specialized / Batch 6 | `focusCompletionScreen`, `focusCompletionNavigation` |
| 25 | `GroupsScreen` (`screens/GroupsScreen.tsx`) | `Shell`, `GroupChatHeader`, `ChannelBar`, `GroupMessageList`, `MessageActionSheet`, `GroupChatComposer`, `VirtualStudyHall` | Incremental `SSDSAvatar`/`SSDSBadge`/`SSDSDialog` inside subcomponents; retain WhatsApp-style chat & hall | `useFocusEffect`, `useNavigation`, `useRoute`, `useStore()`, `useOptionalFocusSession()` | Supabase Realtime, `expo-audio`, `expo-clipboard`, `expo-image-picker`, `expo-document-picker` | Specialized / Batch 6 | `groupChatFullscreenRedesign`, `groupChatAndFocusDecoupling`, `groupInvitesAndSync`, `groupRealtimeSubscription` |
| 26 | `SmartStudyRoomScreen` (`screens/SmartStudyRoomScreen.tsx`) | `SafeAreaView`, `lucide-react-native`, custom study room hall | Incremental `SSDSButton`/`SSDSText`; retain room/chair layout | `useNavigation`, `useSafeAreaInsets` | `groupFocusTimer`, `smartStudyRoomTypes`, Supabase Realtime | Specialized / Batch 6 | `groupFocusTimer`, `groupRoomStats` |
| 27 | `StudyPlannerScreen` (`screens/StudyPlannerScreen.tsx`) | `Shell`, custom SVG timeline, `FocusSessionSetupModal`, `NativeSchedulePickers` | Incremental `SSDSDialog`/`SSDSButton`/`SSDSText`; retain planner timeline & quarantine UI | `useNavigation`, `useStore()`, `useOptionalFocusSession()` | `lib/planner.ts`, `lib/plannerSchedule.ts`, `lib/groupRooms.ts`, `AsyncStorage` | Specialized / Batch 6 | `plannerRecovery`, `plannerSchedule`, `studyPlannerFilters`, `studyPlannerGroupSync` |
| 28 | `StudySakhaAlarmScreen` (`screens/StudySakhaAlarmScreen.tsx`) | `AppBottomNav`, `StudySakhaAlarmModule` | **None** (keep thin adapter isolated per `DEC-012`) | `useNavigation`, `useStore()` | `src/modules/alarm/*`, native Alarm Engine | Specialized / Batch 6 | `alarmUiUpdate`, `alarmEngineReliability`, `alarmStorage`, `heavySleeperMissions` |
| 29 | `TestPlayerScreen` (`screens/TestPlayerScreen.tsx`) | `SafeAreaView`, `AppHeader`, `useSmartAndroidBack`, `Button`, `Card`, `ProgressBar`, `Tag`, `Txt` | `SSDSProgressBar`, `SSDSButton`, `SSDSDialog`, `SSDSBadge`, `SSDSText`; retain exam timer/palette | `useNavigation`, `useRoute`, `useStore()` | `getTests`, `AsyncStorage` (`getUserScopedStorageKey`) | Specialized / Batch 6 | `notificationCentre` (deep-link), `store.reducer` |
| 30 | `StudyPlanner` (`screens/StudyPlanner.tsx`) | Unmounted legacy planner file (`Shell`, `Ionicons`) | **Do not migrate** — verify unreferenced and retire in cleanup | N/A (`App.tsx` mounts `StudyPlannerScreen`) | `lib/plannerSchedule.ts` | Retire Check | `grep` reference check |

---

## 4. Legacy Component Retirement Plan

| Legacy File | Current Consumers | Retirement Condition |
| --- | --- | --- |
| `components/ui.tsx` | `17` files | Deprecate individual exports only after Batches 1–5 reach `0` consumers for that primitive. |
| `components/BottomSheet.tsx` | `7` files | Keep until `SSDSBottomSheet` adds swipe-to-dismiss `PanResponder` parity or all 7 consumers explicitly opt into `Modal` slide sheets. |
| `lib/theme.tsx` | `39` files | Keep mounted in `App.tsx` alongside `SSDSThemeProvider` until all screens & components migrate to `useSSDSTheme()`. |

---

## 5. Phase 6 Acceptance Criteria (Per Migration PR / Batch)

1. Zero regressions in `StoreProvider` state, `AccountSyncEngine` sync, navigation routes (`lib/navigation.ts`), or `useSmartAndroidBack`.
2. All `SSDS*` components render with the approved Blue–Teal–Amber palette across Light, Dark, and System modes, `highContrast`, and `textScale` `0.8`–`1.4`.
3. Zero `AsyncStorage` reads/writes for `ssds_appearance_v1` or `ssds_custom_presets_v1`.
4. `tsc --noEmit -p study-sakha-design-system-native/tsconfig.json`, `eslint --no-cache` on changed files, all Phase 1–5 SSDS suites, and all screen-specific regression Jest suites pass.
5. Physical Android device verification completed in Phase 7 before retiring any legacy `components/ui.tsx` or `lib/theme.tsx` exports.
