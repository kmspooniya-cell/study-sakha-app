# Notification Implementation Checklist — Study Sakha

**Updated:** 2026-11-27

## Phase 0 — Complete Repository Audit
- [x] Inspect `App.tsx`, `lib/navigation.ts`, `components/Shell.tsx`, `screens/NotificationsScreen.tsx`, `lib/notifications.ts`, `lib/store.tsx`, `lib/types.ts`, `screens/SettingsScreen.tsx`, `lib/theme.tsx`, `lib/i18n.ts`, and `supabase/migrations/`.
- [x] Identify all notification origins, reducer actions, sync behavior, and native channels.
- [x] Document `docs/NOTIFICATION_ARCHITECTURE_AUDIT.md`, `docs/NOTIFICATION_DATA_FLOW.md`, and `docs/NOTIFICATION_IMPLEMENTATION_CHECKLIST.md`.

## Phase 1 — Immersive Notifications UI
- [x] Route-aware immersive shell (`shouldHideAppShell` for `Notifications` & `NotificationSettings`) preserving Android status bar, system navigation bar, and `SafeAreaInsets`.
- [x] Sticky `NotificationHeader` (normal mode + selection mode).
- [x] `AnnouncementCard` (conditional, compact, 2-line clamp, dismissible without deleting source, View All modal when >1 active, no expired/duplicate items).
- [x] Activity summary + real unread count + Mark all read.
- [x] Exactly 5 smart filters (`All`, `Unread`, `Study`, `Social`, `Updates`) with horizontal scroll and preserved selection.
- [x] Chronological grouping (`Today`, `Yesterday`, `This Week`, `Earlier`), newest-first, invalid/future timestamp safety.
- [x] Compact `NotificationRow` (44dp icon, 48dp+ touch targets, theme tokens, light/dark/system support).
- [x] `NotificationEmptyState`, `NotificationSkeleton`, `NotificationErrorState`.
- [x] Virtualized `FlatList` with pagination, memoized rows, and stable keys.

## Phase 2 — Complete Notification Interaction Engine
- [x] Optimistic single/bulk mark read, mark unread, and mark all read.
- [x] Swipe left (Mark read/unread + Delete) and swipe right (Mark read/unread) with single-open-row coordination and accessible button alternatives.
- [x] Long-press selection mode with `Set<string>` state and `NotificationHeader` selection toolbar.
- [x] `NotificationActionMenu` with contextual and type-specific actions.
- [x] Optimistic delete & bulk delete with `UndoSnackbar` and soft-delete/archive.
- [x] Deterministic Android `BackHandler` priority (menu -> modals -> selection -> swipe row -> back).

## Phase 3 — Deep Linking and Centralized Navigation Router
- [x] Centralized `NotificationRouter` (`lib/notifications/notificationRouter.ts`) mapping Planner, Focus, Tests, Streak (`Statistics`), Groups, Chat, Friends, Announcements, and System.
- [x] Pending navigation intent for cold start / unauthenticated / uninitialized navigation states + duplicate-tap guard.
- [x] Safe fallbacks for missing/invalid/expired entities.

## Phase 4 — Notification Preferences
- [x] Immersive `NotificationSettingsScreen` (General, Study, Social, Updates, Quiet Hours across midnight).
- [x] Per-user persistence with optimistic toggle + rollback + OS permission status & system settings shortcut.

## Phase 5 — Backend, Supabase and Delivery
- [x] Additive numbered Supabase migration (`supabase/migrations/202611270002_notification_centre_backend.sql`).
- [x] Centralized `NotificationRegistry`, `NotificationService`, `NotificationRepository`, `NotificationSync`, `NotificationDeduplication`, `NotificationSelectors`.
- [x] Expo push token registration/refresh/cleanup & Android notification channels (preserving `study-sakha-alarm-engine`).
- [x] Realtime subscription & offline idempotent operation queue.

## Phase 6 — Module Integration & Verification
- [x] Integrated TestResult deep link payload in `TestPlayerScreen.tsx`, `NotificationSettings` shortcut in `SettingsScreen.tsx`, and cold-start/foreground routing in `App.tsx`.
- [x] Unit, component, navigation, and mocked Supabase tests (`test/notificationCentre.test.tsx`, `test/notificationLifecycle.test.tsx`, `test/notifications.test.tsx`).
- [x] Host verification: Jest suites, `expo lint`, TypeScript check on notification files, `expo config`, `build:web`.
- [ ] Live Supabase migration push (`202611270002`) & physical Android device/EAS push verification (blocked in Codespace: no `adb`/device or remote push server).
