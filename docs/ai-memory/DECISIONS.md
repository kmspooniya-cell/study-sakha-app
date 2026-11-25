# Architectural Decisions — Study Sakha

## DEC-008 — 2026-11-25

Reconcile Supabase history only after catalog verification, then deploy forward-only migrations. This preserved existing data and avoided re-executing non-idempotent history or using --include-all blindly. Later defects receive new forward-only migrations.

Last verified: 2026-11-25

| ID | Decision | Rationale | Constraints |
|---|---|---|---|
| **DEC-001** | Use React Navigation (Root Stack -> Drawer -> Authenticated Stack) instead of Expo Router | Existing navigation, `studysakha://` linking, custom drawer, and back-target policies are built on `@react-navigation/*` (`App.tsx`, `lib/navigation.ts`). | Keep all route names and params typed in `lib/navigation.ts`. |
| **DEC-002** | Keep `StoreProvider` (`useReducer`) + user-scoped `AsyncStorage` as primary local state | Synchronous deterministic reducer with immediate offline availability and strict per-user key isolation (`sakha-store-v1:user:<id>`). | Do not persist transient UI flags, secrets, or native handles. |
| **DEC-003** | Cloud Account Sync via single versioned JSON document (`account_sync_documents`) + optimistic-concurrency RPC | Avoids per-entity schema churn while enabling offline queue, timestamp/tombstone conflict resolution (`lib/sync/`), and Realtime acceleration. | Excludes passwords, tokens, managed content, group records, native permissions, and local file paths. |
| **DEC-004** | Keep `GEMINI_API_KEY` and Supabase service-role secrets strictly server-side (`server.js` / Vercel) | Prevents credential extraction from mobile/web client bundles. `/api/chat` authenticates callers via Supabase Bearer token and rate-limits per user. | Native builds require `EXPO_PUBLIC_API_BASE_URL` to be an absolute `https://` URL (`app.config.js`). |
| **DEC-005** | Android Focus Lock implemented via `AccessibilityService` + `SharedPreferences` + `AlarmManager` via Expo config plugin (`plugins/withFocusLock.js`) | Enforces app blocking when JS is backgrounded without requesting `SYSTEM_ALERT_WINDOW` or `QUERY_ALL_PACKAGES` (uses launcher `<queries>`). | Requires custom dev/release build (not supported in Expo Go). Do not hand-edit generated `android/` without updating `native/focus-lock/android/` and `plugins/withFocusLock.js`. |
| **DEC-006** | Disable Android backup (`allowBackup: false`) and block `SYSTEM_ALERT_WINDOW` | Reduces security/data-leakage surface for release builds (`app.json`, `app.config.js`, `scripts/validate-release-config.cjs`). | Enforced by release validation script. |
| **DEC-007** | Use `pnpm` (`12.16.1`) and `npx expo install` for dependency management | `pnpm-lock.yaml` is the workspace lockfile; `npx expo install` guarantees SDK 57 compatible package versions. | Always run `pnpm run lint` and `pnpm run test:ci` before completing tasks. |
