# Study Sakha Pre-launch Testing Report

**Date:** 2026-11-24  
**Recommendation:** **BLOCKED pending Android artifact and device validation**

## Status summary

| Area | Status | Evidence |
|---|---|---|
| Baseline audit | PASS | Repository, dependencies, config and tools inspected. See [audit](./PRELAUNCH_TESTING_AUDIT.md). |
| Jest + RNTL | PASS | Complete direct run: 26 suites, 95 tests passed after new coverage. |
| Focus timeout investigation | PASS | Focus suite passes; failure was not reproducible. |
| TypeScript | PASS | `pnpm exec tsc --noEmit --pretty false`. |
| Focused ESLint | PASS | New test and mock files pass with zero warnings. |
| Web export | PASS | Existing Phase 3 validation exported `dist`. |
| Maestro installation | PASS | Official installer, CLI `2.12.1`. |
| Maestro E2E execution | BLOCKED | `maestro test .maestro/` reported 0 connected devices; no flow executed. |
| Flashlight installation | PASS | Official installer, CLI `0.21.0`. |
| Flashlight measurements | BLOCKED | `flashlight measure` could not collect data in the non-interactive shell and no Android device exists. See [baseline](./PERFORMANCE_BASELINE.md). |
| Crashlytics | BLOCKED | No Firebase project or `google-services.json`; package not installed. |
| Android Monkey | BLOCKED | `adb` unavailable and no APK/device. |
| MobSF | BLOCKED | Docker available, but no APK. See [security audit](./ANDROID_SECURITY_AUDIT.md). |
| Android release build | BLOCKED | Android SDK/`ANDROID_HOME` unavailable in Codespace. |

## Changes made

- Added `test:ci` to [package.json](../package.json).
- Exported the existing store reducer and action type for direct reducer testing in [lib/store.tsx](../lib/store.tsx).
- Added reusable native mock factories in [test/mocks/native.ts](../test/mocks/native.ts).
- Added authentication validation, Supabase persistence configuration, reducer, notification, statistics and theme tests.
- Added twelve source-reviewed Maestro flows under [.maestro/](../.maestro/).
- Added the host-side mobile quality workflow at [mobile-quality.yml](../.github/workflows/mobile-quality.yml).
- Added this report set.

## Known limitations and unresolved issues

1. A release APK has not been produced in Codespaces because the Android SDK is not installed.
2. No physical tablet or emulator has executed Maestro, Flashlight, Monkey or runtime smoke tests.
3. Crashlytics is not configured and must not be described as active.
4. MobSF findings are unavailable until the actual signed release APK exists.
5. The dedicated test account and non-production backend/API environment must be supplied before E2E execution.
6. The test command now normalizes pnpm's forwarded separator, so `pnpm test -- --runInBand` is the supported full-suite command.

## Device execution commands

```bash
adb devices
adb install -r path/to/study-sakha-preview.apk
export MAESTRO_TEST_EMAIL='dedicated-test-account@example.com'
export MAESTRO_TEST_PASSWORD='provided-out-of-band'
export MAESTRO_RUN_ID="$(date +%s)"
maestro test .maestro/
adb logcat -c
adb shell monkey -p com.anonymous.agonpreview -v 500 2>&1 | tee artifacts/monkey/monkey-500.log
adb shell monkey -p com.anonymous.agonpreview -v 1500 2>&1 | tee artifacts/monkey/monkey-1500.log
adb shell monkey -p com.anonymous.agonpreview -v 5000 2>&1 | tee artifacts/monkey/monkey-5000.log
adb logcat -d -v threadtime > artifacts/monkey/logcat-final.log
```

Run Monkey stages only against the dedicated installation and test account. Review each stage for fatal exceptions and ANRs before increasing the event count.

