# Development Log — Study Sakha

## 2026-11-28 — Homepage UI Replacement (`screens/DashboardScreen.tsx`)
- **Strict Design-Only Replacement (`screens/DashboardScreen.tsx`):** Replaced the existing Homepage visual presentation with the uploaded Gemini `homepagedesign` layout while preserving `Shell` (`AppHeader` + `AppBottomNav`) and 100% of existing handlers, navigation routes, store selectors, and native integrations.
- **Visual Structure:** Implemented the cardless editorial greeting (`Good morning/afternoon/evening,` + user first name), 80x80 SVG `GoalDial` (outer ticks, base track, `#19C5B5` progress arc, `GOAL`/`LIVE` sublabel), compact `statsStrip` (`Studied today` and `Study streak` with hairline dividers), and `Study Planner` (`Quick controls`) 2x2 bento grid (`Add Task`, `Focus Lock`, `Focus Timer`, `Alarm`) with full light/dark theme palettes (`LIGHT_PALETTE` / `DARK_PALETTE`).
- **Preserved Integrations & Workflows:** `Add Task` -> `StudyPlanner` (with live pending task count & next task title), `Focus Lock` -> `FocusLock` (with live `focusLockNative.getBlockingStatus()` & event subscription for `ON`/`OFF` state), `Focus Timer` -> `FocusSessionSetupModal` -> `FocusCenter` (with live `useOptionalFocusSession()` timer display & running state), `Alarm` -> `Alarm` (with live `readAlarmSummary()` `ON`/`OFF` & next alarm time), `GoalDial` -> active `FocusCenter` or `FocusSessionSetupModal`, plus `Shell` `AppHeader` (Logo, Sync, Theme, Notifications, More menu) and `AppBottomNav` (`Home`, `Library`, `Groups`, `Sakha AI`, `Profile`).
- **Verification:** `test/dashboardHomepageRedesign.test.tsx`, `test/navigationLayoutFixes.test.tsx`, `test/drawerSettingsNavigation.test.tsx`, `test/navigationBack.test.tsx` (4/4 suites, 21/21 tests), `expo lint` (0 errors), `tsc --noEmit` (0 errors in `DashboardScreen.tsx` and `test/dashboardHomepageRedesign.test.tsx`), and `pnpm run build:web` (`dist/` exported) all passed on host. Physical Android device visual/runtime verification remains pending.

## 2026-11-28 — Help & Feedback System Audit & Full Implementation
- **Audit Finding:** The previous Help modal in `components/Shell.tsx` was a frontend-only prototype (`handleContinue` at step 3 only closed the modal and cleared `descriptionText` with no network call, backend table, log collection, screenshot upload, or admin visibility), and `screens/SettingsScreen.tsx` had a placeholder `"Support submission is unavailable in this build"` modal.
- **Supabase Backend & Private Storage (`supabase/migrations/202611280001_feedback_submissions.sql`):** Added `public.feedback_submissions` (categories `report_issue`, `share_idea`, `appreciate_team`; statuses `submitted`, `received`, `in_progress`, `resolved`, `closed`; `client_request_id` unique index for idempotency; strict owner + `is_admin()` RLS) and private `feedback-attachments` storage bucket (5 MB, PNG/JPEG/WebP, owner-folder + admin RLS).
- **Feedback Service (`lib/feedback.ts`):** Implemented `submitFeedback`, `collectSafeDiagnosticLogs` with token/JWT/API-key/password/email redaction (`redactSensitiveText`) and 16 KB cap (`MAX_LOG_BYTES`), `pickFeedbackScreenshot` + `uploadFeedbackScreenshot` + `cleanupTemporaryScreenshot`, and admin/user query helpers.
- **UI & Admin (`components/HelpFeedbackModal.tsx`, `components/Shell.tsx`, `screens/SettingsScreen.tsx`, `screens/AdminScreen.tsx`):** Replaced both placeholder modals with `HelpFeedbackModal` (explicit opt-in log/screenshot consent, sub-categories for issues and ideas, reproduction steps, validation, duplicate-submit guard, error/retry with form preservation, and Reference ID confirmation) and added a `Feedback` tab to `AdminScreen.tsx` for viewing submissions, signed screenshots, and updating status/admin responses.
- **Verification:** `test/helpFeedbackSystem.test.tsx` + 3 navigation suites (4/4 suites, 27/27 tests), `expo lint` (0 errors), and `tsc --noEmit` (0 errors in feedback files) passed on host. Live Supabase migration push and physical device runtime remain unverified in Codespace.

## 2026-11-28 — Alarm Engine Outside-App Triggering, Lock-Screen Activity & Shared Next-Occurrence Fix
- **Dedicated Native Full-Screen Alarm Activity (`AlarmRingingActivity.kt`, `plugins/withAlarmEngine.js`):** Added `AlarmRingingActivity` (`launchMode="singleInstance"`, `showWhenLocked="true"`, `turnScreenOn="true"`, `FLAG_KEEP_SCREEN_ON`, keyguard dismissal on transition) registered via `withAlarmEngine.js`. When `heavySleeper` is ON, it launches `MainActivity` (`studysakha://alarm`, `launchMode="mission"`) into `HeavySleeperMissionView` while `AlarmPlaybackService` continues ringing/vibrating until mission completion; when `heavySleeper` is OFF, it provides direct Dismiss (opening the Greeting screen) and Snooze controls.
- **Background Triggering, Permissions & Duplicate Prevention (`AlarmEngineScheduler.kt`, `AlarmEngineReceiver.kt`, `AlarmPlaybackService.kt`, `AlarmEngineModule.kt`, `alarmNative.ts`, `StudySakhaAlarmModule.tsx`):**
  - Switched exact alarm scheduling to `AlarmManager.setAlarmClock` (with `setAndAllowWhileIdle` fallback), persisted active snoozes in `SharedPreferences` across `BOOT_COMPLETED`/`MY_PACKAGE_REPLACED`/`TIME_CHANGED`/`TIMEZONE_CHANGED`, acquired a short WakeLock in `AlarmEngineReceiver`, and guarded against duplicate triggers via `AlarmPlaybackService.isAlarmRinging(alarmId)` and `AlarmRingingActivity.finishActive(alarmId)`.
  - Added `getAlarmPermissionStatus`, `openExactAlarmSettings`, `openFullScreenIntentSettings`, and `openNotificationSettings` plus an Android Dashboard permission readiness banner and Android JS `Vibration.cancel()` guard so native sound/vibration continue independently of RN rendering.
- **Shared Next-Occurrence Calculation (`src/modules/alarm/alarmStorage.ts`, `src/modules/alarm/StudySakhaAlarmModule.tsx`):** Replaced hardcoded `"Tomorrow · ..."` with shared `getNextAlarmOccurrence` / `formatAlarmOccurrenceLabel` / `formatLocalDateLabel` using local calendar day boundaries (midnight/DST/timezone-safe) across the Next Scheduled Alarm card, individual alarm cards, and Ringing screen.
- **Verification:** `expo prebuild --no-install --platform android` (PASS), `expo lint` (PASS, 0 errors), and 5 Alarm Jest suites (`test/alarmEngineReliability.test.tsx` + 4 existing suites) verified on host. Android Kotlin compilation & physical lock-screen/Doze/reboot device testing remain **Not Verified** (no Android SDK/device in Codespace).

## 2026-11-28 — Focus Lock Real Android App Blocking, Usage Limits & Profiles Cleanup
- **Native Per-App Daily Usage Limits & Suspension (`FocusLockUsageLimits.kt`, `FocusLockModule.kt`, `plugins/withFocusLock.js`):** Implemented `UsageStatsManager.queryEvents` local-midnight daily usage tracking, persisted per-app daily limits (`app_usage_limits`), local-midnight reset, and temporary reminder suspension (`rest_of_day`, `till_tomorrow`, `7_days`) without deleting configured limits.
- **AccessibilityService & Intervention Screen (`FocusLockAccessibilityService.kt`, `FocusLockBlockingActivity.kt`):** Added dual independent policy enforcement (active study session with native `allowedPackageIds` Allowlist support + per-app daily usage limits with in-app `Handler` timer recheck), IME/launcher/SystemUI handling, 150ms burst debounce, and rich native intervention UI (app icon/name, configured limit, time spent today, remaining time, `Close App`, conditional `Open App`, `Emergency Access • 5m`, and `Turn Off Reminder Temporarily`).
- **Controlled Emergency Access (`FocusLockUsageLimits.kt`, `FocusLockAlarm.kt`, `FocusLockBootReceiver.kt`):** Added 5-minute Emergency Pass with daily use counter, non-resetting active timer, `FOCUS_LOCK_EMERGENCY_EXPIRED` alarm (`requestCode = 92`), boot/clock-change rebasing, 50-entry audit history, and Strict Mode PIN delegation (`requiresPinForEmergency`).
- **JS Bridge, UI & Blocking Profiles Cleanup (`lib/focusLockNative.ts`, `lib/focusLockUsageLimits.ts`, `screens/FocusLockScreen.tsx`):** Removed `Duplicate` and `Save Focus Profile` modal; replaced with direct `Save Profile` (validate, save, and apply immediately). Added per-app daily limit cycling and `Turn Off Reminder` modal (`Rest of the day`, `Till tomorrow`, `7 days`) in App Selection. Updated `EmergencyAccessModal` to grant 5-min passes without ending the study session.
- **Verification:** `expo prebuild --no-install --platform android` (PASS), `test/focusLockRealBlocking.test.tsx` + `focusLockP1Fixes` + `focusLockP2Fixes` + `focusLockP3Hardening` + `focusLockCleanup` (5/5 suites, 19/19 tests), and `docs/FOCUS_LOCK_PRODUCTION_AUDIT.md` updated. Physical Android device runtime remains unverified (no Android SDK/device in Codespace).

## 2026-11-27 — Final Pre-APK Release Audit & Remediation
- **Android Manifest & Camera Mission Fix (`app.json`, `plugins/withAlarmEngine.js`):** Fixed `BUG-028` where `expo-image-picker` `"cameraPermission": false` emitted `<uses-permission android:name="android.permission.CAMERA" tools:node="remove"/>` in `AndroidManifest.xml`, and added `android.media.action.IMAGE_CAPTURE` to `<queries>` so `AlarmMissionEngine.kt` can resolve the camera on Android 11+.
- **AlarmEngine Scheduler & Playback Service Fixes (`AlarmEngineScheduler.kt`, `AlarmPlaybackService.kt`, `AlarmEngineModule.kt`):** Fixed `BUG-029` (`sync()` and `rescheduleStored()` no longer cancel pending `ACTION_SNOOZE` alarms), `BUG-030` (`ActiveAlarmMeta` + `isForeground` tracking, `EXTRA_HEAVY_SLEEPER`/`EXTRA_MISSION_BEFORE_SNOOZE` forwarded on notification snooze, idempotent `onStartCommand`, and accurate multi-alarm notification rebuild in `stopAlarm()`), and `BUG-031` (`hasKey` guards in `scheduleSnooze`).
- **FocusLock Blocking Activity Fix (`FocusLockBlockingActivity.kt`):** Fixed `BUG-032` (scaled "Return to Study" button height by `resources.displayMetrics.density`).
- **Test & Documentation Updates:** Fixed `settingsScreen.test.tsx`, `groupRealtimeSubscription.test.tsx`, `fourFixesRegression.test.tsx`, and updated `heavySleeperMissions.test.tsx`; generated `docs/FINAL_PRE_APK_AUDIT.md`, `docs/ANDROID_RELEASE_READINESS.md`, and `docs/FINAL_BUG_TRACKER.md`.
- **Verification:** `expo prebuild --no-install --platform android` (PASS), `expo lint` (PASS, 0 errors), `build:web` (PASS), `validate:release -- preview` with `EXPO_PUBLIC_API_BASE_URL` (PASS), and `jest --runInBand --forceExit` (**57/61 suites, 310/319 tests passed**).

## 2026-11-27 — Complete Notification Centre Redesign & Implementation
- **Phase 0 Audit (`docs/NOTIFICATION_ARCHITECTURE_AUDIT.md`, `docs/NOTIFICATION_DATA_FLOW.md`, `docs/NOTIFICATION_IMPLEMENTATION_CHECKLIST.md`):** Audited `App.tsx`, `lib/navigation.ts`, `components/Shell.tsx`, `screens/NotificationsScreen.tsx`, `lib/notifications.ts`, `lib/store.tsx`, `lib/types.ts`, `screens/SettingsScreen.tsx`, and `supabase/migrations/`.
- **Core Notification Architecture (`lib/notifications/*`, `lib/notifications.ts`, `lib/types.ts`, `lib/store.tsx`):**
  - Created `types.ts`, `registry.ts` (10 normalized types mapped to 3 categories), `notificationDeduplication.ts` (`eventKey` + `id` deduplication, future/expired filtering), `notificationSelectors.ts` (5 smart filters, `Today`/`Yesterday`/`This Week`/`Earlier` grouping, active announcements), `notificationPreferences.ts` (per-user persistence, Quiet Hours across midnight, push vs inbox separation), `notificationRouter.ts` (centralized destination mapping, entity fallback, pending cold-start intent, duplicate-tap guard), `notificationRepository.ts`, `notificationSync.ts` (offline idempotent queue + Supabase Realtime), and `notificationService.ts` (Android channels `study-reminders`, `social-messages`, `group-activity`, `announcements`, `achievements` — preserving `study-sakha-alarm-engine` — and Expo push token lifecycle).
  - Extended `lib/store.tsx` reducer with `unreadNotif`, `markNotifsRead`, `deleteNotifs`, `restoreNotifs`, `setNotifications`, `setAnnouncements`, `updatedAt` tracking, and `archivedAt`-aware `unread` count.
- **Immersive UI & Interaction Engine (`lib/navigation.ts`, `components/notifications/*`, `hooks/notifications/*`, `screens/NotificationsScreen.tsx`, `screens/NotificationSettingsScreen.tsx`):**
  - Added `NotificationSettings` route and updated `shouldHideAppShell` to hide global `Shell` chrome on `Notifications` and `NotificationSettings` while preserving safe areas and system bars.
  - Built `NotificationHeader` (normal + selection toolbar), `AnnouncementCard` (conditional, dismissible, View All modal), `NotificationFilters` (5 filters), `NotificationRow` (Reanimated + Gesture Handler swipe left/right, single-open-row coordination, 48dp touch targets), `NotificationActionMenu`, `NotificationSkeleton`, `NotificationEmptyState`, `NotificationErrorState`, and `UndoSnackbar`.
  - Built `NotificationSettingsScreen` with expandable General, Study, Social, Updates, and Quiet Hours sections, OS permission status banner, and optimistic rollback.
- **Backend Migration (`supabase/migrations/202611270002_notification_centre_backend.sql`):**
  - Added `public.notifications`, `public.notification_preferences`, `public.push_tokens`, extended `public.announcements`, added strict owner RLS, `SECURITY DEFINER` RPCs (`mark_notifications_read`, `archive_notifications`, `upsert_push_token`, `deactivate_push_token`), and `supabase_realtime` publication.
- **Module Integrations (`App.tsx`, `screens/TestPlayerScreen.tsx`, `screens/SettingsScreen.tsx`):**
  - Wired `NotificationSettingsScreen`, pending intent routing, Android channel/token initialization, `TestResult` deep-link metadata on test submission, and `SettingsScreen` shortcut.


## 2026-11-27 — Focus Lock Complete UI & Feature Removal (Focus Status, Quick Lock, Sakha Owl)
- **Removed Remaining Top Sections & Intervention UI (`screens/FocusLockScreen.tsx`):**
  - Removed **Focus Status Dashboard** (`FocusStatusCard` — Ready to Focus, Blocked Apps, Duration, Blocked Today, Next scheduled focus time).
  - Removed **Quick Focus Lock** (`QuickLockPresets`, `selectedPreset`, `customMinutes`, `untilTime` state/persistence, Instant Start, duration presets, Custom/Until Time/End of Day, and `START FOCUS LOCK`).
  - Removed **Sakha Owl** (`OwlAssistantCard`, `InterventionModal`, `showIntervention` state, `Test Mindful Intervention` card in `active_session`, and `Trigger Mindful Intervention Modal` in `showStateLab`).
  - Cleaned up unused `Animated`/`Easing`/`SafeAreaView`/`reduceMotion` imports.
- **Final Focus Lock Structure:** Starts directly with `Blocking Profiles` (without `Manage Apps`), followed by `Discipline Controls` (`Blocking Modes`, `App Selection`, `Strict Mode`, `Focus Analytics`, `Web & Shorts`) and `Android Protection Readiness`.
- **Verification:** Updated `test/focusLockCleanup.test.tsx`; 3 focused Jest suites (18/18 tests) and `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` passed; `tsc --noEmit` reported 0 errors in `screens/FocusLockScreen.tsx` and `test/focusLockCleanup.test.tsx`.

## 2026-11-27 — Focus Lock Screen UI Cleanup & Feature Removal
- **Removed Manage Apps Duplicate Button (`screens/FocusLockScreen.tsx`):** Removed the `Manage Apps ({selectedAppIds.length})` button from the `BLOCKING PROFILES` header while preserving `App Selection` in `DISCIPLINE CONTROLS` and all app-blocking/profile functionality.
- **Removed Four Features & Dedicated Screens (`screens/FocusLockScreen.tsx`):**
  - Removed `Usage Rules`, `Smart Schedules`, `Smart Breaks`, and `Study Sakha Exclusive Suite` from `DISCIPLINE CONTROLS` / the exclusive suite banner, along with their dedicated screens (`'rules'`, `'schedules'`, `'breaks'`, `'sakha'`) in `ScreenName` and `renderScreenContent`.
  - Removed `Sakha AI →` (`onOpenSakha`) from `OwlAssistantCard` so no leftover navigation reference to `'sakha'` remains.
  - Cleaned up unused components (`UsageLimitCard`, `BreakManagementCard`, `ScheduleCard`, `FocusRewardCard`), services (`UsageTrackingService`, `ScheduleService`), interfaces (`UsageRule`, `FocusSchedule`, `ScheduleConflict`), state/persistence fields (`rules`, `schedules`, `holidayMode`, `dailyClaimed`, `groupJoined`, `groupCountdown`, `partnerStatus`, `earnedMinutesBank`), and 13 unused Lucide icon imports.
- **Preserved Core Functionality:** Retained Focus Status Dashboard, Quick Focus Lock, Sakha Owl Intervention Card, Blocking Profiles, Discipline Controls (`Blocking Modes`, `App Selection`, `Strict Mode`, `Focus Analytics`, `Web & Shorts`), Android Protection Readiness, and native Android `FocusLock` integration.
- **Verification:** Added `test/focusLockCleanup.test.tsx`; 3 focused Jest suites (`test/focusLockCleanup.test.tsx`, `test/stabilityFailureScenarios.test.tsx`, `test/navigationLayoutFixes.test.tsx`: 18/18 tests) and `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` passed; `tsc --noEmit` reported 0 errors in `screens/FocusLockScreen.tsx` and `test/focusLockCleanup.test.tsx` (repo baseline still fails on unrelated pre-existing group test typings). Visual/runtime verification on a physical Android device remains pending.

## 2026-11-27 — Heavy Sleeper Mode Production-Readiness Audit & Fixes
- **Snooze & Notification Bypass Fixes (`AlarmEngineScheduler.kt`, `AlarmEngineModule.kt`, `AlarmEngineReceiver.kt`, `alarmNative.ts`, `StudySakhaAlarmModule.tsx`):** Fixed `scheduleSnooze` dropping `heavySleeper` and `missionBeforeSnooze` extras (which would have shown a `Stop` notification action after the first snooze), added `isHeavySleeperAlarm` guard on `ACTION_DISMISS_NOTIFICATION`, and hid Snooze controls once `maxSnooze` is reached.
- **Session Recovery & Native Trigger Race Fixes (`StudySakhaAlarmModule.tsx`):** Added `missionRestoredRef` (one-time post-hydration session restore) and `activeRingingIdRef` guard in `handleNativeAlarm`, and cleared `restoredMissionSession` + `saveActiveMissionSession(null)` on dismiss/snooze/native actions so updating `alarms` never re-opens or resets an active mission.
- **Resource Leak & Photo Similarity Fixes (`AlarmMissionEngine.kt`, `AlarmEngineModule.kt`, `HeavySleeperMissionView.tsx`):** Added `AlarmMissionEngine.cleanup()` invoked from `AlarmEngineModule.invalidate()` to unregister sensors/activity listeners and resolve pending camera promises; tracked and cleared Memory flash timers on unmount; tightened `computeSignatureSimilarity` luminance cosine and dHash baselines (`0.0` floor for orthogonal/random images) to reduce false-positive photo matches.
- **Verification:** `expo prebuild --no-install --platform android`, 4 focused Jest suites (36/36 tests), `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` (0 errors), and `tsc --noEmit` (0 errors in alarm/mission files) passed. Kotlin compilation & physical Android hardware verification remain unverified without an Android SDK/device.

## 2026-11-27 — Heavy Sleeper Mode Full Implementation
- **Modular Mission Logic & Persistence (`src/modules/alarm/alarmMissions.ts`):** Implemented pure generators/validators for Math (4 difficulties), Memory (progressive length & speed), Shake (20–100 target clamping), Typing (exact sentence match), QR/Barcode (exact registered code match), Steps (10–100 target clamping), sequential/randomized queue building (`clampMissionCount` preventing count > selected missions when duplicates disabled), retry limits, timeouts, and `AsyncStorage` persistence (`@study_sakha_alarm_mission_state_v1`, `@study_sakha_alarm_mission_results_v1`) across restarts.
- **Native Android Mission Engine (`native/alarm/android/java/com/anonymous/agonpreview/AlarmMissionEngine.kt`, `AlarmEngineModule.kt`, `AlarmEngineScheduler.kt`, `AlarmEngineReceiver.kt`, `AlarmPlaybackService.kt`, `native/alarm/android/res/xml/alarm_file_paths.xml`, `plugins/withAlarmEngine.js`):**
  - Added real Android `SensorManager` integration for `TYPE_ACCELEROMETER` (shake detection with g-force threshold + debounce) and `TYPE_STEP_COUNTER` / `TYPE_STEP_DETECTOR` with `ACTIVITY_RECOGNITION` runtime permission handling and `onStudySakhaMissionSensor` native-to-JS events.
  - Added `CAMERA` runtime permission handling, `FileProvider` capture, offline ZXing (`com.google.zxing:core:3.5.3`) `MultiFormatReader` QR/barcode decoding, and real reference-vs-current photo similarity scoring (normalized luminance cosine + RGB grid + dHash).
  - Enforced `heavySleeper` and `missionBeforeSnooze` on `AlarmPlaybackService` notifications so heavy-sleeper alarms cannot be bypassed from notification Stop/Snooze actions.
- **Mission Runner & Editor Controls (`src/modules/alarm/HeavySleeperMissionView.tsx`, `src/modules/alarm/StudySakhaAlarmModule.tsx`, `src/modules/alarm/alarmNative.ts`):** Replaced all simulated mission handlers with real native sensor/camera/ZXing validation, auto-started missions when a heavy-sleeper alarm rings, enforced `missionBeforeSnooze`, restored active mission sessions on restart, and added Retry Limit, Mission Timeout, Allow Duplicates, and per-mission settings (Shake/Steps targets, QR registration, Photo reference capture & similarity threshold) in the editor.
- **Verification:** `expo prebuild --no-install --platform android`, 4 focused Jest suites (36/36 tests including `test/heavySleeperMissions.test.tsx`), `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` (0 errors), and `tsc --noEmit` (0 errors in alarm/mission files) passed. Kotlin compilation & physical Android sensor/camera runtime remain unverified in Codespace (no Android SDK/device).

## 2026-11-27 — Alarm Theme Library, Preview & Settings Fixes
- **Theme Library Done Button (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Updated `renderThemesScreen()` header with `minWidth: 0`, `flex: 1`, `numberOfLines={1}` on title/subtitle, and `flexShrink: 0` on the right actions row so `Preview` and `Done` never clip on narrow mobile viewports; `Done` and Back return to Alarm Settings.
- **Theme Selection Layout Stability (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Changed `themeGrid` to `justifyContent: 'space-between', rowGap: 10`, gave `themeCardWrap` a constant `borderWidth: 2.5, borderColor: 'transparent'`, and moved `overflow: 'hidden'` to `themeCardInner` so selecting any of the 4 themes (`starry_sky`, `cozy_study`, `midnight_blue`, `obsidian`) only updates its border/check state and never clips or drops sibling cards.
- **Isolated Theme Preview (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Replaced `triggerAlarmRinging(alarms[0])` in `renderThemesScreen()` with a dedicated `themePreviewVisible` full-screen `Modal` (`testID="alarm-theme-preview-dismiss"`). Dismissing Preview returns directly to Theme Library without triggering real alarm ringing or the Good Morning screen.
- **Simplified Alarm Settings (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Removed `DISPLAY SETTINGS` (`Appearance Mode`, `Minimal Display Mode`), `WAKE-UP & SOUND DEFAULTS`, `24-Hour Time Format`, and `Time Zone` from `renderSettingsScreen()`, keeping only the Theme Library card, `NOTIFICATIONS` (`Upcoming Alarm Notifications`, `Missed Study Task Alerts`), and `Reset Default Settings`.
- **Verification:** Updated `test/alarmUiUpdate.test.tsx`; 6 focused Jest suites (45/45 tests), `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` (0 errors), and `tsc --noEmit` (0 errors in alarm files) passed.

## 2026-11-27 — Alarm Dashboard & Editor Cleanup
- **Removed Duplicate Shortcuts (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Removed the 4 shortcut buttons (`Friends`, `Sleep`, `Analytics`, `History`) from `renderDashboardScreen()`; all remain accessible through the 3-dot header menu.
- **Add Alarm Buttons (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Removed the empty-state `+ Add Smart Alarm` button, moved the floating `Add Alarm` button (`fabWrap`) to bottom-left (`left: 18`), and renamed the top-card `+ Create Alarm` button to `Add Alarm` so only those two `Add Alarm` buttons remain.
- **Create/Edit Footer Removal (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Removed the bottom `editorFooter` (`Save & Test` and `Save Alarm` buttons) from `renderEditorScreen()`, keeping only the top-right `Save` button in the header with its existing save flow.
- **Verification:** Updated `test/alarmUiUpdate.test.tsx`; 6 focused Jest suites (41/41 tests), `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` (0 errors), and `tsc --noEmit` (0 errors in alarm files) passed.

## 2026-11-27 — Alarm Create/Edit Screen UI Update
- **Wheel Time Picker (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Replaced the up/down arrow stepper card and `"Next alarm in"` countdown text in `renderEditorScreen()` with a vertical scrolling wheel-style time picker (`WheelColumn` with `snapToInterval`, `nestedScrollEnabled`, tap-to-select, and Hour/Minute/AM-PM columns supporting both 12h and 24h formats).
- **Alarm Details (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Removed the alarm title `TextInput`, preset suggestion chips, and motivational message input; kept only a single horizontal Category selector (`testID="alarm-category-selector"`) that opens a Category selection modal preserving all 7 categories (`wakeup`, `study`, `revision`, `mocktest`, `focus`, `personal`, `bedtime`).
- **Specific Date Picker (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Replaced the Specific Date `TextInput` with a `Pressable` field (`testID="alarm-specific-date-field"`) that opens Study Planner's existing `NativeDatePicker` (Android) / `WebDatePicker` (non-Android) from `components/NativeSchedulePickers.tsx` directly without opening the keyboard.
- **Horizontal Sound Selector (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Replaced the vertical sound list with a compact horizontal scrolling `ScrollView` of selectable sound cards (`testID="alarm-sound-card-*"`), preserving sound selection, play/pause preview, volume stepper, gradual volume toggle, and vibration toggle.
- **Verification:** Expanded `test/alarmUiUpdate.test.tsx`; 6 focused Jest suites (39/39 tests), `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` (0 errors), and `tsc --noEmit` (0 errors in alarm files) passed. Physical Android device runtime remains not verified in Codespace.

## 2026-11-27 — Alarm Module UI Update
- **Header 3-Dot Menu (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Removed top-right `BedDouble` and `Settings` icons from the Alarm Dashboard header and added a 3-dot overflow menu (`MoreVertical`, `testID="alarm-header-menu-button"`) containing `Sleep`, `Analytics`, `History`, `Friends`, and `Settings` while preserving all underlying screen navigation.
- **Removed Study Section (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Removed the `Study Sync` shortcut, `'studyAlarms'` route/screen (`renderStudyAlarmsScreen`), and Study-only modals (`showAddTaskModal`, `showFocusCenterModal`) from the Alarm Module without touching Study Sakha's main `StudyPlanner` or other study features.
- **Main Screen Shortcuts (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Removed the `Themes` shortcut from the main Alarm Dashboard; `Theme Library` remains accessible through Alarm Settings only (preserving all 4 themes: `starry_sky`, `cozy_study`, `midnight_blue`, `obsidian`).
- **Global Bottom Navigation (`src/modules/alarm/StudySakhaAlarmModule.tsx`, `screens/StudySakhaAlarmScreen.tsx`):** Removed `renderAlarmBottomNav()` completely and wired Study Sakha's global `AppBottomNav` (`components/Shell.tsx`) via `globalBottomNav` prop with keyboard-hide support and non-doubled bottom safe-area edges.
- **White Card Design & Next Alarm Card Cleanup (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Replaced dark/colored `LinearGradient` backgrounds on the Next Scheduled Alarm card and Settings Theme Library card with clean white (`#FFFFFF`) cards and high-contrast typography; removed the `"Next alarm in"` countdown bar and `"Test Ring"` button from the Next Scheduled Alarm card while preserving alarm time, label, repeat schedule/date, `Edit`, and `Disable` actions.
- **Verification:** Added `test/alarmUiUpdate.test.tsx`; 6 focused Jest suites (35/35 tests) and `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` passed; `tsc --noEmit` reported 0 errors in `StudySakhaAlarmModule.tsx`, `StudySakhaAlarmScreen.tsx`, and `test/alarmUiUpdate.test.tsx`. Physical Android device runtime remains not verified in Codespace.

## 2026-11-27 — Groups Module UI-Only Icon Upgrade
- **Groups Screen (`screens/GroupsScreen.tsx`):** Replaced remaining decorative emojis and text-glyph indicators (`🔥`, `★`, `✓`, `✨`, `→`, `↑`) with semantic `lucide-react-native` icons (`Flame`, `Star`, `CheckCircle2`, `Sparkles`, `ArrowRight`, `TrendingUp`) using consistent `strokeWidth` (`1.9`–`2`) and theme tokens. Standardized Group Details tab and action icons to `Timer`, `MessageCircle`, `ChartNoAxesCombined`, and `ShieldCheck`. Preserved initials-based avatars (`MemberAvatar`, `groupAvatar`) and all business logic/navigation/state.
- **Smart Study Room & Chat List (`screens/SmartStudyRoomScreen.tsx`, `components/groups/GroupMessageList.tsx`):** Replaced text-glyph controls (`☀`, `🌙`, `›`, `⏸`, `▶`, `■`) with `Sun`, `Moon`, `ChevronRight`, `Pause`, `Play`, `Square` from `lucide-react-native`, and updated chat empty-state icon to `MessageCircle`.
- **Verification:** `tsc --noEmit` reported 0 errors in all Groups module files (repo baseline still fails on unrelated `src/modules/alarm/alarmFriendsApi.ts` and test typings); `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` passed (exit 0); Groups emoji scan confirmed zero decorative UI emojis remain (only functional chat `COMMON_EMOJIS` / `QUICK_REACTIONS` remain).

## 2026-11-27 — Phase 1 Groups & Chat Full-Screen Professional Redesign
- **Full-Screen Navigation & App Shell (`lib/navigation.ts`, `components/Shell.tsx`, `screens/GroupsScreen.tsx`):**
  - Added `shouldHideAppShell` in `lib/navigation.ts` and `hideChrome` support in `components/Shell.tsx` so entering Group Details / Group Chat (`activeScreen === 'detail'`) hides `AppHeader`, `AppBottomNav`, desktop `Sidebar`, and `TopBar` while preserving safe-area insets (`insets.top` and `insets.bottom`) and Android system navigation.
  - Restores global header and bottom navigation when returning to Groups (`activeScreen === 'main'`); channel changes and detail tab switches keep the full-screen shell active.
  - Implemented deterministic Android `BackHandler` priority in `GroupsScreen.tsx`: dismiss keyboard -> close message action sheet -> close channel selector -> close search -> close group menu -> close selection sheet -> clear reply preview -> return from Group Details to Chat (when entered from Chat) -> return to Groups main -> pop to `DashboardRoot`.
- **Compact Group Chat Header & Channel Selector (`components/groups/GroupChatHeader.tsx`, `components/groups/ChannelSelectorSheet.tsx`):**
  - Replaced the oversized `heroCard` and outer `padding: 16` wrapper with a compact ~58dp `GroupChatHeader` (back button, avatar, group name, member count, real studying indicator when `liveMemberCount > 0`, inline message search toggle, Join button if unjoined, and More options menu).
  - Kept all 7 Group Details tabs (`Live Study`, `Chat`, `Goals`, `Learn Together`, `Events`, `Members`, `Insights`) in a compact horizontally scrollable strip.
  - Replaced the 224px tablet sidebar and mobile channel chip strip with `ChannelBar` + `ChannelSelectorSheet` (`BottomSheet`), removing the hardcoded `unread: 2` on `announcements` and tracking real unread counts per channel.
- **Virtualized Message List, Contextual Actions & Composer (`components/groups/GroupMessageList.tsx`, `components/groups/MessageActionSheet.tsx`, `components/groups/GroupChatComposer.tsx`, `lib/groupRooms.ts`):**
  - Replaced `ScrollView` + `.map()` with virtualized `FlatList`, memoized `MessageBubbleRow`, sender grouping, date separators, unread divider, reply quote blocks, delivery status (`sending`/`sent`/`failed` with retry), and older-message pagination (`getStudyGroupMessages` with `beforeCreatedAt`).
  - Removed permanent per-bubble `Reply` and `Report` clutter; added long-press `MessageActionSheet` with quick emoji reactions and permission-aware working actions (`Reply`, `Copy text`, `Save to group resources` when attachment exists, `Report message` on received messages).
  - Built `GroupChatComposer` with `KeyboardAvoidingView` (`behavior="height"` on Android, `"padding"` on iOS), safe-area bottom inset coordination, multiline auto-growth, `AsyncStorage` draft persistence per `groupId:channelId`, `expo-image-picker` & `expo-document-picker` attachments, inline emoji tray, reply preview, and read-only channel banner.
  - Added loading skeleton, load error with Retry, offline banner, and empty channel/search states.
- **Verification:** `test/groupChatFullscreenRedesign.test.tsx` (8/8) + 5 existing group/navigation suites (35/35) passed; `expo lint` passed with 0 errors/0 warnings; `tsc --noEmit` reported 0 errors in all modified/created files. Physical Android device verification remains pending.

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

## 2026-11-27 — Production APK Critical UX & Functional Fixes (6 Parts)
- **Part 1 — Sakha AI Android Keyboard & Composer (`app.json`, `screens/SakhaAIScreen.tsx`):** Added `"softwareKeyboardLayoutMode": "resize"` in `app.json` and measured Android window/keyboard overlap via `measureInWindow` in `SakhaAIScreen.tsx` (`androidKeyboardOverlap`), removed `insets.bottom` double-padding while keyboard is open, enabled smooth multiline scrolling (`scrollEnabled={inputHeight >= 128}`), and auto-scrolled `ScrollView` on keyboard open and multiline growth.
- **Part 2 — Alarm Screen Header Safe Area (`src/modules/alarm/StudySakhaAlarmModule.tsx`):** Replaced `react-native` `SafeAreaView` (no-op on Android) with `react-native-safe-area-context` `SafeAreaView` (`edges={['top', 'right', 'bottom', 'left']}`) and `useSafeAreaInsets()`, removed nested inner `SafeAreaView` double-padding, and inset `toastPill` below status bar.
- **Part 3 & 4 — Alarm Friends Demo Removal & Real Supabase Integration (`supabase/migrations/202611270001_alarm_friends_and_accountability.sql`, `src/modules/alarm/alarmFriendsApi.ts`, `src/modules/alarm/StudySakhaAlarmModule.tsx`):** Removed all fabricated users (`Aarav Sharma`, `Priya Rathore`, `Vikram Choudhary`, `Sneha Verma`), `SAKHA-KAM-26`, and demo preview buttons; filtered legacy `fr-*` entries on hydration; added RLS-protected tables and `SECURITY DEFINER` RPCs for user search, friend requests (send/accept/reject/cancel/remove), target wake-up time, wake-up squads, rate-limited cheers/nudges, and notifications.
- **Part 5 — Alarm Themes Selector Stability (`screens/StudySakhaAlarmScreen.tsx`, `src/modules/alarm/StudySakhaAlarmModule.tsx`):** Memoized host module/callbacks, validated hydrated `activeThemeId` against `ALARM_THEMES`, added `toastTimerRef` debouncing for rapid selections, added an explicit `Done` button on the Themes screen, and added Android `BackHandler` sub-screen navigation.
- **Part 6 — Alarm Dismiss / Stop & Native Lifecycle (`native/alarm/android/.../*.kt`, `src/modules/alarm/alarmNative.ts`, `src/modules/alarm/StudySakhaAlarmModule.tsx`, `App.tsx`):** Fixed `stopAlarm` to cancel only `ACTION_SNOOZE` (`cancelSnooze`) so recurring `ACTION_FIRE` schedules stay intact; added `Stop` and `Snooze` notification actions, `studysakha://alarm` deep link, partial `WakeLock`, audio URI fallback, and synchronous `activeService` stop in `AlarmPlaybackService`; handled notification actions & one-time alarm completion in `AlarmEngineReceiver` / `AlarmEngineScheduler`; fixed JS hydration race via `peekPendingNativeAlarm()` after `hydrated === true`; added fallback ringing item and rapid-tap dismiss guard; and wired `App.tsx` to route to `Alarm` whenever a native alarm is actively ringing.

## 2026-11-27 — Focus Lock Production Audit & P0 Critical Fixes
- Completed full source-code and test-suite audit of Focus Lock in `docs/FOCUS_LOCK_PRODUCTION_AUDIT.md`.
- Implemented all 5 P0 critical fixes (scope strictly limited to P0):
  1. Fixed Allowlist Mode inversion in `screens/FocusLockScreen.tsx`, `lib/focusLockNative.ts`, and `FocusLockModule.kt` (`resolveBlockedPackages`, `strategy` persistence and native sync).
  2. Prevented Strict Mode Level 2/3 early session completion bypass (`canCompleteSessionEarly`, hiding Complete Session in Level 2/3, recording interrupted sessions with `status: 'interrupted'` and zero completion points).
  3. Replaced empty-string `pinCode` with `expo-secure-store`-backed 4-digit Exit PIN setup/confirmation/change/remove UI (`lib/focusLockPin.ts`, `screens/FocusLockScreen.tsx`), 5-attempt lockout, and 30s Forgot-PIN recovery wait.
  4. Added durable background pending-completion queue (`FocusLockSessionTiming.recordPendingCompletion`, `FocusLockModule.consumePendingCompletions`) across `FocusLockAlarm`, `FocusLockAccessibilityService`, `FocusLockBootReceiver`, and `FocusLockModule`, consumed idempotently in `FocusLockScreen`.
  5. Added monotonic same-boot timing (`SystemClock.elapsedRealtime()`, `Settings.Global.BOOT_COUNT`, `AlarmManager.ELAPSED_REALTIME_WAKEUP`) and `TIME_CHANGED`/`TIMEZONE_CHANGED` handling in `FocusLockSessionTiming.kt`, `FocusLockBootReceiver.kt`, and `plugins/withFocusLock.js`.
- Added regression suite `test/focusLockP0Fixes.test.tsx`.

## 2026-11-27 — Focus Lock P1 High-Priority Fixes
- Implemented all 6 P1 fixes from `docs/FOCUS_LOCK_PRODUCTION_AUDIT.md` (P2/P3 out of scope):
  1. Added `lib/focusLockDuration.ts` (`computeUntilTimeSession`, `computeEndOfDaySession`, `computeDurationSession`) and wired `handleStartFocus` in `screens/FocusLockScreen.tsx` to use exact calculated `endsAt` timestamps.
  2. Added native pause/resume synchronization (`status = "paused"`, `pauseBlockingSession`, `resumeBlockingSession`) across `FocusLockSessionTiming.kt`, `FocusLockModule.kt`, `FocusLockBootReceiver.kt`, `lib/focusLockNative.ts`, and `screens/FocusLockScreen.tsx` (Pause/Resume and Smart Break).
  3. Replaced unsupported permission stubs with the 5 real Android Focus Lock permissions (`accessibility`, `usage`, `exact_alarm`, `notification`, `battery`) and real native checks/settings openers in `FocusLockModule.kt` and `FocusLockScreen.tsx`.
  4. Added `onAndroidBack` support in `components/Shell.tsx` (removing `'FocusLock'` exclusion) and `handleAndroidBack` in `screens/FocusLockScreen.tsx` for nested back navigation and active-session exit protection.
  5. Added `SCHEDULE_EXACT_ALARM` in `plugins/withFocusLock.js` and `canScheduleExactAlarms()` + `SecurityException` fallback in `FocusLockAlarm.kt`.
  6. Updated `FocusLockAccessibilityService.kt` to use `SystemClock.elapsedRealtime()` with `BURST_DEBOUNCE_MS = 350L` and immediate reset on `TYPE_WINDOW_STATE_CHANGED` for other packages.
- Added regression tests in `test/focusLockP1Fixes.test.tsx` and updated `test/stabilityFailureScenarios.test.tsx`.

## 2026-11-27 — Focus Lock P2 Feature Completion
- Implemented all 6 P2 feature-completion items from `docs/FOCUS_LOCK_PRODUCTION_AUDIT.md`:
  1. Connected Blocking Modes (`quick`, `strict`, `allowlist`, `pomodoro`, `deep`, `scheduled`, `emergency`) to real strategy/strictness/DND/break behavior and honestly disabled unsupported `custom` quotas.
  2. Added `lib/focusLockP2Helpers.ts` with `buildPredefinedProfiles` (matched to installed packages) and custom profile CRUD (`+ Save Profile`, `Rename`, `Duplicate`, `Delete`) in `screens/FocusLockScreen.tsx`.
  3. Connected `websiteBlocking` to app-level browser shielding (`resolveEffectiveBlockedPackages`) and honestly labeled in-app Shorts/URL/keyword filtering as unsupported without VPN/window-content inspection.
  4. Added `ACCESS_NOTIFICATION_POLICY` in `plugins/withFocusLock.js`, `setDndEnabled`/`openDndSettings`/`dndAccessEnabled`/`setRestartRecoveryEnabled` in `FocusLockModule.kt` + `FocusLockBootReceiver.kt`, and `expo-notifications` start/complete alerts.
  5. Connected Focus Lock schedule display to `state.plannerScheduleItems` via `getNextFocusScheduleLabel`.
  6. Synchronized `screens/SettingsScreen.tsx` with `FocusLockSnapshot` + `getBlockingStatus()` and routed management directly to `FocusLock`.
- Added regression suite `test/focusLockP2Fixes.test.tsx` and updated `test/focusLockP1Fixes.test.tsx` for 6 real permissions.

## 2026-11-27 — Focus Lock P3 Production Hardening
- Eliminated 1-second `AsyncStorage.setItem` write storm in `screens/FocusLockScreen.tsx` by removing `remainingSecs` from persistence dependencies and stabilized `completeSession` via `historyRecordsRef`.
- Optimized `FocusLockAccessibilityService.kt` using `SharedPreferences.OnSharedPreferenceChangeListener` + `HashSet<String>` cache + `runCatching { startActivity(intent) }`, and added `OnBackInvokedCallback` (API 33+) in `FocusLockBlockingActivity.kt`.
- Removed unused `iconAsBase64` rendering from `FocusLockModule.getInstalledApps()`, added crash-safe `peekPendingCompletions` + `acknowledgePendingCompletions`, and added structured `StudySakhaFocusLock` diagnostics across native Kotlin files.
- Added `test/focusLockP3Hardening.test.tsx`.
