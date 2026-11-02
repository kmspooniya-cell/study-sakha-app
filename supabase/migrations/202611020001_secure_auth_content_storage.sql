-- Authenticated users start as learners; administrator assignment is operator-only.
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

create table public.managed_content (
  id text primary key,
  content_type text not null check (content_type in ('note', 'book', 'pyq-set', 'test', 'current-affairs')),
  title text not null,
  description text not null,
  exam_id text not null check (exam_id in ('upsc', 'ssc', 'banking', 'neet', 'jee')),
  subject text not null,
  topic text not null,
  source_url text,
  file_object_path text unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger managed_content_set_updated_at before update on public.managed_content
for each row execute function public.set_updated_at();

alter table public.managed_content enable row level security;

create policy managed_content_published_read on public.managed_content
for select to authenticated
using (status = 'published' or public.is_admin());

create policy managed_content_admin_write on public.managed_content
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on table public.managed_content to authenticated;
revoke all on table public.managed_content from anon;
revoke all on table public.user_roles from anon, authenticated;

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
  where id = 'Student-content';
end;
$$;

create policy study_sakha_student_content_read on storage.objects
for select to authenticated
using (
  bucket_id = 'Student-content'
  and (
    public.is_admin()
    or public.is_published_student_content_object(name)
  )
);

create policy study_sakha_student_content_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'Student-content' and public.is_admin());

create policy study_sakha_student_content_admin_update on storage.objects
for update to authenticated
using (bucket_id = 'Student-content' and public.is_admin())
with check (bucket_id = 'Student-content' and public.is_admin());

create policy study_sakha_student_content_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'Student-content' and public.is_admin());

-- These restrictive policies prevent older permissive bucket policies from granting
-- anonymous access or learner writes to Student-content. Other buckets are unaffected.
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

create policy study_sakha_student_content_insert_guard on storage.objects
as restrictive for insert to public
with check (
  bucket_id <> 'Student-content'
  or (auth.role() = 'authenticated' and public.is_admin())
);

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

create policy study_sakha_student_content_delete_guard on storage.objects
as restrictive for delete to public
using (
  bucket_id <> 'Student-content'
  or (auth.role() = 'authenticated' and public.is_admin())
);
