# Study Sakha Web vs Android Compatibility Audit

**Audit date:** 2026-11-24  
**Scope:** Expo SDK 57 / React Native 0.86 application in this checkout  
**Evidence level:** static source and generated Android project inspection. No Android emulator or physical device was available, so no behavior is labelled Android tested.

## Executive summary

The Web Preview is not a reliable proxy for the installed APK because it runs through the local Express/Metro server and can resolve relative `/api/*` requests. Native builds do not have that origin. The largest confirmed APK risks are:

1. **Sakha AI cannot connect unless the APK build receives `EXPO_PUBLIC_API_BASE_URL`.** The checked-in `.env` contains Supabase values only. Web falls back to a relative URL; Android intentionally throws when the API base URL is absent (`lib/geminiChat.ts`).
2. **Notifications are an in-app inbox, not OS notifications.** There is no `expo-notifications` dependency, permission request, notification handler, channel, scheduled trigger, or push token registration. Planner and group “reminders” are persisted UI state only.
3. **Book/PDF reading is not an in-app Android PDF reader.** `BookReaderScreen` obtains a signed URL and calls `Linking.openURL`, delegating to a browser or installed PDF app. The offline download path is native file storage plus sharing, not embedded PDF rendering.
4. **Focus Lock explicitly has no Android blocking service.** The UI correctly says it is a timer and disables blocking. A production APK therefore cannot block other apps.
5. **Custom-scheme deep linking was incomplete.** The app declared `studysakha` in `app.json` and AndroidManifest, but React Navigation had `prefixes: []`. This audit fixes it to `['studysakha://']`.

## Feature compatibility matrix

| Module | Web behavior | Android implementation | Result / severity | Recommended action |
|---|---|---|---|---|
| Authentication | Supabase session uses browser-compatible AsyncStorage and resolves through the web server | Supabase uses AsyncStorage with `persistSession`, `autoRefreshToken`, `detectSessionInUrl: false`; auth state is restored and verified | **Likely compatible; medium runtime risk** if production env is absent or storage is cleared | Test cold start, token refresh, sign-out and reinstall on Android |
| Dashboard | Context state, Supabase data and local persistence | Same React Native tree and store | **No static platform defect found** | Device smoke test loading/error states |
| Library | Resources render in RN Web; web download UI is intentionally unavailable | Native PDF download uses `expo-file-system/legacy` document storage; sharing uses `expo-sharing` | **Compatible for download/share; high functional gap for reading** | Add a supported embedded PDF viewer only if in-app reading is required |
| Notes | Local/store-backed note editing | Same store and navigation | **No static platform defect found** | Test keyboard, back gesture and persistence |
| Books / PDF reader | Opens URL through browser behavior | `Linking.openURL` opens external handler; signed URL requires network | **High** for “reader” expectation | Decide whether external handoff is acceptable; otherwise add native-compatible viewer and build it |
| PYQ | RN Web test flow | Same test player/navigation | **No static platform defect found** | Test Android back and app resume during a test |
| Tests | Local and Supabase-backed attempts | Same implementation; AppState handling exists in player | **Medium runtime risk** | Test background/resume and timer accuracy on real Android |
| Sakha AI | Relative `/api/chat` works through preview/server origin | Native requires absolute `EXPO_PUBLIC_API_BASE_URL`; bearer token is sent to backend | **Critical configuration blocker** when env is missing | Deploy backend and inject the URL at EAS build time; verify `/api/health` from device |
| Study Planner | Custom web date/time picker | `@react-native-community/datetimepicker` Android picker | **Likely compatible; medium** | Test date/time/time-zone and repeated schedules on Android |
| Focus Centre / timer | JS timers and AppState recovery | Same JS timer plus native `expo-audio`; background playback is explicitly disabled for focus music | **Medium**: timer/audio lifecycle needs device verification | Test screen lock, backgrounding, interruptions and audio focus |
| Statistics | Same derived data and charts | Same RN/SVG/Skia paths | **Medium**: rendering/performance unverified | Test large datasets and low-end Android rendering |
| Study Groups / realtime | Supabase realtime WebSocket in browser | `AppState` lifecycle and Supabase realtime channels are present | **Medium**: network sleep/reconnect risk | Test two Android devices, background/resume, auth refresh and channel cleanup |
| Notifications | In-app notification inbox | Same store-backed inbox; no OS notification implementation | **Critical feature gap** for reminders/push | Add `expo-notifications`, Android channel/permission flow, scheduling and token backend before claiming reminders |
| Profile / settings | Image picker uses web base64 path | Image picker copies selected image to `File(Paths.document, ...)`; config removes camera permission | **Likely compatible; medium** | Test Android 13+ photo permission and persisted profile image |
| Admin panel | Browser `File` upload path | `expo-document-picker` asset is wrapped with `expo-file-system` `File`, then uploaded as ArrayBuffer | **Likely compatible; high operational risk** | Test large PDF, MIME/signature checks and release build upload |
| Downloads | Browser-side behavior is intentionally limited | Files stored under app document directory and shared with Android | **Compatible with network; medium** | Test signed URL expiry, missing files, storage cleanup and share targets |
| Focus Lock | Shows unavailable state | Shows unavailable state; no service/module | **Incomplete by design; high if promised** | Implement a native service/config plugin only as a separate product task |

## Runtime and configuration findings

### Platform APIs and browser-only code

- Platform checks are generally present for image selection, date/time pickers, audio downloads, profile files and web styling.
- Browser globals in `lib/geminiChat.ts` and `lib/audioDownloadManager.ts` are guarded. The Android AI path correctly refuses a relative URL.
- `AdminScreen` uses the web `File` object only on web and the Expo FileSystem `File` on native.
- `App.tsx` touches `document` only after checking `Platform.OS === 'web'` and `typeof document === 'undefined'`.
- No unguarded `localStorage`, `window.document`, or browser-only PDF API was found in the application source.

### Persistence and hydration

- Supabase auth and application state both use `@react-native-async-storage/async-storage`.
- The root navigation waits for `state.hydrated` and `state.authReady` before rendering authenticated routes.
- Store recovery is user-scoped and has a write queue, legacy import path, and auth-state race protection.
- The remaining risk is runtime: AsyncStorage failures, reinstall behavior, and token refresh were not exercised on Android.

### Supabase and realtime

- Supabase is configured from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Auth changes call `supabase.realtime.setAuth`; group realtime code listens to `AppState` and cleans up subscriptions.
- The checked-in `.env` has the two Supabase values, but no API base URL. Public Supabase keys are expected in a client bundle; server Gemini credentials remain in `server/`.
- Realtime requires a live HTTPS/WSS connection and valid RLS/realtime authorization. Static code inspection cannot prove production channel authorization.

### Android permissions and native configuration

Generated `android/app/src/main/AndroidManifest.xml` includes INTERNET, audio foreground-service permissions, MODIFY_AUDIO_SETTINGS, vibration, photo/storage permissions, the Expo audio service, and the `studysakha` intent filter. The config also registers Expo audio, splash, navigation bar, image picker, media library and date/time picker plugins.

The manifest contains `SYSTEM_ALERT_WINDOW`, but the app does not implement a blocking service. Permission presence alone does not provide app blocking. There is also no notification permission/channel configuration because notifications are not implemented.

### Background work, timers and audio

- Focus timers use JS state plus `AppState` recovery. JS timers are not a durable Android background scheduler.
- `expo-audio` is configured and used for ambient/focus playback. Focus music sets `shouldPlayInBackground: false`; playback should stop or become unreliable when backgrounded by design.
- Audio downloads are persisted in app document storage and verified with `getInfoAsync`.
- No Android WorkManager, foreground timer service, or exact alarm implementation exists.

### Navigation and deep links

- React Navigation stack/drawer types are centralized in `lib/navigation.ts`.
- Android back handling is implemented in `Shell`, focus screens and book reader flows.
- **Fixed:** `App.tsx` now includes the declared `studysakha://` scheme in `linking.prefixes`.
- The app has no HTTP App Links association (`assetlinks.json`), so HTTPS links are not claimed by the APK.

### Themes, animation and images

- Theme rendering is shared and uses RN-compatible components, SVG and Skia helpers with web-specific files where needed.
- Reanimated/worklets, Skia and SVG are native dependencies and therefore require a rebuilt native binary after version/configuration changes.
- Static inspection found no Android-only image URI bug, but large procedural/canvas scenes and charts need a real device performance pass.

## Build and release audit

- Expo dependency is `~57.0.31`; installed `node_modules/expo` reports `57.0.33`, so lockfile/install reproducibility should be checked before release.
- `eas.json` has preview APK, production AAB and arm64 APK profiles. Minification and resource shrinking are enabled in all profiles.
- `runtimeVersion` uses `appVersion`; the generated manifest has Expo updates disabled. EAS Update is therefore not a substitute for rebuilding when native modules/config change.
- `package.json` uses pnpm (`pnpm@12.16.1`), so use pnpm for scripts. The repository instructions mention `bun`, but no `bun.lock` is present.
- No explicit production environment block is present in `eas.json`. EAS build jobs must receive `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `EXPO_PUBLIC_API_BASE_URL` through EAS environment variables or the build environment.
- Hermes is the normal Expo Android runtime for this SDK generation; no project override was found. Compilation alone does not validate runtime behavior of audio, Skia, FileSystem, WebSocket or picker modules.

## Fixes implemented

| File | Change | Reason |
|---|---|---|
| `App.tsx` | Changed React Navigation `linking.prefixes` from `[]` to `['studysakha://']` | Aligns navigation parsing with the app scheme and generated Android intent filter |
| `WEB_ANDROID_COMPATIBILITY_AUDIT.md` | Added this audit | Records evidence, severity, blockers, verification limits and rebuild steps |

## Remaining blockers

1. **No deployed backend URL is configured for native builds.** Set `EXPO_PUBLIC_API_BASE_URL` to the HTTPS origin serving `/api/health` and `/api/chat`.
2. **OS notifications and scheduled reminders are not implemented.** The current inbox should not be described as push/local notification support.
3. **No Android emulator/device was available in this audit.** Audio, PDF handoff, permissions, back behavior, realtime reconnect, image picker and release performance remain unverified.
4. **Expo docs could not be fetched from this environment** because `docs.expo.dev` DNS resolution failed. SDK 57 package versions were inspected locally instead.
5. **Android production validation did not complete in this environment.** The Gradle wrapper exists, but a release build requires the Android/Gradle toolchain and signing configuration.

## Exact Android APK rebuild instructions

From the repository root, after setting the production values in EAS:

```bash
pnpm install --frozen-lockfile

# Required for native AI and Supabase-backed production behavior.
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value 'https://<project>.supabase.co' --environment production --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value '<publishable-key>' --environment production --visibility sensitive
npx eas-cli@latest env:create --name EXPO_PUBLIC_API_BASE_URL --value 'https://<deployed-backend-origin>' --environment production --visibility plaintext

# APK for direct Android installation.
npx eas-cli@latest build --platform android --profile preview

# Production store artifact.
npx eas-cli@latest build --platform android --profile production
```

Before distributing the APK, install it on an Android 13+ device and verify: cold-start session restore, sign-in/sign-out, AI health/chat, PDF external opening and offline download, planner picker, timer through screen lock, audio interruption, profile photo permission, group realtime after background/resume, deep link `studysakha://...`, and release logs. Record those results separately from this static audit.

## Verification performed

- Source and generated Android manifest/config inspection: completed.
- Expo major version inspection: completed locally; Expo 57.
- TypeScript, Jest and web export commands were started but hung in this environment before emitting completion diagnostics and were stopped. They are **not passing results**.
- Android APK/device runtime test: not performed.
