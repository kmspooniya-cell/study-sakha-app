# Study Sakha — Production Migration Reconciliation & Recovery Plan

**Date:** 2026-11-25  
**Target Project:** `study-sakha-app` (`edjazjfylnpvqykpdtiq`) · **Environment:** `production`  
**Status:** **EXECUTED AND VERIFIED — 2026-11-25**

---

## 1. Executive Summary

Read-only inspection of the production database (`edjazjfylnpvqykpdtiq`) against the 15 local SQL files in `supabase/migrations/` confirms:

1. **Migration History Drift:** Only 3 of 15 local migrations (`202611230003`, `202611230004`, `202611240001`) are recorded in remote migration history. `supabase db push --remote` is blocked by `DbPushMissingRemoteError` because 9 local migrations precede `202611230003`.
2. **Phase 1 Candidates (`202611240002`, `202611240003`):** Every schema object, policy, seeded row, RPC definition, `search_path`, and privilege in both migrations is **100% present and verified** on remote. Both are safe `supabase migration repair --status applied` candidates.
3. **Phase 2 Missing Objects (`202611020001`, `202611200001`):**
   - From `202611020001`: `handle_new_study_sakha_user()`, trigger `study_sakha_create_profile_and_learner_role` on `auth.users`, `is_published_student_content_object(text)`, and all 8 `study_sakha_student_content_*` policies on `storage.objects` are **missing**.
   - From `202611200001`: `study_room_break_messages`, `study_room_reports`, **`get_study_room_member_profiles(text, uuid[])`** (newly confirmed missing in live `pg_proc`), and **`supabase_realtime` publication entries** (`pg_publication_tables` is currently empty) are **missing**.
4. **Phase 3 (`202611250001_account_sync_documents.sql`):** Not yet applied remotely; 100% compatible with `lib/sync/` and `StoreProvider` (`lib/store.tsx`), idempotent, and ready to deploy as a separate migration.

> [!CAUTION]
> **Do NOT run `supabase db push --include-all`.** Doing so would re-execute superseded migrations (`202611200003`, `202611220001`, `202611230001`), breaking `silent-focus` Realtime authorization and reintroducing an ambiguous 8-argument `submit_study_member_activity` overload.

---

## 2. Phase 1 — Migration History Repair Candidates & Live Evidence

All evidence below was collected via `pnpm exec supabase migration list --remote` and `pnpm exec supabase db query --remote --read-only` against `edjazjfylnpvqykpdtiq`.

### 2.1 Post-Head Candidates (`202611240002`, `202611240003`)

| Version | Migration File | Live Verification Evidence | Repair Verdict |
|---|---|---|---|
| `202611240002` | `202611240002_study_room_realtime_silent_focus_read.sql` | `pg_policies` on `realtime.messages` confirms `silent_focus_reactions_read` exists as `PERMISSIVE`, `SELECT`, `roles = {authenticated}`, with `qual = ((extension = 'broadcast'::text) AND (split_part(realtime.topic(), ':'::text, 3) = 'silent-focus'::text) AND is_study_room_topic_member())` (no `event = 'silent-reaction'` filter). | **Verified 100% Applied** — Safe to mark `applied`. |
| `202611240003` | `202611240003_production_backend_repairs.sql` | 1) `public.exams` contains all 7 rows (`banking`, `jee`, `neet`, `ras`, `rpsc_rssb`, `ssc`, `upsc`) with exact `name`, `short_name`, `color`, and `aspirants_label`.<br>2) `pg_proc` confirms `public.create_study_group(text, text, text, text)` and `public.get_study_room_insights(text)` match the `202611240003` bodies verbatim (including `btrim()` and regex validation), `prosecdef = true`, `proconfig = ['search_path=pg_catalog, public']`, and `proacl = {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` (`public`/`anon` revoked, `authenticated` granted). | **Verified 100% Applied** — Safe to mark `applied`. |

**Proposed Phase 1 Commands (Do NOT execute yet):**

```bash
pnpm exec supabase migration repair --status applied 202611240002
pnpm exec supabase migration repair --status applied 202611240003
```

### 2.2 Pre-Head Historical Migrations (`202611010001` – `202611230002`)

| Version | Migration File | Live Verification Evidence | History Action |
|---|---|---|---|
| `202611010001` | `202611010001_initial_study_sakha_schema.sql` | All 19 initial tables, 16 `*_set_updated_at` triggers, `is_admin()`, `set_updated_at()`, RLS policies, and `user_roles` privilege revocations (`relacl = {postgres=...,service_role=...}`) are present. | Mark `applied` when reconciling pre-head history. |
| `202611020001` | `202611020001_secure_auth_content_storage.sql` | **PARTIAL.** `managed_content` and `Student-content` bucket (`public = false`) exist; auth trigger/function, `is_published_student_content_object`, and 8 `study_sakha_student_content_*` storage policies are **missing**. | Mark `applied` **ONLY together with** deploying the corrective migration (`202611250002`). |
| `202611020002` | `202611020002_managed_content_only.sql` | `managed_content` table, `managed_content_set_updated_at` trigger, `managed_content_published_read` / `managed_content_admin_write` policies, and grants are present. | Mark `applied` when reconciling pre-head history. |
| `202611200001` | `202611200001_group_study_rooms.sql` | **PARTIAL.** `study_groups` (6 rows), `study_group_memberships`, `study_group_rooms` (24 rows), `study_room_sessions`, triggers, policies, column-level `UPDATE` ACLs (`pg_attribute.attacl`), and core RPCs exist; `study_room_break_messages`, `study_room_reports`, `get_study_room_member_profiles`, and `supabase_realtime` entries are **missing**. | Mark `applied` **ONLY together with** deploying the corrective migration (`202611250002`). |
| `202611200002` | `202611200002_harden_study_room_session_join.sql` | `study_room_sessions_one_active_member_idx`, `join_study_room(text, text, text, boolean)`, and revoked direct `INSERT` on `study_room_sessions` (`authenticated=r/postgres` + column `w` ACLs) are present. | Mark `applied` when reconciling pre-head history. |
| `202611200003` | `202611200003_study_room_realtime_authorization.sql` | Superseded by `202611230004`, `202611240001`, and `202611240002` (all verified present). | Mark `applied` (do NOT execute SQL). |
| `202611220001` | `202611220001_study_member_activity_sync.sql` | `study_member_activity_events`, indexes, `study_member_activity_events_member_read`, and `get_study_group_activity_insights(text)` exist; 8-arg `submit_study_member_activity` superseded by `202611230003`. | Mark `applied` (do NOT execute SQL). |
| `202611230001` | `202611230001_saved_early_focus_status.sql` | `study_member_activity_events_focus_status_check` includes `'saved_early'`; 8-arg RPC superseded by `202611230003`. | Mark `applied` (do NOT execute SQL). |
| `202611230002` | `202611230002_focus_session_metadata.sql` | All 6 metadata columns and 14-arg `submit_study_member_activity` are present (superseded by `202611230003`). | Mark `applied` (do NOT execute SQL). |

**Other Historical Gaps Check:** No other missing historical migration has uncovered effects. Note that remote also has two extra RPCs not in local migrations (`approve_study_group_membership(text, text)` and `request_study_group_membership(text)`), which will be preserved untouched.

---

## 3. Phase 2 — Missing-Object Inventory & Proposed Corrective SQL

### 3.1 Missing Objects Confirmed on Remote

1. **From `202611020001_secure_auth_content_storage.sql`:**
   - Function `public.handle_new_study_sakha_user()` (`SECURITY DEFINER`, `set search_path = pg_catalog, public`, revoked from `public, anon, authenticated`)
   - Trigger `study_sakha_create_profile_and_learner_role` on `auth.users`
   - Idempotent backfill of `public.profiles` and `public.user_roles` (`on conflict do nothing` — currently 1 `auth.users` row, 0 missing profiles, 0 missing roles, kept for safety before cutover)
   - Function `public.is_published_student_content_object(text)` (`SECURITY DEFINER`, `set search_path = pg_catalog, public`, revoked from `public, anon`, granted to `authenticated`)
   - 8 `storage.objects` policies:
     - Permissive: `study_sakha_student_content_read`, `study_sakha_student_content_admin_insert`, `study_sakha_student_content_admin_update`, `study_sakha_student_content_admin_delete`
     - Restrictive: `study_sakha_student_content_read_guard`, `study_sakha_student_content_insert_guard`, `study_sakha_student_content_update_guard`, `study_sakha_student_content_delete_guard`
   - *Note on existing `storage.objects` policies:* Remote currently has `admin_upload_student_content` and `admin_upload_student_content 1plj4jr_0` (`INSERT` for `authenticated`). Adding `study_sakha_student_content_insert_guard` (`AS RESTRICTIVE`) ensures `public.is_admin()` is always required for `Student-content` inserts without dropping existing policies.

2. **From `202611200001_group_study_rooms.sql`:**
   - Table `public.study_room_break_messages` + index `study_room_break_messages_group_created_idx` + RLS + 2 policies (`study_room_break_messages_member_read`, `study_room_break_messages_member_insert`) + `select, insert` grants to `authenticated` (referenced by `lib/groupRooms.ts` and `lib/groupRoomRealtime.ts`).
   - Table `public.study_room_reports` + RLS + 2 policies (`study_room_reports_member_insert`, `study_room_reports_admin_read`) + `select, insert` grants to `authenticated` + table comment (referenced by `lib/groupRooms.ts`).
   - Function `public.get_study_room_member_profiles(group_key text, member_ids uuid[])` (`SECURITY DEFINER`, `set search_path = pg_catalog, public`, revoked from `public, anon`, granted to `authenticated`) — **missing from remote `pg_proc` and actively called by `lib/groupRooms.ts:337` and `lib/groupRoomRealtime.ts:158`**.
   - `supabase_realtime` publication entries for `public.study_room_break_messages` and `public.study_group_rooms` (`pg_publication_tables` for `supabase_realtime` is currently empty).

### 3.2 Proposed Corrective SQL (`202611250002_reconcile_auth_storage_and_room_gaps.sql`)

> [!IMPORTANT]
> **For review only — do NOT create this migration file or run it until explicitly approved.**

```sql
-- Forward-only corrective migration restoring missing objects from 202611020001 and 202611200001.
-- Idempotent where practical; preserves all existing tables, rows, and extra remote RPCs.

-- 1. Auth user provisioning function, trigger, and idempotent backfill (from 202611020001)
create or replace function public.handle_new_study_sakha_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requested_exam text;
begin
  requested_exam := new.raw_user_meta_data ->> 'exam_id';

  insert into public.profiles (id, display_name, email, exam_id)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Aspirant'
    ),
    new.email,
    (select e.id from public.exams e where e.id = requested_exam)
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'learner')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_study_sakha_user() from public, anon, authenticated;

drop trigger if exists study_sakha_create_profile_and_learner_role on auth.users;
create trigger study_sakha_create_profile_and_learner_role
after insert on auth.users
for each row execute function public.handle_new_study_sakha_user();

insert into public.profiles (id, display_name, email, exam_id)
select
  user_account.id,
  coalesce(
    nullif(btrim(user_account.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(user_account.email, ''), '@', 1), ''),
    'Aspirant'
  ),
  user_account.email,
  (select exam.id from public.exams exam where exam.id = user_account.raw_user_meta_data ->> 'exam_id')
from auth.users user_account
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select user_account.id, 'learner'
from auth.users user_account
on conflict (user_id) do nothing;

-- 2. Published Student-content helper & storage.objects RLS policies (from 202611020001)
create or replace function public.is_published_student_content_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.managed_content content
    where content.file_object_path = object_name
      and content.status = 'published'
  )
  or exists (
    select 1
    from public.resources resource
    join public.resource_files resource_file
      on resource_file.resource_id = resource.id
      and resource_file.file_role = 'pdf'
    join public.uploaded_files uploaded_file
      on uploaded_file.id = resource_file.file_id
    where resource.status = 'published'
      and uploaded_file.bucket_name = 'Student-content'
      and uploaded_file.object_path = object_name
      and uploaded_file.deleted_at is null
  );
$$;

revoke all on function public.is_published_student_content_object(text) from public, anon;
grant execute on function public.is_published_student_content_object(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from storage.buckets where id = 'Student-content'
  ) then
    raise exception 'Required Supabase Storage bucket "Student-content" does not exist.';
  end if;

  update storage.buckets
  set public = false
  where id = 'Student-content'
    and public is distinct from false;
end;
$$;

drop policy if exists study_sakha_student_content_read on storage.objects;
create policy study_sakha_student_content_read on storage.objects
for select to authenticated
using (
  bucket_id = 'Student-content'
  and (
    public.is_admin()
    or public.is_published_student_content_object(name)
  )
);

drop policy if exists study_sakha_student_content_admin_insert on storage.objects;
create policy study_sakha_student_content_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'Student-content' and public.is_admin());

drop policy if exists study_sakha_student_content_admin_update on storage.objects;
create policy study_sakha_student_content_admin_update on storage.objects
for update to authenticated
using (bucket_id = 'Student-content' and public.is_admin())
with check (bucket_id = 'Student-content' and public.is_admin());

drop policy if exists study_sakha_student_content_admin_delete on storage.objects;
create policy study_sakha_student_content_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'Student-content' and public.is_admin());

drop policy if exists study_sakha_student_content_read_guard on storage.objects;
create policy study_sakha_student_content_read_guard on storage.objects
as restrictive for select to public
using (
  case
    when bucket_id <> 'Student-content' then true
    when auth.role() <> 'authenticated' then false
    else (
      public.is_admin()
      or public.is_published_student_content_object(name)
    )
  end
);

drop policy if exists study_sakha_student_content_insert_guard on storage.objects;
create policy study_sakha_student_content_insert_guard on storage.objects
as restrictive for insert to public
with check (
  bucket_id <> 'Student-content'
  or (auth.role() = 'authenticated' and public.is_admin())
);

drop policy if exists study_sakha_student_content_update_guard on storage.objects;
create policy study_sakha_student_content_update_guard on storage.objects
as restrictive for update to public
using (
  bucket_id <> 'Student-content'
  or (auth.role() = 'authenticated' and public.is_admin())
)
with check (
  bucket_id <> 'Student-content'
  or (auth.role() = 'authenticated' and public.is_admin())
);

drop policy if exists study_sakha_student_content_delete_guard on storage.objects;
create policy study_sakha_student_content_delete_guard on storage.objects
as restrictive for delete to public
using (
  bucket_id <> 'Student-content'
  or (auth.role() = 'authenticated' and public.is_admin())
);

-- 3. Missing group study room tables, RPC, and Realtime registration (from 202611200001)
create table if not exists public.study_room_break_messages (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  room_id text not null default 'pomodoro' check (room_id = 'pomodoro'),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  foreign key (group_id, room_id) references public.study_group_rooms(group_id, room_id)
);

create table if not exists public.study_room_reports (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  room_id text not null check (room_id in ('silent-focus', 'pomodoro', 'exam-simulation', 'desk-cam')),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('Harassment', 'Unsafe behavior', 'Spam', 'Other')),
  created_at timestamptz not null default now(),
  foreign key (group_id, room_id) references public.study_group_rooms(group_id, room_id),
  check (reporter_id <> reported_user_id)
);

create index if not exists study_room_break_messages_group_created_idx
  on public.study_room_break_messages(group_id, created_at desc);

alter table public.study_room_break_messages enable row level security;
alter table public.study_room_reports enable row level security;

drop policy if exists study_room_break_messages_member_read on public.study_room_break_messages;
create policy study_room_break_messages_member_read on public.study_room_break_messages
for select to authenticated
using (
  public.is_study_group_member(group_id)
  and exists (
    select 1
    from public.study_group_rooms room
    where room.group_id = study_room_break_messages.group_id
      and room.room_id = 'pomodoro'
      and room.phase = 'break'
  )
);

drop policy if exists study_room_break_messages_member_insert on public.study_room_break_messages;
create policy study_room_break_messages_member_insert on public.study_room_break_messages
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_study_group_member(group_id)
  and exists (
    select 1
    from public.study_group_rooms room
    where room.group_id = study_room_break_messages.group_id
      and room.room_id = 'pomodoro'
      and room.phase = 'break'
  )
);

drop policy if exists study_room_reports_member_insert on public.study_room_reports;
create policy study_room_reports_member_insert on public.study_room_reports
for insert to authenticated
with check (
  reporter_id = auth.uid()
  and public.is_study_group_member(group_id)
  and exists (
    select 1
    from public.study_group_memberships membership
    where membership.group_id = study_room_reports.group_id
      and membership.user_id = study_room_reports.reported_user_id
      and membership.status = 'active'
  )
);

drop policy if exists study_room_reports_admin_read on public.study_room_reports;
create policy study_room_reports_admin_read on public.study_room_reports
for select to authenticated
using (public.is_study_group_admin(group_id));

revoke all on table public.study_room_break_messages from anon;
revoke all on table public.study_room_reports from anon;
grant select, insert on public.study_room_break_messages to authenticated;
grant select, insert on public.study_room_reports to authenticated;

comment on table public.study_room_reports is
  'Room moderation reports are visible only to group admins and platform admins.';

create or replace function public.get_study_room_member_profiles(group_key text, member_ids uuid[])
returns table (user_id uuid, display_name text, streak integer)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select profile.id, profile.display_name, coalesce(profile.streak, 0)
  from public.profiles profile
  where public.is_study_group_member(group_key)
    and profile.id = any(member_ids)
    and exists (
      select 1
      from public.study_group_memberships membership
      where membership.group_id = group_key
        and membership.user_id = profile.id
        and membership.status = 'active'
    );
$$;

revoke all on function public.get_study_room_member_profiles(text, uuid[]) from public, anon;
grant execute on function public.get_study_room_member_profiles(text, uuid[]) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'study_room_break_messages'
    ) then
      alter publication supabase_realtime add table public.study_room_break_messages;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'study_group_rooms'
    ) then
      alter publication supabase_realtime add table public.study_group_rooms;
    end if;
  end if;
end;
$$;
```

---

## 4. Phase 3 — Account Sync (`202611250001_account_sync_documents.sql`) Verification

| Aspect | Migration Definition | Client (`lib/sync/`, `lib/store.tsx`) Compatibility | Status |
|---|---|---|---|
| **Table & Index** | `public.account_sync_documents` (`user_id` PK -> `auth.users(id) on delete cascade`, `version bigint > 0`, `document jsonb` object check, `updated_at`, `updated_by_device`, `created_at`) + `account_sync_documents_updated_at_idx`. | `pullAccountDocument(userId)` queries `select('version, document, updated_at').eq('user_id', userId).maybeSingle()`. | **Compatible** |
| **RLS & Grants** | `anon` revoked all; `authenticated` granted `select` only (`insert, update, delete` revoked). `account_sync_documents_owner_read`, `_owner_insert`, `_owner_update` all enforce `user_id = (select auth.uid())`. | Reads use `select` directly; all writes route through `push_account_sync_document`. | **Compatible** |
| **RPC & Concurrency** | `push_account_sync_document(document_value jsonb, expected_version bigint, device_key text)` (`SECURITY DEFINER`, `set search_path = pg_catalog, public`) checks `auth.uid() is not null`, `jsonb_typeof(document_value) = 'object'`, `char_length(coalesce(device_key, '')) <= 128`, locks row `for update`, inserts `version = 1` when missing & `expected_version in (null, 0)`, rejects stale `expected_version`, and increments `version` on match. | `pushAccountDocument()` calls `supabase.rpc('push_account_sync_document', { document_value, expected_version, device_key })`, reads `accepted`, `version`, `document`, `updated_at`. `AccountSyncEngine.start()` passes `expectedVersion = 0` for first push and merges + retries on `accepted === false`. | **Compatible** |
| **Realtime** | Guarded `do $$` adds `public.account_sync_documents` to `supabase_realtime`. | `AccountSyncEngine.subscribe()` listens to `postgres_changes` (`event: '*'`, `schema: 'public'`, `table: 'account_sync_documents'`, `filter: user_id=eq.${this.userId}`). | **Compatible** |

---

## 5. Phase 4 — Proposed Deployment Sequence (Pending Explicit Approval)

1. **Create & Review Corrective Migration:** Write `supabase/migrations/202611250002_reconcile_auth_storage_and_room_gaps.sql` with the approved SQL from Section 3.2.
2. **Reconcile Verified Migration History:**
   ```bash
   pnpm exec supabase migration repair --status applied 202611010001 202611020001 202611020002 202611200001 202611200002 202611200003 202611220001 202611230001 202611230002 202611240002 202611240003
   ```
3. **Dry-Run Push Verification:**
   ```bash
   pnpm exec supabase db push --dry-run --remote
   ```
   Confirm output lists **only** `202611250001_account_sync_documents.sql` and `202611250002_reconcile_auth_storage_and_room_gaps.sql`.
4. **Deploy Forward-Only Migrations:**
   ```bash
   pnpm exec supabase db push --remote
   ```
5. **Verify Remote Migration History:**
   ```bash
   pnpm exec supabase migration list --remote
   ```
   Confirm all 16 versions are synced (`local === remote`).
6. **Verify RLS, RPCs, Triggers, Storage & Realtime (Read-Only Queries):**
   - Confirm `handle_new_study_sakha_user`, `is_published_student_content_object`, `get_study_room_member_profiles`, and `push_account_sync_document` exist with `SECURITY DEFINER`, `search_path = pg_catalog, public`, and `authenticated`-only execute grants (none for `handle_new_study_sakha_user`).
   - Confirm `study_sakha_create_profile_and_learner_role` trigger is attached to `auth.users`.
   - Confirm all 8 `study_sakha_student_content_*` policies exist on `storage.objects`.
   - Confirm `study_room_break_messages`, `study_room_reports`, and `account_sync_documents` exist with RLS enabled and expected policies.
   - Confirm `pg_publication_tables` for `supabase_realtime` contains `study_group_rooms`, `study_room_break_messages`, and `account_sync_documents`.
7. **Two-User Isolation & Optimistic Concurrency Tests:**
   - Sign in as User A & User B; verify User A cannot `SELECT` or `push_account_sync_document` into User B's `account_sync_documents` row.
   - Verify `push_account_sync_document(doc, 0, 'dev-1')` returns `accepted = true, version = 1`, stale `expected_version = 1` after version 2 returns `accepted = false` with latest server `version` and `document`, and `expected_version = 2` succeeds with `version = 3`.
   - Verify Realtime `postgres_changes` delivers `account_sync_documents` updates only to the owning user, and `study_room_break_messages` / `study_group_rooms` updates only to active group members.

---

## 6. Rollback & Recovery Considerations

- **Forward-Only Policy:** Never run `db reset` or drop existing tables in production.
- **If `202611250001` or `202611250002` fails mid-run:** Supabase CLI wraps each migration file in a transaction; a failed migration rolls back cleanly without partial schema state.
- **If a deployed object causes a regression:** Create a new forward-only migration (e.g., `202611250003_*`) to alter the function/policy rather than deleting history or reverting rows.

---

## 7. Explicit Unresolved Risks

1. **`managed_content.exam_id` Check Constraint:** Remote `managed_content_exam_id_check` currently allows only `('upsc', 'ssc', 'banking', 'neet', 'jee')` (omitting `'ras'` and `'rpsc_rssb'`). Left untouched per recovery scope; track separately if admin managed content for RAS/RPSC is added.
2. **Legacy `storage.objects` Policy (`admin_upload_student_content 1plj4jr_0`):** Existing policy checks `app_metadata ->> 'role' = 'admin'`. The new `AS RESTRICTIVE` `study_sakha_student_content_insert_guard` enforces `public.is_admin()` (`user_roles` table) on `Student-content`, preventing privilege escalation while preserving existing policies.
3. **Live Runtime Verification Pending:** Two-user isolation, `auth.users` signup trigger, `Student-content` signed URLs, and multi-device `AccountSyncEngine` Realtime sync remain unverified until deployment is approved and executed.
