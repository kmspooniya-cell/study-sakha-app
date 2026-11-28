# Next Task — Study Sakha

## SettingsScreen SSDS Icon Migration — host complete
- **Completed:** Audited `screens/SettingsScreen.tsx` and replaced all emoji, text-symbol, and legacy `Ionicons` icons with `SSDSIcon` (`lucide-react-native`, `strokeWidth: 1.75`) and consistent bordered icon containers (`catIconBox`, `navIconBox`) while preserving the Blue–Teal–Amber palette, light/dark themes, labels, navigation, callbacks, and persistence. Verified 0 errors/warnings in ESLint, 0 errors in scoped `tsc`, and 4/4 Jest suites (22/22 tests) on host.
- **Exact next action:** Visually verify `SettingsScreen` (home grid, quick controls, category rows, detail screens, search, and modals) in Light and Dark themes on a physical Android build and Web Preview.

## Profile Screen Tab Switching Flicker Fix — host complete
- **Completed:** Removed `tabFadeAnim`/`tabSlideAnim` opacity-0 reset and conditional tab unmounting in `screens/ProfileScreen.tsx`; all 3 tab panels stay mounted with `display: 'none'` + `collapsable={false}` for instant, flicker-free switching. Verified 3 Jest suites (`9/9` tests), ESLint (`0` errors), and scoped `tsc` (`0` errors).
- **Exact next action:** Visually verify repeated switching between Overview, Statistics, and Account on a physical Android build and Web Preview.

## Statistics Screen Header, Filters & Demo Task Removal — host complete
- **Completed:** Fixed `Study Activity Analytics` single-row header layout, implemented functional `Daily`/`Weekly`/`Monthly` filtering (chart, period total, daily average, previous-period comparison, and selected-day details) in `screens/StatisticsScreen.tsx`, and removed `TODAY_PLAN` demo tasks from `deriveStatistics()` (`lib/statistics.ts`) with an empty state in `All Scheduled Tasks`. Verified 3 Jest suites (`14/14` tests), ESLint (`0` errors), and scoped `tsc` (`0` errors).
- **Exact next action:** Visually verify `StatisticsScreen` on a physical Android device for single-row header alignment, `Daily`/`Weekly`/`Monthly` switching, and `All Scheduled Tasks` empty/populated states.

## Focus & Visual Settings Theme Crash Fix & Consistent Popup Height — host complete
- **Completed:** Optimized `graphics/canvas2d.ts` (`SkImage` rasterization for offscreen `MemoryCanvas`, `saveLayer` bypass, Skia JSI `.dispose()` lifecycle, `addOval` fast path), `hooks/useProceduralPicture.ts` (previous `SkPicture` disposal & safe renderer fallback), `components/GeminiFocusTimer.tsx` (rapid theme switching guard), and `components/FocusSettingsSheet.tsx` (consistent `sheetHeight` across all 5 categories). Verified 4 Focus Jest suites, ESLint, scoped `tsc`, and `pnpm run build:web`.
- **Exact next action:** Test all 7 themes (including `Enchanted Garden` and rapid switching) and all 5 settings categories on a physical Android dev/release build to confirm smooth frame rates, zero OOM crashes, and fixed popup dimensions.

## SSDS Phase 6 Batch 5A — complete
- **Completed:** Migrated `NotificationsScreen`, `NotificationSettingsScreen`, and `SettingsScreen` presentation to existing SSDS components; corrected the Batch 4 test TS2556 argument mismatch. Report: `docs/SSDS_PHASE_6_BATCH_5A_REPORT.md`.
- **Verification:** 15 suites / 62 regression tests and SSDS package TypeScript passed. Workspace TypeScript and target ESLint retain documented pre-existing diagnostics. Android runtime is **NOT VERIFIED**.
- **Exact next SSDS action:** Batch 5B (SakhaAI and Focus Lock screens) remains pending and was not started in this task.

## Home Quick Control Cards & Android Floating Focus Indicator — host complete
- **Completed:** Converted the 4 Study Planner Quick Control cards (`Add Task`, `Focus Lock`, `Focus Timer`, `Alarm`) in `screens/DashboardScreen.tsx` to action-only buttons without live counts/badges/timers/status text, and fixed Android overlay/collapsable/elevation/reveal positioning in `components/ActiveSessionBar.tsx`. Verified 6 focused Jest suites, ESLint, and `pnpm run build:web`.
- **Exact next action:** Verify the Floating Focus Indicator on a physical Android dev/release build (start a session in Focus Centre, navigate back/to other screens, tap to open controls, verify live timer sync, and verify dismissal when the session ends).

## SSDS Phase 6 Batch 4 — complete
- **Completed:** Migrated the remaining Statistics and Profile visual components to SSDS; Library and Admin were already integrated. Automated focused checks are recorded in `docs/SSDS_PHASE_6_BATCH_4_REPORT.md`.
- **Exact next action:** In a separately authorized task, begin Phase 6 Batch 5 from `docs/SSDS_PHASE_6_SCREEN_MIGRATION_INVENTORY.md`; do not start it as part of Batch 4.


## Null `.includes()` web preview crash — remaining verification
- **Completed:** Traced the null to persisted StoreProvider collection hydration and fixed validation at the reducer boundary; added regression coverage; exported the web bundle successfully.
- **Remaining:** Open the generated/deployed web preview in a real Chromium browser, capture the complete console stack, and verify cold start plus authenticated Library/Settings navigation with legacy null snapshots.
- **Exact next action:** Run the web preview/E2E environment with Chromium available and confirm no runtime errors before release sign-off.

## Help & Feedback System follow-up — 2026-11-28
- Host implementation, RLS migration (`supabase/migrations/202611280001_feedback_submissions.sql`), log redaction, screenshot upload/cleanup, Admin Feedback tab, and Jest/ESLint/TS checks are complete.
- Exact next action: push `supabase/migrations/202611280001_feedback_submissions.sql` to the linked Supabase project and verify live end-to-end submission, private screenshot signed URLs, and Admin status updates on a running build.

## Focus Lock Real Android Blocking follow-up — 2026-11-28
- Host audit & enforcement pipeline fixes (`FocusLockUsageLimits.kt`, `FocusLockAccessibilityService.kt`, `FocusLockBlockingActivity.kt`, `FocusLockModule.kt`, `plugins/withFocusLock.js`, `screens/FocusLockScreen.tsx`), CNG prebuild, `expo lint`, scoped `tsc`, Focus Lock Jest suites (`6/6` suites, `26/26` tests), and `docs/FOCUS_LOCK_PRODUCTION_AUDIT.md` Section 17 are complete.
- Exact next action: build an Android APK via EAS (`eas build --platform android --profile preview`) and verify on a physical Android device (real Chrome 5-minute daily usage limit test, Home/Recents re-entry, rapid switching, temporary reminder suspension, 5-minute Emergency Pass auto-reblock, and reboot recovery). Physical device verification is **BLOCKED / NOT TESTED** in Codespace because no Android SDK (`ANDROID_HOME`) or `adb` device is available.

## Notification Centre follow-up — 2026-11-27
- Host implementation, unit/component/navigation/mocked-Supabase tests, Expo lint, TypeScript, and web export are complete.
- Exact next actions:
  1. Push `supabase/migrations/202611270002_notification_centre_backend.sql` to the linked Supabase project and verify RLS + RPCs (`mark_notifications_read`, `archive_notifications`, `upsert_push_token`).
  2. Build an Android development/release APK via EAS and verify on a physical Android device: immersive safe areas, Android hardware/gesture back priority, swipe gestures, Quiet Hours, channel creation, and foreground/background/terminated push tap routing.

## Focus Lock Screen UI Cleanup follow-up — 2026-11-27
- Host cleanup and regression tests (`test/focusLockCleanup.test.tsx`, `expo lint`, `tsc` 0 errors in Focus Lock files) are complete.
- Exact next action: visually verify the cleaned-up Focus Lock screen in Light and Dark modes on an Android dev/release build and confirm retained Discipline Controls navigation and native app-blocking behavior.

## Heavy Sleeper Mode & Alarm Module follow-up — 2026-11-28
- Host fixes for QR/Barcode registration (status, Replace/Remove, ZXing `GlobalHistogramBinarizer` fallback), Photo reference registration (preview, Replace/Remove, native cleanup, strict missing-reference guard), Shake/Step continuous sensor sessions (`onCompleteRef`/`advanceMissionRef` decoupling, `SharedPreferences` + `ActiveMissionSession` persistence, `elapsedRealtime` debounce, `SENSOR_DELAY_UI` 0-latency), and `missionRestorePromiseRef` race fix are complete and host-verified (`expo prebuild`, ESLint 0 errors, scoped `tsc` 0 errors, Jest 5/5 suites 46/46 tests).
- Exact next action: build the Android APK via EAS cloud and verify on a physical Android device: Kotlin compilation, QR/Barcode registration & ringing scan, Photo reference capture/preview/similarity threshold, Shake & Step continuous counting across re-renders/screen-lock/backgrounding, and permission denial flows.

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


## SSDS Phase 6 Batch 5B — complete
- **Completed:** Cleaned Batch 5A hook/ref lint causes and unused helper; migrated SakhaAI and Focus Lock presentation to SSDS without editing native/backend implementations. Report: `docs/SSDS_PHASE_6_BATCH_5B_REPORT.md`.
- **Verification:** Batch 5A screen ESLint, SSDS package TypeScript, and focused AI/Focus regressions passed. Combined Batch 1–5A / SSDS Phase 1–5 / AI / Focus Lock regressions passed 23 suites / 101 tests. Workspace TypeScript remains blocked by unrelated errors; all-five-screen ESLint still reports existing FocusLockScreen operational findings. Android runtime is **NOT VERIFIED**.
- **Exact next SSDS action:** No further screen migration was started. Batch 6 remains pending.

## SSDS Phase 6 Batch 6A — 2026-11-28
- **Implemented:** FocusLockScreen lint cleanup and SSDS presentation adoption for DashboardScreen, FocusCenterScreen, FocusCompletionScreen, and StudyPlannerScreen. `StudyPlanner.tsx` retirement assessed but not removed.
- **Verified:** SSDS package TypeScript; FocusLockScreen ESLint; Focus Lock tests (6 suites / 26 tests); focus/completion/planner tests (6 suites / 30 tests); `git diff --check`.
- **Still failing:** repository TypeScript has existing diagnostics; full Jest has 7 failing suites / 8 tests; StudyPlannerScreen has 24 baseline lint errors / 14 warnings; FocusCenterScreen has one baseline warning. Dashboard pre-existing worktree diff lacks several homepage indicators listed in requirements. Android not verified.
- **Exact next action:** Review the pre-existing Dashboard feature removals and the 7 failing Jest suites; resolve or classify them before considering Batch 6A fully accepted. Do not begin Batch 6B in this follow-up.
- **Batch 6B status:** presentation migration is complete and documented in `docs/SSDS_PHASE_6_BATCH_6B_REPORT.md`; remaining work is limited to the documented baseline Jest/TypeScript/lint diagnostics and Android runtime verification.
