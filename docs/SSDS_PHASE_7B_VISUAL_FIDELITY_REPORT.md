# Study Sakha — Phase 7B SSDS Visual Fidelity Remediation

## Executive summary

The mounted application was reviewed against the Gemini-generated SSDS tokens, typography, icon contract and component variants. The StoreProvider-to-SSDS bridge remains the single appearance source of truth and SSDS persistence remains disabled. Specialized interfaces were intentionally retained where they own exam, focus, realtime, chat, reader, chart, alarm or native workflows.

This pass made a narrow, evidence-backed icon consistency improvement: notification and TestPlayer action icons now use Lucide icons through `SSDSIcon`, preserving their existing semantics and touch handlers. No business logic, navigation, persistence, native, backend or scoring behavior was changed.

The application is **not claimed pixel-perfect**. Several specialized screens still contain justified hybrid presentation and require screenshot/device comparison before further replacement can be considered safe.

## Files modified in this pass

- `screens/NotificationsScreen.tsx` — replaced three Ionicons usages (announcement, close, back) with Lucide icons through `SSDSIcon`.
- `screens/NotificationSettingsScreen.tsx` — replaced accordion chevrons, back, and notification-disabled Ionicons with Lucide icons through `SSDSIcon`.
- `screens/TestPlayerScreen.tsx` — replaced close, timer, question-grid, and completion Ionicons with Lucide icons through `SSDSIcon`.
- Existing unrelated worktree changes in all other files were preserved.

## Mounted-screen classification

| Route/screen | Classification | Current visual status / remaining work |
|---|---|---|
| AppGuide | Fully SSDS aligned | Core SSDS layout, typography, icon and button primitives. |
| More | Partially aligned | SSDS section/stack integration; shared option grid remains custom. |
| SignIn, SignUp | Partially aligned | SSDS forms/cards/buttons; auth shell and some layout remain custom. |
| Search, CurrentAffairs, PYQ, Tests | Partially aligned | SSDS search/cards/badges/empty states; domain rows and shell remain custom. |
| BookReader, NoteEditor | Specialized custom UI intentionally retained | Reader/editor, rich text, keyboard and content actions require custom treatment. |
| TaskPerformance | Partially aligned | SSDS analytics shell; task detail/list remains domain-specific. |
| TestResult | Specialized custom UI intentionally retained | Charts, result review and custom score presentation retained. |
| Library | Fully aligned host surface | SSDS cards, search, badges, progress, skeleton and empty states. |
| Statistics | Partially aligned | SSDS analytics shell; SVG charts and series retained. |
| Profile | Partially aligned | SSDS avatar/surface adoption; editing/photo UI remains custom. |
| Admin | Partially aligned | SSDS actions/inputs/confirmation; admin data views remain custom. |
| Notifications | Partially aligned | Feed/gesture rows remain specialized; action/header icons now use SSDS icon contract where touched. |
| NotificationSettings | Partially aligned | Preference rows remain custom; accordion/back/permission icons now use SSDS icons. |
| Settings | Partially aligned | Lucide category registry and SSDSIcon are correct; extensive settings controls still mix raw Text/custom colors. |
| SakhaAI | Specialized custom UI intentionally retained | Markdown, chat bubbles, composer, streaming and action cards require custom rendering. |
| FocusLock | Specialized custom UI intentionally retained | Native permission/status/enforcement presentation is specialized. |
| Dashboard | Specialized custom UI intentionally retained | Goal dial, progress widgets and quick actions remain domain-specific. |
| FocusCenter | Specialized custom UI intentionally retained | Procedural Skia/Canvas, timer, music and session lifecycle remain custom. |
| FocusCompletion | Specialized custom UI intentionally retained | Reflection/capture/share/animation remain custom. |
| StudyPlannerScreen | Specialized custom UI intentionally retained | Timeline, forms, date pickers and duration workflow remain custom; baseline lint issues remain. |
| Groups | Specialized custom UI intentionally retained | Realtime social/chat/presence UI remains custom. |
| SmartStudyRoom | Specialized custom UI intentionally retained | Room lifecycle, timer and presence UI remain custom. |
| StudySakhaAlarm | Specialized custom UI intentionally retained | Native alarm host and mission presentation remain specialized. |
| TestPlayer | Specialized custom UI intentionally retained | Exam controls remain custom; action icons now use SSDSIcon. |
| LibraryNotes, LibraryBooks, LibraryPYQSets, LibraryStarred, LibraryDownloads | Mounted detail routes requiring follow-up | Active navigator routes; not safe to call fully aligned without dedicated visual comparison. |
| Legacy `StudyPlanner.tsx` | Legacy/compatibility file | `App.tsx` mounts `StudyPlannerScreen`; file was not deleted because repository-wide removal safety is not established. |

## Typography audit

SSDS `SSDSText` and tokenized typography are used in migrated shells and headings. Raw React Native `Text` remains in specialized/custom trees, settings controls, chat/markdown, exam content, charts, native-host UI and legacy compatibility surfaces. These are retained where replacing text would risk rich content, accessibility, or domain behavior. Remaining hybrid typography should be compared under large text scale and long Hindi/Devanagari strings before replacement.

## Icon audit

The authoritative contract remains `study-sakha-design-system-native/src/components/foundation/Icon.tsx`: Lucide icons, semantic token colors, sizes 14/16/20/24/32/44 and default stroke width 1.75. Settings category icons already use explicit Lucide components (`UserIcon`, `Palette`, `GraduationCap`, `Calendar`, `Timer`, `Shield`, `Sparkles`, etc.) through `SSDSIcon`; no arbitrary replacement was made.

This pass removed clear legacy Ionicons from the touched notification and TestPlayer action surfaces. Ionicons remain in FocusCenter, SakhaAI and other specialized screens where a complete semantic mapping and visual comparison is still required. MaterialCommunityIcons/emoji/domain icons were not globally replaced because the original SSDS source does not define authoritative equivalents for every use.

## Color and theme audit

The approved Blue–Teal–Amber values remain in SSDS token files. The existing bridge maps StoreProvider theme mode, accent/custom accent, text/display scale, density, contrast, reduce motion and animation intensity to SSDS and passes `disablePersistence`.

Screen-level hardcoded colors were classified as follows:

- Focus procedural themes, chart series, alarm/mission states and category/background previews: intentional domain/illustration colors.
- Native/platform boundaries: retained pending Android verification.
- Ordinary surfaces/text/borders in hybrid screens: potential token bypasses, but not globally replaced because screen-level context and custom accent behavior require visual confirmation.

StudyPlanner already overlays its primary background/surface/text/border/accent values from `useSSDSTheme`; remaining static palette values are calendar/status/illustration-specific. Settings category background swatches intentionally represent category identity and are not ordinary surfaces.

## Shared component and legacy dependency audit

`lib/ssds.ts` remains the single SSDS export barrel. `components/ui.tsx`, `components/BottomSheet.tsx` and `lib/theme.tsx` remain compatibility dependencies for specialized and legacy consumers. No deletion is safe without a complete consumer and runtime inventory. No duplicate persistence or theme provider was introduced.

## Functionality preserved

The icon changes preserve existing press handlers, labels, navigation, notification actions, test timer behavior and answer/scoring logic. No StoreProvider, AccountSyncEngine, Supabase, realtime, Gemini, Focus Lock, alarm, planner, focus-session or TestPlayer business logic was changed.

## Verification

```text
pnpm exec tsc --noEmit --pretty false -p study-sakha-design-system-native/tsconfig.json
# PASS — 0 errors

pnpm test -- test/notificationCentre.test.tsx test/notificationLifecycle.test.tsx test/settingsScreen.test.tsx --runInBand --forceExit --silent
# PASS — 3 suites, 17 tests

pnpm test -- test/ssdsBatch4Screens.test.tsx test/ssdsBatch3Screens.test.tsx --runInBand --forceExit --silent
# 1 existing Batch 3 TaskPerformance fixture failure; Batch 4 suite passed (8 tests)

pnpm exec eslint screens/NotificationsScreen.tsx screens/NotificationSettingsScreen.tsx screens/TestPlayerScreen.tsx
# Existing TestPlayer baseline: 2 errors, 0 warnings; no new icon-related diagnostics

git diff --check
# PASS
```

Workspace TypeScript remains subject to the documented resource/termination limitation. Full Jest remains subject to the documented fixture/context failures; no green claim is made.

## Remaining visual mismatches and device needs

- Hybrid raw typography and legacy icon use remain in specialized screens.
- Additional mounted detail routes need dedicated visual inspection.
- Dark mode, custom accent, high contrast, reduced motion, large Hindi text, keyboard/safe-area layouts and accessibility touch targets require rendered screenshot/device comparison.
- Android alarm, Focus Lock, notification permissions, audio, planner persistence, TestPlayer background behavior and realtime multi-client flows remain unverified.

## Recommended remediation order

1. Capture light/dark/custom-accent screenshots for all mounted routes.
2. Replace only confirmed ordinary-surface token bypasses.
3. Complete an evidence-based Lucide mapping for remaining Ionicons in specialized screens.
4. Audit additional Library detail routes and legacy planner usage.
5. Run Android accessibility/native and live Supabase verification.

## Final readiness assessment

**READY WITH KNOWN ISSUES.** Gemini SSDS remains authoritative and the safe icon consistency improvements are complete for this pass, but pixel-perfect fidelity and release readiness cannot be claimed without rendered comparison, baseline test/TypeScript remediation, and Android/live-backend verification.
