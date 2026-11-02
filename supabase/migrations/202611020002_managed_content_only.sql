-- Creates only the managed content storage required by the app.
-- Existing relations are intentionally not altered or silently adopted.
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

create trigger managed_content_set_updated_at
before update on public.managed_content
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
