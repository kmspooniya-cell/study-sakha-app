# Study Sakha — Root Project Instructions (`AGENTS.md`)

This is an **Expo / React Native** mobile and web application (**Study Sakha**). Prioritize mobile-first patterns, performance, and cross-platform compatibility (Android, iOS, Web).

---

## 1. Project Identity and Purpose

- **App Name:** Study Sakha (`slug: "agon-preview"`, Android package: `com.anonymous.agonpreview`, URL scheme: `studysakha://`, owner: `study-sakha`)
- **Purpose:** Competitive exam preparation platform for Indian aspirants (UPSC, SSC, Banking, NEET, JEE, RAS, RPSC/RSSB) featuring a Study Dashboard, Library (Notes, Books/PDFs, PYQ Sets, Starred, Offline Downloads), PYQ Bank, Timed Tests & Results, Study Planner, Focus Centre (procedural Skia/Canvas2D themes, ambient audio, timer/stopwatch/pomodoro), Focus Lock (Android native app blocker), Study Groups & Live Study Rooms (Supabase Realtime), Sakha AI (Gemini-backed assistant), Current Affairs, Statistics, Notifications, Profile, Settings, and Admin content management.

---

## 2. Technology Stack

- **Framework:** Expo SDK `~57.0.31` (installed `57.0.33`), React `19.2.3`, React Native `0.86.3`, TypeScript `~6.0.3` (`strict: true`)
- **Package Manager:** `pnpm@12.16.1` (`pnpm-lock.yaml`, `pnpm-workspace.yaml`)
- **Navigation:** `@react-navigation/native` (`^7.5.0`), `@react-navigation/native-stack` (`^7.20.0`), `@react-navigation/drawer` (`7.14.3`)
- **Backend / Database / Auth / Realtime / Storage:** `@supabase/supabase-js` (`^2.118.0`) + PostgreSQL migrations in `supabase/migrations/`
- **AI / Server:** Express (`^5.3.0`) in `server.js` + `server/gemini.js` (`@google/genai` `^2.32.0`), deployed to Vercel via `api/[...path].js`
- **Graphics & UI:** `@shopify/react-native-skia` (`2.6.2`), `react-native-svg` (`15.15.4`), `react-native-reanimated` (`4.5.1`), `expo-linear-gradient`, `@expo/vector-icons`, `lucide-react-native`, `@expo-google-fonts/inter`
- **Audio & Media:** `expo-audio`, `expo-speech`, `expo-image`, `expo-image-picker`, `expo-media-library`, `expo-document-picker`, `expo-file-system`, `expo-sharing`, `react-native-view-shot`
- **Device & System:** `expo-notifications`, `expo-haptics`, `expo-navigation-bar`, `expo-status-bar`, `expo-splash-screen`, `expo-secure-store`, `@react-native-async-storage/async-storage` (`2.2.0`), `@react-native-community/datetimepicker`
- **Testing:** Jest (`jest-expo`), `@testing-library/react-native` (`^13.3.0`), Maestro E2E flows in `.maestro/`

---

## 3. Expo Has Changed — Do Not Trust Your Training Data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json` (currently `57`).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v57.0.0/`
3. For anything else, fetch `https://docs.expo.dev/llms.txt` — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

---

## 4. Project Architecture & Folder Structure

```text
/workspaces/study-sakha-app
├── App.tsx                  # Root providers (GestureHandler, SafeArea, Store, Theme), fonts, linking, navigators
├── index.ts                 # Root entry with dynamic bootstrap & React error boundary
├── app.json / app.config.js # Expo config & EAS Android build-time env validation
├── eas.json                 # EAS build profiles (preview, production, production-apk, arm64-apk)
├── server.js                # Express API (/api/health, /api/chat, /api/audio-catalog, /api/audio/:filename) + Metro dev proxy
├── api/[...path].js         # Vercel serverless catch-all exporting server.js app
├── vercel.json              # Vercel build/rewrites/functions config
├── components/              # Shared UI, Shell, Charts, Focus modals/timers, Study Hall, Pickers
├── hooks/                   # Custom hooks (e.g., useProceduralPicture.ts)
├── lib/                     # Store, Supabase client, navigation types, theme, i18n, AI, sync/, groupRooms, planner, statistics
│   └── sync/                # Account sync engine (syncEngine, syncConflictResolver, syncQueue, syncRepository, syncTypes)
├── screens/                 # 27+ screen components (auth, dashboard, library, focus, planner, groups, tests, AI, admin, etc.)
├── native/focus-lock/android/ # Custom Kotlin AccessibilityService, Module, BlockingActivity, Alarm, BootReceiver, XML
├── plugins/withFocusLock.js # Expo config plugin injecting native Focus Lock sources, manifest entries, and MainApplication package
├── server/                  # Server-side Gemini handler (gemini.js), appKnowledge.js, requestTimeout.js
├── supabase/migrations/     # 15+ forward-only SQL migrations (schema, RLS, RPCs, realtime auth, account_sync_documents)
├── themes/                  # Procedural Focus Timer themes & Canvas2D/Skia renderers
├── test/                    # 34 Jest + RNTL test suites and test/mocks/native.ts
├── .maestro/                # 12 Maestro E2E YAML flows
├── .github/workflows/       # CI workflows (mobile-quality.yml, main.yml)
├── scripts/                 # run-jest.cjs, validate-release-config.cjs
└── docs/                    # Technical audits and docs/ai-memory/ persistent memory system
```

---

## 5. Navigation Architecture

- **React Navigation** is used for all navigation (`@react-navigation/*`). Navigators and `studysakha://` linking config live in `App.tsx`; screens live in `screens/`.
- Keep route names and parameters typed in `lib/navigation.ts`. Preserve the existing hierarchy:
  1. **Root Stack (`RootStackParamList`):** `SignIn`, `SignUp` (unauthenticated) OR `Dashboard` (authenticated).
  2. **Drawer (`DrawerParamList`):** `MainDrawerNavigator` with `CustomDrawerContent` (Profile, Offline downloads, App Guide, Settings, Share) wrapping `MainStack`.
  3. **Authenticated Stack (`AppStackParamList`):** `DashboardRoot`, `Library`, `Groups`, `More`, `LibraryNotes`, `LibraryBooks`, `LibraryPYQSets`, `LibraryStarred`, `LibraryDownloads`, `PYQ`, `Tests`, `TestPlayer`, `TestResult`, `SakhaAI`, `NoteEditor`, `BookReader`, `CurrentAffairs`, `Search`, `Notifications`, `Statistics`, `TaskPerformance`, `StudyPlanner`, `FocusCenter`, `FocusCompletion`, `FocusLock`, `Profile`, `Settings`, `AppGuide`, `Admin`.
- **Android Back Policy:** `getAndroidBackTarget` in `lib/navigation.ts` maps detail/subsection routes back to their parent section (`Library`, `Tests`, `Statistics`, or `DashboardRoot`).

---

## 6. State Management & Data Persistence

- **Global Store (`lib/store.tsx`):** `StoreProvider` uses a synchronous, deterministic `useReducer` (`storeReducer`) exposed via `StoreContext`.
- **Account-Scoped Local Persistence:** State is persisted to `AsyncStorage` under `sakha-store-v1:user:<encodedUserId>` (with legacy unscoped key migration support). Separate user-scoped storage keys exist for planner data, focus history (`lib/focusHistory.ts`), group retry queues (`lib/groupActivitySync.ts`), and library downloads (`lib/resourceDownloads.ts`).
- **Cloud Account Sync (`lib/sync/`):** `AccountSyncEngine` syncs application-owned state to `public.account_sync_documents` via `push_account_sync_document` RPC (optimistic concurrency), local retry queue, and Supabase Realtime updates merged via `syncConflictResolver.ts` using timestamps and tombstones. Passwords, tokens, managed content, group records, native permissions, and local file paths are excluded.
- **Theme (`lib/theme.tsx`):** `ThemeProvider` manages light/dark/system mode, text scale, display scaling, accent colors, high contrast, reduce motion, and custom backgrounds.

---

## 7. Backend Architecture & Authentication

- **Supabase (`lib/supabase.ts`):** Uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with `AsyncStorage` persistence and `autoRefreshToken: true` (`detectSessionInUrl: false`). Realtime auth is updated on `onAuthStateChange`.
- **Auth Verification:** `StoreProvider` verifies sessions server-side via `supabase.auth.getUser(access_token)` and loads `profiles` + `user_roles` (`is_admin()`). Failed verification routes through `authResolved(null)` to clear stale user state.
- **Express / Vercel API (`server.js`, `api/[...path].js`):**
  - `GET /api/health`, `GET /healthz`, `GET /api/healthz`
  - `POST /api/chat` (requires `Authorization: Bearer <supabase_access_token>`, validated via `authClient.auth.getUser`, rate-limited 20 req/min/user, calls `server/gemini.js` using server-only `GEMINI_API_KEY`)
  - `GET /api/audio-catalog`, `GET /api/audio/:filename` (supports HTTP byte-range `206` streaming from `assets/audio_library/`)
  - In local dev (`node server.js`), proxies non-`/api/*` requests and WebSockets to Expo Metro on port `8081`.

---

## 8. Android Native Architecture

- **Continuous Native Generation (CNG):** `android/` is generated by Expo prebuild (`.gitignore` excludes `/android` and `/ios`, though a generated `android/` directory may exist locally after prebuild). Never edit generated `android/` files by hand for permanent changes — configure native behavior in `app.json`, `app.config.js`, `plugins/withFocusLock.js`, and `native/focus-lock/android/`.
- **Focus Lock Native Module (`plugins/withFocusLock.js` + `native/focus-lock/android/`):**
  - `FocusLockModule.kt` (`NativeModules.StudySakhaFocusLock`)
  - `FocusLockAccessibilityService.kt` (monitors foreground window transitions for user-selected packages; does not read/store screen content)
  - `FocusLockBlockingActivity.kt` (blocking/reminder overlay activity)
  - `FocusLockAlarm.kt` & `FocusLockBootReceiver.kt` (exact alarm expiration and reboot recovery via `SharedPreferences`)
  - `FocusLockPackage.kt` (registered in `MainApplication` via config plugin)
- **Permissions & Security:** `allowBackup: false`, `SYSTEM_ALERT_WINDOW` blocked, `POST_NOTIFICATIONS` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` + `PACKAGE_USAGE_STATS` + `RECEIVE_BOOT_COMPLETED` declared. Uses launcher intent `<queries>` instead of `QUERY_ALL_PACKAGES`.

---

## 9. Coding Conventions, Commands & Security

### Commands
Use `pnpm` (`pnpm-lock.yaml` is present; use `npx expo install <package>` for Expo SDK-compatible packages).
```bash
npx expo install <package>         # ALWAYS use for adding Expo/RN packages
pnpm run lint                      # TypeScript check (tsc --noEmit)
pnpm run test                      # Jest suite via scripts/run-jest.cjs
pnpm run test:ci                   # jest --runInBand
pnpm exec expo lint                # ESLint
pnpm exec expo-doctor              # Diagnose dependency & config issues
pnpm run build:web                 # Export web bundle to dist/
pnpm run validate:release -- preview # Validate EAS release env & app.json
pnpm run dev                       # Start Express API + Metro dev server (server.js)
```
EAS builds (cloud): `npx eas-cli@latest build --platform android --profile <preview|arm64-apk|production|production-apk>`.

### Security Requirements
- Never place `GEMINI_API_KEY`, Supabase service-role keys, passwords, or access tokens in client code, `EXPO_PUBLIC_*` variables, or documentation/memory files.
- Native/production builds require `EXPO_PUBLIC_API_BASE_URL` to be an absolute `https://` URL without embedded credentials (`lib/apiConfig.ts`, `app.config.js`).
- Keep `allowBackup: false` and `SYSTEM_ALERT_WINDOW` blocked in `app.json` / `app.config.js`.
- All Supabase authorization must remain enforced via RLS and `SECURITY DEFINER` RPCs (`set search_path = pg_catalog, public`), never client-only checks.

### Important Architectural Constraints
- **Expo Go:** Only includes bundled native modules; custom native code (`StudySakhaFocusLock`) requires a development or release build (`eas build` or `expo run:android`).
- **Store & Sync:** Keep `storeReducer` pure and synchronous; never persist transient UI flags, passwords, or native handles into `account_sync_documents`.
- **Run `pnpm run lint` and `pnpm run test:ci` before declaring any task done.**

---

## 10. Permanent AI Project Memory System (`docs/ai-memory/`)

The `docs/ai-memory/` directory is the repository's persistent source of truth across restarts, new conversations, and model switches:
- `docs/ai-memory/PROJECT_CONTEXT.md` — Technical architecture & repository overview
- `docs/ai-memory/FEATURE_STATUS.md` — Feature classification (`Complete`, `In Progress`, `Partially Implemented`, `Broken`, `Pending`, `Not Verified`)
- `docs/ai-memory/DEVELOPMENT_LOG.md` — Chronological record of significant work
- `docs/ai-memory/BUG_TRACKER.md` — Confirmed bugs, severity, root causes, fixes, verification status
- `docs/ai-memory/NEXT_TASK.md` — Current task, completed/pending steps, blockers, exact next action
- `docs/ai-memory/DECISIONS.md` — Architectural decisions, rationale, and constraints
- `docs/ai-memory/TESTING_STATUS.md` — Executed tests, results, build status, unverified areas

### Mandatory Automatic Memory Update Rule
After every significant development task:
1. Update `docs/ai-memory/DEVELOPMENT_LOG.md` (append; never overwrite useful history).
2. Update `docs/ai-memory/FEATURE_STATUS.md` if any feature status changed.
3. Update `docs/ai-memory/BUG_TRACKER.md` if bugs were discovered or fixed.
4. Update `docs/ai-memory/NEXT_TASK.md` with actual remaining work and exact next action.
5. Update `docs/ai-memory/TESTING_STATUS.md` with executed validation results.
6. Update `docs/ai-memory/DECISIONS.md` when an architectural decision is made.

**Never claim a fix or test is verified unless the relevant test or validation was actually executed in the current session.**

### Mandatory Session Recovery System
Whenever a new Antigravity session starts, **before making code changes**:
1. Read `AGENTS.md`.
2. Read all 7 files in `docs/ai-memory/` (`PROJECT_CONTEXT.md`, `FEATURE_STATUS.md`, `DEVELOPMENT_LOG.md`, `BUG_TRACKER.md`, `NEXT_TASK.md`, `DECISIONS.md`, `TESTING_STATUS.md`).
3. Run `git status` and inspect any uncommitted changes.
4. Compare documentation with actual source code.
5. Provide a short context recovery summary covering:
   - What this project does
   - Current architecture
   - Last completed work
   - Existing uncommitted changes
   - Known bugs
   - Pending work
   - Recommended next action

Never assume the previous task completed successfully.

### Context Preservation Rules
- Never overwrite useful project history; append new entries.
- Keep documentation concise and technically accurate.
- Preserve existing architecture unless explicitly approved; never remove existing features to simplify implementation.
- Never overwrite user changes, invent test results, or store secrets/tokens/passwords in memory files.
