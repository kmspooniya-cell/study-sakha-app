# Notification Data Flow — Study Sakha

**Last Updated:** 2026-11-27

---

## 1. Notification Origin & Ingestion Flow

```text
[Local Modules]                     [Expo Notifications]                 [Supabase Backend]
 - Study Planner (scheduled)         - Foreground received listener       - public.notifications (user inbox)
 - Focus Centre (session complete)   - Background/cold tap response       - public.announcements (published)
 - Test Player (test submitted)      - Presented tray capture             - Supabase Realtime (postgres_changes)
 - Groups / Chat / Friends           - Push token registration            - account_sync_documents (fallback/merge)
        |                                     |                                     |
        +-------------------------------------+-------------------------------------+
                                              |
                                              v
                              NotificationService (lib/notifications/)
                                - Normalize kind -> 5 smart categories
                                - Deduplicate by id & stable eventKey
                                - Filter future-scheduled items from inbox
                                - Respect per-category & quiet-hours prefs
                                              |
                                              v
                                   StoreProvider (lib/store.tsx)
                                    - Optimistic reducer updates
                                    - User-scoped AsyncStorage persistence
                                    - Derived unread count (non-archived, !read)
                                              |
                                              v
                       NotificationsScreen / NotificationSettingsScreen
```

---

## 2. Read / Unread / Delete / Undo Lifecycle

1. **Optimistic UI Update:**
   - `markRead(ids)` / `markUnread(ids)` / `markAllRead()` immediately updates `StoreProvider` state and `unread` badge count.
   - `softDelete(ids)` moves items into a pending-undo buffer, removes them from the visible feed, updates `unread`, and displays an Undo snackbar (configurable window, e.g. 4.5s).
2. **Undo:**
   - Tapping **Undo** cancels the pending deletion timer and restores the exact notification objects in-place (preserving original `read` state and `at` timestamp).
3. **Background Persistence & Offline Queue:**
   - Once committed (or immediately for read/unread), `NotificationSyncQueue` (`AsyncStorage`-backed, user-scoped) enqueues idempotent mutations (`mark_read`, `mark_unread`, `mark_all_read`, `archive`, `restore`).
   - When authenticated and online, mutations flush to Supabase (`public.notifications` + `account_sync_documents` sync).
   - On network failure, operations remain queued with retry/backoff and reconcile when connectivity returns.

---

## 3. Deep Linking & Navigation Flow

1. **Tap in Inbox (`NotificationsScreen`):**
   - Optimistically marks notification read -> resolves destination via `NotificationRouter` -> navigates via React Navigation without blocking on network.
   - Preserves `NotificationsScreen` filter and scroll offset in navigation/hook state so Back returns cleanly.
2. **Tap on System/Push Notification (`App.tsx`):**
   - `NotificationRouter` parses `response.notification.request.content.data`.
   - Captures notification into `StoreProvider` (deduplicated).
   - If `!navigationRef.isReady() || !state.hydrated || !state.authReady || showBrandIntro || !state.user`, stores a `pendingNavigationIntent` (keyed by `notificationId` to prevent duplicate opens).
   - Once ready & authenticated, validates destination/entity ID and navigates to the target screen (with safe fallback to `Notifications` if the entity is unavailable/invalid).

---

## 4. Preferences & Quiet Hours Flow

- **Master & Category Toggles:** Stored per-user in `NotificationPreferences` (synced to `AsyncStorage`, `SettingsScreen`-compatible storage, and Supabase `public.notification_preferences`).
- **Separation of Concerns:** Disabling push for a category suppresses OS-level/push delivery for that category while still allowing in-app inbox visibility when `inAppEnabled` is true.
- **Quiet Hours:** Evaluates `startTime` / `endTime` in the user's local timezone (correctly handling midnight wrap-around such as `22:30` -> `05:30`). Suppresses non-urgent push alerts during quiet hours; urgent Alarm Engine behavior (`StudySakhaAlarmModule` / `AlarmPlaybackService.kt`) is never affected.
