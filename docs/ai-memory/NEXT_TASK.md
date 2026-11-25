# Next Task — Study Sakha

Last verified: 2026-11-25

## Current Task
Commit the current working tree changes (uncommitted code cleanups + `.bak` removals + `AGENTS.md` + `docs/ai-memory/`), then proceed with backend migration deployment and Android EAS build/device validation.

## Completed Steps
- [x] Inspected complete repository, git history, package/Expo/EAS/Android configs, and existing `docs/` audits.
- [x] Verified TypeScript (`pnpm run lint` -> exit 0) and full Jest suite (`pnpm run test:ci` -> 34 suites, 144 tests passed).
- [x] Created permanent root `AGENTS.md` and `docs/ai-memory/` memory system (7 files).

## Pending Steps
1. Review and commit the uncommitted working tree changes + new `AGENTS.md` and `docs/ai-memory/` files (user action / when requested).
2. Verify/deploy pending Supabase migrations (`202611240003_production_backend_repairs.sql` and `202611250001_account_sync_documents.sql`) against the linked Supabase project.
3. Verify Vercel backend deployment (`/api/health`, `/api/chat`, `/api/audio-catalog`) with `GEMINI_API_KEY` configured, and ensure `EXPO_PUBLIC_API_BASE_URL` is set in EAS `preview` / `production` environments.
4. Trigger an EAS Android build (`eas build --platform android --profile preview` or `arm64-apk`).
5. Execute Android device validation checklist (Focus Lock AccessibilityService, notifications, auth/sync, offline downloads, Maestro E2E `.maestro/`, MobSF security scan).

## Blockers
- **Android SDK unavailable in Codespace:** Local `./android/gradlew` builds cannot run here; use EAS cloud builds.
- **No connected Android device/emulator:** Runtime verification, Maestro, Flashlight, and MobSF cannot run in this container.
- **No Supabase CLI/service-role credentials in workspace:** Live DB migration status cannot be queried from this container.

## Exact Next Action
Review `git status` and commit the working tree changes and `docs/ai-memory/` files, then deploy/verify the Supabase migrations and run an EAS Android preview build.
