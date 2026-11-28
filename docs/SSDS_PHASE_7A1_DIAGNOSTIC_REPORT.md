# Study Sakha — Phase 7A.1 Diagnostic Isolation Report

## Scope

This was a diagnostic-only pass. Existing uncommitted worktree changes were preserved. No application source, tests, native Android, backend, StoreProvider, AccountSyncEngine, navigation, compiler configuration, or Jest configuration files were modified.

## 1. Workspace TypeScript process investigation

The workspace command is:

```text
pnpm run lint
  -> tsc --noEmit
```

The direct command was also run:

```text
pnpm exec tsc --noEmit --pretty false
```

Observed result: **exit 143 (SIGTERM), approximately 25 seconds after launch, with zero compiler diagnostics emitted**. A process-tree observation showed:

- TypeScript 6.0.3 was actively running, not exiting because of a type error.
- The `tsc` process reached approximately 1.0–1.1 GiB RSS and high CPU while resolving the workspace.
- The surrounding Expo CLI process was already consuming approximately 450 MiB RSS.
- The container reported no cgroup OOM kill (`memory.events`: `oom 0`, `oom_kill 0`) and no compiler output.
- The command was terminated by the execution/session environment, not by a TypeScript diagnostic or compiler error.
- The initial `/usr/bin/time` attempt was unavailable in this image; it did not execute `tsc` and is not considered a compiler result.

`tsconfig.json` extends `expo/tsconfig.base`, enables strict mode, excludes `node_modules`, `dist`, generated native folders and build config files, and has no project references. The SSDS package has its own bounded config (`include: ["src/**/*.ts", "src/**/*.tsx"]`, `skipLibCheck: true`) and completes successfully. This contrast, plus the large workspace process footprint and zero diagnostics, supports **resource/time-limit isolation**, not a proven TypeScript source error.

Deterministic scope result:

```text
pnpm exec tsc --noEmit --pretty false -p study-sakha-design-system-native/tsconfig.json  # PASS, 0 errors
```

No compiler setting, include/exclude list, or project source was changed to force completion. A complete workspace TypeScript pass remains unverified.

## 2. Jest failures isolated individually

Each failed suite was run independently with `--runInBand --forceExit --silent`. The independent results reproduced the full-suite failures.

| Suite / test | Exact result | Evidence and classification |
|---|---|---|
| `focusImprovements.test.tsx` — direct Group Hall navigation | Jest test timeout at 5,000 ms | Reproduces independently. The stack ends at the test timeout; no changed SSDS callback is implicated. Existing focus/group fixture or lifecycle timing issue. **Pre-existing/baseline.** |
| `focusImprovements.test.tsx` — smart duration selector | Cannot find `Enter a whole number of minutes (positive integers only).` after `-5` | Reproduces independently. The assertion targets shared `FocusSessionSetupModal` validation text, outside Batch 6B presentation changes. **Stale/ pre-existing expectation or shared-modal behavior; not proven migration-caused.** |
| `ssdsBatch3Screens.test.tsx` — TaskPerformance task display | Cannot find `Revise Fundamental Rights (Art. 12–35)` | Reproduces independently. `TaskPerformanceScreen` derives visible tasks from StoreProvider/statistics fixtures; no demo data or SSDS wrapper can safely restore this expectation. **Existing fixture/data-path mismatch.** |
| `focusSessionSetup.test.tsx` — shared room setup | Cannot find `Join room` | Reproduces independently; room setup state never exposes that action in the harness. **Existing fixture/state-path failure.** |
| `focusSessionSetup.test.tsx` — Silent Focus Hall exit | Cannot find `Join room` | Same independent reproduction and state path. **Existing fixture/state-path failure.** |
| `studyPlannerFocusIntegration.test.tsx` — deleted plan | Cannot find accessibility label `Delete plan` | Reproduces independently. Planner state/fixture does not reach the expected detail action. Fixing this would require changing planner behavior or fixture assumptions. **Existing planner fixture/state failure.** |
| `studyPlannerFocusIntegration.test.tsx` — dynamic planned duration | Cannot find `Add Plan` | Reproduces independently. Same planner modal/form state path. **Existing planner fixture/state failure.** |
| `studyPlannerFocusIntegration.test.tsx` — aggregated focus progress | Cannot find `60 min` | Reproduces independently. Same planner data-path issue; duration/accounting logic was not changed. **Existing planner fixture/state failure.** |
| `navigationLayoutFixes.test.tsx` | Suite startup `SyntaxError: Unexpected token 'export'` from `lucide-react-native/dist/esm/lucide-react-native.mjs`, imported through `study-sakha-design-system-native` → `lib/ssdsThemeBridge.tsx` → `lib/ssds.ts` → `DashboardScreen` | Jest’s current transform configuration does not transpile this ESM dependency. **Environment/configuration limitation.** |
| `stabilityFailureScenarios.test.tsx` | Same `lucide-react-native` ESM `Unexpected token 'export'`, through `NotificationsScreen` | Same environment limitation. **Pre-existing test infrastructure issue.** |
| `helpFeedbackSystem.test.tsx` | Same `lucide-react-native` ESM `Unexpected token 'export'`, through `AdminScreen` | Same environment limitation. **Pre-existing test infrastructure issue.** |

The three suite-startup errors account for zero individual tests, while the other five suites contain eight failed tests total. This matches the documented **7 suites / 8 tests** baseline. No failure was proven to be a concrete product defect introduced by the SSDS migration, so no source fix or test weakening was justified.

## 3. Resource and environment blockers

- Workspace `tsc` is CPU/memory intensive and is terminated by the execution environment before diagnostics are printed.
- Jest cannot transform the installed ESM-only Lucide entrypoint in three existing suites unless the test transform/mocking strategy is changed; that is a test-environment change, not a product fix, and was intentionally not made in this diagnostic task.
- Android runtime, native alarm/Focus Lock behavior, and live Supabase/realtime behavior remain outside host diagnostics.

## 4. Verification commands and results

```text
pnpm test -- --runInBand --forceExit --silent                                  # 69 passed / 7 failed suites; 356 passed / 8 failed tests
pnpm test -- test/focusImprovements.test.tsx --runInBand --forceExit --silent   # 1 failed suite, 2 failed tests, reproduced
pnpm test -- test/ssdsBatch3Screens.test.tsx --runInBand --forceExit --silent   # 1 failed test, reproduced
pnpm test -- test/focusSessionSetup.test.tsx --runInBand --forceExit --silent   # 2 failed tests, reproduced
pnpm test -- test/studyPlannerFocusIntegration.test.tsx --runInBand --forceExit --silent # 3 failed tests, reproduced
pnpm test -- test/navigationLayoutFixes.test.tsx --runInBand --forceExit --silent # ESM startup failure, reproduced
pnpm test -- test/stabilityFailureScenarios.test.tsx --runInBand --forceExit --silent # ESM startup failure, reproduced
pnpm test -- test/helpFeedbackSystem.test.tsx --runInBand --forceExit --silent  # ESM startup failure, reproduced
pnpm exec tsc --noEmit --pretty false                                           # exit 143, no diagnostics emitted
pnpm exec tsc --noEmit --pretty false -p study-sakha-design-system-native/tsconfig.json # PASS, 0 errors
git diff --check                                                               # PASS
```

## 5. Remaining blockers and next action

The workspace TypeScript check and full Jest suite are **not passing**. The next safe actions are infrastructure-scoped: run workspace `tsc` in a less resource-constrained environment or with process telemetry, and decide on a repository-approved Jest ESM transform/mock strategy. Product source, business logic, navigation, persistence, native modules and backend remain unchanged.

**Diagnostic verdict:** no proven minimal application defect was found; source files were correctly left untouched.
