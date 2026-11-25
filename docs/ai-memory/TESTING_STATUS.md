# Testing Status — Study Sakha

## Production deployment validation — 2026-11-25

- Production deployment and schema/RLS verification: PASS. Applied 202611250001 through 202611250003; final history has 17 migrations; schema lint has no errors.
- Live Account Sync concurrency/isolation: PASS. Owner versioning succeeded, stale/retry rejected, cross-user read returned 0, and no test rows persisted.
- Focused Account Sync tests: PASS — 1 suite, 4 tests.
- Expo config validation: PASS with pnpm exec expo config --type public --json. expo-doctor is unavailable in this workspace.

Last verified: 2026-11-25

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
