# Next Task — Study Sakha

## Deployment Update — 2026-11-25

Production Supabase deployment and live schema verification are complete. Continue with release/runtime validation; a second authenticated client/device is still needed for end-to-end Realtime delivery.

Last verified: 2026-11-25

## Current Task
Await explicit user approval of `docs/SUPABASE_MIGRATION_RECOVERY_PLAN.md` before creating `202611250002_reconcile_auth_storage_and_room_gaps.sql`, running `supabase migration repair --status applied`, or running `supabase db push --remote`.

## Completed Steps
- [x] Inspected complete repository, git history, package/Expo/EAS/Android configs, and existing `docs/` audits.
- [x] Verified TypeScript (`pnpm run lint` -> exit 0) and full Jest suite (`pnpm run test:ci` -> 35 suites, 156 tests passed).
- [x] Created permanent root `AGENTS.md` and `docs/ai-memory/` memory system (7 files).
- [x] Re-verified remote `edjazjfylnpvqykpdtiq` schema, policies, RPCs, triggers, and Realtime publication via read-only queries, and created `docs/SUPABASE_MIGRATION_RECOVERY_PLAN.md`.

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
Push `supabase/migrations/202611260001_group_invites_discovery_and_realtime.sql` to the linked Supabase project (`supabase db push --remote`), ensure `EXPO_PUBLIC_API_BASE_URL` (and optionally `EXPO_PUBLIC_GROUP_INVITE_BASE_URL`) is set in EAS `preview` / `production` environments, and verify cross-account group discovery + invitation deep linking on an EAS Android build.
