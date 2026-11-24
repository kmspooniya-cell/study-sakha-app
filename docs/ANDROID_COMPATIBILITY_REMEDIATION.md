# Android Compatibility Remediation

**Date:** 2026-11-24  
**Scope:** Phase 2 remediation following [the compatibility audit](../WEB_ANDROID_COMPATIBILITY_AUDIT.md)  
**Device status:** No Android device or emulator was available. No device behavior is marked tested.

## 1. Issues fixed

### Production environment selection

`eas.json` now maps build profiles to named EAS environments:

- `preview` and `arm64-apk` use the `preview` environment.
- `production` uses the `production` environment.

The build configuration does not contain secret values. The following values must be created in EAS environment storage:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

Only the Supabase URL, publishable key, and public HTTPS API origin belong in the client build. Gemini credentials and service-role keys remain server-side.

### Sakha AI URL and network handling

`lib/geminiChat.ts` now:

- rejects configured API URLs that are relative, non-HTTPS, malformed, or contain credentials;
- preserves the existing relative `/api/*` fallback for Web Preview;
- applies a 15-second timeout to health and chat requests;
- reports timeout and network transport failures with actionable messages;
- still passes the existing Supabase bearer token to the existing `/api/chat` backend.

The backend architecture was not replaced and no Gemini key was moved into the client.

### Runtime blank-screen protection

`index.ts` now wraps the dynamically loaded application in an error boundary. Render exceptions produce a visible recovery message and are logged with the React component stack. The existing initialization catch remains in place for Skia/import failures.

This boundary is diagnostic protection. It does not swallow the exception or claim that the underlying screen recovered.

### Existing timer recovery review

The focus timer already persists active state to AsyncStorage, derives elapsed time from timestamps, restores state on mount, refreshes on `AppState` activation, and clears its intervals during cleanup. The test player uses the same deadline based approach. No timer rewrite was made because the current lifecycle already prevents overlapping intervals through effect cleanup and timestamp-based recovery.

This remains JS timer recovery. It is not a durable Android background execution service.

### Focus Lock scope

No Accessibility Service, overlay permission flow, installed-app enumeration, or app-blocking foreground service was added. The existing UI continues to state that Focus Lock is a timer only.

## 2. Files modified

| File | Change |
|---|---|
| `eas.json` | Added explicit `environment` selection to all Android profiles |
| `lib/geminiChat.ts` | Added HTTPS URL validation, timeout handling, and transport error messages |
| `lib/apiConfig.ts` | Added pure API URL validation helper for runtime and regression testing |
| `lib/notifications.ts` | Added Android channel, permission, scheduled planner reminder and tap handling |
| `app.json` | Registered the Expo notifications config plugin |
| `index.ts` | Added a visible React error boundary around the loaded application |
| `test/geminiChat.test.tsx` | Added URL validation regression tests |
| `docs/ANDROID_COMPATIBILITY_REMEDIATION.md` | Added this remediation report |

The earlier deep-link fix remains in `App.tsx`: the `studysakha://` scheme is included in React Navigation prefixes.

## 3. Dependencies added or changed

The following SDK-compatible dependency was added:

```bash
expo-notifications@~57.0.25
```

No other dependency was upgraded.

## 4. Android-specific implementation details

### AI

Native builds require an absolute HTTPS API origin. Web Preview still uses the current origin when no API URL is configured, preserving the existing preview server behavior.

Example EAS setup:

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value 'https://<project>.supabase.co' --environment preview --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value '<publishable-key>' --environment preview --visibility sensitive
npx eas-cli@latest env:create --name EXPO_PUBLIC_API_BASE_URL --value 'https://<backend-origin>' --environment preview --visibility plaintext

npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value 'https://<project>.supabase.co' --environment production --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value '<publishable-key>' --environment production --visibility sensitive
npx eas-cli@latest env:create --name EXPO_PUBLIC_API_BASE_URL --value 'https://<backend-origin>' --environment production --visibility plaintext
```

The backend health endpoint is expected at `/api/health` and chat at `/api/chat`. They could not be checked remotely because no deployed API URL is configured in this checkout.

### Notifications

`expo-notifications@~57.0.25` is installed and registered as an Expo config plugin. `lib/notifications.ts` creates the Android `study-reminders` channel, requests native permission, preserves the existing in-app inbox, cancels and reschedules one reminder for the next incomplete planner item with a date and time, presents foreground notifications, and routes notification taps to the existing Notifications screen.

`app.json` also declares `android.permission.POST_NOTIFICATIONS`; regenerating the native project produced that permission in the Android manifest. The runtime channel is still created by `lib/notifications.ts` because channels are not represented by a static manifest entry.

This is local notification support only. No push token registration or backend delivery was added, so push notifications are not claimed.

### PDF reader

No embedded reader dependency was added. External opening through signed Supabase URLs and native download/share behavior remain intact. This avoids replacing a working fallback without a verified Expo 57-compatible viewer.

### Focus timer

The current implementation persists timestamps and reloads active sessions from AsyncStorage. `AppState` activation recalculates elapsed time, so foreground recovery does not depend on interval ticks that occurred while the process was inactive.

## 5. Web regression results

- Web-specific API fallback remains unchanged: Web Preview may use relative `/api/*` requests.
- No browser-only API was introduced into native paths.
- The changed AI URL validator only applies when an API base URL is explicitly configured.
- The new error boundary uses React Native `View` and `Text`, so it is compatible with Web.

Automated Web export did not produce a completion result in this environment; the Expo command started Metro and remained running until stopped. This is recorded as unverified, not passed.

## 6. Build validation results

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed with network escalation; the sandbox-only attempt was blocked by a read-only pnpm store |
| `pnpm add expo-notifications@~57.0.25` | Passed with network escalation; lockfile and package manifest updated |
| Expo SDK 57 package compatibility lookup | Local `node_modules/expo/bundledNativeModules.json` reports `expo-notifications: ~57.0.25` |
| TypeScript | Passed: `tsc --noEmit` |
| Focused ESLint | Passed for changed files with `--max-warnings=0` |
| Full ESLint | Failed with 245 errors and 252 warnings, primarily in bundled `.agents` skill assets and pre-existing application files; changed files pass focused lint |
| Focused regression test | Passed: 4 tests in `test/geminiChat.test.tsx` |
| Changed-file Problems check | No errors found |
| Notification integration Problems check | No errors found in changed files |
| Existing tests | Full Jest run reached tests but `focusSessionSetup.test.tsx` exceeded its 5-second test timeout; other suites shown in output passed before the run stopped |
| Web production export | Not completed; Metro started but produced no completion output before the bounded command ended |
| Android Gradle release validation | Reached Expo/Gradle configuration but failed because this environment has no Android SDK or `ANDROID_HOME`; no APK was produced |
| Android device/emulator test | Not available |

## 7. Remaining device-testing requirements

After installing a preview APK on Android 13+, verify:

1. Cold start, Supabase session restoration, token refresh and sign-out.
2. `GET /api/health` and authenticated `/api/chat` from the installed APK.
3. AI timeout behavior with airplane mode and a slow endpoint.
4. Deep link handling for `studysakha://...`.
5. Timer behavior after backgrounding, screen lock, process recreation and device restart.
6. Audio interruption and return to the focus screen.
7. External PDF opening, signed URL expiry, offline download and sharing.
8. Group realtime reconnect after background/foreground transitions.
9. Profile photo permissions on Android 13+.
10. Notification behavior only after `expo-notifications` is installed and implemented.

## Build commands after environment setup

```bash
pnpm install --frozen-lockfile
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform android --profile production
```

No device testing is complete until an emulator or physical Android device produces observed results for the checklist above.
