# Study Sakha — Phase 7A Host-Side Stability Remediation

## Scope and preservation

This task was restricted to host-side diagnosis and safe remediation. Existing worktree changes were preserved. No application source, native Android module, backend/Supabase schema, StoreProvider, AccountSyncEngine, navigation, test, or configuration file was modified. No confirmed implementation defect met the threshold for a safe code change during this pass.

## Initial baseline and exact diagnostics

Commands run before analysis:

```text
pnpm test -- --runInBand --forceExit --silent
pnpm exec tsc --noEmit --pretty false
```

Full Jest result: **69 suites passed / 7 failed; 356 tests passed / 8 failed**. This matches the Phase 7 baseline exactly.

The failed suites and assertions were:

| Suite | Failing test/assertion | Classification | Action |
|---|---|---|---|
| `test/focusImprovements.test.tsx` | Direct Group Hall navigation test exceeded the 5-second Jest timeout | Existing focus/group test-path failure; no stack reached a changed SSDS presentation callback | No safe migration fix identified |
| `test/focusImprovements.test.tsx` | Expected custom-duration validation text was absent after entering `-5` | Existing `FocusSessionSetupModal` expectation mismatch; Batch 6 screen changes do not own this modal validation copy | No assertion weakening or unrelated modal rewrite |
| `test/ssdsBatch3Screens.test.tsx` | `TaskPerformanceScreen` could not find `Revise Fundamental Rights (Art. 12–35)` | Existing fixture/statistics-data mismatch in the Batch 3 test path; current screen still derives tasks from StoreProvider/statistics data | No demo data or business-logic change |
| `test/focusSessionSetup.test.tsx` | Shared room setup could not find `Join room` | Existing room/setup fixture/state path; no changed SSDS callback implicated | No navigation or room-flow change |
| `test/focusSessionSetup.test.tsx` | Silent Focus Hall exit could not find `Join room` | Same existing room/setup fixture/state path | No navigation or room-flow change |
| `test/studyPlannerFocusIntegration.test.tsx` | Could not find `Delete plan` | Existing planner fixture/state path; changing planner persistence or task state would violate scope | No planner logic change |
| `test/studyPlannerFocusIntegration.test.tsx` | Could not find `Add Plan` | Existing planner fixture/state path | No planner logic change |
| `test/studyPlannerFocusIntegration.test.tsx` | Could not find `60 min` | Existing planner duration fixture/state path; duration calculations preserved | No calculation change |
| `test/navigationLayoutFixes.test.tsx` | Jest could not transform ESM `lucide-react-native` (`Unexpected token 'export'`) | Existing test-environment transformation limitation | No global Jest transform change |
| `test/stabilityFailureScenarios.test.tsx` | Jest could not transform ESM `lucide-react-native` | Existing test-environment transformation limitation | No test suppression |
| `test/helpFeedbackSystem.test.tsx` | Jest could not transform ESM `lucide-react-native` | Existing test-environment transformation limitation | No test suppression |

The table contains eight failed test cases plus three suite-level startup failures, matching the reported eight-test Jest count (suite-level startup failures do not add individual test cases).

The failure set and totals are unchanged from the documented pre-migration/Phase 7 baseline. No failure was demonstrated to be caused by the Batch 6B SSDS wrappers. The Groups realtime harness issue previously identified in Batch 6B remains covered by its shared SSDS mock and passes in focused execution.

## TypeScript diagnostic inventory

`pnpm exec tsc --noEmit --pretty false` was started against the current workspace but was terminated by the container at exit **143** before emitting diagnostics (`/tmp/phase7a-ts.txt` contained no compiler output). Therefore this run cannot establish a new diagnostic inventory or claim workspace TypeScript remediation.

The previously recorded workspace baseline remains authoritative until a complete compiler run is available. It includes diagnostics in the SSDS bridge/component types, legacy screen token/style types, and broad Jest/test typings. The SSDS package check remains independently verifiable and passed.

No `any`, `@ts-ignore`, broad assertion, or compiler suppression was introduced.

## Theme-token audit

The reviewed hybrid screens contain three categories of non-token colors:

1. **Intentional domain colors:** chart series, procedural focus themes, alarm/mission states, and category illustrations. These should not be globally replaced.
2. **Native/platform colors:** system overlays, status/permission affordances, and native-host boundaries. These require device validation.
3. **Potential token bypasses:** raw screen-level colors in Settings, Notifications, NotificationSettings, FocusCenter, SakhaAI, StudyPlanner, Groups and TestPlayer alongside legacy `useTheme`/raw `Text`/custom containers.

The current evidence does not isolate a clear, low-risk bypass whose replacement can be made without visual regression or layout redesign. Settings category icons already use Lucide components through `SSDSIcon` with SSDS size/stroke/color resolution. Consequently, no color or icon changes were made in this stability task.

Recommended follow-up is a controlled light/dark/system/custom-accent/high-contrast/reduced-motion comparison, then narrowly replace only values proven to ignore the bridge.

## Verification after diagnosis

```text
pnpm exec tsc --noEmit --pretty false -p study-sakha-design-system-native/tsconfig.json  # PASS, 0 errors
pnpm test -- --runInBand --forceExit --silent                               # 69 passed / 7 failed suites; 356 passed / 8 failed tests (unchanged baseline)
git diff --check                                                          # PASS
```

No source files were changed, so no new-file ESLint run was applicable. Existing baseline diagnostics remain:

- StudyPlannerScreen: 24 errors / 14 warnings.
- GroupsScreen: 7 errors / 22 warnings.
- SmartStudyRoomScreen: 0 errors / 2 warnings.
- StudySakhaAlarmScreen: 0 errors / 0 warnings.
- TestPlayerScreen: 2 errors / 0 warnings.

## Remaining risks

- Full Jest is not green, although its failures match the documented baseline.
- Workspace TypeScript could not complete in this container; no new diagnostics can be ruled in or out from this run.
- Android runtime, native alarm/Focus Lock enforcement, live Supabase/realtime multi-client behavior, and accessibility/device rendering remain unverified.
- Hybrid legacy/SSDS presentation may still bypass theme tokens in edge states; this requires visual matrix testing rather than global replacement.

## Recommended next phase

1. Run workspace TypeScript in an environment where the compiler completes and capture a line-level baseline.
2. Repair the existing Jest fixture/environment failures without weakening assertions or changing product logic.
3. Execute the theme matrix on device and remediate only confirmed token bypasses.
4. Perform Android native and live Supabase multi-client verification.

## Verdict

**Host-side stability remediation is complete as a diagnostic pass, but the project is not fully ready.** No safe confirmed implementation defect was found to fix without changing unrelated behavior; the documented Jest, lint, workspace TypeScript, Android, and live-backend limitations remain.
