-- Forward-only migration for Study Groups cross-account discovery, secure
-- expiring/revocable invitation tokens, leave/disband RPCs, and Realtime sync.

alter table public.study_groups
  add column if not exists archived_at timestamptz;

drop policy if exists study_groups_member_read on public.study_groups;
create policy study_groups_member_read on public.study_groups
for select to authenticated
using (
  archived_at is null
  and (privacy = 'Public' or public.is_study_group_member(id))
);

create table if not exists public.study_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.study_groups(id) on delete cascade,
  token text not null unique,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists study_group_invites_group_active_idx
  on public.study_group_invites(group_id, expires_at)
  where revoked_at is null;

create index if not exists study_group_invites_creator_recent_idx
  on public.study_group_invites(created_by, created_at desc);

alter table public.study_group_invites enable row level security;

drop policy if exists study_group_invites_member_read on public.study_group_invites;
create policy study_group_invites_member_read on public.study_group_invites
for select to authenticated
using (
  created_by = auth.uid()
  or public.is_study_group_admin(group_id)
);

revoke all on table public.study_group_invites from public, anon;
grant select on table public.study_group_invites to authenticated;

create or replace function public.list_discoverable_study_groups()
returns table (
  id text,
  name text,
  privacy text,
  join_method text,
  owner_id uuid,
  created_at timestamptz,
  member_count bigint,
  is_member boolean,
  member_role text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    g.id,
    g.name,
    g.privacy,
    g.join_method,
    g.owner_id,
    g.created_at,
    (
      select count(*)
      from public.study_group_memberships m_count
      where m_count.group_id = g.id
        and m_count.status = 'active'
    ) as member_count,
    (my_m.user_id is not null) as is_member,
    my_m.role as member_role
  from public.study_groups g
  left join public.study_group_memberships my_m
    on my_m.group_id = g.id
   and my_m.user_id = auth.uid()
   and my_m.status = 'active'
  where auth.uid() is not null
    and g.archived_at is null
    and (g.privacy = 'Public' or my_m.user_id is not null)
  order by (my_m.user_id is not null) desc, g.created_at desc;
$$;

create or replace function public.join_open_study_group(group_key text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to join a study group.';
  end if;

  insert into public.study_group_memberships (group_id, user_id, role, status)
  select study_group.id, auth.uid(), 'Member', 'active'
  from public.study_groups study_group
  where study_group.id = btrim(coalesce(group_key, ''))
    and study_group.archived_at is null
    and study_group.privacy = 'Public'
    and study_group.join_method = 'Open Join'
  on conflict (group_id, user_id) do update
    set status = 'active';

  if not found then
    raise exception 'This group requires an invitation or approval.';
  end if;
end;
$$;

create or replace function public.create_study_group_invite(
  group_key text,
  expires_in_hours integer default 168,
  max_uses_limit integer default null
)
returns table (
  id uuid,
  group_id text,
  token text,
  expires_at timestamptz,
  max_uses integer,
  use_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  normalized_group_id text := btrim(coalesce(group_key, ''));
  target_group public.study_groups%rowtype;
  recent_count integer;
  clamped_hours integer;
  generated_token text;
  inserted_row public.study_group_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to create an invitation link.';
  end if;

  select *
  into target_group
  from public.study_groups g
  where g.id = normalized_group_id
    and g.archived_at is null;

  if not found then
    raise exception 'This study group is no longer available.';
  end if;

  if target_group.privacy = 'Private' then
    if not public.is_study_group_admin(normalized_group_id) then
      raise exception 'Only group admins or owners can invite members to a private group.';
    end if;
  elsif not public.is_study_group_member(normalized_group_id) then
    raise exception 'Join this group before creating an invitation link.';
  end if;

  if max_uses_limit is not null and max_uses_limit <= 0 then
    raise exception 'Maximum uses must be greater than zero.';
  end if;

  select count(*)
  into recent_count
  from public.study_group_invites invite
  where invite.created_by = auth.uid()
    and invite.created_at >= now() - interval '10 minutes';

  if recent_count >= 15 then
    raise exception 'Too many invite links created recently. Wait a few minutes and try again.';
  end if;

  clamped_hours := least(greatest(coalesce(expires_in_hours, 168), 1), 720);
  generated_token := replace(replace(rtrim(encode(gen_random_bytes(24), 'base64'), '='), '+', '-'), '/', '_');

  insert into public.study_group_invites (
    group_id,
    token,
    created_by,
    expires_at,
    max_uses
  )
  values (
    normalized_group_id,
    generated_token,
    auth.uid(),
    now() + make_interval(hours => clamped_hours),
    max_uses_limit
  )
  returning * into inserted_row;

  return query
  select
    inserted_row.id,
    inserted_row.group_id,
    inserted_row.token,
    inserted_row.expires_at,
    inserted_row.max_uses,
    inserted_row.use_count,
    inserted_row.created_at;
end;
$$;

create or replace function public.list_study_group_invites(group_key text)
returns table (
  id uuid,
  group_id text,
  token text,
  expires_at timestamptz,
  max_uses integer,
  use_count integer,
  revoked_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    invite.id,
    invite.group_id,
    invite.token,
    invite.expires_at,
    invite.max_uses,
    invite.use_count,
    invite.revoked_at,
    invite.created_at
  from public.study_group_invites invite
  where invite.group_id = btrim(coalesce(group_key, ''))
    and invite.revoked_at is null
    and invite.expires_at > now()
    and (invite.created_by = auth.uid() or public.is_study_group_admin(invite.group_id))
  order by invite.created_at desc
  limit 20;
$$;

create or replace function public.revoke_study_group_invite(invite_key uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  invite_row public.study_group_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to revoke an invitation.';
  end if;

  select *
  into invite_row
  from public.study_group_invites invite
  where invite.id = invite_key;

  if not found then
    return false;
  end if;

  if invite_row.created_by <> auth.uid() and not public.is_study_group_admin(invite_row.group_id) then
    raise exception 'You do not have permission to revoke this invitation.';
  end if;

  update public.study_group_invites
  set revoked_at = coalesce(revoked_at, now())
  where id = invite_key;

  return true;
end;
$$;

create or replace function public.get_study_group_invite_preview(invite_token text)
returns table (
  valid boolean,
  status_reason text,
  group_id text,
  group_name text,
  privacy text,
  join_method text,
  member_count bigint,
  is_member boolean,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  cleaned_token text := btrim(coalesce(invite_token, ''));
  invite_row public.study_group_invites%rowtype;
  group_row public.study_groups%rowtype;
  active_members bigint;
  already_member boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in to view this group invitation.';
  end if;

  if char_length(cleaned_token) < 16 or char_length(cleaned_token) > 128 then
    return query select false, 'invalid'::text, null::text, null::text, null::text, null::text, 0::bigint, false, null::timestamptz;
    return;
  end if;

  select *
  into invite_row
  from public.study_group_invites invite
  where invite.token = cleaned_token;

  if not found then
    return query select false, 'invalid'::text, null::text, null::text, null::text, null::text, 0::bigint, false, null::timestamptz;
    return;
  end if;

  select *
  into group_row
  from public.study_groups g
  where g.id = invite_row.group_id;

  if not found or group_row.archived_at is not null then
    return query select false, 'archived'::text, null::text, null::text, null::text, null::text, 0::bigint, false, invite_row.expires_at;
    return;
  end if;

  if invite_row.revoked_at is not null then
    return query select false, 'revoked'::text, null::text, null::text, null::text, null::text, 0::bigint, false, invite_row.expires_at;
    return;
  end if;

  if invite_row.expires_at <= now() then
    return query select false, 'expired'::text, null::text, null::text, null::text, null::text, 0::bigint, false, invite_row.expires_at;
    return;
  end if;

  if invite_row.max_uses is not null and invite_row.use_count >= invite_row.max_uses then
    return query select false, 'max_uses_reached'::text, null::text, null::text, null::text, null::text, 0::bigint, false, invite_row.expires_at;
    return;
  end if;

  select count(*)
  into active_members
  from public.study_group_memberships m
  where m.group_id = group_row.id
    and m.status = 'active';

  already_member := public.is_study_group_member(group_row.id);

  return query select
    true,
    'ok'::text,
    group_row.id,
    group_row.name,
    group_row.privacy,
    group_row.join_method,
    active_members,
    already_member,
    invite_row.expires_at;
end;
$$;

create or replace function public.join_study_group_by_invite(invite_token text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  cleaned_token text := btrim(coalesce(invite_token, ''));
  invite_row public.study_group_invites%rowtype;
  group_row public.study_groups%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join this study group.';
  end if;

  if char_length(cleaned_token) < 16 or char_length(cleaned_token) > 128 then
    raise exception 'This invitation link is invalid.';
  end if;

  select *
  into invite_row
  from public.study_group_invites invite
  where invite.token = cleaned_token;

  if not found then
    raise exception 'This invitation link is invalid.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('invite:' || invite_row.id::text, 0));

  select *
  into invite_row
  from public.study_group_invites invite
  where invite.id = invite_row.id;

  select *
  into group_row
  from public.study_groups g
  where g.id = invite_row.group_id
    and g.archived_at is null;

  if not found then
    raise exception 'This study group is no longer available.';
  end if;

  if invite_row.revoked_at is not null then
    raise exception 'This invitation link has been revoked.';
  end if;

  if invite_row.expires_at <= now() then
    raise exception 'This invitation link has expired.';
  end if;

  if public.is_study_group_member(group_row.id) then
    return group_row.id;
  end if;

  if invite_row.max_uses is not null and invite_row.use_count >= invite_row.max_uses then
    raise exception 'This invitation link has reached its usage limit.';
  end if;

  insert into public.study_group_memberships (group_id, user_id, role, status)
  values (group_row.id, auth.uid(), 'Member', 'active')
  on conflict (group_id, user_id) do update
    set status = 'active';

  update public.study_group_invites
  set use_count = use_count + 1
  where id = invite_row.id;

  return group_row.id;
end;
$$;

create or replace function public.leave_study_group(group_key text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_group_id text := btrim(coalesce(group_key, ''));
  member_role text;
  other_admin_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in to leave a study group.';
  end if;

  select m.role
  into member_role
  from public.study_group_memberships m
  where m.group_id = normalized_group_id
    and m.user_id = auth.uid()
    and m.status = 'active';

  if not found then
    return;
  end if;

  if member_role = 'Owner' then
    select exists (
      select 1
      from public.study_group_memberships m
      where m.group_id = normalized_group_id
        and m.user_id <> auth.uid()
        and m.status = 'active'
        and m.role in ('Owner', 'Admin')
    ) into other_admin_exists;

    if not other_admin_exists then
      raise exception 'Transfer leadership or disband the group before leaving.';
    end if;
  end if;

  update public.study_room_sessions
  set status = 'left',
      focusing = false,
      ended_at = coalesce(ended_at, now())
  where group_id = normalized_group_id
    and user_id = auth.uid()
    and status = 'active';

  delete from public.study_group_memberships
  where group_id = normalized_group_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.disband_study_group(group_key text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_group_id text := btrim(coalesce(group_key, ''));
begin
  if auth.uid() is null then
    raise exception 'Sign in to disband a study group.';
  end if;

  if not public.is_study_group_admin(normalized_group_id) then
    raise exception 'Only a group owner or admin can disband this group.';
  end if;

  update public.study_groups
  set archived_at = coalesce(archived_at, now())
  where id = normalized_group_id;

  update public.study_group_invites
  set revoked_at = coalesce(revoked_at, now())
  where group_id = normalized_group_id
    and revoked_at is null;

  update public.study_room_sessions
  set status = 'left',
      focusing = false,
      ended_at = coalesce(ended_at, now())
  where group_id = normalized_group_id
    and status = 'active';
end;
$$;

revoke all on function public.list_discoverable_study_groups() from public, anon;
revoke all on function public.create_study_group_invite(text, integer, integer) from public, anon;
revoke all on function public.list_study_group_invites(text) from public, anon;
revoke all on function public.revoke_study_group_invite(uuid) from public, anon;
revoke all on function public.get_study_group_invite_preview(text) from public, anon;
revoke all on function public.join_study_group_by_invite(text) from public, anon;
revoke all on function public.leave_study_group(text) from public, anon;
revoke all on function public.disband_study_group(text) from public, anon;

grant execute on function public.list_discoverable_study_groups() to authenticated;
grant execute on function public.create_study_group_invite(text, integer, integer) to authenticated;
grant execute on function public.list_study_group_invites(text) to authenticated;
grant execute on function public.revoke_study_group_invite(uuid) to authenticated;
grant execute on function public.get_study_group_invite_preview(text) to authenticated;
grant execute on function public.join_study_group_by_invite(text) to authenticated;
grant execute on function public.leave_study_group(text) to authenticated;
grant execute on function public.disband_study_group(text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'study_groups'
    ) then
      alter publication supabase_realtime add table public.study_groups;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'study_group_memberships'
    ) then
      alter publication supabase_realtime add table public.study_group_memberships;
    end if;
  end if;
end;
$$;

notify pgrst, 'reload schema';
