# Final Pre-APK Release Audit — Study Sakha (2026-11-27)

## Executive Summary
- **Scope:** Full Application + AlarmEngine + FocusLock + Notification Centre + Android Native + Supabase + EAS Build Readiness.
- **Fixes Applied:** 6 defects (`BUG-028` through `BUG-033`), including 2 **P0** Android native/manifest blockers (`CAMERA` permission stripped by `expo-image-picker` + missing `IMAGE_CAPTURE` `<queries>`; `AlarmEngineScheduler.sync()` cancelling newly scheduled `ACTION_SNOOZE` alarms), 1 **P1** `AlarmPlaybackService` notification snooze & multi-alarm metadata defect, 2 **P2** native defects (`scheduleSnooze` `hasKey` guards, `FocusLockBlockingActivity` dp button height), and 5 test-suite mock/typing repairs.
- **Final APK Verdict:** **NO-GO (for immediate store/production publish) / READY FOR EAS PREVIEW APK BUILD & PHYSICAL DEVICE QA**.

---

## Release Gate Matrix

| Gate | Classification | Evidence & Constraints |
|---|---|---|
| **A. JavaScript / TypeScript Readiness** | **PASS WITH LIMITATIONS** | `EXPO_NO_TELEMETRY=1 pnpm exec expo lint` passed (0 errors, 5 pre-existing unused-var warnings in `StudySakhaAlarmModule.tsx`). `pnpm run lint` (`tsc --noEmit`) has 0 errors in all application/library/screen/component/alarm/focusLock/notification files, and exits 2 only on pre-existing test-file typings in 5 `test/*.test.tsx` files. |
| **B. Expo Configuration Readiness** | **PASS** | `expo config --type public --json` and `expo prebuild --no-install --platform android` succeeded cleanly; `validate:release -- preview` passed when `EXPO_PUBLIC_API_BASE_URL=https://study-sakha-app.onrender.com` was provided alongside `.env` Supabase keys. |
| **C. Android Native Compilation Readiness** | **BLOCKED** | No Android SDK (`ANDROID_HOME` unset) in Codespace; `:app:assembleRelease` and `:app:compileDebugKotlin` cannot run locally. Must compile via EAS Cloud (`preview` / `arm64-apk` / `production`). |
| **D. Alarm Engine Readiness** | **PASS WITH LIMITATIONS (Host) / NOT VERIFIED (Device)** | Fixed P0 `CAMERA` manifest removal (`BUG-028`), P0 `sync()` cancelling `ACTION_SNOOZE` (`BUG-029`), P1 `AlarmPlaybackService` notification snooze & multi-alarm metadata (`BUG-030`), and P2 `scheduleSnooze` `hasKey` guards (`BUG-031`). All 4 Alarm Jest suites (`heavySleeperMissions`, `alarmUiUpdate`, `alarmStorage`, `alarmAndSakhaProductionFixes`) pass. Physical Android ringing/sensors/camera/boot remain **NOT VERIFIED**. |
| **E. FocusLock Readiness** | **PASS WITH LIMITATIONS (Host) / NOT VERIFIED (Device)** | Fixed P2 `FocusLockBlockingActivity` button height (`BUG-032`). Template-to-generated Kotlin/XML sync and all 5 FocusLock Jest suites (`focusLockCleanup`, `focusLockP0Fixes`, `focusLockP1Fixes`, `focusLockP2Fixes`, `focusLockP3Hardening`) pass. Physical Android `AccessibilityService`, `UsageStats`, and blocking overlay remain **NOT VERIFIED**. |
| **F. Notification Readiness** | **BLOCKED (Remote Schema) / PASS (Host)** | `NotificationCentre` UI, router, preferences, and offline queue pass `notificationCentre.test.tsx`. Remote Supabase project (`edjazjfylnpvqykpdtiq`) is missing `supabase/migrations/202611270002_notification_centre_backend.sql`, causing `"Could not find the table 'public.notifications' in the schema cache"` (`BLK-003`). |
| **G. Supabase / Backend Readiness** | **PASS WITH LIMITATIONS** | Auth, RLS, `server.js` (`/api/health`, `/api/chat`, `/api/audio-catalog`), and `validateApiBaseUrl` verified on host. Remote `202611270002` migration push blocked in Codespace (`EROFS` on `/home/codespace/.supabase`, no remote credentials). |
| **H. Full Application Regression Readiness** | **PASS WITH LIMITATIONS** | `pnpm exec jest --runInBand --forceExit`: **57/61 suites passed (310/319 tests passed)**. 4 suites failed (`focusSessionSetup`, `focusImprovements`, `studyPlannerFocusIntegration`, `stabilityFailureScenarios`). `pnpm run build:web` exported cleanly to `dist/`. |
| **I. Physical Android Device Readiness** | **NOT VERIFIED** | No `adb`, emulator, or physical Android device is available in Codespace. |
| **J. APK Release Readiness** | **NO-GO** | Blocked on EAS Cloud APK compilation, `EXPO_PUBLIC_API_BASE_URL` verification in EAS env, `202611270002` Supabase migration push, and physical Android device smoke testing. |
