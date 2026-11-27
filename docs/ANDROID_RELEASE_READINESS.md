# Android Release Readiness — Study Sakha (2026-11-27)

## Release Verdict: **NO-GO (for immediate store/production publish) / READY FOR EAS PREVIEW APK BUILD & DEVICE QA**

- **Why not GO yet:** No Android SDK (`ANDROID_HOME`) or physical Android device/emulator is available in this Codespace container, so Kotlin compilation (`:app:assembleRelease`), APK installation, physical alarm ringing/missions, FocusLock `AccessibilityService` runtime, and live Notification Centre Supabase migration (`202611270002`) remain unverified on device.
- **Why ready for EAS Preview Build:** All P0/P1 static, manifest, plugin, and native lifecycle defects discovered during this audit (`BUG-028` through `BUG-032`) are fixed, `expo prebuild --no-install --platform android` succeeds cleanly, `expo lint` passes (0 errors), `build:web` exports cleanly to `dist/`, and `validate:release -- preview` passes when `EXPO_PUBLIC_API_BASE_URL` is supplied.

---

## Android Configuration & Manifest Verification

- **Package ID:** `com.anonymous.agonpreview`
- **URL Scheme:** `studysakha://`
- **Version:** `1.0.0` (`versionCode: 1`)
- **Security Flags:**
  - `android:allowBackup="false"` (verified in `app.json`, `app.config.js`, and generated `AndroidManifest.xml`)
  - `android.permission.SYSTEM_ALERT_WINDOW` blocked (`tools:node="remove"` in generated `AndroidManifest.xml`)
  - `android.permission.RECORD_AUDIO` blocked (`tools:node="remove"`)
  - No `QUERY_ALL_PACKAGES` (uses `<queries>` for `ACTION_MAIN`/`CATEGORY_LAUNCHER`, `https` `BROWSABLE`, and `android.media.action.IMAGE_CAPTURE`)
- **AlarmEngine (`plugins/withAlarmEngine.js`):**
  - Permissions: `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, `USE_FULL_SCREEN_INTENT`, `VIBRATE`, `WAKE_LOCK`, `CAMERA` (fixed `BUG-028`), `ACTIVITY_RECOGNITION`.
  - Components: `.AlarmEngineReceiver` (`exported="false"`), `.AlarmEngineBootReceiver` (`exported="true"`, `BOOT_COMPLETED`, `MY_PACKAGE_REPLACED`, `TIME_SET`, `TIMEZONE_CHANGED`), `.AlarmPlaybackService` (`exported="false"`, `foregroundServiceType="mediaPlayback"`), `FileProvider` (`${applicationId}.alarm.fileprovider`).
  - Gradle: `implementation("com.google.zxing:core:3.5.3")`.
- **FocusLock (`plugins/withFocusLock.js`):**
  - Permissions: `PACKAGE_USAGE_STATS`, `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`, `ACCESS_NOTIFICATION_POLICY`.
  - Components: `.FocusLockAccessibilityService` (`BIND_ACCESSIBILITY_SERVICE`), `.FocusLockBlockingActivity` (`exported="false"`, `excludeFromRecents="true"`, `launchMode="singleTop"`), `.FocusLockAlarm$Receiver` (`exported="false"`), `.FocusLockBootReceiver` (`exported="true"`).

---

## EAS Build & Environment Checklist

| Check | Status | Notes |
|---|---|---|
| `eas.json` profiles (`preview`, `arm64-apk`, `production`, `production-apk`) | **PASS** | `credentialsSource: "remote"`, ProGuard/R8 minify + resource shrink + bundle compression enabled. |
| `.github/workflows/main.yml` | **PASS** | Installs `pnpm@12.16.1`, Node 22, `pnpm install --frozen-lockfile`, runs `eas build --platform android --profile preview --non-interactive --no-wait`. |
| `EXPO_PUBLIC_SUPABASE_URL` & `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **PASS** | Present in `.env`; must also exist in EAS `preview`/`production` envs. |
| `EXPO_PUBLIC_API_BASE_URL` | **BLOCKED (Local `.env`)** | Omitted in checked-in `.env`. `validate:release -- preview` passes when `EXPO_PUBLIC_API_BASE_URL=https://study-sakha-app.onrender.com` is set. Must be verified in EAS `preview`/`production` environment variables. |
| Local Gradle Build | **BLOCKED** | `ANDROID_HOME` unset / no Android SDK in Codespace. |
| Physical Device APK Smoke Test | **NOT VERIFIED** | No `adb` / emulator / physical Android device in Codespace. |
