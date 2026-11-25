-- Forward-only corrective migration restoring confirmed gaps from the secure
-- auth/content-storage and group study-room migrations. Existing data and
-- unrelated remote objects are preserved.

-- Auth user provisioning, including safe backfill for existing auth users.
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

-- Published Student-content helper and restrictive storage policies.
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
  if not exists (select 1 from storage.buckets where id = 'Student-content') then
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
  and (public.is_admin() or public.is_published_student_content_object(name))
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
    else (public.is_admin() or public.is_published_student_content_object(name))
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

-- Missing group room tables, policies, member-profile RPC, and Realtime rows.
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
    select 1 from public.study_group_rooms room
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
    select 1 from public.study_group_rooms room
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
    select 1 from public.study_group_memberships membership
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
      select 1 from public.study_group_memberships membership
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
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'study_room_break_messages'
    ) then
      alter publication supabase_realtime add table public.study_room_break_messages;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'study_group_rooms'
    ) then
      alter publication supabase_realtime add table public.study_group_rooms;
    end if;
  end if;
end;
$$;
