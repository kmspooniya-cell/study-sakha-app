# Study Planner Complete Audit

Date: 2026-11-24

## Scope

This audit covered the planner screen, planner schedule helpers, planner state and reducer actions, persistence and migration paths, focus session crediting, statistics derivation, and related tests.

Primary files reviewed:

- [StudyPlannerScreen](../screens/StudyPlannerScreen.tsx)
- [store](../lib/store.tsx)
- [planner helpers](../lib/planner.ts)
- [statistics helpers](../lib/statistics.ts)
- [FocusCenterScreen](../screens/FocusCenterScreen.tsx)
- [FocusCompletionScreen](../screens/FocusCompletionScreen.tsx)
- [focus and planner tests](../test/)

No UI redesign or unrelated module repair was performed.

## Planner Architecture

Planner data has two active representations:

1. Legacy custom tasks in `state.plannerTasks`, migrated from the older AsyncStorage key.
2. Schedule plans in `state.plannerScheduleItems`, which are the recurring and dated plans rendered by the current planner screen.

Schedule occurrences are derived rather than stored as separate task objects. The stable occurrence identity is:

`<scheduleId>::<YYYY-MM-DD>`

This identity is used for per-occurrence completion and credited focus seconds. The base schedule ID remains separate from the occurrence ID.

Planner persistence is hydrated through the StoreProvider. The screen performs the legacy planner migration once after storage is ready, and malformed persisted records are rejected and surfaced through the existing persistence error path.

## Confirmed Defect

### Local calendar dates were mixed with UTC dates

**Severity:** High for users outside UTC, especially near midnight.

Planner selection and statistics use local calendar dates. Focus crediting and the focus completion screen still used `toISOString().slice(0, 10)`, which produces a UTC date. A session completed near midnight could therefore be credited to the previous or next planner day. For a scheduled plan, this could prevent the expected occurrence from reaching its planned duration.

### Root cause

- Store-level `dayKey` returned a UTC ISO date.
- Focus completion derived its daily summary date directly from UTC ISO formatting.
- Statistics and planner occurrence calculations use local date parts.

### Fix implemented

- [dayKey](../lib/store.tsx) now formats the device-local year, month, and day.
- [FocusCompletionScreen](../screens/FocusCompletionScreen.tsx) uses the shared helper for the session summary and weekly streak keys.
- [store reducer tests](../test/store.reducer.test.tsx) verify that the shared store key and statistics local date key agree.

This also corrects existing callers in Focus Centre, Focus Lock, profile and admin code that already use the shared `dayKey` helper.

## Recurrence and Occurrence Verification

Verified behavior:

- Daily, weekly, monthly and yearly recurrence rules are evaluated by date.
- Weekly schedules use configured repeat days, falling back to the schedule start day.
- Manual completion is keyed by occurrence ID, so completing one recurring occurrence does not complete all occurrences.
- Recurring occurrence study seconds are read from the occurrence key and do not fall back to the base schedule key.
- Non-recurring legacy records may still use the base task key for compatibility.
- Planned progress is capped at 100%.
- A schedule occurrence becomes completed when explicitly completed or when credited actual seconds reach its planned duration.
- Editing a custom planner task preserves its ID and supporting accumulated study data. Changing its target date resets only the task's completion state as intended.
- Deleting a schedule item removes the active schedule item while retaining historical completion and credited-second maps.

The schedule helper and planner screen contain equivalent recurrence checks. No confirmed discrepancy was found in the reviewed recurrence paths.

## Focus Integration

The existing focus reducer protections were verified:

- A saved focus session is deduplicated by session ID.
- Focus seconds are indexed by task ID and, when supplied, by schedule occurrence ID.
- Automatic schedule completion uses the updated accumulated occurrence total, including the current session.
- The focus completion screen does not add daily minutes again when the session ID is already recorded.

The date-key fix ensures these credits are associated with the same local planner day used by the planner and statistics modules.

## Persistence and Statistics

Verified behavior:

- Planner schedule items are normalized during hydration.
- Invalid persisted schedule data enters the existing protected recovery path and emits a useful error.
- Legacy planner migration is guarded so it does not repeatedly import the same data.
- Statistics derives scheduled task progress from occurrence-level planner data and normalized focus sessions.
- Existing historical data is retained when an active schedule is deleted.

No additional confirmed data-loss, duplicate-occurrence, or planner/statistics synchronization defect was found in the inspected code and tests.

## Files Changed

This module changed:

- [lib/store.tsx](../lib/store.tsx): local calendar date keying.
- [screens/FocusCompletionScreen.tsx](../screens/FocusCompletionScreen.tsx): shared local date key for daily summary and streak calculations.
- [test/focusCompletionScreen.test.tsx](../test/focusCompletionScreen.test.tsx): mock for the new shared helper.
- [test/store.reducer.test.tsx](../test/store.reducer.test.tsx): local-date consistency regression test.

The repository already contained unrelated uncommitted work from earlier modules; it was preserved.

## Verification Results

### Focused planner and integration tests

**PASS**

- 8 suites
- 39 tests
- Includes planner schedules, planner filters, planner group sync, focus session setup, focus completion, statistics, store reducer and persistence tests.

The original `focusSessionSetup.test.tsx` 5-second timeout did not recur. Its timeout was not increased, assertions were not weakened, and the test was not skipped.

### Full Jest suite

**PASS**

- 26 suites
- 99 tests

Jest prints the existing expected persistence error for the malformed-data recovery test and reports an open-handle warning after completion. The process still exits successfully. The warning is not a planner assertion failure.

### TypeScript

**PASS**

`pnpm exec tsc --noEmit` completed successfully.

### Web production export

**PASS**

`pnpm run build:web` completed successfully and exported the web bundle.

### ESLint

**PARTIAL**

The changed completion screen and test files passed lint. The command including [lib/store.tsx](../lib/store.tsx) reports two pre-existing errors in the StoreProvider:

- Updating `stateRef.current` during render.
- Synchronous state updates in an effect during legacy migration setup.

It also reports existing warnings for an unused `seedStudyLog` helper and a dependency suggestion. These findings are outside the confirmed planner date defect and were not changed because this module is restricted to planner functionality and directly related helpers.

## Remaining Issues

- No physical Android device or emulator was available in this run, so background execution, process recreation, timezone changes on an actual Android device, notification behavior, and native focus behavior remain device-test requirements.
- The StoreProvider ESLint errors remain and should be handled in a separate global store quality module.
- Jest's open-handle warning remains for the broader test environment and was not attributable to a failing planner test in this run.
- Recurrence behavior should still be manually checked across a daylight-saving timezone and a timezone east/west of UTC.

## Release Assessment for Module 6

**Partially verified.** Planner recurrence, occurrence identity, persistence paths, focus crediting logic and web regression checks pass automated verification. Android runtime and device-specific timezone/background behavior remain unverified. No further planner code changes are justified by the current evidence.

