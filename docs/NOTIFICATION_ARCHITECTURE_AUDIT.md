# Notification Architecture Audit — Study Sakha

**Audit Date:** 2026-11-27  
**Scope:** Existing notification, announcement, local scheduling, sync, navigation, and settings infrastructure across client, server, and Supabase migrations.

---

## 1. Executive Summary

Study Sakha currently has a **local-first, reducer-backed notification inbox** (`lib/store.tsx`) paired with **Expo local scheduled reminders** (`lib/notifications.ts`), **account-level JSON sync** (`lib/sync/`, `account_sync_documents`), and a **published announcements table** in Supabase (`public.announcements`). However, the existing `NotificationsScreen.tsx` is a basic list wrapped in the global `Shell` (app header + bottom nav), lacks modern inbox interactions (swipe, multi-select, undo, contextual menus, 5 smart filters, `This Week` grouping, skeleton/error states), has no dedicated `NotificationSettingsScreen`, does not fetch `public.announcements` from Supabase, and does not yet support remote push token registration or server-backed user notification records/preferences.

---

## 2. Current Implementation Inventory

### 2.1 Navigation & Shell
- **Navigator (`App.tsx`, `lib/navigation.ts`):** React Navigation v7 (`RootStackParamList` -> `AuthenticatedStackNavigator` with `AppStackParamList`). `Notifications` is registered in `AppStackParamList` (`linking` path: `notifications`).
- **Chrome Visibility (`lib/navigation.ts`, `components/Shell.tsx`):** `shouldHideAppShell(routeName, params)` currently hides `AppHeader`, `AppBottomNav`, `Sidebar`, and `TopBar` only when `routeName === 'Groups' && params?.fullScreen === true`. `NotificationsScreen.tsx` renders `<Shell active="Notifications" ...>` which displays the global header and bottom tabs.
- **Notification Tap Handling (`App.tsx` lines 384–419):** `Notifications.addNotificationResponseReceivedListener` and `getLastNotificationResponseAsync()` capture the payload into `StoreProvider` (`dispatch({ type: 'notify', notif, fromSystem: true })`) and set `pendingNotificationRoute.current = 'Notifications'`, navigating only to `Notifications` rather than deep-linking to the target destination.

### 2.2 State Management & Persistence (`lib/store.tsx`, `lib/types.ts`)
- **Types (`lib/types.ts`):**
  - `AppNotificationKind`: `'planner' | 'focus' | 'test' | 'content' | 'group' | 'streak' | 'announcement'`
  - `AppNotificationTargetRoute`: `'StudyPlanner' | 'FocusCenter' | 'Groups' | 'Tests' | 'TestPlayer' | 'TestResult' | 'Library' | 'Profile' | 'Notifications'`
  - `AppNotification`: `{ id, title, body, at, kind, read, targetRoute?, plannerItemId?, taskId?, groupId?, testId?, resultId?, data? }`
- **Reducer (`lib/store.tsx`):**
  - `readNotif`: marks one (`action.id`) or all notifications `read: true`. Does not support `read: false` (mark unread), bulk IDs, or `updatedAt`/tombstone tracking.
  - `notify`: drops non-system notifications when `state.settings.notifications === false`; deduplicates by `action.notif.id`; prepends to `state.notifications`.
  - `deleteNotif`: hard-filters `state.notifications` by `action.id` (no soft-delete/archive or undo).
  - `announce`: prepends `Announcement` to `state.announcements`.
- **Unread Count (`lib/store.tsx:2484`):** Derived dynamically as `state.notifications.filter((n) => !n.read).length`. Exposed via `StoreContext` (`unread`) and consumed in `AppHeader`, `Sidebar`, `MoreOptionsGrid`, and `NotificationsScreen`.
- **Local Persistence:** Stored in user-scoped `AsyncStorage` (`sakha-store-v1:user:<encodedUserId>`). `announcements` are excluded from `account_sync_documents` (`lib/store.tsx:1761`).
- **Cloud Sync (`lib/sync/syncConflictResolver.ts`):** `notifications` is in `COLLECTION_KEYS` and `accountKeys`, merged by `id` and timestamp (`updatedAt`, `at`, ...), with tombstone support (`tombstones.notifications`).

### 2.3 Notification Sources
1. **Study Planner (`lib/notifications.ts`):** `syncUpcomingPlannerReminder(enabled, items)` schedules local `expo-notifications` (`DATE` trigger) for incomplete `plannerScheduleItems` using `STUDY_REMINDER_CHANNEL_ID = 'study-reminders'`. Skips Android channel APIs in Expo Go (`isExpoGoNotificationRuntime()`).
2. **Focus Centre (`lib/focusSession.tsx:691-707`):** Dispatches `{ type: 'notify', notif: { id: 'focus-complete-<sessionId>', kind: 'focus', ... } }` when a study session completes without an `onCompleted` callback.
3. **Mock Tests (`screens/TestPlayerScreen.tsx:288-298`):** Dispatches `{ type: 'notify', notif: { id: 'n-<timestamp>', kind: 'test', ... } }` on test submission (missing `resultId` in the notification payload!).
4. **Admin Announcements (`screens/AdminScreen.tsx:793-805`):** Dispatches `announce` and `notify` (`kind: 'announcement'`) locally.
5. **Alarm Module (`src/modules/alarm/`, `native/alarm/`):** Isolated module with its own `public.alarm_notifications` table (`202611270001_alarm_friends_and_accountability.sql`) and native Android channel `study-sakha-alarm-engine` (`IMPORTANCE_HIGH` in `AlarmPlaybackService.kt`). **Must remain untouched.**

### 2.4 Backend & Supabase Schema
- **`public.announcements` (`202611010001_initial_study_sakha_schema.sql`):** Stores `id, legacy_id, title, body, audience_type ('all'|'exam'|'plan'), audience_exam_id, audience_plan, status ('draft'|'published'|'unpublished'), sort_order, published_at, created_at, updated_at`. RLS allows public read of `published` rows and admin write. **Gap:** Client does not currently query `public.announcements`, and there is no `expires_at` or `category` column.
- **`public.account_sync_documents` (`202611250001`):** Syncs `notifications` array as part of the user's JSON document.
- **`public.alarm_notifications` (`202611270001`):** Dedicated to the Alarm module's friend accountability feature.
- **Missing Backend Capabilities:**
  - No dedicated `public.notifications` table for server-originated/multi-device notifications with `event_key` deduplication, `archived_at` soft-delete, or RLS-enforced per-user CRUD.
  - No `public.notification_preferences` table for per-user category/quiet-hours preferences.
  - No `public.push_tokens` table for Expo/FCM device token registration and ownership validation.

### 2.5 Existing Tests & Known Gaps
- `test/notifications.test.tsx`: Tests `syncUpcomingPlannerReminder` and Expo Go channel omission.
- `test/notificationLifecycle.test.tsx`: Tests empty state, Expo payload capture, deduplication, persistence across restart, tap-to-navigate, delete, and Today/Yesterday/Earlier grouping.
- **Pre-existing issues:** `NotificationsScreen.tsx` does not support `NotificationSettings`, swipe gestures, selection mode, undo, 5 smart filters, `This Week` grouping, or direct deep-link routing on push tap.
