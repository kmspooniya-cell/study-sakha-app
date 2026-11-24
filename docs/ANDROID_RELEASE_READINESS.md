# Study Sakha Android Release Readiness

**Date:** 2026-11-24  
**Scope:** Phase 3 Android release audit following the [compatibility audit](../WEB_ANDROID_COMPATIBILITY_AUDIT.md) and [remediation report](./ANDROID_COMPATIBILITY_REMEDIATION.md).  
**Expo:** `~57.0.31`  
**React Native:** `0.86.3`  
**Device status:** No Android emulator or physical Android device was available. Runtime device behavior is therefore unverified.

## Release recommendation

**Do not publish the Android release yet.** The source and web export validate, and the generated Android configuration contains the notification permission and Expo notification module. A release APK was not produced because the environment has no Android SDK, and the required cold start, authentication, notification, timer, realtime, PDF and audio checks have not been run on a device.

The code is suitable for the next device validation pass after installing the Android SDK or using EAS with authenticated project access and configured EAS environment variables.

## Feature-wise test results

| Area | Implementation evidence | Result | Remaining validation |
|---|---|---|---|
| Startup and crash handling | `index.ts` has an error boundary around dynamic app loading; `App.tsx` gates navigation on store hydration and auth readiness. | Static review passed; no device crash log collected. | Cold start, warm start, forced render error, and process recreation on Android. |
| Authentication | Supabase client uses AsyncStorage persistence and `autoRefreshToken`; store restores the session and listens for auth changes. | Static review passed; no device session test. | Sign-in, sign-out, refresh, restart, expired token and offline recovery. |
| Dashboard, Library, Notes and Books | Registered in the React Navigation stacks; Library downloads use Expo file APIs and local persistence. | TypeScript and web export passed. | Android route traversal and file permission behavior. |
| PYQ and Tests | Registered screens and existing test player deadline recovery remain in place. | Existing tests cover related flows; the complete Jest suite passes. | Android navigation, test submission, and process recreation. |
| Sakha AI | `lib/geminiChat.ts` validates native HTTPS API origins, adds a 15-second timeout, preserves the Supabase bearer token, and retains the relative Web Preview fallback. | URL regression tests passed; no deployed API endpoint was configured for a live check. | APK health/chat requests, timeout, auth failure, airplane mode and slow network. |
| Study Planner | Planner state persists through the global store; notification sync selects the earliest incomplete future item. | Static review passed; no device timezone test. | Create/edit/complete/delete, restart, timezone/date changes and reminder cancellation. |
| Focus Centre and Focus Timer | Timestamp-based persistence, `AppState` recovery, interval cleanup and completion accounting are present in `FocusCenterScreen.tsx`. | Static review passed; existing timer tests passed. | Screen lock, backgrounding, audio interruption, pause/resume, process recreation and exactly-once statistics. |
| Focus Lock | Existing feature remains a timer and persistence flow. No Accessibility Service or overlay blocker was added. | Scope is correctly limited. | Confirm UI copy and timer behavior on Android; app blocking remains unsupported. |
| Statistics | Existing store and focus completion flows remain registered. | No regression found in automated output. | Verify one record per completed session on device. |
| Study Groups and Realtime | `lib/groupRoomRealtime.ts` tracks auth, AppState, subscription cleanup and reconnect behavior. | Static review and related realtime tests passed. | RLS, reconnect after backgrounding, duplicate channel prevention and multi-device presence. |
| Notifications | `expo-notifications` is installed; Android channel and permission request are implemented; one deterministic planner reminder is cancelled/rescheduled; taps route to Notifications. | Configuration and TypeScript passed. Local notification behavior is unverified on Android. | Android 13 permission prompt, channel, tap navigation, restart, timezone and duplicate prevention. |
| PDF Reader | Book reader preserves signed Supabase URL external opening; downloads and sharing use existing Expo file APIs. No embedded native PDF dependency was introduced. | Fallback path preserved; no device test. | Signed URL expiry, external viewer availability, download and share. |
| Profile, Settings and Admin | Existing React Navigation registration and Expo picker/media modules remain unchanged. | TypeScript and web export passed. | Android photo/media permissions, admin PDF selection and authenticated operations. |

## Confirmed fixes in this phase

### Android notification configuration

The Expo config now includes `expo-notifications` and explicitly declares `android.permission.POST_NOTIFICATIONS` in [app.json](../app.json). Regenerating the native project with `npx expo prebuild --no-install --platform android` produced a manifest containing:

- `POST_NOTIFICATIONS`
- `VIBRATE`
- audio foreground service permissions
- the `studysakha` deep-link scheme
- Expo audio service configuration

`lib/notifications.ts` creates the `study-reminders` channel at runtime, requests permission on Android, schedules at most one deterministic upcoming reminder, cancels it when disabled or resynchronizing, and attaches the Notifications route to the response data. This is local notification support. Push token registration and backend push delivery are not implemented or claimed.

### AI transport handling

Native and production builds reject relative, non-HTTPS, malformed or credential-bearing API URLs. Requests have a 15-second timeout and produce transport-specific errors. Web Preview retains its same-origin `/api` behavior. No Gemini or service-role secret is placed in the client.

### Startup diagnostics

The root bootstrap catches dynamic initialization failures and renders an actionable error. The added React error boundary logs the error and component stack while showing a visible failure state. It does not silently swallow the exception.

### Navigation and deep linking

The `studysakha://` prefix is registered with React Navigation. Notification responses use a navigation ref and route to the existing Notifications screen once the container is ready.

## Configuration and build audit

### EAS profiles

[eas.json](../eas.json) maps:

- `preview` to EAS `preview`, APK, all common Android architectures;
- `arm64-apk` to EAS `preview`, APK, arm64 only;
- `production` to EAS `production`, Android App Bundle.

Each environment must provide these public client variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

The checked-in `.env` contains the Supabase URL and publishable key but no API base URL. `app.config.js` now fails Android EAS configuration resolution when any of these three public variables is missing or when the API origin is not absolute HTTPS. EAS account values were not independently inspected in this checkout, so environment presence remains a release gate. Service-role and Gemini secrets must remain server-side.

The `preview`, `production`, and `arm64-apk` profiles now select `preview` or `production` EAS environments explicitly and use Expo-managed remote Android credentials. The app config disables Android backup and blocks the unused `SYSTEM_ALERT_WINDOW` permission. Storage permissions were not blocked because the profile-photo and focus-proof export features use Expo Image Picker and Media Library and require their SDK-managed permissions on supported Android versions.

The expected backend routes are `/api/health` and `/api/chat`. A deployed absolute API URL was not available here, so neither endpoint was live-tested.

The checked-in `.env` was intentionally not changed. It still contains no API base URL. The release validator can be run with `pnpm run validate:release -- preview` or `pnpm run validate:release -- production`; it reports missing variables without printing their values. A validation run with non-secret placeholder values passed, and a run with the API variable omitted failed as expected.

Expo config resolution was tested with `npx expo config --type public --json`. The generated configuration contains `allowBackup: false` and `blockedPermissions: ["android.permission.SYSTEM_ALERT_WINDOW"]`. After `npx expo prebuild --platform android --no-install`, the generated manifest reflected both settings. The SDK-managed storage/media permissions remain because the application uses Image Picker and Media Library.

### Native build result

Command executed from the generated Android project:

```bash
./android/gradlew :app:assembleRelease --no-daemon --console=plain
```

Gradle resolved and evaluated the Expo 57 project, then failed during Android SDK discovery:

```text
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable
or by setting sdk.dir in android/local.properties.
```

No APK was created. An EAS preview build command was also started in non-interactive mode but did not return a build result in this environment; it was stopped after remaining without output. This is not evidence of a successful EAS build.

## Validation evidence

| Command | Observed result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed; lockfile up to date. |
| `./node_modules/.bin/tsc --noEmit --pretty false` | Passed. |
| Focused ESLint on changed files with `--max-warnings=0` | Passed. |
| `pnpm test -- --runInBand` | Passed after the test runner wrapper normalized pnpm's forwarded separator: 26 suites, 95 tests. |
| `./node_modules/.bin/expo export --platform web` | Passed; exported `dist` and bundled web JavaScript. |
| `npx expo prebuild --no-install --platform android` | Passed; regenerated Android project and manifest. |
| `npx expo config --type public --json` | Passed; resolved package, backup and blocked-permission policy. |
| `pnpm run validate:release -- preview` with placeholder values | Passed; required variable names, HTTPS validation and backup policy checked. |
| `pnpm run validate:release -- preview` without API URL | Failed as intended; reported only the missing variable name. |
| `pnpm exec eslint app.config.js scripts/validate-release-config.cjs --max-warnings=0` | Passed after the validator path fix. |
| `./android/gradlew :app:assembleRelease --no-daemon --console=plain` | Failed because Android SDK/`ANDROID_HOME` is unavailable. |
| Android emulator/device checks | Not run; no device or emulator was available. |

### Existing automated failure

The previously reported `test/focusSessionSetup.test.tsx` timeout was not reproducible in the current tree. Investigation found no unresolved promise, production interval leak, or AsyncStorage operation that remains pending in the test. The focused suite passed all 17 tests with fake timers, and the complete suite passed 26 suites and 95 tests. The earlier recorded run was launched concurrently with other resource-heavy validation processes, which explains the isolated 5-second timeout under contention. The test was not given a larger timeout and its assertions were not weakened. The requested pnpm command also had an independent argument-forwarding defect; [run-jest.cjs](../scripts/run-jest.cjs) now removes only the forwarded separator.

The suite also emitted an existing React `act(...)` warning in the study planner test and an expected persistence recovery error log in the malformed saved-data test. These are test diagnostics, not evidence of an Android crash.

## Crash and root-cause record

No Android crash log, Hermes stack trace, or device ANR was available because no Android runtime was connected. The confirmed pre-device risks and their current causes are:

1. **APK AI failure risk:** a mobile build without `EXPO_PUBLIC_API_BASE_URL` would attempt an unusable native API path. The code now rejects invalid configuration clearly; EAS variables still need account-level verification.
2. **Android 13 notification failure risk:** the permission was absent from the explicit app permission list. `POST_NOTIFICATIONS` is now generated from `app.json`, while runtime permission handling is in `lib/notifications.ts`.
3. **Blank screen risk:** initialization/render failures previously had limited visible diagnostics. The bootstrap error state and React error boundary now expose and log the failure.
4. **Focus Lock expectation mismatch:** Android app blocking requires privileged native functionality. No Accessibility Service or overlay implementation was approved or added.
5. **PDF embedded-reader limitation:** there is no verified Expo 57 embedded PDF dependency in this project. The signed URL and download/external-opening fallbacks remain the supported paths.

## Device test checklist

Run this checklist on Android 13 or newer with a release APK:

- [ ] Cold start from a terminated process shows the app or a useful error state.
- [ ] Warm start restores the authenticated Supabase session.
- [ ] Sign-in, sign-out, token refresh and restart work.
- [ ] AI health and chat work with the production HTTPS API; airplane mode and timeout errors are readable.
- [ ] Notification permission prompt appears once and channel `study-reminders` exists.
- [ ] Planner reminder schedules, cancels, reschedules and survives restart without duplicates.
- [ ] Notification tap opens the existing Notifications screen.
- [ ] Timer remains accurate after backgrounding and screen lock; pause/resume/completion record once.
- [ ] Audio interruption and return to Focus Centre behave correctly.
- [ ] No duplicate realtime subscriptions appear after background/foreground cycles.
- [ ] Supabase RLS rejects unauthorized group data and authorized members reconnect.
- [ ] Signed PDF URLs open externally; downloads and sharing work; expired URLs show a useful error.
- [ ] Profile photo and admin document permissions work on Android 13+.
- [ ] Back button and `studysakha://` deep links work from relevant app states.

## Release steps after the environment blocker is removed

```bash
pnpm install --frozen-lockfile
npx expo prebuild --no-install --platform android
npx expo-doctor
npx eas-cli@latest env:list --environment preview
npx eas-cli@latest build --platform android --profile preview
```

Before starting the build, confirm the three public variables exist in the selected EAS environment without printing their values. Install the resulting APK on an Android 13+ device or emulator and complete the checklist above. Promote to the production profile only after device results are recorded.

## Files changed for compatibility work

- [App.tsx](../App.tsx): notification synchronization, tap routing, navigation ref and deep-link prefix.
- [app.json](../app.json): Expo notifications plugin and Android notification permission.
- [eas.json](../eas.json): explicit preview/production environment mapping.
- [app.config.js](../app.config.js): Android EAS environment validation, backup policy and blocked overlay permission.
- [scripts/validate-release-config.cjs](../scripts/validate-release-config.cjs): safe local/profile configuration validation without printing values.
- [index.ts](../index.ts): startup and render error diagnostics.
- [lib/apiConfig.ts](../lib/apiConfig.ts): public API URL validation.
- [lib/geminiChat.ts](../lib/geminiChat.ts): native API validation, timeout and transport errors.
- [lib/notifications.ts](../lib/notifications.ts): Android local reminder implementation.
- [test/geminiChat.test.tsx](../test/geminiChat.test.tsx): URL validation regression coverage.

