# Navigation and Dashboard Audit

Date: 2026-11-24

## Scope

This Module 5 audit inspected [App.tsx](../App.tsx), [lib/navigation.ts](../lib/navigation.ts), [components/Shell.tsx](../components/Shell.tsx), [screens/DashboardScreen.tsx](../screens/DashboardScreen.tsx), all authenticated screen registrations, navigation call sites, back handling, notification navigation, and related tests.

No screen redesign, route removal, dependency change, or unrelated module repair was made.

## Navigation architecture

The application uses this hierarchy:

```
NavigationContainer
└── RootStackNavigator
    ├── SignIn
    ├── SignUp
    └── Dashboard
        └── MainDrawerNavigator
            └── MainStackNavigator
                ├── DashboardRoot
                ├── Library and library subsections
                ├── Groups
                ├── More
                ├── PYQ
                ├── Tests, TestPlayer, TestResult
                ├── SakhaAI
                ├── NoteEditor and BookReader
                ├── CurrentAffairs and Search
                ├── Notifications
                ├── Statistics and TaskPerformance
                ├── StudyPlanner
                ├── FocusCenter, FocusCompletion, FocusLock
                ├── Profile
                ├── Settings
                ├── AppGuide
                └── Admin
```

The root stack is selected from StoreProvider authentication state. The authenticated drawer contains one drawer route, `MainStack`, whose native stack owns the actual feature routes. This matches the typed contracts in [lib/navigation.ts](../lib/navigation.ts).

## Route verification

- Every route in `AppStackParamList` is registered exactly once in [App.tsx](../App.tsx).
- Root routes `SignIn`, `SignUp`, and `Dashboard` are registered exactly once.
- Drawer route `MainStack` is registered exactly once.
- Existing route parameters cover library filters, test IDs, result IDs, focus sessions, room focus, AI prompts, and header branding.
- Navigation call sites use the registered route names.
- Existing route-related TypeScript checks pass.
- No duplicate screen registration was found.
- No route was removed or renamed.

## Dashboard behavior

- `DashboardRoot` is the first authenticated stack screen and therefore the authenticated home destination.
- The logo in [components/Shell.tsx](../components/Shell.tsx) returns to `DashboardRoot` through `StackActions.popTo`.
- The logo is disabled on Dashboard and Sakha AI, preserving the Sakha AI header exception.
- The drawer opens the correct destinations through nested `MainStack` navigation.
- Dashboard shortcuts use registered routes for Library, Study Planner, Focus Center, Focus Lock, tests, notes, PYQ, and Current Affairs.
- Library navigation remains within the authenticated stack.
- Back handling maps library subsections, test details, task performance, and contextual detail screens to their expected parent or Dashboard.
- Android back handling leaves Dashboard, Groups, and Focus Lock to their screen-specific or system behavior as currently designed.
- No back-navigation loop was found in the inspected route paths.

## Confirmed navigation bug

### Notification tap lost during cold start

Severity: Medium.

The notification response listener previously returned immediately when `navigationRef.isReady()` was false. On a cold start or while the brand intro was displayed, a notification tap could therefore be discarded and never open the notification inbox.

### Repair

[App.tsx](../App.tsx) now:

- reads the last notification response during startup;
- queues the supported `Notifications` destination until the navigation container is ready;
- handles foreground and background response events through the same path;
- clears the stored response after navigation so the route is not selected repeatedly.

The response shape is parsed defensively by [lib/navigation.ts](../lib/navigation.ts). Expo SDK 57 documents `getLastNotificationResponseAsync()` for initial notification response handling and recommends checking the last response during startup.

## Lifecycle and leak review

- Navigator components are conditionally rendered from auth state, so the authenticated tree is removed after logout.
- The notification response listener is removed on unmount.
- Focus and back listeners use existing cleanup paths.
- No new global listener or timer was introduced.
- Screen focus behavior remains screen-owned through React Navigation focus effects.
- No unnecessary navigator remount was identified beyond the intentional auth boundary change.

## Files modified

- [App.tsx](../App.tsx): queue and handle initial notification navigation after the container is ready.
- [lib/navigation.ts](../lib/navigation.ts): add defensive notification route extraction.
- [test/navigationBack.test.tsx](../test/navigationBack.test.tsx): add notification route parsing regression coverage.
- [docs/NAVIGATION_DASHBOARD_AUDIT.md](./NAVIGATION_DASHBOARD_AUDIT.md): this report.

## Verification

| Check | Result |
|---|---|
| Navigation test | PASS — 6 tests |
| Full Jest suite | PASS — 26 suites, 98 tests |
| TypeScript | PASS — `pnpm exec tsc --noEmit --pretty false` |
| Focused ESLint | PASS — App.tsx, lib/navigation.ts, and navigation test |
| Web production export | PASS — `pnpm run build:web` |
| Android device navigation | NOT RUN |
| Cold-start notification tap on Android | NOT RUN |

The persistence test emits an expected diagnostic when testing malformed saved data recovery. It does not represent a failed test.

## Remaining issues

- Physical Android verification is still required for hardware back behavior, drawer gestures, auth tree replacement after logout, deep links, and notification taps from a terminated process.
- Notification routing currently supports the existing `Notifications` destination. Additional notification destinations require an explicit data contract and route mapping.
- Full repository ESLint still contains pre-existing findings outside this navigation change and in [lib/store.tsx](../lib/store.tsx).
