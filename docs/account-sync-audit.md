# Study Sakha account-sync audit

## Current architecture

- Supabase Auth restores the session through `supabase.auth.getSession()` and verifies it with `getUser()`.
- `StoreProvider` is the application state boundary. It restores a user-scoped AsyncStorage snapshot after authentication and writes persisted reducer state back to AsyncStorage.
- Existing Supabase user data includes `profiles`, published/admin-managed content, study groups, memberships, rooms, room sessions, room messages/reports, and group activity events.
- Existing realtime is limited to group-room channels and does not synchronize the application store.

## Persistence coverage before account sync

| Domain | Existing source | Before this change |
| --- | --- | --- |
| Auth identity/password | Supabase Auth | Synchronized by Auth; passwords never enter app state |
| Profile name/exam | `profiles` plus Auth metadata | Partially synchronized; profile writes are remote, other fields were local metadata/store. The current photo value is a device URI, so it is intentionally not uploaded or synchronized |
| Theme and preferences | Store/AsyncStorage | Device-local |
| Notes | Store/AsyncStorage | Device-local |
| Planner tasks/settings/completions | Store/AsyncStorage and planner helpers | Device-local; group completion events were separately remote |
| Bookmarks/starred/reading progress | Store/AsyncStorage | Device-local |
| Study logs/statistics/results | Store/AsyncStorage and local history files | Device-local, with group activity as a separate remote projection |
| Focus history/preferences | Store plus user-scoped history files | Device-local except group activity submissions |
| Sakha AI chat | Store/AsyncStorage | Device-local; request credentials/loading state are not persisted |
| Groups/rooms/membership | Supabase tables/RPCs/realtime | Backend synchronized |
| Notifications/preferences | Store/AsyncStorage and local scheduling | Device-local; native permission/file state remains device-specific |
| Managed learning content | Supabase `managed_content` | Backend synchronized, not user-owned account state |

## Account-sync design

The application-owned account state is stored as one versioned, user-scoped Supabase document. The client keeps the existing local snapshot for immediate/offline use, queues immutable snapshot operations per authenticated user, and uploads through an optimistic-concurrency RPC. Incoming Realtime rows and periodic pulls are merged through `syncConflictResolver`; Realtime is an accelerator, not the source of truth.

The document deliberately excludes passwords, access tokens, managed content, group records, native permissions, local file paths, and active JavaScript timer intervals. Records with stable IDs are merged by ID. Notes and planner tasks prefer the newest record metadata while preserving planner completion/history collections by union. Test results and focus records are de-duplicated by stable IDs. Deletions are represented by tombstones in the sync document so an older device cannot resurrect a deleted item.

Account scope is keyed by the authenticated `auth.uid()` on the database side; the client cannot choose another owner. Logout stops the engine, removes its listeners, and clears in-memory account state through the existing reducer path.

