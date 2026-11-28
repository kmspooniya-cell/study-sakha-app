# Study Sakha — Focus Lock Functional & Production Readiness Audit

**Audit Date:** 2026-11-27  
**Scope:** Complete static source-code and test-suite audit of the Focus Lock module (`screens/FocusLockScreen.tsx`, `lib/focusLockNative.ts`, `lib/focusLockSnapshot.ts`, `native/focus-lock/android/*`, `plugins/withFocusLock.js`, and integration points in `App.tsx`, `components/Shell.tsx`, `screens/SettingsScreen.tsx`, `screens/FocusCenterScreen.tsx`, `lib/store.tsx`, and `test/`).  
**Method:** Direct inspection of source files, config plugins, native Kotlin/XML implementations, and execution of existing Jest tests (`test/focusLockCleanup.test.tsx`, `test/stabilityFailureScenarios.test.tsx`). Physical Android device / EAS release-build runtime behavior was **not** executed in this environment and is explicitly marked `UNVERIFIED` where runtime hardware/OS verification is required.

---

## 1. Executive Summary

Study Sakha’s Focus Lock module has a **real Android native core** (`StudySakhaFocusLock` via `FocusLockModule.kt`, `FocusLockAccessibilityService.kt`, `FocusLockBlockingActivity.kt`, `FocusLockAlarm.kt`, and `FocusLockBootReceiver.kt`), wired into Expo CNG via `plugins/withFocusLock.js`. However, the surrounding React Native experience in `screens/FocusLockScreen.tsx` (3,613 lines) is an **incomplete migration from a frontend UI prototype**. Several high-visibility features are **UI-only**, **broken**, or **disconnected** from the native layer and from `SettingsScreen.tsx`.

### Key Findings
- **Core Blocking Exists, With Major Gaps:** Native foreground package detection via `AccessibilityService` + `FocusLockBlockingActivity` + `SharedPreferences` + `AlarmManager` is implemented in Kotlin, but **physical-device enforcement is unverified** and has a 1,500 ms debounce bypass, no OEM background-popup handling, and no `TIME_SET`/`TIMEZONE_CHANGED` protection.
- **Broken Session & Duration Controls:** `Until Time` always starts a 75-minute session (`screens/FocusLockScreen.tsx:2129`), `End of Day` always starts 240 minutes (`:2130`), **Allowlist Mode** passes allowed apps into the blocklist (`:2217, 2708`), and **Pause** only pauses the JS UI timer without updating the native Android deadline (`:2617-2624`).
- **Strict Mode Is Not Enforced (and PIN Can Lock Out Users):** `strictConfig` is never persisted to `AsyncStorage` (`:2036-2040`), `pinCode` defaults to `""` with **no UI to set a PIN** (`:1941`), and users at Level 2/3 can tap **Complete Session** immediately (`:2674-2682`) to terminate native blocking and claim full Focus Points.
- **Silent Session Loss in Background:** If a session expires via `FocusLockAlarm` while the app is killed or backgrounded, `FocusLockAlarm.Receiver` deletes `SESSION_KEY` and calls `emitGlobal("onSessionExpired")` (`FocusLockAlarm.kt:56-60`), which no-ops when React Native is inactive—losing the session from `focusHistory`, `studyLog`, and `focusPoints`.
- **Android Protection Readiness Is Capped at 25%:** Only 2 of 8 permission cards (`accessibility`, `usage`) check real native status (`screens/FocusLockScreen.tsx:2312-2317`); the other 6 are permanently `"Needs Attention"` and non-functional.
- **UI-Only Features:** All 4+ Blocking Modes (except Emergency Focus), Smart Break, Web & Shorts filtering, URL/keyword rules, all 8 Notification/DND toggles, and most Strict Mode safeguards have no native or OS-level implementation.
- **Separate Alarm Engine:** `AlarmEngineScheduler.kt`, `AlarmEngineReceiver.kt`, `AlarmEngineModule.kt`, `AlarmMissionEngine.kt`, `src/modules/alarm/StudySakhaAlarmModule.tsx`, and `src/modules/alarm/alarmNative.ts` belong to the separate **Study Sakha Alarm Engine** (`StudySakhaAlarmEngine`), not Focus Lock. Notably, `AlarmEngine` handles `canScheduleExactAlarms()`, `openExactAlarmSettings()`, `TIME_SET`, and `TIMEZONE_CHANGED`, whereas `FocusLockAlarm`/`FocusLockBootReceiver` do not.

**Final Production Readiness Verdict:** **NOT READY**

---

## 2. Complete Button-by-Button Functionality Matrix

| Feature / Button | Location | Handler & Behavior | Persists? | Native Sync? | Classification |
|---|---|---|---|---|---|
| **Focus Status Dashboard** | `screens/FocusLockScreen.tsx:718-835, 2371-2382` | Renders `sessionState` badge, metrics, and action link. | Partial | Partial | **PARTIALLY WORKING** |
| **Ready to Focus status** | `screens/FocusLockScreen.tsx:761, 1905` | Default `sessionState = 'ready'`; switches on session transitions. | Yes (`:2039`) | Partial | **PARTIALLY WORKING** |
| **Blocked Apps counter** | `screens/FocusLockScreen.tsx:818-821` | Displays `selectedAppIds.length` (wrongly counts allowed apps in Allowlist mode). | Yes (`:2038`) | Partial | **PARTIALLY WORKING** |
| **Duration / Remaining counter** | `screens/FocusLockScreen.tsx:822-827` | Shows `computedDurationMins` when idle, `remainingSec` when running. | Partial | Partial | **PARTIALLY WORKING** |
| **Blocked Today counter** | `screens/FocusLockScreen.tsx:828-831` | Updated by `getBlockingStatus()` and `onBlockedAppDetected`. | Yes (native `SharedPreferences` + JS) | Yes | **PARTIALLY WORKING** |
| **Next scheduled focus time** | `screens/FocusLockScreen.tsx:811-813, 2376` | Hardcoded `"7:00 PM"` (`:2376`) and `"7:00 PM"` in `OwlAssistantCard` (`:676`). | No | No | **UI ONLY** |
| **Quick Focus Lock** | `screens/FocusLockScreen.tsx:840-962` | Container card for presets, mode/strict summary, and start CTA. | N/A | N/A | **PARTIALLY WORKING** |
| **Instant Start badge** | `screens/FocusLockScreen.tsx:884-886` | Static non-interactive pill (`View`, not `TouchableOpacity`). | N/A | N/A | **UI ONLY** |
| **15m, 25m, 30m, 50m, 90m, 2 hrs** | `screens/FocusLockScreen.tsx:863-869, 893-905, 2131` | Sets `selectedPreset`; `computedDurationMins` computes `15..120`. | Yes (`:2038`) | On start | **WORKING** |
| **Custom Duration (`+`/`-`)** | `screens/FocusLockScreen.tsx:910-931, 2128` | Adjusts `customMinutes` in 5m steps (`5..240`). | Yes (`:2038`) | On start | **WORKING** |
| **Until Time** | `screens/FocusLockScreen.tsx:933-947, 2129` | Updates `untilTime` string, but `computedDurationMins` **hardcodes `75` mins** (`:2129`). | No | No | **BROKEN** |
| **End of Day** | `screens/FocusLockScreen.tsx:872, 2130` | `computedDurationMins` **hardcodes `240` mins** (`:2130`) instead of time to EOD. | No | No | **BROKEN** |
| **START FOCUS LOCK** | `screens/FocusLockScreen.tsx:949-959, 2213-2236` | Validates duration, apps, accessibility; starts native session optimistically before promise settles. | Partial | Yes (with race) | **PARTIALLY WORKING** |
| **Fix Health →** | `screens/FocusLockScreen.tsx:802-805, 2378` | Navigates to internal `'settings'` sub-view. | N/A | No | **WORKING** (UI nav) |
| **Open Timer** | `screens/FocusLockScreen.tsx:806-809, 2379` | Navigates to `'active_session'` sub-view. | N/A | No | **WORKING** (UI nav) |
| **Sakha Owl Card** | `screens/FocusLockScreen.tsx:654-713` | Displays mood/copy by `sessionState`; idle copy hardcodes `7:00 PM`. | N/A | No | **PARTIALLY WORKING** |
| **Preview Intervention Screen** | `screens/FocusLockScreen.tsx:697-708, 2402-2405` | Opens JS `InterventionModal` (`appName="Instagram"` hardcoded at `:3267`). | N/A | No | **UI ONLY** |
| **Intervention Modal Actions** | `screens/FocusLockScreen.tsx:1684-1710, 3265-3283` | `Return to Study` / `Continue Focus` close modal with toast; `Request Emergency` opens `EmergencyAccessModal`. | No | No | **UI ONLY** |
| **Blocking Profiles (horizontal list)** | `screens/FocusLockScreen.tsx:347-356, 2410-2442` | `getPresetLists()` returns `[]` (`:348`); heading renders with **empty list**. | N/A | No | **BROKEN** |
| **Blocking Modes card & screen** | `screens/FocusLockScreen.tsx:2451, 2696-2721` | Opens `modes` sub-view; selecting a mode sets `selectedModeId` only (except `allowlist` & `emergency`). | No (`selectedModeId` not persisted) | Only `emergency` | **UI ONLY** (except Emergency) |
| **Emergency Focus mode card** | `screens/FocusLockScreen.tsx:2710-2713` | Calls `handleStartFocus(45, 2)`. | Partial | Yes | **PARTIALLY WORKING** |
| **App Selection card & screen** | `screens/FocusLockScreen.tsx:2452, 2723-2818` | Lists real Android launcher apps via `getInstalledApps()`; search, filters, Select All/Clear work. | Yes (`selectedAppIds`) | Yes | **PARTIALLY WORKING** |
| **Allow Only Selected (Allowlist)** | `screens/FocusLockScreen.tsx:2708, 2738-2745, 2217` | Sets `appStrategy = 'allow'`, but `handleStartFocus` **blocks `selectedAppIds`** instead of inverting! | No (`appStrategy` not persisted) | Inverted! | **BROKEN** |
| **Strict Mode card & screen** | `screens/FocusLockScreen.tsx:2453, 2820-2881` | Level 1/2/3 selector + 7 safeguard toggles + cooldown chips. | Only `strictLevel` (`:2038`); `strictConfig` lost | No | **PARTIALLY WORKING** / **UI ONLY** |
| **Extreme Mode (`Level 3`) Confirm** | `screens/FocusLockScreen.tsx:2249-2255, 3161-3193` | Opens confirmation modal; sets `strictLevel = 3`. | Yes (`strictLevel`) | No | **PARTIALLY WORKING** |
| **Focus Analytics card & screen** | `screens/FocusLockScreen.tsx:2454, 2883-2964` | Reads `historyRecords` for sessions/longest/score; most KPIs hardcoded `0` or `Unavailable`. | Partial | Partial (`blockedAttemptsToday`) | **PARTIALLY WORKING** |
| **Analytics Empty State toggle** | `screens/FocusLockScreen.tsx:2906-2910` | Toggles `showEmptyAnalytics` preview state. | No | No | **UI ONLY** |
| **Web & Shorts card & screen** | `screens/FocusLockScreen.tsx:2455, 2966-3072` | 6 toggles + custom URLs + keyword chips. | Yes (`contentRules`) | **No** | **UI ONLY** |
| **Android Protection Readiness bar** | `screens/FocusLockScreen.tsx:2484-2501, 2318-2319` | Navigates to `'settings'` sub-view; score capped at **25%** (`2/8`). | N/A | Partial (2/8) | **PARTIALLY WORKING** |
| **Active Session: Pause / Resume** | `screens/FocusLockScreen.tsx:2611-2637` | Pauses JS interval only; **does not pause native `endsAt` or `FocusLockAlarm`**. | No | **No** | **BROKEN** |
| **Active Session: Take Break** | `screens/FocusLockScreen.tsx:2258-2272, 2639-2645` | Starts JS-only break timer; native blocking remains active! | Partial (`breakConfig`) | **No** | **BROKEN** |
| **Active Session: End Session (Lvl 1)** | `screens/FocusLockScreen.tsx:2649-2661` | Stops native session (`emergencyExit=true`), records partial history, goes home. | Yes | Yes | **WORKING** |
| **Active Session: Emergency Access (Lvl 2/3)** | `screens/FocusLockScreen.tsx:2663-2672, 1721-1833` | Opens `EmergencyAccessModal`; PIN check broken (`pinCode=""`), Partner approval non-functional. | No | On confirm | **BROKEN** |
| **Active Session: Complete Session** | `screens/FocusLockScreen.tsx:2674-2686` | Immediately completes session even at Level 2/3 Strict Mode and stops native blocking! | Yes | Yes | **PARTIALLY WORKING** (Bypass!) |
| **Active Session: Simulate Intervention** | `screens/FocusLockScreen.tsx:2586-2595` | Increments `blockedAttemptsToday` in JS only (not native) and opens `InterventionModal`. | Yes (JS) | No | **UI ONLY** |
| **Settings Sub-header Back (`<`)** | `screens/FocusLockScreen.tsx:2334-2339` | Returns to `'home'` sub-view. | N/A | N/A | **WORKING** |
| **Settings Sub-header Theme Toggle** | `screens/FocusLockScreen.tsx:2351-2356` | Dispatches `themeMode` to global store. | Yes | N/A | **WORKING** |
| **Settings: Daily Study Intention** | `screens/FocusLockScreen.tsx:3102-3109` | Updates `dailyIntention` shown in `InterventionModal`. | Yes (`:2038`) | No | **WORKING** |
| **Settings: Notification & Device Toggles (8x)** | `screens/FocusLockScreen.tsx:3111-3135` | Toggles `notifSettings` booleans only. | Yes (`:2039`) | **No** | **UI ONLY** |
| **Settings: Open Permission Settings** | `screens/FocusLockScreen.tsx:1534-1542, 2274-2281` | Opens Android Settings **only** for `accessibility` & `usage`; 6 others show error toast. | N/A | Partial (2/8) | **PARTIALLY WORKING** |
| **SettingsScreen → Focus Lock section** | `screens/SettingsScreen.tsx:2668-2769, 3976-4045` | Separate `settings.focuslock` state; **completely disconnected** from `FocusLockScreen` & native module. | Yes (own key) | Read-only status | **UI ONLY** / **BROKEN** |
| **FocusCenterScreen → Blocked Apps** | `screens/FocusCenterScreen.tsx:292-293` | Hardcodes `blockedAppsCount={5}`; navigates to `'FocusLock'`. | N/A | No | **PARTIALLY WORKING** |

---

## 3. Feature-Wise Implementation Status

### Working
- **Duration Presets (`15m`, `25m`, `30m`, `50m`, `90m`, `2 hrs`, `Custom`):** Correctly calculate minutes (`screens/FocusLockScreen.tsx:2127-2132`) and persist `selectedPreset` and `customMinutes`.
- **Installed App Discovery (Android):** `FocusLockModule.kt:34-57` queries `ACTION_MAIN` + `CATEGORY_LAUNCHER` activities, deduplicates by `packageName`, excludes self and critical system packages (`:248`), and sorts alphabetically.
- **Session Credit Deduplication:** `creditedSessionId` ref (`screens/FocusLockScreen.tsx:1993, 2135`) and `appendFocusHistory` (`lib/focusHistory.ts:53`) prevent duplicate writes for the same `sessionId`.
- **Accessibility & Usage Access Detection/Navigation:** `FocusLockModule.kt:239-246` accurately checks `ENABLED_ACCESSIBILITY_SERVICES` and `AppOpsManager.OPSTR_GET_USAGE_STATS`, and opens system settings (`:105-107`).

### Partially Working
- **Session Lifecycle & Native Sync:** Starting and stopping sessions call `StudySakhaFocusLock`, and `refreshNativeState` restores active native sessions on mount/foreground (`:2092-2103`). However, optimistic UI transitions (`:2229-2235`), broken Pause/Break, and background expiration loss undermine reliability.
- **Focus Analytics:** Real `focusHistory` records drive `sessionsCompleted`, `longestSession`, and `focusScore`, and `blockedAttemptsToday` comes from native `SharedPreferences`. All other metrics are `0` or `"Unavailable"`.
- **Android Hardware Back Navigation:** `components/Shell.tsx:107` exempts `'FocusLock'` from `useSmartAndroidBack`, so pressing Android Back on any internal sub-screen exits `FocusLockScreen` completely instead of returning to `'home'`.

### Broken
- **Until Time (`:2129`) & End of Day (`:2130`):** Hardcoded to `75` and `240` minutes.
- **Allowlist Mode (`:2217, 2708, 2738`):** Blocks the selected allowed apps instead of blocking all non-selected apps.
- **Blocking Profiles (`:348`):** `getPresetLists()` returns `[]`, leaving an empty section on the home dashboard.
- **Pause & Smart Break (`:2612-2645`):** Desynchronizes JS countdown from native `endsAt` and `FocusLockAlarm`.
- **Emergency Access PIN & Partner Approval (`:1743, 1783-1796, 1941`):** `pinCode` is `""` with no setup UI; Partner Approval has no backend/network implementation.
- **Disconnected `SettingsScreen.tsx` Focus Lock (`:2668-2769`):** Maintains an independent, unused list of app names (`'Instagram'`, etc.) and rules.

### UI-Only / Placeholder
- **Web & Shorts Filtering (`:2966-3072`)**
- **7 of 8 Blocking Modes (`:361-372`)**
- **8 Notification & Device Control toggles (`:3111-3135`)**
- **Strict Mode safeguards (`strictConfig`, `:1937-1948, 2827-2868`)**
- **Next Scheduled Focus Time (`"7:00 PM"`, `:2376`)**
- **6 of 8 Permission Cards (`overlay`, `notification`, `dnd`, `background`, `battery`, `packages`, `:376-387`)**
- **Sakha Owl Intervention Preview (`:697-708, 3265-3283`)**

### Unverified (Requires Physical Android Device)
- Real-time `FocusLockAccessibilityService` interception across Android 10–15 and OEM skins (MIUI/HyperOS, OneUI, ColorOS, FuntouchOS).
- `FocusLockBlockingActivity` launch from background under OEM background-popup restrictions.
- `FocusLockAlarm` delivery under Doze Mode and `FocusLockBootReceiver` execution after device reboot.

---

## 4. Native Android Architecture Assessment

### Mechanism
Focus Lock uses an **`AccessibilityService`** (`FocusLockAccessibilityService.kt`) listening for `TYPE_WINDOW_STATE_CHANGED | TYPE_WINDOWS_CHANGED` (`native/focus-lock/android/res/xml/focus_lock_service.xml:2`), with `android:canRetrieveWindowContent="false"` (`:5`). It does **not** use `UsageStatsManager` for blocking (only for optional daily usage display in `FocusLockModule.kt:60-81`) and does **not** use `SYSTEM_ALERT_WINDOW` (explicitly blocked in `app.json:27` and `app.config.js:79`).

When a foreground window package matches `cachedPackages` from `SharedPreferences("study_sakha_focus_lock")` and `cachedEndsAt > now`, it starts `FocusLockBlockingActivity` (`FocusLockAccessibilityService.kt:61-64`).

### Assessment of Native Behavior
1. **App Blocking Reliability:**
   - **1,500 ms Debounce Gap (`FocusLockAccessibilityService.kt:57`):** `if (lastBlockedPackage == packageId && now - lastBlockedAt < 1500L) return` suppresses re-blocking the same app within 1.5 seconds, allowing brief interaction or rapid task-switching bypasses.
   - **OEM Background Activity Restrictions:** Android 10+ restricts background activity starts; while `AccessibilityService` is generally exempted in AOSP, Chinese OEMs (Xiaomi MIUI/HyperOS, Oppo ColorOS, Vivo FuntouchOS) often require an explicit "Display pop-up windows while running in the background" permission, which Study Sakha neither checks nor requests.
2. **Restart, Process Death & Reboot:**
   - **Process Death / App Restart:** Session JSON persists in `SharedPreferences("study_sakha_focus_lock")` (`FocusLockModule.kt:291`), and `FocusLockAccessibilityService` reads directly from `SharedPreferences` (`FocusLockAccessibilityService.kt:20-21`), so blocking continues even if the RN app is swiped away.
   - **Device Reboot:** `FocusLockBootReceiver.kt` listens to `BOOT_COMPLETED` and `MY_PACKAGE_REPLACED` and reschedules `FocusLockAlarm` if `endsAt > System.currentTimeMillis()`.
   - **Force Stop:** Android OS stops all services, receivers, and alarms on Force Stop until the user manually re-opens the app.
3. **Alarms & Exact Alarm Handling (`FocusLockAlarm.kt`):**
   - `withFocusLock.js` does **not** declare `SCHEDULE_EXACT_ALARM` (it only exists in the manifest because `plugins/withAlarmEngine.js:81` adds it).
   - `FocusLockAlarm.schedule()` (`:17-21`) does not check `AlarmManager.canScheduleExactAlarms()` on Android 12+ (API 31+) and silently falls back to inexact `setAndAllowWhileIdle()`.
   - Uses a single fixed request code `91` (`:31`), preventing duplicate alarms, and validates `sessionId` in `Receiver.onReceive` (`:54`).
4. **Native-to-JS Synchronization:**
   - `FocusLockModule.emit()` checks `reactContext.hasActiveReactInstance()` (`:323`). If the app is dead when `FocusLockAlarm.Receiver` fires, `onSessionExpired` is dropped and **no pending-completion record is persisted**, causing silent data loss.
5. **Bridge Performance Bug (`FocusLockModule.kt:46, 250-264`):**
   - `getInstalledApps()` encodes a 96x96 PNG Base64 icon for every installed app, even though `FocusLockScreen.tsx:2076-2087` discards `iconBase64` completely.

---

## 5. Permission & Android Protection Readiness Audit

`FocusLockScreen.tsx:376-387` defines 8 permissions, and `readinessPct` (`:2319`) divides `grantedPermsCount / 8`:

| Permission | Why Required | Detected? | Request Flow | Revocation Detected? | Current UI Status |
|---|---|---|---|---|---|
| **Usage Access** (`PACKAGE_USAGE_STATS`) | Reads daily app foreground minutes (`FocusLockModule.kt:60-81`). | **Yes** (`AppOpsManager`, `:245-246`) | Opens `ACTION_USAGE_ACCESS_SETTINGS` (`:107`) | Yes (on `AppState` active, `:2109`) | Accurate |
| **Accessibility Service** (`BIND_ACCESSIBILITY_SERVICE`) | Core foreground package detection (`FocusLockAccessibilityService.kt`). | **Yes** (`Settings.Secure`, `:239-243`) | Opens `ACTION_ACCESSIBILITY_SETTINGS` (`:105`) | Yes (on `AppState` active, `:2109`) | Accurate |
| **Display Over Other Apps** | N/A (`SYSTEM_ALERT_WINDOW` is intentionally blocked in `app.json:27`). | **No** | Error toast (`:2280`) | No | Hardcoded `Needs Attention` |
| **Notification Permission** (`POST_NOTIFICATIONS`) | Focus session alerts & persistent timer. | **No** (not checked here) | Error toast (`:2280`) | No | Hardcoded `Needs Attention` |
| **Do Not Disturb Access** | Auto-DND during Deep Focus. | **No** | Error toast (`:2280`) | No | Hardcoded `Needs Attention` |
| **Background Execution** | OEM autostart / background reliability. | **No** | Error toast (`:2280`) | No | Hardcoded `Needs Attention` |
| **Battery Optimization** | Prevents Doze/OEM from killing service. | **No** | Error toast (`:2280`) | No | Hardcoded `Needs Attention` |
| **Installed App Visibility** | Launcher `<queries>` in `withFocusLock.js:95-109`. | **No** (always granted at manifest level) | Error toast (`:2280`) | No | Hardcoded `Needs Attention` |

**Impact:** Even on a properly configured Android device, Android Protection Readiness can **never exceed 25% (2/8)**.

---

## 6. Security, Strict Mode & Bypass Vulnerabilities

1. **Complete Session Bypass in Strict Mode (`screens/FocusLockScreen.tsx:2674-2682`):** During `active_strict` (Level 2 or Level 3), the **"Complete Session"** button remains enabled and calls `focusLockNative.stopBlockingSession(sessionId, false)` immediately, unlocking all apps and awarding Focus Points.
2. **System Clock Manipulation Bypass (`FocusLockAccessibilityService.kt:44-55`, `FocusLockBootReceiver.kt`):** Both files compare `endsAt <= System.currentTimeMillis()`. Unlike `AlarmEngineBootReceiver.kt`, `FocusLockBootReceiver` does not handle `TIME_SET` or `TIMEZONE_CHANGED`. Advancing the device clock past `endsAt` immediately deletes `SESSION_KEY` and disables blocking.
3. **1.5s Debounce Window (`FocusLockAccessibilityService.kt:57`):** Rapidly re-opening a blocked app within 1.5s bypasses `FocusLockBlockingActivity`.
4. **Pause / Break Desync (`screens/FocusLockScreen.tsx:2612-2645`):** Pausing or taking a break leaves native `endsAt` untouched; conversely, a user cannot actually pause native protection.
5. **Accidental Lockout / Broken PIN (`screens/FocusLockScreen.tsx:1743, 1941`):** Enabling `pinProtection` with `pinCode === ''` causes any 4-digit PIN entry to fail.
6. **OS-Level Boundaries (Inherent to Non-Device-Owner Apps):** Without Device Owner / MDM or Device Admin, Android allows users to revoke Accessibility permission in Settings, Force Stop Study Sakha, Clear App Data, or Uninstall Study Sakha. `com.android.settings` is intentionally excluded in `FocusLockModule.kt:248` to avoid Play Store policy violations and user lockouts.

---

## 7. Focus Analytics & Statistics Audit

- **Attributed to Store & History (`screens/FocusLockScreen.tsx:2134-2153`):** Completing or stopping a session dispatches `recordFocusStudy` (updating `studyLog` for `StatisticsScreen` / `StudyPlannerScreen`) and `upsertFocusHistory` + `appendFocusHistory` to `study-sakha-focus-history-v1:user:<id>`.
- **Mixed History Source (`:2047, 2286`):** `FocusLockScreen` reads **all** records from `study-sakha-focus-history-v1:user:<id>` without filtering `subject === 'Focus Lock'`, so Focus Center sessions inflate Focus Lock’s `sessionsCompleted` and `longestSession`.
- **Missing / Placeholder Metrics (`:2299-2309`):** `blockedTime`, `mostDistractingApp`, `mostDistractingTime`, `actualDistractionUsage`, and `estimatedTimeReclaimed` are hardcoded `'Unavailable'`; `unlockAttempts`, `emergencyBreaks`, and `streak` are hardcoded `0`; `heatmapData` is empty; `focusTrend` is a single aggregate point.
- **Completion Modal Mismatch (`:3304`):** Displays `computedDurationMins` (planned minutes) instead of actual elapsed minutes.
- **Background Expiration Loss:** Sessions expiring while the app is closed never call `completeSession()`.

---

## 8. Production Readiness Assessment

| Category | Assessment | Summary |
|---|---|---|
| **UI & Navigation** | **Issues** | Hardware Back exits entire `FocusLock` route (`Shell.tsx:107`); empty Blocking Profiles; stale demo copy. |
| **Core Blocking Engine** | **Issues** | Native `AccessibilityService` exists, but Allowlist mode is inverted (`:2217`), Web/Shorts is UI-only, and 1.5s debounce creates a bypass. |
| **Native Android Integration** | **Issues** | `getInstalledApps()` wastes CPU/memory encoding unused Base64 icons; optimistic JS start ignores native failures. |
| **Background Reliability** | **Issues** | No OEM background-popup guidance; background expiration drops session history/points; `UNVERIFIED` on real devices. |
| **Alarm System** | **Issues** | `FocusLockAlarm` lacks `canScheduleExactAlarms()` check, manifest permission in `withFocusLock.js`, and `TIME_SET` handling. |
| **Permission Management** | **Issues** | Only 2/8 permissions checked; readiness capped at 25%; 6 buttons show error toast. |
| **Strict Mode** | **Issues** | `strictConfig` unpersisted; `Complete Session` bypasses Level 2/3; PIN has no setup UI (`""`). |
| **Session Persistence** | **Issues** | `sessionId`, `isPaused`, `untilTime`, `appStrategy`, `strictConfig` not persisted in `AsyncStorage`; background expiry lost. |
| **Notifications** | **Issues** | Zero real notifications implemented; all 8 toggles in Settings are UI-only. |
| **Analytics** | **Issues** | Mixes Focus Center & Focus Lock history; most KPIs hardcoded `0`/`Unavailable`. |
| **Security & Anti-Bypass** | **Issues** | Clock change unlocks immediately; `Complete Session` bypasses Strict Mode; 1.5s debounce gap. |
| **Battery Optimization** | **Issues** | Not checked or requested anywhere in `FocusLockModule.kt` or `FocusLockScreen.tsx`. |
| **Android Compatibility** | **Issues** | `UNVERIFIED` on Android 12–15 & OEMs (MIUI/OneUI/ColorOS); missing `SCHEDULE_EXACT_ALARM` in `withFocusLock.js`. |

---

## 9. Prioritized Issues List (P0–P3)

### P0 — Critical
1. **Allowlist Mode Blocks Allowed Apps (`screens/FocusLockScreen.tsx:2217, 2708, 2738`):** Selecting Allowlist Mode sends `selectedAppIds` as the blocklist to `startBlockingSession`, blocking study apps and leaving distracting apps open.
2. **Strict Mode Bypass via "Complete Session" (`screens/FocusLockScreen.tsx:2674-2682`):** Users in Level 2/3 Strict Mode can end native blocking immediately and claim Focus Points.
3. **Broken Exit PIN Lockout (`screens/FocusLockScreen.tsx:1743, 1941`):** `strictConfig.pinCode` defaults to `""` with no UI to configure it, causing `pinProtection` to reject any 4-digit PIN.
4. **Silent Session Loss on Background Expiration (`native/focus-lock/.../FocusLockAlarm.kt:56-60`):** Expired sessions when RN is closed are deleted without saving a pending-completion record for `focusHistory` / `studyLog` / `focusPoints`.
5. **Clock-Change Bypass (`native/focus-lock/.../FocusLockAccessibilityService.kt:44-55`, `FocusLockBootReceiver.kt`):** Advancing the device clock past `endsAt` immediately clears `active_session` and disables blocking.

### P1 — High
6. **Until Time & End of Day Hardcoded (`screens/FocusLockScreen.tsx:2129-2130`):** Always schedule 75m and 240m regardless of clock time.
7. **Pause & Smart Break Desync (`screens/FocusLockScreen.tsx:2612-2645`):** JS timer pauses/breaks without updating native `endsAt` or `FocusLockAlarm`.
8. **Optimistic Start Race Condition (`screens/FocusLockScreen.tsx:2229-2235`):** Transitions UI and shows success toast before `startBlockingSession` resolves.
9. **Android Readiness Capped at 25% (`screens/FocusLockScreen.tsx:2312-2319, 2274-2281`):** 6/8 permissions are unimplemented stubs.
10. **`FocusLockAlarm` Missing `canScheduleExactAlarms()` & `withFocusLock.js` Missing `SCHEDULE_EXACT_ALARM` (`FocusLockAlarm.kt:17-21`, `plugins/withFocusLock.js:85-94`).**
11. **1,500 ms Debounce Window (`FocusLockAccessibilityService.kt:57`)** allows brief re-entry into blocked apps.
12. **Android Hardware Back Exits Entire Screen (`components/Shell.tsx:107`):** Sub-screens (`apps`, `modes`, `strict`, `analytics`, `content`, `settings`) do not return to `'home'`.

### P2 — Medium
13. **`strictConfig`, `appStrategy`, `untilTime`, `selectedModeId` Not Persisted (`screens/FocusLockScreen.tsx:2036-2040`).**
14. **Disconnected `SettingsScreen.tsx` Focus Lock Section (`screens/SettingsScreen.tsx:2668-2769, 3976-4045`) & `FocusCenterScreen.tsx:292` (`blockedAppsCount={5}`).**
15. **Empty Blocking Profiles Section (`screens/FocusLockScreen.tsx:348, 2410-2442`).**
16. **UI-Only Features Presented as Active Controls:** Web & Shorts (`:2966-3072`), Notification/DND toggles (`:3111-3135`), Blocking Modes (`:2696-2721`), Next Scheduled Time `"7:00 PM"` (`:2376`).
17. **Analytics Mixes Focus Center & Focus Lock History (`screens/FocusLockScreen.tsx:2286`)** and shows wrong duration in `SessionCompletionModal` (`:3304`).
18. **Unused Base64 App Icon Encoding (`FocusLockModule.kt:46, 250-264`)** causes unnecessary CPU/memory overhead.

### P3 — Low
19. **Stale Prototype Copy (`screens/FocusLockScreen.tsx:2726, 2806`)** still references `"Demo dataset"` and `"mock data"`.
20. **`UsageStats` Launches Hardcoded `0` (`FocusLockModule.kt:74`)** shown as `"0 opens"` in UI (`screens/FocusLockScreen.tsx:1162`).
21. **Dev-Only `showStateLab` Modal Dead Code (`screens/FocusLockScreen.tsx:1901, 3196-3262`).**

---

## 10. Recommended Fixes in Implementation Order

1. **Fix Session Integrity & Bypass Bugs (P0):**
   - Invert `packageIds` in `handleStartFocus` when `appStrategy === 'allow'` (`allApps.filter(a => !selectedAppIds.includes(a.id))`), and persist `appStrategy`.
   - Disable/hide `Complete Session` in Level 2/3 Strict Mode (require timer completion or valid Emergency Access).
   - Add PIN setup/validation UI or remove `pinProtection` until configured; persist `strictConfig`.
   - Persist pending-completion records in `FocusLockAlarm.Receiver` when `onSessionExpired` fires without an active RN instance, and consume them in `refreshNativeState()`.
   - Add `TIME_SET`/`TIMEZONE_CHANGED` handling in `FocusLockBootReceiver` and consider elapsed-realtime (`SystemClock.elapsedRealtime()`) delta tracking alongside wall-clock `endsAt`.
2. **Fix Duration, Pause, Break & Optimistic Start (P1):**
   - Implement real `Until Time` and `End of Day` minute calculations.
   - Make `handleStartFocus` `async` and transition to `active_session` only after `startBlockingSession` resolves.
   - Sync Pause/Break with native `FocusLockModule` (or disable Pause/Break when native blocking is active).
   - Handle Android `BackHandler` inside `FocusLockScreen` to return from sub-screens to `'home'`.
3. **Fix Native Permissions, Exact Alarms & Performance (P1–P2):**
   - Add `SCHEDULE_EXACT_ALARM` + `canScheduleExactAlarms()` check/settings flow to `withFocusLock` / `FocusLockAlarm` / `FocusLockModule`.
   - Implement real native checks & settings intents for `POST_NOTIFICATIONS`, Battery Optimization (`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`), and DND (`NotificationManager.isNotificationPolicyAccessGranted`), and remove unimplemented permission cards (`overlay`, `packages`) or mark them accurately.
   - Remove unused `iconBase64` encoding in `FocusLockModule.getInstalledApps()` (or render icons in `AppSelectionList`).
   - Tighten `FocusLockAccessibilityService` debounce or re-check on `TYPE_WINDOW_STATE_CHANGED`.
4. **Clean Up UI-Only Stubs, Analytics & Disconnected Settings (P2–P3):**
   - Remove or clearly gate UI-only sections (Web & Shorts, unimplemented Blocking Modes, DND/Notification toggles, empty Blocking Profiles).
   - Wire `SettingsScreen.tsx` Focus Lock and `FocusCenterScreen.tsx` `blockedAppsCount` to `readFocusLockSnapshot` / `FocusLockScreen` state.
   - Filter `analyticsData` to Focus Lock records and display actual elapsed seconds in `SessionCompletionModal`.

---

## 11. Verification & Recommended Test Scenarios

### Observed in Current Session
- `pnpm exec jest test/focusLockCleanup.test.tsx test/stabilityFailureScenarios.test.tsx --runInBand`: **2 suites passed, 14 tests passed** (mocked RN environment; `focusLockNative: null` in `focusLockCleanup.test.tsx:70`).

### Missing Tests & Physical-Device Verification Needed
- **Unit/Integration Tests (Jest):**
  - `Until Time` and `End of Day` duration calculation tests (including midnight rollover).
  - `Allowlist Mode` package inversion test verifying distracting apps are passed to `startBlockingSession`.
  - `handleStartFocus` rejection test verifying `sessionState` does not enter `active_session` on native failure.
  - `strictConfig` persistence and PIN validation tests.
  - Background expiration recovery test consuming native completion records into `focusHistory` and `studyLog`.
- **Physical Android Device / Instrumented E2E Tests (Android 12–15, MIUI/OneUI/ColorOS):**
  - Enable Accessibility + Usage Access -> Start session -> Open blocked app -> Verify `FocusLockBlockingActivity` appears immediately and cannot be bypassed via Back, Recents, or rapid re-launch.
  - Swipe Study Sakha from Recents -> Verify blocking continues.
  - Reboot device mid-session -> Verify `FocusLockBootReceiver` reschedules expiration alarm and blocking remains active.
  - Lock screen / Doze Mode -> Verify `FocusLockAlarm` fires on time.
  - Revoke Accessibility mid-session -> Verify `refreshNativeState` detects revocation and updates readiness/status accurately.

---

## 12. P0 Critical Implementation Report (Updated 2026-11-27)

All **five P0 critical issues** identified in Section 9 have been implemented and verified with automated unit/component/template-invariant tests. Scope was strictly limited to P0 fixes; P1, P2, and P3 items remain open.

### 12.1 P0 Issues & Resolutions

1. **Allowlist Mode Inversion (`screens/FocusLockScreen.tsx`, `lib/focusLockNative.ts`, `FocusLockModule.kt`):**
   - Added pure helper `resolveBlockedPackages(apps, selectedAppIds, strategy)` in `screens/FocusLockScreen.tsx`. In `'allow'` mode, unselected/non-allowed apps are sent to `startBlockingSession` while selected apps remain accessible.
   - Persisted `appStrategy` (`'block' | 'allow'`) in `FocusLockStorage` (`AsyncStorage`) and passed `strategy` in `startBlockingSession` so `refreshNativeState()` accurately restores `selectedAppIds` in Allowlist mode after app restart.
2. **Strict Mode Early Completion Bypass (`screens/FocusLockScreen.tsx`):**
   - Added `canCompleteSessionEarly(strictLevel, nowMs, sessionEndMs)` and enforced it in both UI (hiding **Complete Session** when `strictLevel >= 2`) and business logic.
   - Separated `'completed'` from `'interrupted'` in `completeSession(endedAt, status, overrideSession)`: early exits (`End Session`, `Emergency Access`) record `status: 'interrupted'` and **never** award completion Focus Points or show `SessionCompletionModal`.
   - Deduplicated completion credits using `creditedSessionId` and `historyRecords` checks.
3. **Exit PIN Protection (`lib/focusLockPin.ts`, `screens/FocusLockScreen.tsx`):**
   - Removed hardcoded empty `pinCode: ''` from `StrictConfig`; stored the 4-digit Exit PIN securely via `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`, with `AsyncStorage` fallback on web) scoped by `userId`.
   - Added a PIN Setup & Confirmation Modal (strict `/^\d{4}$/` validation), Change/Remove PIN controls (blocked during active Level 2/3 sessions), and persisted `strictConfig` in `FocusLockStorage`.
   - Empty or unconfigured PINs are never treated as active protection (`"PIN protection (Not configured)"`).
   - Updated `EmergencyAccessModal` with SecureStore verification, 5-attempt lockout cooldown (30s), and a 30-second **Forgot PIN Recovery Wait** to prevent permanent lockouts.
4. **Background Session Expiration Data Loss (`FocusLockSessionTiming.kt`, `FocusLockAlarm.kt`, `FocusLockAccessibilityService.kt`, `FocusLockModule.kt`, `FocusLockBootReceiver.kt`, `screens/FocusLockScreen.tsx`):**
   - Added `FocusLockSessionTiming.recordPendingCompletion()` to atomically persist expired session metadata under `pending_completions` in `SharedPreferences` **before** clearing `SESSION_KEY` across `FocusLockAlarm.Receiver`, `FocusLockAccessibilityService`, `FocusLockBootReceiver`, and `FocusLockModule`.
   - Exposed `consumePendingCompletions()` on `StudySakhaFocusLock` and `lib/focusLockNative.ts`.
   - `FocusLockScreen` consumes pending completions on mount, `AppState` `'active'`, and `onSessionExpired`, crediting `studyLog` (`recordFocusStudy`), `focusHistory` (`upsertFocusHistory` + `appendFocusHistory`), and `focusPoints` idempotently.
5. **System Clock Change Bypass (`FocusLockSessionTiming.kt`, `FocusLockAlarm.kt`, `FocusLockBootReceiver.kt`, `FocusLockAccessibilityService.kt`, `FocusLockBlockingActivity.kt`, `FocusLockModule.kt`, `plugins/withFocusLock.js`):**
   - Added monotonic same-boot timing metadata (`durationMs`, `startedElapsedMs`, `endsElapsedMs`, `bootCount` via `Settings.Global.BOOT_COUNT`) using `SystemClock.elapsedRealtime()`.
   - Switched `FocusLockAlarm` to `AlarmManager.ELAPSED_REALTIME_WAKEUP` so wall-clock jumps cannot prematurely fire or expire active sessions.
   - Registered `ACTION_TIME_CHANGED` and `ACTION_TIMEZONE_CHANGED` in `plugins/withFocusLock.js` and `FocusLockBootReceiver.kt`, using `rebaseForBootOrClockChange()` to clamp remaining duration to `[0, durationMs]` across reboots and clock changes.

### 12.2 Modified & Added Files
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockSessionTiming.kt` (new)
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAlarm.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockBootReceiver.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAccessibilityService.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockBlockingActivity.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockModule.kt`
- `plugins/withFocusLock.js`
- `lib/focusLockNative.ts`
- `lib/focusLockPin.ts` (new)
- `screens/FocusLockScreen.tsx`
- `test/focusLockP0Fixes.test.tsx` (new)
- Synced generated Kotlin templates in `android/app/src/main/java/com/anonymous/agonpreview/` for `stabilityFailureScenarios.test.tsx`.

### 12.3 Tests Added & Executed
- Added `test/focusLockP0Fixes.test.tsx` (6 tests covering Allowlist vs Blocklist, Strict Mode early completion prevention, Exit PIN setup/validation/empty-PIN rejection/recovery, idempotent background pending-completion processing, and native Kotlin monotonic-timing/clock-change invariants).
- Executed `pnpm exec jest test/focusLockP0Fixes.test.tsx test/focusLockCleanup.test.tsx test/stabilityFailureScenarios.test.tsx --runInBand`: **3 suites passed, 20 tests passed**.
- Executed `pnpm exec tsc --noEmit`: **0 TypeScript errors** in all Focus Lock source and test files (`screens/FocusLockScreen.tsx`, `lib/focusLockPin.ts`, `lib/focusLockNative.ts`, `test/focusLockP0Fixes.test.tsx`).

### 12.4 Known Limitations & Remaining P0 Issues
- **Physical Device Verification Pending:** Native Android runtime behavior (clock-change intents, `ELAPSED_REALTIME_WAKEUP` under Doze, `BOOT_COUNT` reboot recovery, and `AccessibilityService` enforcement on MIUI/OneUI/ColorOS) is verified by source inspection and mocked/template tests only; physical-device testing on an EAS/development build is still required.
- **OS Boundaries:** Ordinary third-party Android apps cannot prevent Force Stop, Uninstall, Clear Data, or Accessibility revocation in System Settings without Device Owner / MDM privileges.
- **Remaining P0 Issues:** **0** (all 5 P0 issues resolved). P1–P3 issues from Section 9 remain out of scope for this pass.

---

## 13. P1 High-Priority Implementation Report (Updated 2026-11-27)

All **six P1 high-priority issues** from Section 9 have been implemented on top of the P0 fixes. Scope was strictly limited to P1 items; P2 and P3 items remain out of scope.

### 13.1 P1 Issues & Resolutions

1. **Until Time & End of Day Duration (`lib/focusLockDuration.ts`, `screens/FocusLockScreen.tsx`):**
   - Created `lib/focusLockDuration.ts` with `computeDurationSession()`, `computeUntilTimeSession()`, and `computeEndOfDaySession()` using local calendar `Date` arithmetic (`new Date(y, m, d + 1, 0, 0, 0, 0)`), handling midnight rollover and local DST boundaries while rejecting invalid or non-positive durations.
   - Updated `handleStartFocus` in `screens/FocusLockScreen.tsx` to use the exact same computed `endsAt` timestamp across UI state, native `startBlockingSession`, and alarm scheduling.
   - *Note:* The `QuickLockPresets` UI was previously removed from `FocusLockScreen.tsx` in the workspace prior to P1; per scope rules, no UI redesign or removed cards were re-introduced, while the underlying duration engine now supports `mins`, `until`, and `eod` accurately.

2. **Native Pause & Take Break Synchronization (`FocusLockSessionTiming.kt`, `FocusLockModule.kt`, `FocusLockBootReceiver.kt`, `lib/focusLockNative.ts`, `screens/FocusLockScreen.tsx`):**
   - Added `status = "paused"` support to `FocusLockSessionTiming` (`remainingMs`, `isExpired`, `rebaseForBootOrClockChange`), `FocusLockModule` (`pauseBlockingSession`, `resumeBlockingSession`, `getBlockingStatus`, `getActiveSession`, `getRemainingTime`), and `FocusLockBootReceiver` (preserving paused sessions across reboots/clock changes without scheduling an expiration alarm).
   - Updated `FocusLockScreen.tsx` so **Pause / Resume**, **Take Break**, **End Break Early & Resume Focus**, and break `autoResume` synchronize with `pauseBlockingSession` / `resumeBlockingSession` and restore paused state on `refreshNativeState()`.

3. **Android Protection Readiness Calculation (`FocusLockModule.kt`, `lib/focusLockNative.ts`, `screens/FocusLockScreen.tsx`):**
   - Removed unsupported/irrelevant permission stubs (`overlay`, `dnd`, `background`, `packages`) from `PermissionService.getInitialPermissions()` and replaced them with the 5 real Focus Lock Android permissions: `accessibility`, `usage`, `exact_alarm`, `notification`, and `battery`.
   - Added real native checks (`exactAlarmEnabled`, `notificationsEnabled`, `batteryOptimizationIgnored`) and settings openers (`openExactAlarmSettings`, `openNotificationSettings`, `openBatteryOptimizationSettings`) in `FocusLockModule.kt`, calculating `readinessPct` dynamically (`0%–100%`).

4. **Hardware Back Navigation (`components/Shell.tsx`, `screens/FocusLockScreen.tsx`):**
   - Removed `'FocusLock'` from the `useSmartAndroidBack` exclusion in `components/Shell.tsx` and added an optional `onAndroidBack?: () => boolean` prop to `Shell` (single `useFocusEffect` `BackHandler` subscription, avoiding duplicate listeners).
   - Implemented `handleAndroidBack` in `FocusLockScreen.tsx` to dismiss open modals, return from nested sub-screens to `'home'`, prevent accidental exit while a Focus Lock or Break session is active, and allow exiting to the parent route only when idle on `'home'`.

5. **Exact Alarm Permission Handling (`plugins/withFocusLock.js`, `FocusLockAlarm.kt`, `FocusLockModule.kt`, `screens/FocusLockScreen.tsx`):**
   - Explicitly declared `android.permission.SCHEDULE_EXACT_ALARM` in `plugins/withFocusLock.js`.
   - Updated `FocusLockAlarm.schedule()` to check `canScheduleExactAlarms(context)` on Android 12+ (API 31+), fall back safely to `setAndAllowWhileIdle` / `set` without crashing, and catch `SecurityException`.

6. **Accessibility Debounce Logic (`FocusLockAccessibilityService.kt`):**
   - Replaced the 1,500 ms wall-clock per-package debounce with a monotonic `SystemClock.elapsedRealtime()` burst deduplication (`BURST_DEBOUNCE_MS = 350L`).
   - Added immediate reset (`lastBlockedPackage = null`) on `AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED` for non-blocked foreground packages so rapid app switching back to a blocked app is caught immediately.

### 13.2 Modified & Added Files
- `lib/focusLockDuration.ts` (new)
- `lib/focusLockNative.ts`
- `components/Shell.tsx`
- `screens/FocusLockScreen.tsx`
- `plugins/withFocusLock.js`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockSessionTiming.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAlarm.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockBootReceiver.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAccessibilityService.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockModule.kt`
- `test/focusLockP1Fixes.test.tsx` (new)
- `test/stabilityFailureScenarios.test.tsx` (updated boot receiver assertion for `active || paused`)
- Synced Kotlin templates in `android/app/src/main/java/com/anonymous/agonpreview/`.

### 13.3 Verification & Limitations
- **Jest:** `pnpm exec jest test/focusLockP0Fixes.test.tsx test/focusLockP1Fixes.test.tsx test/focusLockCleanup.test.tsx test/stabilityFailureScenarios.test.tsx --runInBand` — **4 suites passed, 25 tests passed** (mocked JS/RN environment + Kotlin template sync checks).
- **TypeScript:** `pnpm exec tsc --noEmit` reported **0 errors** in Focus Lock and `Shell.tsx` files.
- **Physical Device Verification Pending:** Real-device testing on Android 12–15 (exact alarm permission prompt, battery optimization settings, `AccessibilityService` rapid switching, and native pause/resume across process death) remains **UNVERIFIED** without a physical Android device or EAS development build.

---

## 14. P2 Feature Completion Report (Updated 2026-11-27)

All **six P2 feature-completion items** from Section 9 have been implemented on top of the P0 and P1 foundations. Scope was strictly limited to P2; P3 optimization items remain out of scope.

### 14.1 P2 Features Implemented & Connected

1. **Blocking Modes (`screens/FocusLockScreen.tsx`):**
   - `selectedModeId` is now persisted in `FocusLockStorage` and mode switching is blocked during active Level 2/3 Strict sessions.
   - **Connected Modes:**
     - `quick` (Quick Lock -> Blocklist, Level 1)
     - `strict` (Strict Lock -> Blocklist, Level 2)
     - `allowlist` (Allowlist Mode -> Allowlist, Level 2)
     - `pomodoro` (Pomodoro Blocking -> Blocklist, Level 1, cyclic breaks + auto-resume enabled)
     - `deep` (Deep Focus -> Blocklist, Level 3 Extreme confirmation, enables DND integration when DND access is granted)
     - `scheduled` (Scheduled Blocking -> Planner-linked display of next Study Planner session; manual start required)
     - `emergency` (Emergency Focus -> Instant 45m Level 2 sprint)
   - **Honestly Disabled Mode:** `custom` (**Custom Blocking**) is marked `supported: false` because per-app daily usage quotas and launch-limit rules are not supported by the current `AccessibilityService` architecture.

2. **Blocking Profiles (`lib/focusLockP2Helpers.ts`, `screens/FocusLockScreen.tsx`):**
   - Implemented `buildPredefinedProfiles()` matching real installed Android packages (`Social Media Shield`, `Video & Streaming Detox`, `Gaming Lockout`, `Complete Distraction Shield`) with zero hardcoded demo apps.
   - Added full custom profile CRUD (`+ Save Profile`, `Rename`, `Duplicate`, `Delete`), persisted in `FocusLockStorage` (`customProfiles`, `activeProfileId`).
   - Empty profiles or profiles with zero installed apps are rejected with a toast; profile switching/editing is locked during active Strict sessions when `lockProfileEdit` is enabled.

3. **Web & Shorts Blocking (`lib/focusLockP2Helpers.ts`, `screens/FocusLockScreen.tsx`):**
   - Connected `contentRules.websiteBlocking` to `resolveEffectiveBlockedPackages()`, shielding detected installed Android browser packages (`com.android.chrome`, `com.brave.browser`, `com.sec.android.app.sbrowser`, `org.mozilla.firefox`, etc.) at the **application level** during Blocklist sessions.
   - Clearly labeled `ytShorts`, `igReels`, `igStories`, `snapSpotlight`, `adultFilter`, `customUrls`, and `keywords` as **Unsupported** in the current build (requires `canRetrieveWindowContent="true"` or a local VPN/DNS service).

4. **Notification & DND Controls (`plugins/withFocusLock.js`, `FocusLockModule.kt`, `FocusLockBootReceiver.kt`, `lib/focusLockNative.ts`, `screens/FocusLockScreen.tsx`):**
   - Declared `android.permission.ACCESS_NOTIFICATION_POLICY` in `plugins/withFocusLock.js`.
   - Implemented `dndAccessEnabled`, `openDndSettings()`, and `setDndEnabled(enabled)` in `FocusLockModule.kt`, saving and restoring the user's previous `currentInterruptionFilter` when sessions start/pause/stop.
   - Connected `sessionStartNotif` and `sessionCompleteNotif` to `expo-notifications` local alerts, and synced `restartRecovery` to `FocusLockBootReceiver` via `setRestartRecoveryEnabled()`.
   - Added `dnd` (**Do Not Disturb Access**) to `PermissionService` (6 real native permissions total).
   - Clearly distinguished OS-managed DND policy toggles (`allowSelectedCalls`, `allowEmergencyContacts`, `suppressNotifications`) from app-level controls.

5. **Focus Lock Schedule Display (`lib/focusLockP2Helpers.ts`, `screens/FocusLockScreen.tsx`):**
   - Replaced the hardcoded `"7:00 PM"` schedule string with `getNextFocusScheduleLabel(state.plannerScheduleItems ?? [])`, reading real Study Planner schedule items and displaying `"No schedule set"` when none exist.

6. **Focus Lock Settings Integration (`screens/SettingsScreen.tsx`, `lib/focusLockSnapshot.ts`):**
   - Synchronized `SettingsScreen.tsx` with `readFocusLockSnapshot()` and `focusLockNative.getBlockingStatus()` (`blockedApps`, `defaultBlockDuration`, `emergencyUnlockMode`, `simBatteryUnrestricted`).
   - Replaced the disconnected `blocked_apps` sub-detail route in `SettingsScreen` (`case 'focuslock'`) with direct navigation to `'FocusLock'`.

### 14.2 Partially Supported & Remaining Limitations
- **Scheduled Blocking Auto-Start:** Displays next Study Planner schedule time, but does not auto-launch Focus Lock in the background without user initiation.
- **In-App Shorts / URL / Keyword Filtering:** Not enforceable without `canRetrieveWindowContent="true"` or a local Android `VpnService`; only app-level browser blocking is active.
- **Custom Blocking (Quotas / Launch Limits):** Disabled (`supported: false`).
- **Physical Device Verification:** All native Android behaviors (DND filter save/restore, local notifications, `AccessibilityService`, `FocusLockAlarm`) remain **UNVERIFIED** on physical hardware.

### 14.3 Tests & Checks
- `pnpm exec jest test/focusLockP0Fixes.test.tsx test/focusLockP1Fixes.test.tsx test/focusLockP2Fixes.test.tsx test/focusLockCleanup.test.tsx test/stabilityFailureScenarios.test.tsx --runInBand`: **5 suites passed, 30 tests passed**.
- `pnpm exec tsc --noEmit`: **0 TypeScript errors** in Focus Lock, `Shell.tsx`, and `SettingsScreen.tsx`.

---

## 15. P3 Production Hardening Report (Updated 2026-11-27)

All justified **P3 production-hardening improvements** have been implemented on top of the P0, P1, and P2 layers without redesigning the Focus Lock architecture or modifying `StudySakhaAlarmEngine`.

### 15.1 P3 Hardening Changes

1. **Storage & Battery Efficiency (`screens/FocusLockScreen.tsx`):**
   - Removed `remainingSecs` from the `FocusLockStorage` persistence `useEffect` dependency array. Previously, `AsyncStorage.setItem` and `JSON.stringify` ran every 1 second during an active focus session; now persistence only runs when configuration or session lifecycle state changes.

2. **Memory Leak & Listener Churn Prevention (`screens/FocusLockScreen.tsx`, `FocusLockAccessibilityService.kt`, `FocusLockBlockingActivity.kt`):**
   - Added `historyRecordsRef` so `completeSession` does not recreate on every `historyRecords` update, preventing repeated unsubscribe/resubscribe churn on `subscribeFocusLockEvent`.
   - Guarded `appendFocusHistory` state updates with `mountedRef.current`.
   - Registered and unregistered `SharedPreferences.OnSharedPreferenceChangeListener` in `FocusLockAccessibilityService.onServiceConnected()` / `onDestroy()`, and cleared cached session objects on destroy.
   - Registered and unregistered `OnBackInvokedCallback` on Android 13+ (`Build.VERSION_CODES.TIRAMISU`) in `FocusLockBlockingActivity` for predictive-back compatibility.

3. **AccessibilityService & Installed App List Performance (`FocusLockAccessibilityService.kt`, `FocusLockModule.kt`):**
   - Eliminated `SharedPreferences.getString` and `JSONObject` parsing from `onAccessibilityEvent()`'s hot path by updating `cachedSession` / `cachedPackages` (`HashSet<String>`) only when `OnSharedPreferenceChangeListener` fires.
   - Wrapped `startActivity(intent)` in `runCatching` so OEM background-popup restrictions cannot crash the `AccessibilityService`.
   - Removed unused synchronous 96x96 PNG Base64 icon rendering (`iconAsBase64`) from `FocusLockModule.getInstalledApps()`, eliminating unnecessary `Bitmap` allocations and bridge payload overhead.

4. **Crash-Safe Pending Completions & Diagnostics (`FocusLockModule.kt`, `FocusLockAlarm.kt`, `FocusLockBootReceiver.kt`, `lib/focusLockNative.ts`, `screens/FocusLockScreen.tsx`):**
   - Added `peekPendingCompletions()` and `acknowledgePendingCompletions(sessionIds)` so pending completion records are only removed from `SharedPreferences` after React Native finishes processing them.
   - Added structured `android.util.Log` diagnostics (`TAG = "StudySakhaFocusLock"`) for service lifecycle, exact/inexact alarm fallbacks, `SecurityException` handling, boot/clock-change rebasing, and corrupted cache recovery without logging PINs or sensitive user data.

### 15.2 Modified & Added Files
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAccessibilityService.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockBlockingActivity.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAlarm.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockBootReceiver.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockModule.kt`
- `lib/focusLockNative.ts`
- `screens/FocusLockScreen.tsx`
- `test/focusLockP3Hardening.test.tsx` (new)
- `test/focusLockP1Fixes.test.tsx` (updated `SecurityException` log assertion)
- Synced Kotlin templates in `android/app/src/main/java/com/anonymous/agonpreview/`.

### 15.3 Verification & Remaining Risks
- **Jest:** `pnpm exec jest test/focusLockP0Fixes.test.tsx test/focusLockP1Fixes.test.tsx test/focusLockP2Fixes.test.tsx test/focusLockP3Hardening.test.tsx test/focusLockCleanup.test.tsx test/stabilityFailureScenarios.test.tsx --runInBand` — **6 suites passed, 33 tests passed**.
- **TypeScript:** `pnpm exec tsc --noEmit` reported **0 errors** across Focus Lock, `Shell.tsx`, and `SettingsScreen.tsx`.
- **Remaining Physical-Device Risks:** On-device testing on Android 10–16 (especially MIUI/HyperOS, ColorOS, and OneUI background-popup / battery restrictions, `OnBackInvokedCallback` on Android 13+, and Doze alarm delivery) remains **UNVERIFIED** without a physical Android device or EAS build.

---

## 16. Real Android App Blocking, Usage Limits & Profiles Cleanup (Updated 2026-11-28)

### 16.1 Root Cause of Existing Blocking Failures
1. **No Per-App Daily Usage Limit Engine:** `FocusLockAccessibilityService` only evaluated active `SESSION_KEY` sessions; `FocusLockModule.getUsageStats()` used `queryAndAggregateUsageStats` (bucketed intervals that miss ongoing foreground time and lack live enforcement).
2. **Allowlist Coverage Gap:** `FocusLockAccessibilityService` only checked `packageIds` (computed from a snapshot of installed apps), so newly installed apps or launchers/IMEs were not handled cleanly.
3. **Rapid Switching & SystemUI/IME Handling:** `BURST_DEBOUNCE_MS = 350L` and `lastBlockedPackage` clearing only on `TYPE_WINDOW_STATE_CHANGED` for non-blocked packages allowed brief bypasses on Recents/Home switching, while IME windows could interfere with foreground tracking.
4. **Generic Blocking Screen & Destructive Emergency Exit:** `FocusLockBlockingActivity` only showed a static owl/title/timer with no app icon, usage metrics, or temporary reminder suspension, and `EmergencyAccessModal` permanently stopped the entire study session (`stopBlockingSession(sessionId, true)`) instead of granting a time-bounded 5-minute pass.
5. **Blocking Profiles UI:** Included `Duplicate` buttons and a `Save Focus Profile` modal instead of direct one-tap save & apply.

### 16.2 Implemented Enforcement Architecture
- **Per-App Daily Usage Limits (`FocusLockUsageLimits.kt`, `lib/focusLockUsageLimits.ts`):**
  - Uses `UsageStatsManager.queryEvents(midnightMs, nowMs)` from local calendar midnight (`00:00:00.000`) to `now` (plus live `elapsedRealtime` delta in `FocusLockAccessibilityService` for the currently foregrounded app) and persists daily totals per `yyyy-MM-dd` local date key.
  - Evaluates configured `app_usage_limits` independently of Focus Lock study sessions and schedules an in-app `Handler` recheck so crossing a limit (e.g., Chrome 5m) triggers `FocusLockBlockingActivity` immediately without requiring an app switch.
- **Native Intervention Screen (`FocusLockBlockingActivity.kt`):**
  - Displays real app icon and label, status badge (`DAILY LIMIT EXCEEDED` or `FOCUS SESSION ACTIVE`), configured limit, actual time spent today, remaining time (`0m` when exceeded), `Close App`, `Return to Study Sakha`, conditional `Open App` (rendered only when access is authorized), `Emergency Access • 5m`, and `Turn Off Reminder Temporarily` (`Rest of the day`, `Till tomorrow`, `7 days`).
  - Handles Android Back (`OnBackInvokedCallback` on API 33+ and `onBackPressed`), `onNewIntent`, `onResume`, and `excludeFromRecents="true"`.
- **Temporary Reminder Suspension (`FocusLockUsageLimits.kt`, `FocusLockModule.kt`, `screens/FocusLockScreen.tsx`):**
  - Suspends enforcement for `rest_of_day` (next local midnight), `till_tomorrow` (+2 midnights), or `7_days` (+7 midnights) without deleting the underlying limit, persisting expiry across restarts and automatically restoring enforcement when expired.
- **Controlled Emergency Access Lifecycle (`FocusLockUsageLimits.kt`, `FocusLockAlarm.kt`, `FocusLockBootReceiver.kt`):**
  - Persists daily emergency use counts (`usedToday` / `maxDailyUses`), grants a 5-minute pass (`300_000ms`), refuses to reset/extend an already-active pass timer, schedules `FOCUS_LOCK_EMERGENCY_EXPIRED` via `AlarmManager` (`requestCode = 92`), rebases on boot/clock/timezone changes, maintains an auditable 50-entry history, and delegates to Study Sakha Exit PIN verification when Strict Mode Level 2/3 + PIN is enabled (`requiresPinForEmergency`).
- **Study Session Blocking & Allowlist Support (`FocusLockAccessibilityService.kt`, `FocusLockModule.kt`):**
  - Passes `allowedPackageIds` in Allowlist mode so any non-critical, non-launcher, non-IME app outside the allowlist is blocked; keeps daily usage limits and study sessions as separate, compatible policies.
- **Blocking Profiles UI Cleanup (`screens/FocusLockScreen.tsx`):**
  - Removed `Duplicate` and the `Save Focus Profile` modal; replaced with a direct `Save Profile` button that validates non-empty selection and immediately saves & applies the configuration.

### 16.3 Modified & Added Files
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockUsageLimits.kt` (new)
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAccessibilityService.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockBlockingActivity.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockModule.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockAlarm.kt`
- `native/focus-lock/android/java/com/anonymous/agonpreview/FocusLockBootReceiver.kt`
- `plugins/withFocusLock.js`
- `lib/focusLockNative.ts`
- `lib/focusLockUsageLimits.ts` (new)
- `screens/FocusLockScreen.tsx`
- `test/focusLockRealBlocking.test.tsx` (new)
- `test/focusLockP1Fixes.test.tsx`, `test/focusLockP2Fixes.test.tsx`

### 16.4 Remaining Android Limitations & Real-Device Testing Status
- **OS Boundaries:** Without Device Owner / MDM, Android allows users to revoke Accessibility permission in Settings, Force Stop the app, or uninstall it. OEMs (Xiaomi MIUI/HyperOS, Oppo ColorOS, Vivo FuntouchOS, Samsung OneUI) may still require user-granted "Display pop-up windows while running in background" and Battery Optimization exemption for reliable background `startActivity`.
- **Real-Device Testing:** **NOT VERIFIED** in this Codespace (no Android SDK / `ANDROID_HOME` or `adb` device). Physical device verification via an EAS APK build is required before claiming production device readiness.
