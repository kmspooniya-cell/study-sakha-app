# Project Context — Study Sakha

Last verified: 2026-11-25

## 1. Overview

**Study Sakha** (`com.anonymous.agonpreview`, scheme `studysakha://`) is a cross-platform (Android, iOS, Web) competitive exam preparation application built with Expo SDK 57 (`~57.0.31`), React `19.2.3`, React Native `0.86.3`, and TypeScript (`~6.0.3`, strict mode). It targets Indian competitive exam aspirants (UPSC, SSC, Banking, NEET, JEE, RAS, RPSC/RSSB).

## 2. Core Architecture

### Entry & Bootstrap
- `index.ts`: Dynamically loads `App.tsx`, wraps it in a React ErrorBoundary, and renders an actionable failure state on startup errors.
- `App.tsx`: Wraps the app in `GestureHandlerRootView` -> `SafeAreaProvider` -> `StoreProvider` -> `Themed` (`ThemeProvider`) -> `Navigation`. Loads `@expo-google-fonts/inter` + `Ionicons` fonts, displays `Splash` until `state.hydrated && state.authReady`, plays `BrandIntro` (1.5s), and configures `NavigationContainer` with `studysakha://` linking and notification tap routing.

### Navigation (`App.tsx`, `lib/navigation.ts`)
- **Root Stack (`RootStackParamList`):** `SignIn` / `SignUp` when unauthenticated; `Dashboard` (`MainDrawerNavigator`) when authenticated.
- **Drawer (`DrawerParamList`):** Custom left drawer (`CustomDrawerContent`) with Profile header, `Offline downloads` (`LibraryDownloads`), `How to use the app` (`AppGuide`), `Settings`, and `Share with friends`.
- **Authenticated Stack (`AppStackParamList`, 29 routes):** `DashboardRoot`, `Library`, `Groups`, `More`, `LibraryNotes`, `LibraryBooks`, `LibraryPYQSets`, `LibraryStarred`, `LibraryDownloads`, `PYQ`, `Tests`, `TestPlayer`, `TestResult`, `SakhaAI`, `NoteEditor`, `BookReader`, `CurrentAffairs`, `Search`, `Notifications`, `Statistics`, `TaskPerformance`, `StudyPlanner`, `FocusCenter`, `FocusCompletion`, `FocusLock`, `Profile`, `Settings`, `AppGuide`, `Admin`.
- **Android Back Policy:** `getAndroidBackTarget` in `lib/navigation.ts` routes subsections back to their parent section (`Library`, `Tests`, `Statistics`, or `DashboardRoot`). `DashboardRoot` uses double-back-to-exit.

### State Management & Persistence (`lib/store.tsx`, `lib/sync/`)
- `StoreProvider` manages application state via a pure synchronous `storeReducer`.
- **Local Persistence:** User-scoped `AsyncStorage` (`sakha-store-v1:user:<encodedUserId>`), plus dedicated user-scoped storage in `lib/focusHistory.ts`, `lib/groupActivitySync.ts`, and `lib/resourceDownloads.ts`. Legacy unscoped data (`sakha-store-v1`) has a consent-gated migration flow.
- **Cloud Account Sync (`lib/sync/`):** `AccountSyncEngine` syncs application-owned state (`notes`, `plannerTasks`, `plannerSettings`, `plannerScheduleItems`, `plannerScheduleCompletions`, `studyLogs`, `testResults`, `settings`, `starredIds`, `bookmarks`, `readingProgress`, `chat`, etc.) to `public.account_sync_documents` via `push_account_sync_document` RPC, an offline retry queue (`syncQueue.ts`), Supabase Realtime subscription, and timestamp/tombstone conflict resolution (`syncConflictResolver.ts`).
- **Theme (`lib/theme.tsx`):** `ThemeProvider` handles light/dark/system themes, accent colors, text/display scaling, layout density, high contrast, reduce motion, and background overlays.

### Backend, Supabase & AI (`lib/supabase.ts`, `server.js`, `server/`, `supabase/migrations/`)
- **Supabase:** Auth (`AsyncStorage` persistence, `autoRefreshToken: true`), PostgreSQL with RLS, `SECURITY DEFINER` RPCs, private `Student-content` storage bucket (signed URLs), and Realtime channels for study rooms and account sync.
- **15 SQL Migrations (`supabase/migrations/`):**
  - `202611010001` – `202611020002`: Initial schema, profiles, `user_roles`, `is_admin()`, `exams`, `managed_content`, private `Student-content` storage.
  - `202611200001` – `202611240002`: Study groups, rooms, room sessions, realtime authorization, member activity sync, `saved_early` status, focus session metadata.
  - `202611240003_production_backend_repairs.sql`: Seeds `exams` (`upsc`, `ssc`, `banking`, `neet`, `jee`, `ras`, `rpsc_rssb`), repairs `create_study_group` and `get_study_room_insights` RPCs.
  - `202611250001_account_sync_documents.sql`: `account_sync_documents` table, RLS, `push_account_sync_document` RPC, Realtime publication.
- **Express / Vercel Server (`server.js`, `api/[...path].js`, `server/gemini.js`):**
  - `GET /api/health`, `GET /healthz`, `GET /api/healthz`
  - `POST /api/chat`: Verifies Supabase Bearer token, validates payload (max 96KB, 4000 chars, 12 history items), rate-limits (20 req/min/user), calls Gemini (`@google/genai`) with server-side `GEMINI_API_KEY` and app knowledge context (`server/appKnowledge.js`).
  - `GET /api/audio-catalog`, `GET /api/audio/:filename`: Serves `deep_positive_energy.mp3` and `pure_cosmic_waves.mp3` with HTTP 206 byte-range support.
  - Local dev (`node server.js`): Spawns `expo start --web --port 8081 --host lan` and proxies non-API HTTP/WebSocket traffic.

### Android Native Focus Lock (`plugins/withFocusLock.js`, `native/focus-lock/android/`)
- Expo config plugin copies 6 Kotlin files (`FocusLockModule.kt`, `FocusLockAccessibilityService.kt`, `FocusLockBlockingActivity.kt`, `FocusLockAlarm.kt`, `FocusLockBootReceiver.kt`, `FocusLockPackage.kt`) and `focus_lock_service.xml`, registers `FocusLockPackage()` in `MainApplication`, and injects AndroidManifest permissions/service/activity/receivers/queries.
- Uses `SharedPreferences` + `AccessibilityService` + `AlarmManager` (`FocusLockAlarm`) to enforce selected package blocking even when JS is backgrounded.

### CI/CD & Build Configuration
- `packageManager`: `pnpm@12.16.1`.
- `.github/workflows/mobile-quality.yml`: Runs `tsc --noEmit`, focused ESLint, `pnpm run test:ci`, `expo config --type public`, and `pnpm run build:web` on PRs and pushes to `main`.
- `.github/workflows/main.yml`: Manual `workflow_dispatch` to trigger `eas build --platform android --profile preview`.
- `eas.json`: `preview`, `arm64-apk`, `production` (AAB), `production-apk` profiles.
- `app.config.js`: Enforces `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and absolute HTTPS `EXPO_PUBLIC_API_BASE_URL` during Android EAS builds (`EAS_BUILD_ID` present).
