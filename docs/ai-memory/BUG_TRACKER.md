# Bug Tracker — Study Sakha

## 2026-11-25 Deployment Fix

BUG-005: Account Sync RPC first insert failed with ambiguous version column because RETURNS TABLE output variables conflicted with unqualified RETURNING version. Forward-only migration 202611250003 qualified returned columns. Live owner versioning, stale/retry rejection, and rollback-safe isolation now pass.

Last verified: 2026-11-25

## Confirmed & Fixed Bugs (Verified on Host)

| ID | Summary | Severity | Root Cause | Fix | Verification Status |
|---|---|---|---|---|---|
| **BUG-001** | Stale authenticated identity remained visible after session verification failure | High | `authCheckFailed` in `lib/store.tsx` only set `authReady: true` without clearing `state.user`. | Routed `authCheckFailed` through `authResolved(null)` reset path. | **Verified (Jest)**: `test/store.reducer.test.tsx` passes. |
| **BUG-002** | Scheduled focus time not reflected in Study Planner occurrences | High | Focus seconds were stored only under `plannerTaskStudySeconds[taskId]`, while planner occurrences read `scheduleOccurrenceId`. | `lib/store.tsx` indexes elapsed seconds under both `taskId` and `scheduleOccurrenceId`. | **Verified (Jest)**: `test/store.reducer.test.tsx` passes. |
| **BUG-003** | Profile exam save `profiles_exam_id_fkey` & missing `ras`/`rpsc_rssb` catalog IDs | High | Live `exams` table was empty and `ExamId` / `lib/examCatalog.ts` omitted `ras` and `rpsc_rssb`. | Updated `lib/types.ts`, `lib/examCatalog.ts`, `lib/data.ts`, `lib/store.tsx`, and added `supabase/migrations/202611240003_production_backend_repairs.sql`. | **Partially Verified**: Jest contract tests pass; live Supabase migration deployment **Not Verified**. |
| **BUG-004** | Missing `create_study_group` & `get_study_room_insights` RPCs (`PGRST202`) in live Supabase | High | Functions were absent from live PostgREST schema cache (`edjazjfylnpvqykpdtiq`). | Recreated both `SECURITY DEFINER` RPCs in `202611240003_production_backend_repairs.sql` and improved error messages in `lib/groupRooms.ts`. | **Partially Verified**: Jest RPC contract tests pass; live Supabase deployment **Not Verified**. |

## Known Limitations & Unresolved Issues

| ID | Summary | Severity | Details & Current State |
|---|---|---|---|
| **ISSUE-001** | Local Android APK/AAB build blocked in Codespace | High (Release Blocker) | Codespace has no Android SDK / `ANDROID_HOME`. `./android/gradlew :app:assembleRelease` failed with `SDK location not found`. Must build via EAS cloud (`eas build`) or an environment with Android SDK. |
| **ISSUE-002** | Native Android runtime & Focus Lock unverified on device | High (Release Blocker) | No physical Android device or emulator has run cold start, notifications, Focus Lock AccessibilityService, audio focus/backgrounding, PDF external viewer, or Maestro/Flashlight/MobSF checks. |
| **ISSUE-003** | `EXPO_PUBLIC_API_BASE_URL` missing in checked-in `.env` | Medium (Release Config) | Checked-in `.env` omits `EXPO_PUBLIC_API_BASE_URL`. Native EAS builds will intentionally fail (`app.config.js`) unless set in EAS environment variables. |
| **ISSUE-004** | `lib/store.tsx` ESLint findings | Low (Tech Debt) | `docs/GLOBAL_STORE_STATE_AUDIT.md` & `docs/AUTHENTICATION_SESSION_AUDIT.md` noted existing ESLint findings in `lib/store.tsx` (`stateRef.current = state` during render, effect state updates, unused `seedStudyLog`). |
| **ISSUE-005** | Jest `act(...)` console error in `StudyPlannerScreen.tsx` | Low (Test Noise) | During `pnpm run test:ci`, `test/studyPlannerFilters.test.tsx` logs an `An update to App inside a test was not wrapped in act(...)` warning from `StudyPlannerScreen.tsx:1600` (`setSheetMounted(false)`), though all assertions pass. |
