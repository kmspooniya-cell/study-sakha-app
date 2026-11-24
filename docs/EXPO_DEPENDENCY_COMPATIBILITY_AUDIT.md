# Expo SDK 57 Dependency Compatibility Audit

**Module:** 2 — Expo dependency compatibility audit and repair  
**Date:** 2026-11-24  
**Scope:** Dependency metadata and lockfile only. Application modules were not changed.

## Baseline

- Expo: `~57.0.31` in `package.json`, installed `57.0.33`
- React: `19.2.3`
- React Native: `0.86.3`
- Package manager: pnpm `12.16.1`
- Lockfile: `pnpm-lock.yaml`
- React and React Native each resolve to one installed version.
- No package overrides, resolutions or patched dependencies are configured.

## Repairs

The seven patch mismatches reported by Expo Doctor were confirmed before editing and aligned with the SDK-compatible installer:

| Package | Before | After | Result |
|---|---:|---:|---|
| `@expo/metro-runtime` | `57.0.18` | `57.0.19` | Fixed |
| `expo-asset` | `57.0.21` | `57.0.22` | Fixed |
| `expo-constants` | `57.0.24` | `57.0.25` | Fixed |
| `expo-image-picker` | `57.0.21` | `57.0.22` | Fixed |
| `expo-notifications` | `57.0.25` | `57.0.26` | Fixed |
| `expo-sharing` | `57.0.26` | `57.0.27` | Fixed |
| `expo-splash-screen` | `57.0.11` | `57.0.12` | Fixed |

The changes were made with `npx expo install` and updated only [package.json](../package.json) and [pnpm-lock.yaml](../pnpm-lock.yaml). An incidental `minimumReleaseAgeExclude` change created by pnpm was removed from [pnpm-workspace.yaml](../pnpm-workspace.yaml).

## Compatibility findings

Expo Doctor reports **21/21 checks passed** after the repair.

The dependency tree contains one version each of React, React Native and all seven repaired Expo packages. The tree remains on Expo SDK 57 and React Native 0.86.3.

`pnpm peers check` still reports one transitive peer warning:

```text
@react-native/community-cli-plugin@0.86.3 wants @react-native/metro-config@0.86.3
installed @react-native/metro-config@0.88.1
```

This package is pulled through the Expo/React Native CLI toolchain. Expo Doctor considers the project compatible, and no override was added because forcing Metro 0.86.3 could conflict with Expo CLI 57. The warning should be reassessed when Expo SDK or React Native is intentionally upgraded.

No duplicate React or React Native installation was found. No incompatible native module was identified by Expo Doctor.

## Validation

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm dlx expo-doctor` | PASS — 21/21 checks |
| `pnpm exec tsc --noEmit --pretty false` | PASS |
| Focused ESLint for configuration scripts | PASS |
| `pnpm test -- --runInBand` | PASS — 26 suites, 95 tests |
| `pnpm exec expo config --type public --json` | PASS |
| `pnpm run build:web` | PASS |
| `git diff --check` | PASS |
| `pnpm peers check` | PARTIAL — one transitive Metro peer warning remains |

The Jest run retained existing diagnostic console output from malformed persistence and an existing React `act` warning; all tests passed.

## Native rebuild requirement

The repaired packages include native Expo modules. Any Android APK or development build must be rebuilt so the updated native package versions are compiled into the binary. No Android build was run in this module because the environment does not have an Android SDK.

Recommended commands after Android tooling or EAS access is available:

```bash
pnpm install --frozen-lockfile
npx expo prebuild --no-install --platform android
npx eas-cli@latest build --platform android --profile preview
```

