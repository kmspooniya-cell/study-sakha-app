# Supabase Migration History Reconciliation Audit — Study Sakha

**Date:** 2026-11-25  
**Target Project:** `study-sakha-app` (`edjazjfylnpvqykpdtiq`) · **Environment:** `production`  
**Audit Mode:** Read-only inspection (`pnpm exec supabase migration list --remote`, `pnpm exec supabase db push --dry-run --remote`, `pnpm exec supabase db query --remote --read-only`). No remote schema, data, or migration history was modified.

---

## 1. Complete Local / Remote Migration Inventory

### 1.1 Migration List (`pnpm exec supabase migration list --remote`)

| # | Version | Local Migration File | Remote Recorded | Status |
|---|---|---|---|---|
| 1 | `202611010001` | `202611010001_initial_study_sakha_schema.sql` | No | Local-only (before remote head) |
| 2 | `202611020001` | `202611020001_secure_auth_content_storage.sql` | No | Local-only (before remote head) |
| 3 | `202611020002` | `202611020002_managed_content_only.sql` | No | Local-only (before remote head) |
| 4 | `202611200001` | `202611200001_group_study_rooms.sql` | No | Local-only (before remote head) |
| 5 | `202611200002` | `202611200002_harden_study_room_session_join.sql` | No | Local-only (before remote head) |
| 6 | `202611200003` | `202611200003_study_room_realtime_authorization.sql` | No | Local-only (before remote head) |
| 7 | `202611220001` | `202611220001_study_member_activity_sync.sql` | No | Local-only (before remote head) |
| 8 | `202611230001` | `202611230001_saved_early_focus_status.sql` | No | Local-only (before remote head) |
| 9 | `202611230002` | `202611230002_focus_session_metadata.sql` | No | Local-only (before remote head) |
| 10 | `202611230003` | `202611230003_group_activity_rpc_signature.sql` | **Yes (`202611230003`)** | Synced |
| 11 | `202611230004` | `202611230004_study_room_realtime_member_access.sql` | **Yes (`202611230004`)** | Synced |
| 12 | `202611240001` | `202611240001_study_room_realtime_focus_auth.sql` | **Yes (`202611240001`)** | Synced |
| 13 | `202611240002` | `202611240002_study_room_realtime_silent_focus_read.sql` | No | Local-only (after remote head) |
| 14 | `202611240003` | `202611240003_production_backend_repairs.sql` | No | Local-only (after remote head) |
| 15 | `202611250001` | `202611250001_account_sync_documents.sql` | No | Local-only (after remote head) |

- **Total Local Migrations:** 15 (note: `202611200004_member_activity_sync.sql` does not exist locally; the member activity sync migration is `202611220001_study_member_activity_sync.sql`).
- **Remote-Only Migrations:** 0.
- **Local-Only Migrations:** 12 (`9` before `202611230003`, `3` after `202611240001`).
- **Migrations Applied Remotely After Missing Local Versions:** `202611230003`, `202611230004`, `202611240001`.

### 1.2 Dry-Run Output (`pnpm exec supabase db push --dry-run --remote`)

The dry run exited with code `1` (`DbPushMissingRemoteError`) and refused to proceed without `--include-all`:
- **Message:** `Found local migration files to be inserted before the last migration on remote database.`
- **Suggested by CLI (DO NOT RUN):** `--include-all` with:
  - `202611010001_initial_study_sakha_schema.sql`
  - `202611020001_secure_auth_content_storage.sql`
  - `202611020002_managed_content_only.sql`
  - `202611200001_group_study_rooms.sql`
  - `202611200002_harden_study_room_session_join.sql`
  - `202611200003_study_room_realtime_authorization.sql`
  - `202611220001_study_member_activity_sync.sql`
  - `202611230001_saved_early_focus_status.sql`
  - `202611230002_focus_session_metadata.sql`

---

## 2. SQL Safety Audit (All 12 Local-Only Migrations)

### `202611010001_initial_study_sakha_schema.sql`
- **Tables:** Creates 19 `public` tables (`exams`, `subjects`, `subject_exams`, `profiles`, `user_roles`, `uploaded_files`, `resources`, `resource_files`, `pyq_sets`, `pyq_questions`, `tests`, `test_sections`, `test_questions`, `test_question_answers`, `current_affairs`, `current_affair_points`, `current_affair_exams`, `announcements`, `app_feature_config`).
- **Functions & Triggers:** Creates `public.set_updated_at()`, `public.is_admin()` (`SECURITY DEFINER`), and 16 `before update` triggers.
- **RLS & Grants:** Enables RLS on all 19 tables, creates public-read / admin-write / self-profile policies, revokes `user_roles` from `anon, authenticated`, grants table privileges.
- **Idempotency / Risk:** **Not idempotent** (`create table`, `create trigger`, `create policy` without `if not exists`/`drop if exists`). Fails immediately if run against existing production tables.

### `202611020001_secure_auth_content_storage.sql`
- **Tables:** Creates `public.managed_content` (note: duplicated in `202611020002`).
- **Functions & Triggers:** Creates `public.handle_new_study_sakha_user()` (`SECURITY DEFINER`) + trigger `study_sakha_create_profile_and_learner_role` on `auth.users`; backfills `profiles` and `user_roles` (`on conflict do nothing`); creates `public.is_published_student_content_object(text)`.
- **Storage & Policies:** Requires `Student-content` bucket, forces `public = false`, creates 4 permissive + 4 `AS RESTRICTIVE` policies on `storage.objects` (`study_sakha_student_content_*`).
- **Idempotency / Risk:** **Not idempotent** (`create table`, `create trigger`, `create policy` fail on existing `managed_content`).

### `202611020002_managed_content_only.sql`
- **Tables / Triggers / RLS:** Creates `public.managed_content`, `managed_content_set_updated_at` trigger, `managed_content_published_read`, `managed_content_admin_write`, and grants.
- **Idempotency / Risk:** **Not idempotent** (`create table`, `create trigger`, `create policy`).

### `202611200001_group_study_rooms.sql`
- **Tables:** Creates `study_groups`, `study_group_memberships`, `study_group_rooms`, `study_room_sessions`, `study_room_break_messages`, `study_room_reports`. Seeds 5 `study_groups` and 20 `study_group_rooms` (`on conflict do nothing`).
- **Functions, Triggers & RLS:** Creates `track_study_room_focus_time`, `is_study_group_member`, `is_study_group_admin`, `join_open_study_group`, `create_study_group`, `get_study_room_member_profiles`, `get_study_room_insights`, `is_study_room_topic_member`; enables RLS and creates policies on all 6 tables + 4 policies on `realtime.messages`.
- **Realtime:** Conditionally adds `study_room_break_messages` and `study_group_rooms` to `supabase_realtime`.
- **Idempotency / Risk:** **Not idempotent** (`create table`, `create index`, `create trigger`, `create policy`).

### `202611200002_harden_study_room_session_join.sql`
- **Data / Indexes:** Marks duplicate active `study_room_sessions` as `'left'`, creates unique partial index `study_room_sessions_one_active_member_idx`.
- **Functions & Grants:** Creates `join_study_room(text, text, text, boolean)` (`SECURITY DEFINER`) and revokes direct `insert` on `study_room_sessions` from `authenticated`.
- **Idempotency / Risk:** **Not idempotent** (`create unique index` without `if not exists`).

### `202611200003_study_room_realtime_authorization.sql`
- **Functions & Policies:** Replaces `is_study_room_topic_member()` and drops/recreates 4 `realtime.messages` policies.
- **Idempotency / Risk:** **DANGEROUS REGRESSION IF APPLIED.** Superseded by `202611230004`, `202611240001`, and `202611240002`. Applying it would overwrite `is_study_room_topic_member()` (breaking `silent-focus`) and restore the `event = 'silent-reaction'` restriction removed in `202611240002`.

### `202611220001_study_member_activity_sync.sql`
- **Tables / Functions / RLS:** Creates `study_member_activity_events`, 2 indexes, RLS + `study_member_activity_events_member_read` policy, 8-arg `submit_study_member_activity`, and `get_study_group_activity_insights`.
- **Idempotency / Risk:** **UNSAFE TO APPLY.** `create policy` fails on existing table, and creating the 8-arg `submit_study_member_activity` would reintroduce the ambiguous overload that `202611230003` explicitly dropped.

### `202611230001_saved_early_focus_status.sql`
- **Constraints / Functions:** Updates `study_member_activity_events_focus_status_check` to include `'saved_early'` and recreates the 8-arg `submit_study_member_activity`.
- **Idempotency / Risk:** **UNSAFE TO APPLY.** Would reintroduce the obsolete 8-arg `submit_study_member_activity` overload superseded by `202611230003`.

### `202611230002_focus_session_metadata.sql`
- **Columns / Functions:** Adds `started_at`, `ended_at`, `planned_seconds`, `mode`, `schedule_id`, `schedule_occurrence_id` to `study_member_activity_events` and recreates 14-arg `submit_study_member_activity`.
- **Idempotency / Risk:** Already superseded by `202611230003` (recorded remotely).

### `202611240002_study_room_realtime_silent_focus_read.sql`
- **Policies:** Drops and recreates `silent_focus_reactions_read` on `realtime.messages` without `event = 'silent-reaction'`.
- **Idempotency / Risk:** **Idempotent & safe.**

### `202611240003_production_backend_repairs.sql`
- **Data / Functions:** Seeds 7 `exams` (`on conflict (id) do nothing`), updates `create_study_group` and `get_study_room_insights` with `btrim()` / regex validation, reloads PostgREST schema.
- **Idempotency / Risk:** **Idempotent & safe.**

### `202611250001_account_sync_documents.sql`
- **Tables / Indexes:** Creates `public.account_sync_documents` (`if not exists`) and `account_sync_documents_updated_at_idx` (`if not exists`).
- **RLS & Grants:** Enables RLS; creates `account_sync_documents_owner_read`, `_owner_insert`, `_owner_update` enforcing `user_id = (select auth.uid())`; revokes `anon` and direct `authenticated` writes (`insert, update, delete`), granting only `select`.
- **Functions:** Creates `public.push_account_sync_document(jsonb, bigint, text)` (`SECURITY DEFINER`, `set search_path = pg_catalog, public`) enforcing `auth.uid() is not null`, JSON object type, `device_key <= 128`, row lock on `user_id = auth.uid()`, and optimistic concurrency (`expected_version`).
- **Realtime:** Guarded `do $$` block adds `account_sync_documents` to `supabase_realtime` only if absent.
- **Idempotency / Risk:** **Fully idempotent, zero destructive operations.**

---

## 3. Actual Remote Schema Comparison (Read-Only Queries)

Read-only queries against `edjazjfylnpvqykpdtiq` revealed critical discrepancies between remote state and local migrations:

1. **Core Schema (`202611010001` & `202611020002`):** All 19 initial tables + `managed_content` (20 tables), triggers, `is_admin()`, `set_updated_at()`, and RLS policies are **present**.
2. **Auth Trigger & Storage Security (`202611020001`) — PARTIALLY MISSING:**
   - `Student-content` bucket exists (`public = false`).
   - **Missing:** `public.handle_new_study_sakha_user()`, trigger `study_sakha_create_profile_and_learner_role` on `auth.users`, `public.is_published_student_content_object(text)`, and all 8 `study_sakha_student_content_*` policies on `storage.objects` (remote currently has only `admin_upload_student_content` and `admin_upload_student_content 1plj4jr_0` for `INSERT`).
3. **Group Study Rooms (`202611200001`) — PARTIALLY MISSING:**
   - **Present:** `study_groups`, `study_group_memberships`, `study_group_rooms`, `study_room_sessions`, all core group/room RPCs (`create_study_group`, `join_open_study_group`, `get_study_room_insights`, etc., plus remote-extra `approve_study_group_membership` and `request_study_group_membership`).
   - **Missing:** `public.study_room_break_messages` table, `public.study_room_reports` table, and **all** `supabase_realtime` publication tables (`pg_publication_tables` for `supabase_realtime` is currently **empty**).
4. **Session Hardening & Activity Sync (`202611200002`, `202611220001`–`202611230003`):**
   - `study_room_sessions_one_active_member_idx`, `join_study_room`, `study_member_activity_events` (all 17 columns + `'saved_early'` check constraint), and 14-arg `submit_study_member_activity` are **present**.
5. **Realtime & Backend Repairs (`202611240001`–`202611240003`):**
   - `is_study_room_topic_member()` has the `silent-focus` branch (`202611240001`).
   - `silent_focus_reactions_read` omits `event = 'silent-reaction'` (`202611240002` already applied manually).
   - `exams` has all 7 rows (`banking`, `jee`, `neet`, `ras`, `rpsc_rssb`, `ssc`, `upsc`) and `create_study_group` + `get_study_room_insights` have the `202611240003` definitions (already applied manually).
6. **Account Sync (`202611250001`):**
   - `public.account_sync_documents` and `public.push_account_sync_document` are **not present** on remote.

---

## 4. Migration-by-Migration Decision Table

| Migration | Remote version recorded | Schema effects already present | Safe action |
|---|---|---|---|
| `202611010001_initial_study_sakha_schema.sql` | No | Yes (100%) | **Already applied manually — consider safe history reconciliation** |
| `202611020001_secure_auth_content_storage.sql` | No | Partial (`managed_content` & bucket exist; auth trigger, `is_published_student_content_object`, and `storage.objects` policies are **missing**) | **Requires a new corrective migration** (do not mark fully applied; do not run as-is) |
| `202611020002_managed_content_only.sql` | No | Yes (100%) | **Already applied manually — consider safe history reconciliation** |
| `202611200001_group_study_rooms.sql` | No | Partial (`study_groups`, `memberships`, `rooms`, `sessions`, RPCs exist; `study_room_break_messages`, `study_room_reports`, and `supabase_realtime` publication entries are **missing**) | **Requires a new corrective migration** (do not run as-is) |
| `202611200002_harden_study_room_session_join.sql` | No | Yes (100%) | **Already applied manually — consider safe history reconciliation** |
| `202611200003_study_room_realtime_authorization.sql` | No | Superseded by `202611230004` / `202611240001` / `202611240002` | **Unsafe to apply** (would regress `silent-focus` auth) — reconcile history after verifying later migrations |
| `202611220001_study_member_activity_sync.sql` | No | Yes (superseded by `202611230003`) | **Unsafe to apply** (would fail on policy and re-add obsolete 8-arg RPC) — reconcile history |
| `202611230001_saved_early_focus_status.sql` | No | Yes (superseded by `202611230003`) | **Unsafe to apply** (would re-add obsolete 8-arg RPC) — reconcile history |
| `202611230002_focus_session_metadata.sql` | No | Yes (superseded by `202611230003`) | **Already applied manually — consider safe history reconciliation** |
| `202611230003_group_activity_rpc_signature.sql` | **Yes** | Yes (100%) | No action needed (already synced) |
| `202611230004_study_room_realtime_member_access.sql` | **Yes** | Yes (100%) | No action needed (already synced) |
| `202611240001_study_room_realtime_focus_auth.sql` | **Yes** | Yes (100%) | No action needed (already synced) |
| `202611240002_study_room_realtime_silent_focus_read.sql` | No | Yes (100%) | **Already applied manually — consider safe history reconciliation** |
| `202611240003_production_backend_repairs.sql` | No | Yes (100%) | **Already applied manually — consider safe history reconciliation** |
| `202611250001_account_sync_documents.sql` | No | **No (0%)** | **Apply as-is** (after reconciling pre-`202611230003` history) |

---

## 5. Recommended Reconciliation Sequence (Pending Approval)

1. **Do NOT run `supabase db push --include-all`.** Running `--include-all` will fail on existing objects and would regress `is_study_room_topic_member()`, `silent_focus_reactions_read`, and `submit_study_member_activity`.
2. **Reconcile migration history (only after explicit user approval)** for the pre-`202611230003` and `202611240002`–`202611240003` versions that are already applied/superseded (`202611010001`, `202611020001`, `202611020002`, `202611200001`, `202611200002`, `202611200003`, `202611220001`, `202611230001`, `202611230002`, `202611240002`, `202611240003`) using `supabase migration repair --status applied <versions>` **only after** capturing the missing pieces from `202611020001` and `202611200001` into a forward-only corrective migration.
3. **Verify `supabase db push --dry-run --remote`** shows **only** `202611250001_account_sync_documents.sql` (and any approved new forward-only corrective migration).
4. **Deploy `202611250001_account_sync_documents.sql`** via `supabase db push --remote` and run post-deployment verification (table, RLS, RPC optimistic concurrency, Realtime publication).
5. **Create a separate forward-only corrective migration** (e.g., `202611250002_reconcile_auth_storage_and_room_gaps.sql`) to idempotently restore the missing objects discovered in Phase 3:
   - `handle_new_study_sakha_user()` + `study_sakha_create_profile_and_learner_role` trigger on `auth.users`
   - `is_published_student_content_object(text)` + `study_sakha_student_content_*` policies on `storage.objects`
   - `study_room_break_messages` + `study_room_reports` tables & RLS
   - `supabase_realtime` publication registration for `study_group_rooms` and `study_room_break_messages`.

---

## 6. Exact Blockers & Risks

- **Blocker:** `supabase db push --remote` is blocked by `DbPushMissingRemoteError` because 9 local migrations precede the earliest remote recorded version (`202611230003`).
- **Risk 1 (Silent Regression):** Using `--include-all` would execute `202611200003`, `202611220001`, and `202611230001`, regressing Realtime authorization and `submit_study_member_activity`.
- **Risk 2 (Missing Production Objects):** Marking `202611020001` and `202611200001` as applied without a follow-up corrective migration would leave `auth.users` profile/role auto-provisioning, `Student-content` read/restrictive storage policies, `study_room_break_messages`, `study_room_reports`, and `supabase_realtime` publication entries missing in production.

---

## 7. Explicit Deployment Readiness Verdict

**VERDICT: NOT READY FOR DIRECT `db push` — RECONCILIATION REQUIRED FIRST.**  
`202611250001_account_sync_documents.sql` itself is **100% safe and ready to apply**, but `supabase db push --remote` is currently blocked by the `202611010001`–`202611230002` history gap. Await explicit user approval before running `supabase migration repair`, `supabase db push`, or creating the corrective migration for the missing `202611020001`/`202611200001` objects.
