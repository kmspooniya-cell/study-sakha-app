-- Forward-only migration: 202611260002_study_group_chat_messages.sql
-- Description: Persistent, authorized Group Chat with Supabase RLS and Realtime synchronization.

-- 1. Create table public.study_group_messages
create table if not exists public.study_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.study_groups(id) on delete cascade,
  channel_id text not null default 'general-chat',
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender_name text not null,
  sender_initials text not null,
  sender_role text not null default 'Member',
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  attachment jsonb null,
  poll jsonb null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Indexes for efficient retrieval by group and channel
create index if not exists study_group_messages_group_channel_idx
  on public.study_group_messages(group_id, channel_id, created_at asc);

create index if not exists study_group_messages_user_idx
  on public.study_group_messages(user_id);

-- 3. Row Level Security
alter table public.study_group_messages enable row level security;

-- Only authorized active members of the group can read messages
drop policy if exists study_group_messages_member_read on public.study_group_messages;
create policy study_group_messages_member_read on public.study_group_messages
  for select
  using (
    public.is_study_group_member(group_id)
  );

-- Only authorized active members can insert messages for themselves
drop policy if exists study_group_messages_member_insert on public.study_group_messages;
create policy study_group_messages_member_insert on public.study_group_messages
  for insert
  with check (
    user_id = auth.uid()
    and public.is_study_group_member(group_id)
  );

-- Revoke anon access and grant authenticated permissions
revoke all on table public.study_group_messages from public, anon;
grant select, insert on public.study_group_messages to authenticated;

-- 4. Supabase Realtime Publication
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_group_messages'
  ) then
    alter publication supabase_realtime add table public.study_group_messages;
  end if;
end $$;
