# Testing Status — Study Sakha

Last verified: 2026-11-25

## Executed & Verified in Current Session (2026-11-25)

| Check | Command | Result | Scope / Notes |
|---|---|---|---|
| **TypeScript Typecheck** | `pnpm run lint` (`tsc --noEmit`) | **PASS** (exit 0) | Full project typecheck after all current working-tree edits. |
| **Full Jest + RNTL Suite** | `pnpm run test:ci` (`jest --runInBand`) | **PASS** — **34 suites passed, 34 total; 144 tests passed, 144 total** (20.593 s) | Ran in current session against current working tree. Note: `test/studyPlannerFilters.test.tsx` emits a non-failing `act(...)` console error from `StudyPlannerScreen.tsx:1600`. |

## Previously Executed Checks (From `docs/` Audits — Not Re-run in This Session)

| Check | Source Report | Previous Result | Notes |
|---|---|---|---|
| **Expo Doctor** | `docs/EXPO_DEPENDENCY_COMPATIBILITY_AUDIT.md` (2026-11-24) | **PASS** (21/21 checks) | Re-verify if dependencies change. |
| **Web Production Export** | `docs/PRELAUNCH_TESTING_REPORT.md` (2026-11-24) | **PASS** (`pnpm run build:web`) | Exports to `dist/`. |
| **Release Config Validator** | `docs/ANDROID_RELEASE_READINESS.md` (2026-11-24) | **PASS** (with placeholder HTTPS env) / **FAIL** (when `EXPO_PUBLIC_API_BASE_URL` omitted, as expected) | `pnpm run validate:release -- preview`. |
| **Focused ESLint** | `docs/PRELAUNCH_TESTING_REPORT.md` / `docs/GLOBAL_STORE_STATE_AUDIT.md` | **PASS** on CI-scoped files; **FAIL** on `lib/store.tsx` | See `BUG_TRACKER.md` (`ISSUE-004`). |

## Unverified / Blocked Areas

| Area | Status | Blocker / Requirement |
|---|---|---|
| **Android Native Gradle Build (`:app:assembleRelease`)** | **BLOCKED** | No Android SDK / `ANDROID_HOME` in Codespace. Use EAS cloud build. |
| **Maestro E2E (`.maestro/`, 12 flows)** | **BLOCKED** | 0 connected Android devices/emulators. |
| **Flashlight Performance Baseline** | **BLOCKED** | Requires connected Android device. |
| **Android Monkey Stress Test** | **BLOCKED** | Requires `adb` + APK + device. |
| **MobSF Static/Dynamic APK Security Scan** | **BLOCKED** | Requires built release APK. |
| **Live Supabase Migrations & Multi-Device Sync / Realtime** | **NOT VERIFIED** | Requires live Supabase deployment + authenticated test accounts. |
| **Live Sakha AI (`/api/chat`) on Native** | **NOT VERIFIED** | Requires deployed HTTPS `EXPO_PUBLIC_API_BASE_URL` + server `GEMINI_API_KEY`. |
| **Physical Android Focus Lock & Notifications** | **NOT VERIFIED** | Requires dev/release APK on Android 13/14/15 device. |
