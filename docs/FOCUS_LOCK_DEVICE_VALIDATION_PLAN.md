# Study Sakha — Focus Lock Real Android Device Validation Plan

**Date:** 2026-11-28  
**Target Build:** Android Development / Preview APK (`com.anonymous.agonpreview`)  
**Environment Status in Codespace:** No Android SDK (`ANDROID_HOME`) or `adb` device available. All physical-device scenarios below are **`NOT TESTED`** until executed on real Android hardware.

---

## 1. Android Manifest & Expo Prebuild Inspection (Host-Verified)

Inspected generated files from `EXPO_NO_TELEMETRY=1 pnpm exec expo prebuild --no-install --platform android`:

- **Manifest ([AndroidManifest.xml](file:///workspaces/study-sakha-app/android/app/src/main/AndroidManifest.xml)):**
  - **Permissions:**
    - `android.permission.PACKAGE_USAGE_STATS` (`tools:ignore="ProtectedPermissions"`) — present (line 9)
    - `android.permission.RECEIVE_BOOT_COMPLETED` — present (line 13)
    - `android.permission.SCHEDULE_EXACT_ALARM` — present (line 15)
    - `android.permission.ACCESS_NOTIFICATION_POLICY` — present (line 2)
    - `android.permission.POST_NOTIFICATIONS` — present (line 10)
    - `android.permission.SYSTEM_ALERT_WINDOW` (`tools:node="remove"`) — blocked as required (line 16)
    - `android:allowBackup="false"` — enforced (line 35)
    - `<queries>` includes `android.intent.action.MAIN` + `android.intent.category.LAUNCHER` (lines 30–33)
  - **Components:**
    - `.FocusLockAccessibilityService` (`BIND_ACCESSIBILITY_SERVICE`, `@xml/focus_lock_service`) — present (lines 47–52)
    - `.FocusLockBlockingActivity` (`exported="false"`, `excludeFromRecents="true"`, `launchMode="singleTop"`) — present (line 65)
    - `.FocusLockAlarm$Receiver` (`exported="false"`) — present (line 78)
    - `.FocusLockBootReceiver` (`exported="true"`, actions: `BOOT_COMPLETED`, `MY_PACKAGE_REPLACED`, `TIME_SET`, `TIMEZONE_CHANGED`) — present (lines 79–86)
    - `.MainActivity` (`studysakha://` scheme) — present (lines 53–64)
- **Generated Kotlin & XML Sources (`android/app/src/main/`):**
  - `FocusLockAccessibilityService.kt`, `FocusLockAlarm.kt`, `FocusLockBlockingActivity.kt`, `FocusLockBootReceiver.kt`, `FocusLockModule.kt`, `FocusLockPackage.kt`, `FocusLockSessionTiming.kt`, `FocusLockUsageLimits.kt`
  - `res/xml/focus_lock_service.xml`
  - `MainApplication.kt` line 24: `add(FocusLockPackage())`

---

## 2. APK Build & Device Setup Instructions

### 2.1 Build Preview APK via EAS Cloud
Ensure `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `EXPO_PUBLIC_API_BASE_URL` (HTTPS) are configured in EAS environment variables, then run:

```bash
# Fast single-ABI APK for physical ARM64 Android devices:
npx eas-cli@latest build --platform android --profile arm64-apk

# Or universal APK (armeabi-v7a, arm64-v8a, x86, x86_64):
npx eas-cli@latest build --platform android --profile preview
```

### 2.2 Install & Capture Native Logs
```bash
adb install -r study-sakha-preview.apk
adb logcat -c
adb logcat -v time StudySakhaFocusLock:V ActivityTaskManager:I AlarmManager:I AndroidRuntime:E *:S
```

### 2.3 Device Prerequisites Before Testing
1. Open **Study Sakha → Focus Lock → Android Protection Readiness**.
2. Grant **Accessibility Service** (`Study Sakha`), **Usage Access**, **Exact Alarms**, **Notifications**, and **Ignore Battery Optimization**.
3. On Xiaomi/MIUI/HyperOS, Oppo/ColorOS, or Vivo/FuntouchOS, also enable **Display pop-up windows while running in the background** and **Autostart** in system App Info.

---

## 3. Prioritized Real-Device Validation Scenarios

### Scenario 1: Real Chrome Daily Usage Limit Enforcement
- **Setup Steps:**
  1. Open Focus Lock → **App Selection**.
  2. Locate **Chrome** (`com.android.chrome`), tap **Set Daily Limit** until it reads **Daily Limit: 5m**.
  3. Open Chrome and browse normally for 5 minutes (verify actual foreground usage increments in Focus Lock).
- **Expected Behavior:**
  - `FocusLockUsageLimits.queryTodayUsageMs()` tracks real `UsageStatsManager.queryEvents` foreground time from local midnight.
  - Once Chrome reaches 5 minutes (`300,000 ms`), `FocusLockBlockingActivity` launches immediately showing Chrome's icon, `Chrome`, `DAILY LIMIT EXCEEDED`, `Configured Daily Limit: 5m`, `Time Spent Today` (`>= 5m`), and `Remaining Today: 0m`.
  - `Open Chrome` button is **not** shown; tapping `Close App` returns to Home.
- **Actual Observed Behavior:** Not executed (no physical device / `adb`).
- **Status:** `NOT TESTED`
- **Relevant Native Logs:**
  - `adb logcat -v time StudySakhaFocusLock:V *:S`
  - Look for `Blocking overlay launch` / no `Blocking overlay launch failed`.
  - Verify `SharedPreferences` via `adb shell run-as com.anonymous.agonpreview cat shared_prefs/study_sakha_focus_lock.xml`.

---

### Scenario 2: Immediate Native Intervention Without App Switching
- **Setup Steps:**
  1. Set Chrome's daily limit to **5m** (or 15m when current usage is ~14m).
  2. Open Chrome and **stay continuously inside Chrome** without pressing Home, Recents, or switching apps until the limit is crossed.
- **Expected Behavior:**
  - `FocusLockAccessibilityService.limitCheckRunnable` (`Handler(Looper.getMainLooper())`) re-evaluates `currentForegroundPackage` every `1–15s` and launches `FocusLockBlockingActivity` within seconds of crossing the limit—even with zero `AccessibilityEvent` window transitions.
- **Actual Observed Behavior:** Not executed (no physical device / `adb`).
- **Status:** `NOT TESTED`
- **Relevant Native Logs:**
  - `StudySakhaFocusLock` + `ActivityTaskManager` (`START u0 {cmp=com.anonymous.agonpreview/.FocusLockBlockingActivity}`).

---

### Scenario 3: Rest of the Day / Till Tomorrow / 7 Days Suspension
- **Setup Steps:**
  1. Trigger Chrome's daily limit intervention screen (or open Focus Lock → App Selection → Chrome → **Turn Off Reminder**).
  2. Select **Rest of the day**, verify Chrome opens and is usable; repeat on a second limited app with **Till tomorrow** and a third with **7 days**.
  3. Verify Focus Lock UI shows the active suspension badge (`Paused for rest of the day`, etc.) and preserves the configured `Daily Limit` value.
  4. Advance device date past midnight (or wait past midnight) and test opening the app again.
- **Expected Behavior:**
  - While `now < suspendedUntilMs`, `isReminderSuspended()` returns `true` and the app opens without intervention.
  - Configured `app_usage_limits` entry is **not** deleted.
  - After crossing the expiry boundary (next local midnight for `rest_of_day`, +2 midnights for `till_tomorrow`, +7 midnights for `7_days`), enforcement automatically resumes.
- **Actual Observed Behavior:** Not executed (no physical device / `adb`).
- **Status:** `NOT TESTED`
- **Relevant Native Logs:**
  - `StudySakhaFocusLock` + `dumpsys alarm` / inspect `app_reminder_suspensions` in `study_sakha_focus_lock.xml`.

---

### Scenario 4: Emergency Access 5-Minute Lifecycle
- **Setup Steps:**
  1. Trigger `FocusLockBlockingActivity` (either via daily limit or active Focus Lock session).
  2. Tap **Emergency Access • 5m (3 left today)**.
  3. Use the target app for 5 minutes; after 2 minutes, return to Focus Lock and attempt to request Emergency Access again.
  4. Wait for the full 5 minutes to elapse while still inside the target app.
- **Expected Behavior:**
  - First request grants a 5-minute pass, decrements remaining uses (`2 left today`), logs an entry in `emergency_access_state.history`, and opens the app.
  - Requesting again while the pass is active returns `reusedExisting: true` and **does not** reset or extend the 5-minute timer.
  - At 5 minutes, `FocusLockAlarm.Receiver` (`FOCUS_LOCK_EMERGENCY_EXPIRED`) fires, calls `recheckForegroundOnEmergencyExpiry()`, and immediately re-launches `FocusLockBlockingActivity`.
- **Actual Observed Behavior:** Not executed (no physical device / `adb`).
- **Status:** `NOT TESTED`
- **Relevant Native Logs:**
  - `adb logcat -v time StudySakhaFocusLock:V AlarmManager:V *:S`
  - `adb shell dumpsys alarm | grep -A 5 FOCUS_LOCK_EMERGENCY_EXPIRED`

---

### Scenario 5: Emergency Timer Persistence & Reboot Recovery
- **Setup Steps:**
  1. Grant a 5-minute Emergency Pass (~1 minute elapsed, ~4 minutes remaining).
  2. Force-swipe Study Sakha from Recents, then **reboot the Android device**.
  3. Unlock the device and open the restricted app ~2 minutes after reboot, then wait past the original 5-minute mark.
- **Expected Behavior:**
  - `FocusLockBootReceiver` receives `BOOT_COMPLETED`, calls `FocusLockUsageLimits.rebaseEmergencyPassOnBootOrClockChange()`, and reschedules `FocusLockAlarm.scheduleEmergencyExpiry()` for the remaining duration.
  - Once the remaining time expires, blocking is automatically restored; advancing system clock (`TIME_SET` / `TIMEZONE_CHANGED`) does not bypass the remaining monotonic duration.
- **Actual Observed Behavior:** Not executed (no physical device / `adb`).
- **Status:** `NOT TESTED`
- **Relevant Native Logs:**
  - `adb logcat -v time StudySakhaFocusLock:V *:S` after reboot.

---

### Scenario 6: Allowlist and Blocklist Enforcement
- **Setup Steps:**
  1. **Blocklist:** Select Instagram & YouTube in `Block Selected` mode; start a session via `Blocking Modes` → `Emergency Focus`. Attempt to open Instagram (blocked), then WhatsApp (allowed).
  2. **Allowlist:** Switch to `Allow Only Selected`, select only AnkiDroid (or Study Sakha + 1 study app), start a session. Attempt to open AnkiDroid (allowed), then Chrome and a newly installed app (both blocked).
- **Expected Behavior:**
  - Blocklist blocks only selected packages; Allowlist passes `allowedPackageIds` natively so any non-critical, non-launcher, non-IME app not in `allowedPackageIds` is blocked.
- **Actual Observed Behavior:** Not executed (no physical device / `adb`).
- **Status:** `NOT TESTED`
- **Relevant Native Logs:**
  - `StudySakhaFocusLock` + `ActivityTaskManager`.

---

### Scenario 7: Focus Session Blocking (Coexistence with Daily Limits)
- **Setup Steps:**
  1. Configure a 30m daily limit on YouTube (currently 5m used, so 25m left).
  2. Start an active Focus Lock study session blocking YouTube.
  3. Open YouTube during the session, then complete/end the session and open YouTube again.
- **Expected Behavior:**
  - During the study session, YouTube is blocked with `FOCUS SESSION ACTIVE`.
  - After the study session ends, YouTube's independent daily limit (`25m` remaining) still tracks and enforces when 30m is reached.
- **Actual Observed Behavior:** Not executed (no physical device / `adb`).
- **Status:** `NOT TESTED`
- **Relevant Native Logs:**
  - `StudySakhaFocusLock` (`reason=session` vs `reason=usage_limit`).

---

### Scenario 8: Home, Recents & Rapid App Switching
- **Setup Steps:**
  1. While a restricted app is blocked, trigger `FocusLockBlockingActivity`.
  2. Test: (a) Hardware/Gesture **Back**, (b) **Home** button then immediately tap restricted app icon, (c) **Recents** overview then tap restricted app card, (d) Rapidly alternate between Home/Recents and restricted app 10 times in 5 seconds.
- **Expected Behavior:**
  - Back on `FocusLockBlockingActivity` calls `render()` and stays on the intervention screen.
  - Home/SystemUI clears `lastBlockedPackage` so re-opening via launcher or Recents immediately re-launches `FocusLockBlockingActivity` (`BURST_DEBOUNCE_MS = 150L`).
  - `FocusLockBlockingActivity` (`excludeFromRecents="true"`) does not clutter Recents.
- **Actual Observed Behavior:** Not executed (no physical device / `adb`).
- **Status:** `NOT TESTED`
- **Relevant Native Logs:**
  - `ActivityTaskManager` + `StudySakhaFocusLock`.

---

### Scenario 9: Background Execution & Device Restart
- **Setup Steps:**
  1. Start a 30-minute Focus Lock session.
  2. Lock the screen for 2 minutes, unlock, and test opening a blocked app.
  3. Swipe Study Sakha away from Recents, test opening a blocked app.
  4. Reboot the device with Restart Recovery enabled, wait 15s after unlock, and test opening a blocked app.
- **Expected Behavior:**
  - Blocking continues while screen-locked and after Study Sakha UI process is swiped away (`AccessibilityService` runs in its own system-bound service process reading `SharedPreferences`).
  - After reboot, `FocusLockBootReceiver` rebases the active session and reschedules `FocusLockAlarm`.
- **Actual Observed Behavior:** Not executed (no physical device / `adb`).
- **Status:** `NOT TESTED`
- **Relevant Native Logs:**
  - `StudySakhaFocusLock: Rebased active session on android.intent.action.BOOT_COMPLETED`.

---

### Scenario 10: Strict Mode and PIN Protection
- **Setup Steps:**
  1. Open Focus Lock → **Strict Mode** → select **Level 2 (Strong)**, enable **PIN protection**, and configure a 4-digit Exit PIN.
  2. Start a Focus Lock session and open a blocked app to trigger `FocusLockBlockingActivity`.
  3. Tap **Emergency Access (PIN Required • X left)** on the native intervention screen.
  4. Enter an incorrect PIN 5 times in `EmergencyAccessModal`, then enter the correct PIN.
- **Expected Behavior:**
  - Native intervention screen does **not** grant Emergency Access directly; it routes via `studysakha://focus-lock?emergencyPkg=...` to Study Sakha for PIN verification.
  - 5 wrong PIN attempts trigger a 30s lockout; correct PIN grants the 5-minute Emergency Pass without terminating Strict Mode protection.
- **Actual Observed Behavior:** Not executed (no physical device / `adb`).
- **Status:** `NOT TESTED`
- **Relevant Native Logs:**
  - `ActivityTaskManager` (`studysakha://focus-lock?emergencyPkg=...`) + `StudySakhaFocusLock`.
