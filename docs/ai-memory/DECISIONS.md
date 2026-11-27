# Architectural Decisions — Study Sakha

## DEC-016 — 2026-11-27 — Groups main is joined-only; discovery is separate

The Groups landing surface displays only active memberships and only the minimum identity data needed for scanning: avatar, name, and member count. Discovery/search stays on a dedicated internal Explore surface backed by the existing Supabase discovery query, preventing recommended or unjoined groups from mixing with the user's main list.

## DEC-015 — 2026-11-27 — Group navigation stays in one scrollable strip

Keep every implemented Group Details section in the same horizontal tab strip. Narrow screens scroll horizontally rather than collapsing navigation into a secondary menu, preserving direct discoverability and touch access for all sections.

## DEC-014 — 2026-11-27 — Group chat state is server-idempotent and Focus Centre-authoritative

Keep group chat history in Supabase `study_group_messages` and reconcile all sources by the server message id. Initial fetches merge with realtime and send responses instead of replacing the channel array, preventing stale query responses from clearing recent messages or creating duplicates.

Keep Group Hall presence/membership separate from personal studying activity. `useOptionalFocusSession()` is the only source used to derive the current user's studying state; Hall entry/exit and group membership changes must not start, pause, or end a Focus Centre session.

## DEC-012 — 2026-11-27

Keep the supplied alarm module isolated behind a thin host screen adapter. It owns alarm CRUD/history/theme persistence under `@study_sakha_alarm_module_v1`, while the adapter bridges only navigation and the existing app-level light/dark setting. This avoids duplicate providers and prevents overwriting `sakha-store-v1` or planner storage.

Constraints: preserve existing Home, planner, focus, header, and bottom navigation UI; register one `Alarm` route; retain only the four requested alarm themes.

## DEC-011 — 2026-11-26

Treat Expo Go Android as a local-notification fallback runtime: do not invoke Android channel management or attach a channel ID when `Constants.executionEnvironment` is `StoreClient`. Retain channel setup for standalone/development builds where the native provider exists, and retain local scheduling in Expo Go without claiming remote push support.

## DEC-008 — 2026-11-25

Reconcile Supabase history only after catalog verification, then deploy forward-only migrations. This preserved existing data and avoided re-executing non-idempotent history or using --include-all blindly. Later defects receive new forward-only migrations.

Last verified: 2026-11-25

| ID | Decision | Rationale | Constraints |
|---|---|---|---|
| **DEC-001** | Use React Navigation (Root Stack -> Authenticated Native Stack) without a left Drawer | `AuthenticatedStackNavigator` mounts directly on `Dashboard` (`App.tsx`, `lib/navigation.ts`); header overflow actions (`How to use the app`, `Settings`, `Help`, `Share with friends`) live in `AppHeader` (`components/Shell.tsx`). | Keep all route names and params typed in `lib/navigation.ts` and preserve `Profile`, `Settings`, `AppGuide`, and `LibraryDownloads` routes. |
| **DEC-002** | Keep `StoreProvider` (`useReducer`) + user-scoped `AsyncStorage` as primary local state | Synchronous deterministic reducer with immediate offline availability and strict per-user key isolation (`sakha-store-v1:user:<id>`). | Do not persist transient UI flags, secrets, or native handles. |
| **DEC-003** | Cloud Account Sync via single versioned JSON document (`account_sync_documents`) + optimistic-concurrency RPC | Avoids per-entity schema churn while enabling offline queue, timestamp/tombstone conflict resolution (`lib/sync/`), and Realtime acceleration. | Excludes passwords, tokens, managed content, group records, native permissions, and local file paths. |
| **DEC-004** | Keep `GEMINI_API_KEY` and Supabase service-role secrets strictly server-side (`server.js` / Vercel) | Prevents credential extraction from mobile/web client bundles. `/api/chat` authenticates callers via Supabase Bearer token and rate-limits per user. | Native builds require `EXPO_PUBLIC_API_BASE_URL` to be an absolute `https://` URL (`app.config.js`). |
| **DEC-005** | Android Focus Lock implemented via `AccessibilityService` + `SharedPreferences` + `AlarmManager` via Expo config plugin (`plugins/withFocusLock.js`) | Enforces app blocking when JS is backgrounded without requesting `SYSTEM_ALERT_WINDOW` or `QUERY_ALL_PACKAGES` (uses launcher `<queries>`). | Requires custom dev/release build (not supported in Expo Go). Do not hand-edit generated `android/` without updating `native/focus-lock/android/` and `plugins/withFocusLock.js`. |
| **DEC-006** | Disable Android backup (`allowBackup: false`) and block `SYSTEM_ALERT_WINDOW` | Reduces security/data-leakage surface for release builds (`app.json`, `app.config.js`, `scripts/validate-release-config.cjs`). | Enforced by release validation script. |
| **DEC-007** | Use `pnpm` (`12.16.1`) and `npx expo install` for dependency management | `pnpm-lock.yaml` is the workspace lockfile; `npx expo install` guarantees SDK 57 compatible package versions. | Always run `pnpm run lint` and `pnpm run test:ci` before completing tasks. |
| **DEC-009** | Render `AppBottomNav` in normal flex layout inside `Shell` (hiding when native soft keyboard is open) instead of `position: 'absolute'` | Guarantees no screen content or bottom CTAs render behind the bottom tab bar regardless of screen `scroll` mode or `insets.bottom` height, while avoiding double safe-area padding. | Screens inside `Shell` must not add `insets.bottom` or large bottom-nav clearance offsets on mobile (`FloatingFocusBar` remains positioned above the bar). |
| **DEC-010** | Synchronize native drawer navigation via `Drawer.Navigator` `screenListeners` (`transitionEnd`) instead of `InteractionManager.runAfterInteractions` | `InteractionManager` is a `setImmediate` stub in RN `0.86.3`; waiting for `transitionEnd` (`closing: true`) prevents Android native stack transitions from colliding with `Drawer.native.tsx`'s closing spring/overlay. | Clear pending targets on `transitionStart` (`!closing`) and drawer `open` state; execute immediately on Web or when drawer is already closed. |
## DEC-013 — Classify Alarm hardware behavior explicitly

The Alarm module must not claim device reliability beyond the implemented native boundary. The separate Android engine owns AlarmManager scheduling, boot/time-change recovery, notification delivery, system alarm audio, and vibration; the React Native module remains the source of truth and UI event consumer. Manual mission flows for QR/photo/shake/steps and sleep-stage behavior remain simulated/UI-only until supported by device APIs.

## DEC-014 — 2026-11-27 — Keep Sakha actions structured and allowlisted

AI navigation actions remain a server-validated data contract, not executable model output. The server strips all internal action tags from display text, validates route names and parameters against the typed navigation allowlist, returns both a backward-compatible first `action` and an `actions` array, and the client renders explicit action cards that navigate only through React Navigation.

Constraints: never execute arbitrary AI code; invalid actions degrade to normal text; authorization remains enforced by existing authenticated navigation/backend rules; model/provider selection stays internal to the chat screen.

## DEC-015 — 2026-11-27 — Preserve authenticated state across transient auth failures

Supabase session verification, profile reads, and admin-role enrichment are separated into authoritative logout events versus retryable failures. A persisted session user keeps the StoreProvider authenticated during network/profile failures; only explicit `SIGNED_OUT` or classified invalid/expired/revoked token failures clear the user. Root navigation remains gated by the single StoreProvider state.

Constraints: do not create a parallel auth provider, do not bypass RLS or Supabase verification, keep local manual logout immediate, and verify token-revocation behavior against the live Supabase project before final release sign-off.
