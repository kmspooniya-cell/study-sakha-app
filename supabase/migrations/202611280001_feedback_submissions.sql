-- Study Sakha Help & Feedback System
-- Forward-only migration for user feedback submissions and private screenshot attachments.

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_request_id text,
  category text not null check (category in ('report_issue', 'share_idea', 'appreciate_team')),
  sub_category text,
  subject text not null default '',
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  reproduction_steps text check (reproduction_steps is null or char_length(reproduction_steps) <= 2000),
  status text not null default 'submitted' check (status in ('submitted', 'received', 'in_progress', 'resolved', 'closed')),
  admin_response text check (admin_response is null or char_length(admin_response) <= 2000),
  responded_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  logs_shared boolean not null default false,
  screenshot_included boolean not null default false,
  attachment_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(attachment_metadata) = 'object'),
  app_version text,
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_submissions_user_created_idx
  on public.feedback_submissions (user_id, created_at desc);

create index if not exists feedback_submissions_status_created_idx
  on public.feedback_submissions (status, created_at desc);

create unique index if not exists feedback_submissions_user_request_uidx
  on public.feedback_submissions (user_id, client_request_id)
  where client_request_id is not null;

drop trigger if exists feedback_submissions_set_updated_at on public.feedback_submissions;
create trigger feedback_submissions_set_updated_at
  before update on public.feedback_submissions
  for each row execute function public.set_updated_at();

alter table public.feedback_submissions enable row level security;

drop policy if exists feedback_submissions_owner_insert on public.feedback_submissions;
create policy feedback_submissions_owner_insert
  on public.feedback_submissions for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists feedback_submissions_owner_or_admin_select on public.feedback_submissions;
create policy feedback_submissions_owner_or_admin_select
  on public.feedback_submissions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists feedback_submissions_admin_update on public.feedback_submissions;
create policy feedback_submissions_admin_update
  on public.feedback_submissions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists feedback_submissions_admin_delete on public.feedback_submissions;
create policy feedback_submissions_admin_delete
  on public.feedback_submissions for delete to authenticated
  using (public.is_admin());

revoke all on table public.feedback_submissions from anon;
grant select, insert, update, delete on table public.feedback_submissions to authenticated;

-- Private storage bucket for optional feedback screenshots
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-attachments',
  'feedback-attachments',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists feedback_attachments_owner_insert on storage.objects;
create policy feedback_attachments_owner_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'feedback-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists feedback_attachments_owner_or_admin_select on storage.objects;
create policy feedback_attachments_owner_or_admin_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'feedback-attachments'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = (select auth.uid())::text
    )
  );

drop policy if exists feedback_attachments_owner_or_admin_delete on storage.objects;
create policy feedback_attachments_owner_or_admin_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'feedback-attachments'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = (select auth.uid())::text
    )
  );
