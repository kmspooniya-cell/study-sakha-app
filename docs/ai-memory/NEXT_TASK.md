# Next Task — Study Sakha

## Alarm module follow-up — 2026-11-27
- Host integration is complete: typed `Alarm` route, theme/planner adapter, isolated storage, and four-theme catalog.
- Exact next action: run the authenticated app on a development build, open the `Alarm` route from the existing caller when available, and verify back navigation, planner navigation, dark/light synchronization, CRUD, persistence, and all four themes.
- No existing Home/Dashboard Alarm button or handler was present in the inspected source, and no new Home button was added per task restrictions.

## Runtime error follow-up — 2026-11-26
- Code fixes and host regressions for route updates and Expo Go notification channels are complete.
- Exact next action: open the fresh tunnel URL in Android Expo Go, cold start and navigate repeatedly, then capture Metro/device logs while enabling Planner reminders and running repeated planner syncs.
- Blocker: this Codespace has no `adb` or connected Android device, so actual Expo Go runtime status is currently BLOCKED.

## Deployment Update — 2026-11-25

Production Supabase deployment and live schema verification are complete. Continue with release/runtime validation; a second authenticated client/device is still needed for end-to-end Realtime delivery.

Last verified: 2026-11-25

## Current Task
Complete the Alarm Module handoff. The source contains no Home Alarm card, so no Home entry was added under the user's no-redesign restriction. Device/runtime verification remains pending.

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
If the Alarm card is restored in the actual source revision, wire that existing card's `onPress` to the typed `Alarm` route; otherwise run the registered Alarm route on an Expo development/release build and verify device navigation, persistence, theme switching, and native alarm behavior.
