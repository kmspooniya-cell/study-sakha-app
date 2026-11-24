# Study Sakha Pre-launch Testing Audit

**Date:** 2026-11-24  
**Project:** Expo SDK 57 / React Native 0.86.3  
**Package manager:** pnpm 12.16.1  
**Android package:** `com.anonymous.agonpreview`

## Baseline inventory

| Area | Finding | Codespace status |
|---|---|---|
| Jest | `jest-expo` 57.0.6, Jest 29.7, React Native Testing Library 13.3.3 already installed. | Runnable in Codespaces. |
| Existing tests | 20 suites and 86 tests before this phase. Coverage already included timers, persistence, planner, groups, navigation and Gemini URL validation. | Runnable in Codespaces. |
| Jest config | [jest.config.js](../jest.config.js) uses `jest-expo` and `test/**/*.test.tsx`. | Compatible with current Expo setup. |
| Expo config | [app.json](../app.json) declares Expo notifications, audio, media and picker plugins. | `expo config --type public` passed. |
| EAS | [eas.json](../eas.json) maps preview APK profiles to `preview` and production AAB to `production`. | Static inspection completed; EAS account values not available. |
| Android native project | Generated Android project has package `com.anonymous.agonpreview`, Hermes/RN Gradle configuration, audio service, deep-link scheme and notification permission. | Configuration inspectable; local build blocked by missing Android SDK. |
| GitHub Actions | No mobile quality workflow existed before this phase. | Added a host-side workflow; device jobs are intentionally separate. |
| Maestro | Installed via the official Linux installer; version `2.12.1`. | `maestro test .maestro/` stopped with “0 devices connected”; no flow executed. |
| Flashlight | Installed via the official installer; version `0.21.0`. | `flashlight measure` could not collect a measure; the CLI opened its web UI and reported raw-mode limitations in this non-interactive shell. |
| Firebase Crashlytics | No Firebase project file, `google-services.json`, Firebase plugin or React Native Firebase package found. | Blocked on Firebase project/configuration. |
| MobSF | Docker 29.9.2 is available. | Scan blocked because no release APK exists. |
| Android runtime | `adb` is not installed, no emulator is running, and `ANDROID_HOME`/`ANDROID_SDK_ROOT` are unset. | Device-dependent phases blocked. |

## Compatibility decisions

- No Expo, React Native or React upgrade was made.
- No Firebase package was installed without a Firebase project and native configuration.
- No fake credentials, `google-services.json`, APK, performance result or security result was created.
- Maestro flows use selectors found in the source: visible labels, placeholders, and accessibility labels such as `Open menu`, `Open Notes`, `Notification Preferences`, and `Custom subject tag`.
- E2E flows use `MAESTRO_TEST_EMAIL`, `MAESTRO_TEST_PASSWORD`, and `MAESTRO_RUN_ID`; credentials are not committed.
- Performance, Monkey, Crashlytics and MobSF results remain blocked until the APK and Android target are available.

## Tool execution matrix

| Tool | Runs in Codespaces | Requires target/device | Requires external setup |
|---|---:|---:|---:|
| Jest/RNTL | Yes | No | No |
| Expo config/export | Yes | No | Public build environment only for production behavior |
| Maestro CLI | CLI installed | Yes | Android SDK/ADB and installed APK |
| Flashlight | CLI installed | Yes | Android SDK/ADB and installed APK |
| Android Monkey | No in current workspace | Yes | `adb`, installed APK, dedicated test account |
| Firebase Crashlytics | Package/config can be prepared | Release runtime required | Firebase project and `google-services.json` |
| MobSF | Docker available | APK required | Docker image and local APK |

## Phase 2 coverage additions

Added deterministic tests for sign-in validation, Supabase session options, reducer note creation/editing and planner completion, local notification channel/scheduling, statistics deduplication and theme palettes. Added reusable native mock factories for AsyncStorage, notifications, audio, navigation and Supabase auth in [test/mocks/native.ts](../test/mocks/native.ts).

The reported focus-session timeout was investigated with the focused suite and complete suite. It passed both focused execution and the complete direct Jest invocation. The earlier failure was not reproducible as a product defect.

## Commands executed

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec jest --runInBand
pnpm exec eslint test/mocks/native.ts test/store.reducer.test.tsx test/notifications.test.tsx test/statistics.test.tsx test/theme.test.tsx --max-warnings=0
pnpm exec expo config --type public
pnpm exec expo export --platform web
```

The complete direct Jest run passed after the additions. [package.json](../package.json) now routes `pnpm test` through [run-jest.cjs](../scripts/run-jest.cjs), which removes only pnpm's forwarded separator so `pnpm test -- --runInBand` reaches Jest correctly.

