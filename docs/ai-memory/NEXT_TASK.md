# Next Task — Study Sakha

## Notification Centre follow-up — 2026-11-27
- Host implementation, unit/component/navigation/mocked-Supabase tests, Expo lint, TypeScript, and web export are complete.
- Exact next actions:
  1. Push `supabase/migrations/202611270002_notification_centre_backend.sql` to the linked Supabase project and verify RLS + RPCs (`mark_notifications_read`, `archive_notifications`, `upsert_push_token`).
  2. Build an Android development/release APK via EAS and verify on a physical Android device: immersive safe areas, Android hardware/gesture back priority, swipe gestures, Quiet Hours, channel creation, and foreground/background/terminated push tap routing.

## Focus Lock Screen UI Cleanup follow-up — 2026-11-27
- Host cleanup and regression tests (`test/focusLockCleanup.test.tsx`, `expo lint`, `tsc` 0 errors in Focus Lock files) are complete.
- Exact next action: visually verify the cleaned-up Focus Lock screen in Light and Dark modes on an Android dev/release build and confirm retained Discipline Controls navigation and native app-blocking behavior.

## Heavy Sleeper Mode & Alarm Module follow-up — 2026-11-27
- Host implementation for Heavy Sleeper Mode (all 7 missions, modular `alarmMissions.ts`, `HeavySleeperMissionView.tsx`, native `AlarmMissionEngine.kt`, CNG `withAlarmEngine.js` with `CAMERA`, `ACTIVITY_RECOGNITION`, `FileProvider`, and `com.google.zxing:core:3.5.3`) and Alarm UI updates are complete and host-verified (`expo prebuild`, Jest 4/4 suites 36/36, `expo lint` 0 errors, `tsc` 0 errors in alarm/mission files).
- Exact next action: build the Android APK via EAS cloud (`eas build --platform android --profile preview`) and verify on a physical Android device: Kotlin compilation, `CAMERA` / `ACTIVITY_RECOGNITION` runtime permissions, real accelerometer shake, step counter, ZXing QR/barcode registration & scan, photo reference & similarity matching, and mission state persistence across app restart.

## Phase 1 Groups & Chat Full-Screen Redesign follow-up — 2026-11-27
- Host implementation, modular components (`components/groups/*`), full-screen Shell visibility, Android Back priority, virtualized message list, contextual action sheet, and expandable composer are complete and verified on host.
- Exact next action: verify on a physical Android device (gesture navigation + three-button navigation) for keyboard insets, bottom composer positioning above the soft keyboard and system bar, smooth FlatList scrolling, and multi-client Supabase Realtime message delivery.

## Groups header alignment follow-up — 2026-11-27
- Host alignment patch is complete. Verify the header visually on narrow Android and web widths when a runtime is available.

## Groups main screen follow-up — 2026-11-27
- Host redesign is complete and focused group regressions pass.
- Exact next action: verify the Groups main screen on Android phone/tablet and web for bottom-nav spacing, floating button position, dark mode, notification navigation, Explore search, and join refresh behavior.

## Group tab-bar follow-up — 2026-11-27
- Host fix is complete: all Group Details tabs are directly accessible in one horizontal row with active-tab auto-scroll.
- Exact next action: verify the strip on a narrow Android phone, tablet, and web viewport for swipe reachability, selected-tab visibility, and no accidental wrapping.

## Groups redesign follow-up — 2026-11-27
- Host implementation is complete for the requested Groups UI, message lifecycle repair, membership action, Hall click behavior, and Focus Centre separation.
- Exact next action: validate authenticated Groups on an Android development/release build with two Supabase accounts: join idempotency, native share/deep link, message send/realtime ordering across clients, restart hydration, keyboard/back behavior, and Hall entry/exit while a Focus Centre session is active.
- Current blockers: no `adb`/Android device, no live multi-client Supabase session in this container, and full Jest/lint baselines still contain unrelated failures.

## Alarm module follow-up — 2026-11-27
- Host integration is complete: typed `Alarm` route, theme/planner adapter, isolated storage, and four-theme catalog.
- Exact next action: run the authenticated app on a development build, open the `Alarm` route from the existing caller when available, and verify back navigation, planner navigation, dark/light synchronization, CRUD, persistence, and all four themes.
- The Home/Dashboard Alarm entry is now wired through the existing `dashboardActions` grid; device/runtime verification remains pending.

## Runtime error follow-up — 2026-11-26
- Code fixes and host regressions for route updates and Expo Go notification channels are complete.
- Exact next action: open the fresh tunnel URL in Android Expo Go, cold start and navigate repeatedly, then capture Metro/device logs while enabling Planner reminders and running repeated planner syncs.
- Blocker: this Codespace has no `adb` or connected Android device, so actual Expo Go runtime status is currently BLOCKED.

## Deployment Update — 2026-11-25

Production Supabase deployment and live schema verification are complete. Continue with release/runtime validation; a second authenticated client/device is still needed for end-to-end Realtime delivery.

Last verified: 2026-11-25

## Current Task
Complete native Alarm Engine validation. CNG integration and host tests are complete; remaining validation is Android build/device testing for exact permission behavior, background delivery, audio/vibration, reboot/timezone recovery, and full-screen presentation.

## Completed Independent Design-System Task — 2026-11-27
- Extracted and organized the 69-module SSDS v1.0 Master Bundle into `study-sakha-design-system-native/`.
- Structural extraction and package-scoped TypeScript validation passed.
- Exact next action for this package: perform a separately authorized future integration review; do not integrate during this extraction task.

## Completed Steps
- [x] Inspected complete repository, git history, package/Expo/EAS/Android configs, and existing `docs/` audits.
- [x] Verified TypeScript (`pnpm run lint` -> exit 0) and full Jest suite (`pnpm run test:ci` -> 35 suites, 156 tests passed).
- [x] Created permanent root `AGENTS.md` and `docs/ai-memory/` memory system (7 files).
- [x] Re-verified remote `edjazjfylnpvqykpdtiq` schema, policies, RPCs, triggers, and Realtime publication via read-only queries, and created `docs/SUPABASE_MIGRATION_RECOVERY_PLAN.md`.

## Pending Steps
1. Review and commit the uncommitted working tree changes + new `AGENTS.md` and `docs/ai-memory/` files (user action / when requested).
2. Verify/deploy pending Supabase migrations (`202611240003_production_backend_repairs.sql` and `202611250001_account_sync_documents.sql`) against the linked Supabase project.
3. Verify Vercel backend deployment (`/api/health`, `/api/chat`, `/api/audio-catalog`) with `GEMINI_API_KEY` configured, and ensure `EXPO_PUBLIC_API_BASE_URL` is set in EAS `preview` / `production` environments.
4. Retry the EAS Android build after the account quota resets on 2026-12-01 (or use an authorized build account/profile).
5. Install the resulting APK on an Android 13+ emulator and physical device; execute the Alarm checklist for exact permission, background/terminated delivery, reboot/timezone recovery, Doze, audio/vibration, snooze/dismiss, edits/deletes, and duplicate prevention.
6. Execute the broader device validation checklist (Focus Lock AccessibilityService, notifications, auth/sync, offline downloads, Maestro E2E `.maestro/`, MobSF security scan).

## Blockers
- **Android SDK unavailable in Codespace:** Local `./android/gradlew` reaches configuration but cannot compile without an SDK; use EAS cloud builds.
- **EAS Android quota exhausted:** The preview archive uploaded but EAS rejected the build before compilation; quota resets 2026-12-01.
- **No connected Android device/emulator:** Runtime verification, Maestro, Flashlight, and MobSF cannot run in this container.
- **No Supabase CLI/service-role credentials in workspace:** Live DB migration status cannot be queried from this container.

## Completed Task — Sakha AI Chat UX & Intelligence Upgrade — 2026-11-27
- [x] Inspected existing chat, provider, persistence, navigation, store, app registry, and server action paths.
- [x] Removed visible model controls/history notice and tightened the empty chat surface.
- [x] Added Android keyboard avoidance, safe-area composer padding, bounded multiline growth, and latest-message scrolling behavior.
- [x] Added structured markdown/code/table rendering and validated multi-action cards.
- [x] Expanded verified app registry and improved context/personalization instructions without adding unsupported product claims.
- [x] Ran focused Jest (11/11) and Expo lint (pass).
- [x] Recorded full TypeScript/Jest baseline failures and unavailable Android/web runtime verification.

### Exact next action
Run the Sakha AI screen through a deployed web preview and an Android dev/release build on small-phone/tablet devices, then add UI/E2E coverage for keyboard visibility and action-card navigation when those runtimes are available.

## Completed Task — Startup, Authentication & Navigation Audit — 2026-11-27
- [x] Traced process/bootstrap, splash, providers, AsyncStorage hydration, Supabase session restore, root navigation, Homepage entry, notifications, invites, sync, and secondary data loading.
- [x] Confirmed and fixed false logout on temporary network/profile/auth verification failures.
- [x] Added explicit auth lifecycle status and authenticated offline/reconnecting feedback.
- [x] Added focused regression tests and ran TypeScript, Expo lint, public config, focused Jest, and full Jest.
- [x] Created `docs/STUDY_SAKHA_AUTH_STARTUP_AUDIT.md` with FIXED/VERIFIED/BLOCKED/NOT VERIFIED classifications.

### Exact next action
Run cold-start, Wi-Fi/mobile-data toggle, background/foreground, revoked-session, and manual-logout flows on an Android dev/release build against the deployed Supabase/API environment.

## Exact Next Action
Retry `npx eas-cli@latest build --platform android --profile preview --non-interactive` after the quota reset, then install the APK and run the native Alarm device checklist. Do not claim Gradle or physical-device verification until those steps complete.


## GitHub Actions `Build Study Sakha APK` (`withFocusLock`) — 2026-11-27
- **Completed:** Root-caused `MODULE_NOT_FOUND` on `./plugins/withFocusLock` to missing `node_modules` installation in `.github/workflows/main.yml` and added `pnpm@12.16.1` + Node 22 + `pnpm install --frozen-lockfile` before `eas build`.
- **Exact next action:** Trigger the `Build Study Sakha APK` workflow (`workflow_dispatch` on `.github/workflows/main.yml`) in GitHub Actions (once EAS quota is available) and verify the resulting APK artifact.
