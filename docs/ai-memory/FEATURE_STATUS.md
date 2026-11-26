# Feature Status — Study Sakha

## Deployment update — 2026-11-25

Cross-Device Account Sync is schema/RLS/host verified after production deployment; second-client Realtime delivery remains runtime-unverified. Study Groups and Live Study Rooms have live RPCs, room objects, RLS, and publication entries verified; device/multi-client realtime remains untested.

Last verified: 2026-11-25

Status legend:
- **Complete**: Implemented, code/tests verified in host environment (note: Android device runtime checks are tracked separately in `TESTING_STATUS.md`).
- **In Progress**: Active uncommitted modifications or partial rollout.
- **Partially Implemented**: Core exists, but some sub-capabilities or deployments are incomplete.
- **Broken**: Known failing behavior.
- **Pending**: Planned or required next step not yet executed.
- **Not Verified**: Implemented in code, but runtime/device/live-backend behavior has not been executed.

| Feature | Status | Verified Facts & Notes |
|---|---|---|
| **Authentication & Session Management** | **Complete** (Host) / **Not Verified** (Device & Live Auth) | Supabase Auth + AsyncStorage + server-side `getUser()` verification + `authCheckFailed` reset fix. Covered by Jest; live Supabase & Android device session tests not yet run. |
| **Global Store & Local Persistence** | **Complete** | Pure `storeReducer`, user-scoped `AsyncStorage`, malformed snapshot protection, legacy import. Covered by `store.reducer.test.tsx` and `store.persistence.test.tsx`. |
| **Cross-Device Account Sync** | **Partially Implemented** / **Not Verified** (Live) | Client engine (`lib/sync/`), `202611250001_account_sync_documents.sql`, and Jest tests (`accountSync.test.tsx`, `store.persistence.test.tsx`) are implemented. Live Supabase migration deployment and multi-device sync are not yet verified. |
| **Navigation & Deep Linking** | **Complete** (Host) / **Not Verified** (Device) | Typed stacks & drawer in `App.tsx` + `lib/navigation.ts`, `studysakha://` linking, Android back policy. Flex-flow `AppBottomNav` in `components/Shell.tsx` eliminates bottom content overlap; `MainDrawerNavigator` `screenListeners` (`transitionEnd`) replaces `InteractionManager` stub for reliable repeated Settings opens. |
| **Dashboard & Theme System** | **Complete** (Host) | `DashboardScreen.tsx`, `ThemeProvider` (`lib/theme.tsx`), procedural themes, widgets. Uncommitted cleanup in `DashboardScreen.tsx`, `lib/theme.tsx`, `components/Charts.tsx`. |
| **Library, Notes & Book Reader** | **Complete** (Host) / **Not Verified** (Device) | Notes, books, PYQ sets, starred, offline downloads (`lib/resourceDownloads.ts`), signed Supabase URLs. Android file/PDF viewer behavior unverified on device. |
| **PYQ Bank & Mock Tests** | **Complete** (Host) / **Not Verified** (Device) | `PYQScreen.tsx`, `TestsScreen.tsx`, `TestPlayerScreen.tsx`, `TestResultScreen.tsx` with deadline persistence. |
| **Study Planner & Notifications** | **Complete** (Host) / **Not Verified** (Device) | Tasks, schedules, recurrence, canonical normalization & lossless quarantine recovery (`lib/plannerSchedule.ts`), interactive review/restore UI (`StudyPlannerScreen.tsx`), occurrence-indexed focus time fix. Local `expo-notifications` (`study-reminders` channel) implemented; Android 13+ permission & timezone behavior unverified on device. Push notifications (remote) are not implemented. |
| **Focus Centre & Procedural Audio** | **Complete** (Host) / **Not Verified** (Device) | Timestamped timer/stopwatch/pomodoro, Skia/Canvas2D procedural themes, audio download manager & lifecycle (`lib/audioPlayerLifecycle.ts`). Uncommitted refinements in `FocusCenterScreen.tsx` and `hooks/useProceduralPicture.ts`. |
| **Focus Lock (Android Native App Blocker)** | **In Progress** / **Not Verified** (Device) | `plugins/withFocusLock.js` and Kotlin sources (`native/focus-lock/android/`) exist with uncommitted hardening edits. Gradle build and physical Android device testing (AccessibilityService, blocking overlay, alarm, boot receiver) have NOT been run (no Android SDK in Codespace). |
| **Study Groups & Live Study Rooms** | **Partially Implemented** / **Not Verified** (Live) | `GroupsScreen.tsx`, `lib/groupRooms.ts`, `lib/groupRoomRealtime.ts`, `lib/groupActivitySync.ts`. Migration `202611240003` repairs `create_study_group` and `get_study_room_insights` RPCs, but live Supabase migration deployment and multi-device realtime are unverified. |
| **Sakha AI (Gemini Chat)** | **Complete** (Host) / **Not Verified** (Live API) | `SakhaAIScreen.tsx`, `lib/geminiChat.ts`, `server/gemini.js`, `server/appKnowledge.js`. Authenticated, rate-limited, 15s timeout. Requires `GEMINI_API_KEY` on server and `EXPO_PUBLIC_API_BASE_URL` (HTTPS) for native builds. |
| **Statistics & Task Performance** | **Complete** (Host) | `StatisticsScreen.tsx`, `TaskPerformanceScreen.tsx`, `lib/statistics.ts`, `lib/focusHistory.ts`. Covered by Jest. |
| **Profile, Settings, App Guide, Admin** | **Complete** (Host) / **Not Verified** (Device) | Exam catalog includes `ras` and `rpsc_rssb`. Uncommitted fixes in `SettingsScreen.tsx`, `SearchScreen.tsx`, `NotificationsScreen.tsx`, `CurrentAffairsScreen.tsx`. |
| **Android Release Build & Security** | **Blocked / Pending** | `app.config.js`, `eas.json`, `validate:release` ready. Blocked locally (no Android SDK) and awaiting EAS cloud build + physical device + MobSF + Maestro + Flashlight validation. |
