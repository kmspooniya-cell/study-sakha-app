# Study Sakha Supabase Backend Error Audit

Date: 2026-11-24

## Scope

This audit covers the production errors reported for profile exam saving, group creation, and group insights. The repository and the linked Supabase REST API were inspected before changes. No production database write or migration deployment was performed from this workspace.

## Confirmed root causes

### Profile Edit: `profiles_exam_id_fkey`

The live `exams` endpoint returned HTTP 200 with an empty array. The local initial schema intentionally created the table without seed data, while `profiles.exam_id` references `exams.id`. The profile selector also exposed RAS and RPSC/RSSB, but the frontend mapping omitted both values. A profile save could therefore send a legacy or unsupported exam ID, and any valid ID still failed while the production catalog was empty.

Fixes:

- Added stable catalog IDs `ras` and `rpsc_rssb` alongside the existing `upsc`, `ssc`, `banking`, `neet`, and `jee` IDs.
- Added an idempotent catalog insert to the corrective migration that preserves existing catalog metadata.
- Added client validation before the profile upsert.
- Added a specific actionable message for PostgreSQL foreign-key error `23503`.
- Existing profile rows and unrelated profile fields are not rewritten by the migration.

### Group creation: missing `create_study_group`

The live RPC probe returned PostgREST `PGRST202` for the exact named argument set used by the client. The local group migration contains the intended function, but it is absent from the live schema cache or was never deployed with that signature. The client call itself uses the correct argument names:

```text
create_study_group(group_key, group_name, group_privacy, group_join_method)
```

The corrective migration creates or replaces that exact signature, validates the authenticated caller and group settings, inserts the owner membership, and creates all four rooms in the same transaction.

### Group insights: missing `get_study_room_insights`

The live RPC probe returned `PGRST202` for `get_study_room_insights(group_key)`. The local intended function reads positive focused time from `study_room_sessions`, which is also the shape consumed by the Groups UI for room logs and room streaks. The corrective migration creates or replaces that exact signature, requires active membership through the existing security-definer membership helper, returns no rows for zero activity, and limits the response to the most recent 100 records.

The newer `get_study_group_activity_insights(group_key)` RPC does exist remotely: an anonymous probe reached it and received an authorization error rather than `PGRST202`. It remains a separate activity aggregation path and was not duplicated or replaced.

## Production schema evidence

Read-only REST checks against the linked project `edjazjfylnpvqykpdtiq` produced:

| Check | Result |
| --- | --- |
| `exams` table | HTTP 200, empty result for anon-visible rows |
| `create_study_group` exact RPC | HTTP 404 / `PGRST202` |
| `get_study_room_insights` exact RPC | HTTP 404 / `PGRST202` |
| `get_study_group_activity_insights` | HTTP 401 permission denied, proving the function is present but protected |
| Group tables | HTTP 401 permission denied, proving protected tables are present |

The workspace has no Supabase CLI, database client, authenticated test account, or service-role credential. Therefore exact remote constraints, policies, indexes, migration history, and authenticated RPC execution could not be queried. No secret key was requested or printed.

## RPC signatures

### Before

The frontend expected the two signatures below, but the live PostgREST schema cache reported no matching functions:

```text
public.create_study_group(group_join_method text, group_key text, group_name text, group_privacy text)
public.get_study_room_insights(group_key text)
```

PostgREST displays named parameters alphabetically in the error text. PostgreSQL resolves the functions by their declared positional types and names.

### After migration

```text
public.create_study_group(group_key text, group_name text, group_privacy text, group_join_method text)
public.get_study_room_insights(group_key text)
```

Both functions are `security definer`, use `set search_path = pg_catalog, public`, revoke execution from `public` and `anon`, and grant execution only to `authenticated`.

## Security and authorization

- Group creation rejects anonymous callers.
- Group creation validates the group key, name, privacy, and join method.
- Owner membership is inserted using `auth.uid()`; the caller cannot choose another owner.
- Insights are returned only when `is_study_group_member(group_key)` is true.
- Insights are selected by the requested group ID and do not expose sessions from other groups.
- Private group behavior remains controlled by the existing group privacy and membership model.
- No RLS policy was weakened, and no client service-role credential was added.
- The catalog remains publicly readable according to the existing `exams_public_read` policy; writes remain admin-controlled.

## Files changed

- `lib/types.ts` — expanded the stable `ExamId` union.
- `lib/data.ts` — added RAS and RPSC/RSSB catalog entries.
- `lib/examCatalog.ts` — centralized profile focus to database ID mapping.
- `screens/ProfileScreen.tsx` — uses the complete mapping.
- `lib/store.tsx` — rejects unsupported IDs and translates FK failures.
- `lib/groupRooms.ts` — gives missing-RPC errors actionable feature-specific messages.
- `test/backendContracts.test.ts` — verifies profile mappings resolve to catalog IDs.
- `test/groupRooms.join.test.tsx` — verifies both RPC payload contracts and unavailable-service handling.
- `supabase/migrations/202611240003_production_backend_repairs.sql` — forward-only catalog and RPC repair.

## Verification

| Check | Result |
| --- | --- |
| `pnpm test -- --runInBand` | **PASS** — 26 suites, 104 tests |
| `pnpm exec tsc --noEmit` | **PASS** |
| `pnpm run build:web` | **PASS** — Expo web export completed |
| Focused ESLint | **FAIL / pre-existing errors** — [lib/store.tsx](/workspaces/study-sakha-app/lib/store.tsx) has existing `react-hooks/refs` and `react-hooks/set-state-in-effect` errors; warnings also exist. No new error was introduced by the backend files after removing the unused profile import. |
| Live migration deployment | **NOT RUN** — no authenticated migration channel was available |
| Authenticated RPC and RLS tests | **BLOCKED** — no test account or authorized database credentials |

## Safe deployment procedure

1. Review the migration against the production schema in the Supabase SQL editor or a linked project with an authorized operator account.
2. Confirm the exact production object names and inspect the migration history. Do not reset the database and do not mark unapplied migrations as repaired without applying their contents.
3. Apply only `supabase/migrations/202611240003_production_backend_repairs.sql` through the approved production migration process.
4. Execute `NOTIFY pgrst, 'reload schema';` after the SQL changes if the migration runner does not process the included notification.
5. With a dedicated non-production or approved test account, verify profile saves for UPSC, RAS, RPSC/RSSB, SSC, Banking, NEET, and JEE; create public and private groups; verify owner membership and room creation; and query insights as a member and non-member.
6. Re-run the read-only checks and confirm the two RPC calls no longer return `PGRST202`.

The repository changes are ready for review, but the live production repair remains **BLOCKED until the corrective migration is deployed and authenticated behavior is verified**.
