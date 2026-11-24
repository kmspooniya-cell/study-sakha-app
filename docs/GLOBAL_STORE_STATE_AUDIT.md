# Global Store and State Management Audit

Date: 2026-11-24

## Scope

This Module 3 review traced the global state lifecycle through [lib/store.tsx](../lib/store.tsx), [lib/types.ts](../lib/types.ts), [lib/data.ts](../lib/data.ts), [lib/focusHistory.ts](../lib/focusHistory.ts), [lib/groupActivitySync.ts](../lib/groupActivitySync.ts), [lib/resourceDownloads.ts](../lib/resourceDownloads.ts), the planner/statistics helpers, and StoreContext consumers across `screens/`, `components/`, and `App.tsx`.

The review preserved the existing working tree and did not change dependency, authentication, navigation, or UI modules.

## State architecture

- `StoreProvider` owns the reducer state and exposes one StoreContext value.
- The reducer is synchronous and deterministic. Async work remains in provider effects, callbacks, or dedicated persistence utilities.
- Authentication resolves first through Supabase. A user change resets user-owned state and starts recovery for the new account scope.
- Recovery reads the account-scoped AsyncStorage snapshot, normalizes saved data, loads planner tasks, then replays actions that arrived before hydration completed.
- Persistence is enabled only after hydration, storage readiness, and planner task loading succeed. Writes are serialized through a provider queue.
- The storage key is `sakha-store-v1:user:<encoded user id>` for signed-in users and the legacy unscoped key for local data. The persisted snapshot excludes transient hydration, managed-content, and error fields.
- Planner tasks, focus history, group retry queues, and library downloads use separate storage paths. User-scoped keys prevent cross-account file and record reuse.
- Corrupt snapshots fail recovery visibly and leave the saved value untouched. The provider exposes a retry action instead of overwriting the data.

## Confirmed bug

### Scheduled focus time was not indexed by occurrence

Severity: High for planner and focus integration.

A focus session with both a planner task ID and a schedule occurrence ID was stored only under `plannerTaskStudySeconds[taskId]`. Planner occurrence calculations read `plannerTaskStudySeconds[occurrenceId]`, so the planner showed zero progress after a valid focus session. The same mismatch could prevent automatic schedule completion.

### Fix

[lib/store.tsx](../lib/store.tsx) now records elapsed seconds under:

- the task ID, preserving task performance totals;
- the schedule occurrence ID, when present and different from the task ID.

Completion checks use the updated occurrence total, and the existing `plannerScheduleCompletions` update is now reached correctly.

A regression test was added to [test/store.reducer.test.tsx](../test/store.reducer.test.tsx).

## Persistence findings

### Passing protections

- Account isolation and restoration are covered by [test/store.persistence.test.tsx](../test/store.persistence.test.tsx).
- Malformed planner schedule data does not overwrite the original snapshot and surfaces a recovery error.
- Pending writes are serialized in the store, focus history, group activity, and resource download utilities.
- Duplicate focus and group activity records are rejected by stable IDs.
- Legacy data import is consent-gated and retains the original legacy records.
- Recovery uses a generation counter so an older account read cannot restore over a newer account.

### Remaining limitations

- The provider intentionally exposes the full state object through one context, so any state change can re-render all consumers. This is a performance tradeoff in the current architecture; no measured regression justified introducing selector contexts in this module.
- [lib/store.tsx](../lib/store.tsx) still has a render-time `stateRef.current = state` assignment. It is used to make the latest state available to event callbacks and is flagged by the current React hooks ESLint rule. Refactoring it requires careful testing of pre-hydration action capture and account switching.
- The legacy migration scan resets local migration UI state directly from an effect and is flagged by the current hooks lint rule. It is asynchronous external storage coordination, but the state update pattern should be revisited in a dedicated provider cleanup pass.
- The seed study log helper remains unused. It is existing dead code and was not removed because this module does not authorize changing seeded product behavior.

## Cross-module synchronization

- Planner completion state and schedule completion state remain separate by design.
- Focus sessions update recorded session IDs, study totals, task seconds, and occurrence seconds in one reducer transition.
- The focus history and group activity queues remain independently persisted and deduplicated.
- Statistics derives session and study totals from persisted focus records and store study logs; the reducer repair does not change statistics semantics.
- Notes, bookmarks, reading progress, test results, notifications, and chat remain reducer-owned and persisted through the existing store snapshot.
- Library downloads remain in their dedicated user-scoped storage and are not mixed into the main store snapshot.

## Files modified

- [lib/store.tsx](../lib/store.tsx): indexed focus seconds by both task and schedule occurrence and used the updated occurrence total for completion.
- [test/store.reducer.test.tsx](../test/store.reducer.test.tsx): added regression coverage for task and occurrence indexing and automatic occurrence completion.
- [docs/GLOBAL_STORE_STATE_AUDIT.md](./GLOBAL_STORE_STATE_AUDIT.md): this report.

## Verification

| Check | Result |
|---|---|
| Focused store, persistence, planner, and statistics tests | PASS — 4 suites, 8 tests |
| Full Jest suite | PASS — 26 suites, 96 tests |
| TypeScript | PASS — `pnpm exec tsc --noEmit --pretty false` |
| Web production export | PASS — `pnpm run build:web` |
| Focused ESLint | FAIL — existing findings in [lib/store.tsx](../lib/store.tsx): render-time ref assignment, synchronous effect state updates, unused `seedStudyLog`, and `todayDone` dependency warning |
| Device runtime validation | NOT RUN in this module |

The persistence test intentionally logs the recovery error for malformed saved data while asserting that the snapshot is preserved. This is expected diagnostic output, not a failing test.

## Release assessment

The global store is suitable for continued release work after the scheduled focus occurrence repair. Account-scoped hydration, persistence protection, and reducer determinism have regression coverage. The remaining lint findings and single-context render breadth should be addressed in a separate state architecture pass with dedicated runtime profiling and hydration timing tests.
