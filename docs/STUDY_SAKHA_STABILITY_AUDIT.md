# Study Sakha — Production Stability, Performance & Security Audit Report

**Date:** 2026-11-25  
**Target Platform:** Android APK (Expo ~57.0.31 / React Native 0.86.3 / React 19.2.3 / TypeScript ~6.0.3)  
**Workspace:** `/workspaces/study-sakha-app`

---

## 1. Executive Summary & Release Readiness Verdict

Two full engineering passes were completed on Study Sakha: an initial repository-wide audit and P0–P3 stabilization pass, followed by an independent second-pass verification focused on Android native concurrency, crash safety, failure-scenario testing, and APK release readiness.

**Verdict:** JavaScript/TypeScript business logic, state persistence, server audio/range handling, and React lifecycle stability are **verified passing** across 35 Jest suites (156/156 tests), TypeScript, ESLint, and Expo config resolution. However, **Study Sakha is NOT yet verified for production Android APK distribution** because **no Android SDK or emulator/device is available in this environment** (`ANDROID_HOME`/`ANDROID_SDK_ROOT` unset), leaving Kotlin compilation, Gradle APK packaging, and on-device FocusLock AccessibilityService / AlarmManager / BootReceiver runtime behavior **NOT VERIFIED**. In addition, local `validate:release` fails until production environment variables (specifically `EXPO_PUBLIC_API_BASE_URL`) are supplied in EAS/CI.

### Validation Scorecard

| Check | Command | Outcome | Notes |
|---|---|---|---|
| TypeScript Typecheck | `npx tsc --noEmit` | **PASS** | 0 errors after final edit |
| ESLint | `EXPO_NO_TELEMETRY=1 npx expo lint` | **PASS** | 0 errors, 0 warnings (`EXPO_NO_TELEMETRY=1` avoids sandbox `~/.expo` mkdir error) |
| Expo Config Resolution | `EXPO_NO_TELEMETRY=1 npx expo config --json` | **PASS** | `app.config.js` + config plugins resolve cleanly for SDK 57.0.0 |
| Full Jest Suite (incl. Failure Scenarios) | `pnpm test -- --runInBand --forceExit` | **PASS** | 35/35 suites, 156/156 tests passing (including 12 new tests in `test/stabilityFailureScenarios.test.tsx`) |
| Release Env Validation | `node scripts/validate-release-config.cjs` | **BLOCKED / FAIL (Local Env)** | `EXPO_PUBLIC_API_BASE_URL` (and production env set) missing in local shell |
| Android Gradle APK Compilation | `./android/gradlew` | **NOT VERIFIED** | Java & Gradle binaries exist, but Android SDK (`ANDROID_HOME`/`ANDROID_SDK_ROOT`) is absent |
| Android Device / Emulator / Logcat | N/A | **NOT VERIFIED** | No emulator or physical Android device attached |

---

## 2. Independent Verification of Pass 1 Fixes

Every Pass 1 fix was re-inspected line by line during Pass 2:

| Pass 1 Fix | Pass 2 Verification Finding | Verdict |
|---|---|---|
| `FocusLockModule.kt` `copyMap` (`merge`) & `getRemainingTime.toDouble()` | Cloning avoids `ObjectAlreadyConsumedException` on `session`; however, `updatePackages` still called `promise.resolve(session.getArray("packageIds"))`, `readSession()` lacked `try/catch` for corrupt JSON, `getActiveSession()` / `getBlockedPackages()` did not check `endsAt`, and cross-thread `prefs` access lacked synchronization. | **PARTIALLY FIXED → Hardened in Pass 2** |
| `FocusLockAlarm.kt` null checks & `runCatching` | `Receiver.onReceive` did not check `status == "active"`, `sessionId`, or `endsAt`, allowing a duplicate/stale alarm to wipe a newer active session. | **PARTIALLY FIXED → Hardened in Pass 2** |
| `FocusLockBootReceiver.kt` `status == "active"` check | Correctly filtered stopped sessions, though lacked `sessionLock` and `sessionId` pass-through to `FocusLockAlarm.schedule`. | **PARTIALLY FIXED → Hardened in Pass 2** |
| `FocusLockBlockingActivity.kt` nullable launch intent & `onResume()` | Confirmed safe (`?.let { startActivity(it) }` and `onResume` re-checks expiry). | **PASS** |
| `FocusLockAccessibilityService.kt` `runCatching` around `recordBlockedAttemptGlobal` | Confirmed safe, but parsed `JSONObject(raw)` on every OS window event on the main thread. | **PASS → Optimized with raw-string cache in Pass 2** |
| `FocusCenterScreen.tsx` 60× break duration fix & hook deps | Verified all 4 `breakSeconds` unit bugs fixed and deps corrected; added `mountedRef` guard in Pass 2 for async `completeSession` / `discardSession`. | **PASS** |
| `SettingsScreen.tsx` `SafeAreaView` migration | Verified fixed, but Pass 2 grep found `FocusLockScreen.tsx` and `StatisticsScreen.tsx` also still used deprecated RN `SafeAreaView`. | **PARTIALLY FIXED → Remaining screens fixed in Pass 2** |
| `DashboardScreen.tsx` & `focusLockSnapshot.ts` | Verified `AsyncStorage.getItem` wrapped in `try/catch` and dead FocusLock reads removed. | **PASS** |
| `SearchScreen.tsx`, `NotificationsScreen.tsx`, `CurrentAffairsScreen.tsx` | Verified null-safe array guards, fallback notification metadata, URL scheme validation, and timer unmount cleanups. | **PASS** |
| `lib/supabase.ts` & `App.tsx` linking | Verified `supabaseConfigured` guards and `FocusCenter: 'focus/center'` route mapping. | **PASS** |
| `server.js` Range requests & stream errors | Verified suffix range `bytes=-N`, `fs.statSync` guard in `/api/audio/:filename`, and error middleware; Pass 2 discovered `/api/audio-catalog` also called unguarded `fs.statSync` and `res.writeHead` ran before stream `open`. | **PARTIALLY FIXED → Hardened in Pass 2** |
| `components/Charts.tsx`, `lib/theme.tsx`, `scripts/run-jest.cjs` | Verified `buildDonutArcs`, memoized `HeatMap`, `useCallback` on `f`, and local Jest resolution. | **PASS** |

---

## 3. New Issues Discovered & Fixed in Pass 2

### P0 — Critical (Native Stability, Corrupt Data Recovery & Race Conditions)

1. **`FocusLockModule.kt` Uncaught `JSONException` on Corrupted Persisted Session (`readSession` / `getActiveSession` / `getRemainingTime` / `getBlockedPackages`)**
   - **Root Cause:** `readSession()` called `org.json.JSONObject(json)` without `try/catch`, and `getActiveSession`, `getRemainingTime`, `getBlockedPackages`, `getBlockedAttemptCount`, and `isAccessibilityEnabled` had no `try/catch`. Corrupted `SharedPreferences` JSON crashed native `@ReactMethod` invocations.
   - **Fix:** Wrapped `readSession()` in `try/catch` (clears corrupt `SESSION_KEY` and returns `null`), used `optString(i, "")` for `packageIds`, and added `try/catch` promise rejection guards to all `@ReactMethod`s.

2. **Cross-Thread Race Conditions & Stale Alarm Wipes (`FocusLockModule.kt`, `FocusLockAlarm.kt`, `FocusLockBootReceiver.kt`, `FocusLockAccessibilityService.kt`)**
   - **Root Cause:** Native module calls run on `mqt_native_modules` while `FocusLockAlarm.Receiver` and `FocusLockAccessibilityService` run on the Android main thread without synchronization. Duplicate or delayed alarms unconditionally deleted `SESSION_KEY`, and `recordBlockedAttemptInternal` read `blockedAttemptsToday()` twice across async `apply()`.
   - **Fix:** Added `FocusLockModule.sessionLock` around all session and blocked-attempt read/modify/write paths; passed `EXTRA_SESSION_ID` in `FocusLockAlarm` `PendingIntent` so `Receiver.onReceive` only expires the matching active session; cleared expired sessions before checking `status != "active"` in `startBlockingSession`, `getActiveSession`, and `getBlockedPackages`.

3. **`FocusLockModule.kt` `updatePackages` `ReadableArray` Reuse & Inactive Session Mutation**
   - **Root Cause:** `updatePackages` did not check `status == "active"` / `endsAt > now` and resolved `session.getArray("packageIds")` directly.
   - **Fix:** Enforced active unexpired session check and resolved a newly allocated `Arguments.createArray()`.

### P1 — High (Memory Leaks, Unmount Safety, Server Stream Errors, Offline Cleanup)

4. **`FocusLockModule.kt` Native Bitmap Leak in `iconAsBase64` & `FocusLockAccessibilityService.kt` Main-Thread JSON Churn**
   - **Fix:** Recycled the 96×96 `Bitmap` in `finally` inside `iconAsBase64`, and added raw-string session caching in `FocusLockAccessibilityService` to avoid re-parsing `JSONObject` on every Android window event.

5. **Deprecated `SafeAreaView` & Unmount Safety (`screens/FocusLockScreen.tsx`, `screens/StatisticsScreen.tsx`, `screens/FocusCenterScreen.tsx`)**
   - **Fix:** Migrated `FocusLockScreen.tsx` and `StatisticsScreen.tsx` from `react-native`'s deprecated `SafeAreaView` to `react-native-safe-area-context`; added `mountedRef` guards in `FocusLockScreen.refreshNativeState` and `FocusCenterScreen.completeSession` / `discardSession`.

6. **Express Pre-Open Stream Errors & Catalog `statSync` (`server.js`)**
   - **Fix:** Added `safeStatSize()` for `/api/audio-catalog`, and deferred `res.writeHead(...)` until `file.once('open', ...)` on audio endpoints so pre-open file deletion returns clean `500` JSON rather than `socket hang up`.

7. **Offline Realtime Channel Cleanup (`lib/sync/syncEngine.ts`)**
   - **Fix:** Wrapped `await supabase.removeChannel(this.channel)` in `try/catch` inside `AccountSyncEngine.stop()` so offline cleanup errors do not leave `userId` or callbacks dangling.

### P2 — Medium (Config Plugin Divergence Prevention & Release Validator)

8. **Config Plugin Hardcoding (`plugins/withFocusLock.js`) & Missing `production-apk` Profile (`scripts/validate-release-config.cjs`)**
   - **Fix:** Updated `withFocusLock.js` to rewrite `package` / alarm action / `settingsActivity` dynamically if `android.package` changes, and merged launcher `<queries>` intent into existing `<queries>` when present. Added `'production-apk'` to `allowedProfiles` in `scripts/validate-release-config.cjs`.

---

## 4. Failure Scenario Regression Coverage (`test/stabilityFailureScenarios.test.tsx`)

Created [stabilityFailureScenarios.test.tsx](file:///workspaces/study-sakha-app/test/stabilityFailureScenarios.test.tsx) (12 tests, all passing):
- Express suffix `Range` (`bytes=-128`), malformed/out-of-bounds `Range` (`416`), unknown `/api` (`404` JSON), malformed JSON body (`400` JSON), and audio deletion during `/api/audio-catalog` & `/api/audio/:filename` (`500` JSON + server survival).
- Corrupted `AsyncStorage` FocusLock snapshot & storage read rejection returning `null` without unhandled rejection.
- `AccountSyncEngine.stop()` resilience when `supabase.removeChannel` rejects offline.
- Unconfigured `supabase.ts` (`supabaseConfigured === false`) rejecting `createStudentContentSignedUrl` instead of hitting `.invalid`.
- Unavailable JS `focusLockNative` bridge & `subscribeFocusLockEvent` cleanup on non-Android/unlinked builds.
- `NotificationsScreen` & `CurrentAffairsScreen` unmount timer cancellation + unknown notification `kind` fallback + `SearchScreen` undefined `tags` null-safety.
- Automated verification that `native/focus-lock/android/` templates match `android/app/src/main/` sources byte-for-byte and enforce all Kotlin concurrency/alarm/boot/bridge safety guards.

*(Note: Direct Android runtime scenarios — rapid native start/stop under real Android threads, actual reboot broadcast delivery, Doze alarm delay, and `BlockingActivity` back behavior — are covered structurally and via JS contracts, while live Android runtime remains **NOT VERIFIED** without an emulator/device.)*

---

## 5. Complete List of Files Modified / Added / Removed

- **Native Kotlin & Config Plugin:**
  - `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockModule.kt` (synced to `android/app/src/main/java/com/anonymous/agonpreview/FocusLockModule.kt`)
  - `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAlarm.kt` (synced to `android/app/src/main/java/com/anonymous/agonpreview/FocusLockAlarm.kt`)
  - `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockBootReceiver.kt` (synced to `android/app/src/main/java/com/anonymous/agonpreview/FocusLockBootReceiver.kt`)
  - `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockBlockingActivity.kt` (synced to `android/app/src/main/java/com/anonymous/agonpreview/FocusLockBlockingActivity.kt`)
  - `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAccessibilityService.kt` (synced to `android/app/src/main/java/com/anonymous/agonpreview/FocusLockAccessibilityService.kt`)
  - `plugins/withFocusLock.js`
- **Screens, Hooks, Components & Navigation:**
  - `App.tsx`, `components/Charts.tsx`, `hooks/useProceduralPicture.ts`
  - `screens/CurrentAffairsScreen.tsx`, `screens/DashboardScreen.tsx`, `screens/FocusCenterScreen.tsx`, `screens/FocusLockScreen.tsx`, `screens/NotificationsScreen.tsx`, `screens/SearchScreen.tsx`, `screens/SettingsScreen.tsx`, `screens/StatisticsScreen.tsx`
- **Core Lib, Server & Tooling:**
  - `lib/focusLockSnapshot.ts`, `lib/supabase.ts`, `lib/sync/syncEngine.ts`, `lib/theme.tsx`
  - `server.js`, `scripts/run-jest.cjs`, `scripts/validate-release-config.cjs`
- **Tests & Docs:**
  - Added `test/stabilityFailureScenarios.test.tsx`, `docs/STUDY_SAKHA_STABILITY_AUDIT.md`
  - Removed 5 stale backup files (`lib/groupRoomFocusBridge.ts.bak`, `screens/FocusCenterScreen.tsx.bak`, `screens/GroupsScreen.tsx.bak`, `screens/GroupsScreen.tsx.backup`, `screens/GroupsScreen.mixed-backup.tsx.bak`)

---

## 6. Android Compatibility, APK Readiness & Production Release Blockers

### Android Compatibility Findings
- `app.json` / `app.config.js`: `package: "com.anonymous.agonpreview"`, `allowBackup: false`, `SYSTEM_ALERT_WINDOW` blocked, `predictiveBackGestureEnabled: false`, `edgeToEdgeEnabled: true`, `newArchEnabled: true`, `hermesEnabled: true`.
- `eas.json` defines `preview`, `production` (AAB), `production-apk`, and `arm64-apk` with `credentialsSource: "remote"` and R8 minify + resource shrinking + bundle compression enabled.
- `android/app/build.gradle` uses `signingConfigs.debug` for local `release` builds; production signing relies on EAS remote credentials.
- `FocusLockAlarm` uses `setExactAndAllowWhileIdle` with `Exception` fallback to `setAndAllowWhileIdle` (avoiding Play Store `USE_EXACT_ALARM` policy issues on targetSdk 36 while remaining compatible with Android 12–16).

### Production Release Blockers (Before Distributing APK)
1. **Android Native Compile & Device QA (`BLOCKER`):** Run `npx expo prebuild --platform android` / `./android/gradlew assembleDebug` (or EAS build) with an Android SDK and verify `FocusLockModule`, `FocusLockAccessibilityService`, `FocusLockBlockingActivity`, `FocusLockAlarm`, and `FocusLockBootReceiver` on a real Android 12–15 device + Logcat.
2. **Release Environment Variables (`BLOCKER`):** Set `EXPO_PUBLIC_API_BASE_URL` (HTTPS, no credentials), `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the EAS environment and verify `pnpm validate:release -- production-apk` exits `0`.
3. **Remaining Non-Blocking Risks (P2):**
   - `app.json` still uses placeholder package ID `com.anonymous.agonpreview` (`withFocusLock.js` now supports package rewrites if renamed, though changing package ID affects store listing/credentials).
   - `Groups` deep link (`groups/invite/:inviteGroupId`) and parameterized deep links (`TestPlayer`, `TestResult`, `BookReader`, `FocusCompletion`) remain partial on cold link open.
   - `FocusCenterScreen` 1s `clockNow` and `DashboardScreen` 16ms `anim` intervals re-render screen trees during active animations/ticks.
   - `test/studyPlannerFilters.test.tsx` emits a React `act(...)` warning from `Animated.parallel` completion callback in `StudyPlannerScreen.tsx:1600`.
