-- Study Sakha Notification Centre Backend Extension
-- Additive, forward-only migration preserving existing announcements and alarm_notifications.

-- 1. Extend public.announcements with optional category, expiration, and action metadata
alter table public.announcements
  add column if not exists category text not null default 'announcement',
  add column if not exists expires_at timestamptz,
  add column if not exists action_route text,
  add column if not exists action_params jsonb;

create index if not exists announcements_published_expires_idx
  on public.announcements (status, published_at desc, expires_at);

-- 2. User-owned persistent notifications inbox
create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text,
  kind text not null default 'system',
  category text not null default 'updates' check (category in ('study', 'social', 'updates')),
  priority text not null default 'normal' check (priority in ('critical', 'high', 'normal', 'low')),
  title text not null,
  body text not null,
  related_entity_id text,
  target_route text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  archived_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_feed_idx
  on public.notifications (user_id, archived_at, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read, archived_at)
  where archived_at is null and is_read = false;

create unique index if not exists notifications_user_event_key_uidx
  on public.notifications (user_id, event_key)
  where event_key is not null;

alter table public.notifications enable row level security;

drop policy if exists notifications_owner_select on public.notifications;
create policy notifications_owner_select
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notifications_owner_insert on public.notifications;
create policy notifications_owner_insert
  on public.notifications for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists notifications_owner_delete on public.notifications;
create policy notifications_owner_delete
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.notifications from anon;
grant select, insert, update, delete on table public.notifications to authenticated;

-- 3. Per-user notification preferences
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_owner_all on public.notification_preferences;
create policy notification_preferences_owner_all
  on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.notification_preferences from anon;
grant select, insert, update on table public.notification_preferences to authenticated;

-- 4. Device push tokens
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  device_id text not null,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists push_tokens_user_active_idx
  on public.push_tokens (user_id, is_active);

alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_owner_all on public.push_tokens;
create policy push_tokens_owner_all
  on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.push_tokens from anon;
grant select, insert, update, delete on table public.push_tokens to authenticated;

-- 5. SECURITY DEFINER RPCs for batch read/archive & token ownership
create or replace function public.mark_notifications_read(
  notification_ids text[],
  mark_read boolean default true
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  affected integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.notifications
  set
    is_read = mark_read,
    read_at = case when mark_read then coalesce(read_at, now()) else null end,
    updated_at = now()
  where user_id = auth.uid()
    and archived_at is null
    and (notification_ids is null or id = any(notification_ids));

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.mark_notifications_read(text[], boolean) from public, anon;
grant execute on function public.mark_notifications_read(text[], boolean) to authenticated;

create or replace function public.archive_notifications(
  notification_ids text[],
  restore boolean default false
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  affected integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;
  if notification_ids is null or coalesce(array_length(notification_ids, 1), 0) = 0 then
    return 0;
  end if;

  update public.notifications
  set
    archived_at = case when restore then null else now() end,
    updated_at = now()
  where user_id = auth.uid()
    and id = any(notification_ids);

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.archive_notifications(text[], boolean) from public, anon;
grant execute on function public.archive_notifications(text[], boolean) to authenticated;

create or replace function public.upsert_push_token(
  token_value text,
  platform_value text,
  device_id_value text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;
  if btrim(coalesce(token_value, '')) = '' then
    raise exception 'Push token cannot be empty.';
  end if;

  -- Deactivate same token if previously owned by another user on this device
  update public.push_tokens
  set is_active = false, updated_at = now()
  where token = token_value and user_id <> auth.uid();

  insert into public.push_tokens (user_id, token, platform, device_id, is_active, last_seen_at, updated_at)
  values (auth.uid(), token_value, platform_value, coalesce(nullif(btrim(device_id_value), ''), 'unknown'), true, now(), now())
  on conflict (user_id, token) do update
  set
    platform = excluded.platform,
    device_id = excluded.device_id,
    is_active = true,
    last_seen_at = now(),
    updated_at = now();
end;
$$;

revoke all on function public.upsert_push_token(text, text, text) from public, anon;
grant execute on function public.upsert_push_token(text, text, text) to authenticated;

create or replace function public.deactivate_push_token(token_value text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.push_tokens
  set is_active = false, updated_at = now()
  where user_id = auth.uid() and token = token_value;
end;
$$;

revoke all on function public.deactivate_push_token(text) from public, anon;
grant execute on function public.deactivate_push_token(text) to authenticated;

-- 6. Add public.notifications to supabase_realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
