# Development Log — Study Sakha

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
