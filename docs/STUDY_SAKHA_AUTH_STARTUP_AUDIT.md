# Study Sakha Authentication & Startup Audit

Audit date: 2026-11-27  
Scope: cold start → session restore → authenticated Homepage, including temporary network loss and recovery.

## Executive result

The intermittent Login → Homepage flicker had a confirmed code-level cause. `StoreProvider` treated any failure from `supabase.auth.getUser()` or the profile/admin reads as `authCheckFailed`; the reducer converted that action into `authResolved(null)`, clearing the user and resetting hydrated account data. A temporary network interruption could therefore make the root navigator render Login. A later Supabase auth event or successful verification restored the user and navigated back to Homepage.

This is fixed on the host code path. Transient network and profile failures now preserve the authenticated user and local data. Genuine `SIGNED_OUT` and invalid-token failures still clear authentication. Android runtime verification is BLOCKED because this workspace has no `adb`, emulator, or physical device.

Status meanings used by the StoreProvider:

- `session_restoring`: initial session check has not resolved.
- `authenticated`: a session-backed user is available.
- `signed_out`: no authenticated session is available or the user explicitly signed out.
- `network_unavailable`: auth verification was retryable because connectivity failed.
- `token_refresh_failed`: the provider reported an invalid/expired/revoked token.
- `profile_fetch_failed`: the session is usable but profile data could not be read.

## Startup sequence

| Step | Responsible code | Actual behavior and risks |
|---|---|---|
| Process/native startup | `index.ts` → `AppBootstrap` | Initializes Skia, dynamically imports `App`, and shows a bootstrap spinner/error boundary. Import failure is rendered as a recoverable fatal screen. |
| Native/JS splash | Expo splash configuration plus `index.ts`/`App.tsx` | `App` keeps a branded React splash until fonts and app state are ready. Native splash behavior is owned by Expo configuration and was not device-tested here. |
| Provider creation | `App.tsx` → `GestureHandlerRootView` → `SafeAreaProvider` → `StoreProvider` → `ThemeProvider` | Providers are mounted once. `StoreProvider` owns auth, hydration, persistence, and account sync. `ThemeProvider` consumes Store settings. |
| Font loading | `App.tsx` → `useFonts` | `App` returns `null` until Inter and Ionicons fonts load. This blocks the whole UI but does not affect auth state. |
| Supabase client | `lib/supabase.ts` | Uses AsyncStorage, `autoRefreshToken: true`, `persistSession: true`, and `detectSessionInUrl: false`. The separate listener only calls `supabase.realtime.setAuth`; it does not control navigation. |
| Auth initialization | `lib/store.tsx` → one `useEffect` | Registers one StoreProvider `onAuthStateChange` listener, calls `getSession`, verifies with `getUser` when possible, then reads `profiles` and `is_admin`. Cleanup unsubscribes the listener. Request IDs prevent stale async results from winning. |
| Local hydration | `lib/store.tsx` → `recoverSnapshot` → `readRecoverySnapshot` | Runs after `authReady`, scoped by `state.user?.id`. It restores user-scoped `sakha-store-v1:user:<id>` data, planner data, focus data, and account state. The legacy unscoped `sakha-store-v1` key is handled separately and never silently merged. |
| Auth gate | `App.tsx` → `Navigation` | Renders `Splash` while `hydrated` or `authReady` is false. Only after both are true does the root stack choose `Dashboard` or `SignIn`. This prevents Login/Home rendering during unresolved startup. |
| Navigation | `App.tsx` → `NavigationContainer` → Root Stack → Drawer → Authenticated Stack | Authenticated state renders `Dashboard` (`MainDrawerNavigator`); unauthenticated state renders `SignIn`/`SignUp`. Notification and invite navigation are deferred until navigation, auth, hydration, and brand intro are ready. |
| Homepage entry | `App.tsx` → `DashboardScreen` | Secondary content, planner, focus, notification, group, and account-sync effects are allowed to load after the authenticated shell. Their failures do not clear auth. |

## Authentication audit

### Verified architecture

- Supabase Auth is the only authentication provider.
- AsyncStorage is the Supabase session adapter and persists access/refresh session data through Supabase's client configuration.
- `StoreProvider` is the only auth state used by protected navigation.
- `onAuthStateChange` is registered once per StoreProvider mount and unsubscribed on cleanup.
- `supabase.ts` has a second listener, but it is limited to Realtime bearer-token synchronization and does not dispatch auth or navigate.
- Login calls `supabase.auth.signInWithPassword`.
- Signup calls `supabase.auth.signUp` with display name/exam metadata and reports email-confirmation-required when no session is returned.
- Manual logout now clears local Store authentication immediately, then asks Supabase to revoke the session remotely.
- Profile and admin reads are secondary enrichment. A failure no longer becomes logout.

### Root cause fixed

Before the fix:

```text
getUser/profile error
  → authCheckFailed
  → reducer(authResolved(null))
  → user cleared + hydrated data reset
  → Root Stack renders SignIn
  → later auth event succeeds
  → Dashboard renders
```

After the fix:

```text
temporary network/profile failure
  → authTransientFailure(network_unavailable | profile_fetch_failed)
  → user and hydrated data retained
  → Dashboard remains mounted
  → offline/reconnecting indicator appears
  → later auth event/session verification can recover
```

Only a genuine `SIGNED_OUT` event or classified invalid/expired/revoked token clears the account.

## Login, signup, and Homepage flow

- Fresh install with no session: `getSession()` resolves empty, StoreProvider enters `signed_out`, recovery loads local unauthenticated-safe state, and the root stack renders Sign In.
- Valid persisted session: the session's user is retained immediately while remote verification/profile enrichment runs; after auth and local recovery, the root stack renders Homepage without intentionally showing Login.
- Successful login: Supabase emits a session event; StoreProvider verifies/enriches the user, marks auth ready, scopes recovery to that user, and the root stack changes to Dashboard.
- Failed login: the `SignInScreen` remains mounted and receives the Supabase error; no authenticated state is created.
- Signup: Supabase creates the account subject to existing policies. If email confirmation is enabled and no session is returned, the screen stays in the signup flow and reports confirmation instead of opening Homepage.
- Profile failure after auth: the session-backed identity remains valid; profile fallback uses metadata/defaults and the user can reach Homepage.
- Manual logout: StoreProvider clears the local user immediately; Supabase sign-out is still requested for remote/session cleanup.

## Fixes implemented

1. Added explicit `authStatus` lifecycle state to `State` and Store context.
2. Added transient auth failure classification for network, token, and profile failures.
3. Changed session restoration to use the persisted session user as a safe local identity while remote verification is unavailable.
4. Stopped profile/admin read failures from clearing authentication.
5. Ignored non-`SIGNED_OUT` null-session events during an already authenticated state.
6. Added an offline/reconnecting indicator in the authenticated shell.
7. Made manual logout locally authoritative and immediate.
8. Added regression tests for state preservation and network-vs-revoked-token classification.

## Files modified

- `lib/store.tsx` — auth lifecycle state, failure classification, session restoration, transient failure handling, manual logout.
- `App.tsx` — authenticated offline/reconnecting indicator.
- `test/store.reducer.test.tsx` — auth regression tests.
- `docs/STUDY_SAKHA_AUTH_STARTUP_AUDIT.md` — this audit.
- `docs/ai-memory/*` — persistent project memory and verification status.

## Verification

### FIXED / VERIFIED on host

- Focused auth/backend Jest: 2 suites, 12 tests passed.
- Expo lint: passed with no reported errors/warnings.
- TypeScript: `pnpm exec tsc --noEmit --pretty false` passed in the current session.
- Expo public config: passed.
- Full Jest executed: 44 suites passed, 7 existing suites failed, 233 tests passed, 12 failed. Failures are in existing Focus Session Setup, Focus Improvements, Group Realtime, Four Fixes, and related test-environment paths; none are auth regression failures.

### BLOCKED / NOT VERIFIED

- Android physical device network-toggle cycles: BLOCKED; no `adb`, emulator, or device is available.
- Android cold-start/session restoration and hardware Back behavior: NOT VERIFIED on device.
- Live Supabase invalid-refresh-token behavior: NOT VERIFIED against the deployed project.
- Release configuration validation: BLOCKED in this workspace because preview environment variables are not present (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_BASE_URL`).
- Web export: not completed in the available tool window.

## Remaining risks

- Supabase's actual emitted event sequence for a revoked refresh token should be verified against the deployed project; the code still treats an explicit `SIGNED_OUT` as authoritative.
- The offline banner is local state feedback, not a network reachability probe; the existing sync engine remains responsible for retry/reconnect behavior.
- Device-specific Android keyboard, splash, AppState, and storage behavior require a development/release build.

## Production-readiness assessment

The false-logout root cause is fixed and regression-tested on the host. The startup/auth gate is deterministic and remains compatible with the existing StoreProvider, Supabase schema, security policies, and React Navigation hierarchy. Production sign-off is **CONDITIONALLY READY** pending Android runtime network-toggle verification, live Supabase token-revocation verification, release environment configuration, and resolution or accepted waiver of the existing unrelated full-suite failures.
