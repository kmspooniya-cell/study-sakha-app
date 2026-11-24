# Authentication and Session Management Audit

Date: 2026-11-24

## Scope

This Module 4 audit traced authentication through [lib/supabase.ts](../lib/supabase.ts), [lib/store.tsx](../lib/store.tsx), [App.tsx](../App.tsx), [SignInScreen.tsx](../screens/SignInScreen.tsx), [SignUpScreen.tsx](../screens/SignUpScreen.tsx), [SettingsScreen.tsx](../screens/SettingsScreen.tsx), realtime authentication helpers, persistence tests, and the checked-in Supabase migrations.

No migration history was changed.

## Authentication architecture

1. The Supabase client uses the public project URL and publishable key from Expo public environment variables.
2. Supabase Auth uses AsyncStorage, persistent sessions, automatic token refresh, and disables browser URL session detection for native compatibility.
3. The Supabase module updates Realtime auth whenever the Auth session changes.
4. StoreProvider registers one Auth state listener, obtains the initial session, verifies the access token with `supabase.auth.getUser(access_token)`, and loads the profile plus the database-backed admin role.
5. StoreProvider uses request IDs and an active flag to ignore stale asynchronous authentication results and unsubscribes the listener on unmount.
6. Once the identity is resolved, account-scoped local state is recovered from AsyncStorage. The store resets user-owned state when the account changes.
7. App navigation renders the authenticated drawer only when `state.user` exists and keeps the splash screen visible until both auth and store hydration are ready.
8. Sign-out relies on Supabase Auth's `SIGNED_OUT` event to clear the StoreProvider identity and recover the local unauthenticated scope.

## Confirmed issue fixed

### Previous identity could remain authenticated after verification failure

Severity: High.

When a new or refreshed session arrived while a previous user was still in StoreProvider state, failure during server-side session verification dispatched `authCheckFailed`. That action previously set only `authReady: true`, leaving `state.user` unchanged. The app could therefore continue rendering the previous account while the new session was unresolved or invalid.

### Repair

[lib/store.tsx](../lib/store.tsx) now routes `authCheckFailed` through the existing `authResolved(null)` reset path. This:

- clears the in-memory authenticated identity;
- resets user-scoped state and storage readiness;
- prevents the previous account from remaining visible;
- preserves the previous account's AsyncStorage snapshot under its existing user key;
- allows a later valid session to hydrate the correct account again.

Regression coverage was added in [test/store.reducer.test.tsx](../test/store.reducer.test.tsx).

## Authentication and security findings

### Signup and login

- Input validation exists for sign-in and sign-up.
- Passwords are sent only to Supabase Auth through the client SDK.
- The client does not contain service-role credentials.
- Sign-up stores display name and exam metadata in Supabase Auth metadata; the database trigger creates the profile and learner role.
- Email confirmation is surfaced when Supabase returns no session.

### Session restoration and token refresh

- AsyncStorage persistence and automatic refresh are enabled and covered by [test/supabasePersistence.test.tsx](../test/supabasePersistence.test.tsx).
- The initial session is verified server-side with the access token.
- Auth state changes are request-versioned to prevent stale session results from winning.
- Realtime receives the current access token through `setAuth`.
- The exact refresh, expiry, and revocation behavior still requires a connected Supabase project and real device testing.

### Logout and account switching

- Successful Supabase sign-out emits the listener event and clears the user state.
- Failed sign-out returns an error and does not discard the still-active local session.
- Account changes reset user-owned state before account-scoped recovery.
- Existing persistence tests cover switching between two users and verify that notes, planner tasks, schedule items, and results do not cross accounts.
- The repaired verification-failure path closes the remaining stale-identity window.

### Authorization and RLS

The checked-in migrations use database-side authorization:

- `profiles` self-read and self-update policies use `auth.uid()`.
- `user_roles` is not readable by the client.
- `is_admin()` is a security-definer function that checks `user_roles` using `auth.uid()`.
- Managed content writes and private storage writes require the database admin check.
- Study group and Realtime policies require authenticated active membership.
- Client role checks control presentation only; server policies remain the authorization boundary.

No RLS weakening or client-side authorization bypass was found in the inspected migrations. Live policy evaluation was not possible without connected Supabase credentials.

## Files modified

- [lib/store.tsx](../lib/store.tsx): clear stale authenticated identity on session verification failure.
- [test/store.reducer.test.tsx](../test/store.reducer.test.tsx): regression test for failed verification clearing the previous user.
- [docs/AUTHENTICATION_SESSION_AUDIT.md](./AUTHENTICATION_SESSION_AUDIT.md): this report.

No changes were made to [lib/supabase.ts](../lib/supabase.ts), sign-in/sign-up UI, migrations, dependencies, or unrelated modules.

## Verification

| Check | Result |
|---|---|
| Authentication, persistence, RLS contract, and reducer tests | PASS — 5 suites, 13 tests |
| Full Jest suite | PASS — 26 suites, 97 tests |
| TypeScript | PASS — `pnpm exec tsc --noEmit --pretty false` |
| Web production export | PASS — `pnpm run build:web` |
| Focused ESLint | FAIL — existing [lib/store.tsx](../lib/store.tsx) ref-in-render and set-state-in-effect errors, plus existing warnings |
| Live Supabase authentication | NOT RUN — no connected backend session test |
| Physical Android session testing | NOT RUN |

The persistence test logs an expected recovery error while verifying that malformed saved data is not overwritten. It does not represent a failed test.

## Remaining external verification

Before release, verify against a non-production Supabase test project:

- sign-up with email confirmation enabled;
- sign-in and invalid credentials;
- app restart session restoration;
- access-token refresh and expired-token recovery;
- remote sign-out and revoked session;
- account switching on one device;
- profile self-access and cross-user denial;
- learner versus admin RLS behavior;
- private storage access;
- Realtime reconnect after token refresh and backgrounding.

The release remains partially verified until those backend and device checks are executed.
