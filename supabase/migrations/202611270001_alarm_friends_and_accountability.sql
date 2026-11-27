-- Forward-only migration: Alarm Friends, Wake-Up Accountability, Squads, Nudges & Notifications.
-- Strict RLS + SECURITY DEFINER RPCs; no demo/seed user records.

create table if not exists public.alarm_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists alarm_friendships_active_pair_idx
  on public.alarm_friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
  where status in ('pending', 'accepted');

create index if not exists alarm_friendships_requester_idx on public.alarm_friendships (requester_id, status);
create index if not exists alarm_friendships_addressee_idx on public.alarm_friendships (addressee_id, status);

create trigger alarm_friendships_set_updated_at
  before update on public.alarm_friendships
  for each row execute function public.set_updated_at();

create table if not exists public.alarm_wake_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_wake_time text not null default '06:00',
  last_wake_status text not null default 'unknown' check (last_wake_status in ('awake', 'snoozing', 'sleeping', 'unknown')),
  last_wake_at timestamptz,
  current_streak integer not null default 0 check (current_streak >= 0),
  updated_at timestamptz not null default now()
);

create trigger alarm_wake_status_set_updated_at
  before update on public.alarm_wake_status
  for each row execute function public.set_updated_at();

create table if not exists public.alarm_wake_squads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_wake_time text not null default '06:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger alarm_wake_squads_set_updated_at
  before update on public.alarm_wake_squads
  for each row execute function public.set_updated_at();

create table if not exists public.alarm_wake_squad_members (
  squad_id uuid not null references public.alarm_wake_squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'joined', 'declined')),
  invited_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create trigger alarm_wake_squad_members_set_updated_at
  before update on public.alarm_wake_squad_members
  for each row execute function public.set_updated_at();

create table if not exists public.alarm_friend_nudges (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('cheer', 'nudge')),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists alarm_friend_nudges_rate_idx
  on public.alarm_friend_nudges (sender_id, recipient_id, created_at desc);

create table if not exists public.alarm_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('friend_request', 'friend_accepted', 'squad_invite', 'cheer', 'nudge')),
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists alarm_notifications_recipient_idx
  on public.alarm_notifications (recipient_id, created_at desc);

-- Helper: check if two users are accepted friends
create or replace function public.are_alarm_friends(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.alarm_friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = user_a and f.addressee_id = user_b)
        or (f.requester_id = user_b and f.addressee_id = user_a)
      )
  );
$$;

alter table public.alarm_friendships enable row level security;
alter table public.alarm_wake_status enable row level security;
alter table public.alarm_wake_squads enable row level security;
alter table public.alarm_wake_squad_members enable row level security;
alter table public.alarm_friend_nudges enable row level security;
alter table public.alarm_notifications enable row level security;

create policy alarm_friendships_participant_read on public.alarm_friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy alarm_wake_status_self_write on public.alarm_wake_status
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy alarm_wake_status_friend_read on public.alarm_wake_status
  for select to authenticated
  using (user_id = auth.uid() or public.are_alarm_friends(auth.uid(), user_id));

create policy alarm_wake_squads_member_read on public.alarm_wake_squads
  for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.alarm_wake_squad_members m
      where m.squad_id = id and m.user_id = auth.uid()
    )
  );

create policy alarm_wake_squad_members_read on public.alarm_wake_squad_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.alarm_wake_squads s
      where s.id = squad_id and s.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.alarm_wake_squad_members m2
      where m2.squad_id = squad_id and m2.user_id = auth.uid() and m2.status = 'joined'
    )
  );

create policy alarm_friend_nudges_participant_read on public.alarm_friend_nudges
  for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy alarm_notifications_self_read on public.alarm_notifications
  for select to authenticated
  using (recipient_id = auth.uid());

create policy alarm_notifications_self_update on public.alarm_notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Search authenticated users by display_name or exact/prefix email without exposing stranger emails
create or replace function public.search_alarm_users(query_text text)
returns table (
  user_id uuid,
  display_name text,
  exam_id text,
  relationship_status text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  cleaned text := trim(coalesce(query_text, ''));
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(cleaned) < 2 then
    return;
  end if;

  return query
  select
    p.id as user_id,
    p.display_name,
    p.exam_id,
    coalesce((
      select case
        when f.status = 'accepted' then 'accepted'
        when f.status = 'pending' and f.requester_id = caller_id then 'outgoing_pending'
        when f.status = 'pending' and f.addressee_id = caller_id then 'incoming_pending'
        else 'none'
      end
      from public.alarm_friendships f
      where f.status in ('pending', 'accepted')
        and (
          (f.requester_id = caller_id and f.addressee_id = p.id)
          or (f.requester_id = p.id and f.addressee_id = caller_id)
        )
      limit 1
    ), 'none') as relationship_status
  from public.profiles p
  where p.id <> caller_id
    and p.status = 'active'
    and (
      p.display_name ilike ('%' || cleaned || '%')
      or lower(coalesce(p.email, '')) = lower(cleaned)
    )
  order by p.display_name asc
  limit 15;
end;
$$;

create or replace function public.send_alarm_friend_request(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_name text;
  existing_status text;
  req_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;
  if target_user_id is null or target_user_id = caller_id then
    raise exception 'You cannot send a friend request to yourself';
  end if;
  if not exists (select 1 from public.profiles p where p.id = target_user_id and p.status = 'active') then
    raise exception 'User not found';
  end if;

  select f.status into existing_status
  from public.alarm_friendships f
  where f.status in ('pending', 'accepted')
    and (
      (f.requester_id = caller_id and f.addressee_id = target_user_id)
      or (f.requester_id = target_user_id and f.addressee_id = caller_id)
    )
  limit 1;

  if existing_status = 'accepted' then
    raise exception 'You are already friends';
  elsif existing_status = 'pending' then
    raise exception 'A friend request is already pending';
  end if;

  insert into public.alarm_friendships (requester_id, addressee_id, status)
  values (caller_id, target_user_id, 'pending')
  returning id into req_id;

  select coalesce(p.display_name, 'A Study Sakha learner') into caller_name
  from public.profiles p where p.id = caller_id;

  insert into public.alarm_notifications (recipient_id, actor_id, kind, title, body, metadata)
  values (
    target_user_id,
    caller_id,
    'friend_request',
    'New Wake-Up Friend Request',
    caller_name || ' wants to connect on Smart Alarm.',
    jsonb_build_object('request_id', req_id)
  );

  return req_id;
end;
$$;

create or replace function public.respond_alarm_friend_request(request_id uuid, decision text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  row_rec public.alarm_friendships%rowtype;
  caller_name text;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;
  if decision not in ('accept', 'reject', 'cancel') then
    raise exception 'Invalid decision';
  end if;

  select * into row_rec from public.alarm_friendships where id = request_id for update;
  if not found or row_rec.status <> 'pending' then
    raise exception 'Friend request is no longer pending';
  end if;

  if decision in ('accept', 'reject') and row_rec.addressee_id <> caller_id then
    raise exception 'Only the recipient can accept or reject this request';
  end if;
  if decision = 'cancel' and row_rec.requester_id <> caller_id then
    raise exception 'Only the sender can cancel this request';
  end if;

  update public.alarm_friendships
  set status = case
    when decision = 'accept' then 'accepted'
    when decision = 'reject' then 'rejected'
    else 'cancelled'
  end
  where id = request_id;

  if decision = 'accept' then
    select coalesce(p.display_name, 'Your friend') into caller_name
    from public.profiles p where p.id = caller_id;

    insert into public.alarm_notifications (recipient_id, actor_id, kind, title, body, metadata)
    values (
      row_rec.requester_id,
      caller_id,
      'friend_accepted',
      'Friend Request Accepted',
      caller_name || ' accepted your Wake-Up Friends request.',
      jsonb_build_object('request_id', request_id)
    );
  end if;

  return decision;
end;
$$;

create or replace function public.remove_alarm_friend(friend_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  update public.alarm_friendships
  set status = 'cancelled'
  where status = 'accepted'
    and (
      (requester_id = caller_id and addressee_id = friend_user_id)
      or (requester_id = friend_user_id and addressee_id = caller_id)
    );

  return true;
end;
$$;

create or replace function public.upsert_my_alarm_wake_status(
  target_time text,
  wake_status text default 'unknown',
  streak_count integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;
  if target_time !~ '^\d{2}:\d{2}$' then
    raise exception 'Invalid target wake time format (HH:MM)';
  end if;
  if wake_status not in ('awake', 'snoozing', 'sleeping', 'unknown') then
    raise exception 'Invalid wake status';
  end if;

  insert into public.alarm_wake_status (user_id, target_wake_time, last_wake_status, last_wake_at, current_streak)
  values (
    caller_id,
    target_time,
    wake_status,
    case when wake_status in ('awake', 'snoozing') then now() else null end,
    greatest(0, coalesce(streak_count, 0))
  )
  on conflict (user_id) do update set
    target_wake_time = excluded.target_wake_time,
    last_wake_status = excluded.last_wake_status,
    last_wake_at = coalesce(excluded.last_wake_at, public.alarm_wake_status.last_wake_at),
    current_streak = excluded.current_streak;

  return true;
end;
$$;

create or replace function public.create_alarm_wake_squad(
  squad_name text,
  target_time text,
  member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_name text;
  new_squad_id uuid;
  mid uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(coalesce(squad_name, ''))) < 2 then
    raise exception 'Squad name is required';
  end if;
  if target_time !~ '^\d{2}:\d{2}$' then
    raise exception 'Invalid target wake time format (HH:MM)';
  end if;

  insert into public.alarm_wake_squads (owner_id, name, target_wake_time)
  values (caller_id, trim(squad_name), target_time)
  returning id into new_squad_id;

  insert into public.alarm_wake_squad_members (squad_id, user_id, status, invited_by)
  values (new_squad_id, caller_id, 'joined', caller_id);

  select coalesce(p.display_name, 'A friend') into caller_name
  from public.profiles p where p.id = caller_id;

  if member_ids is not null then
    foreach mid in array member_ids loop
      if mid <> caller_id and public.are_alarm_friends(caller_id, mid) then
        insert into public.alarm_wake_squad_members (squad_id, user_id, status, invited_by)
        values (new_squad_id, mid, 'invited', caller_id)
        on conflict do nothing;

        insert into public.alarm_notifications (recipient_id, actor_id, kind, title, body, metadata)
        values (
          mid,
          caller_id,
          'squad_invite',
          'Wake-Up Squad Invitation',
          caller_name || ' invited you to "' || trim(squad_name) || '" (' || target_time || ').',
          jsonb_build_object('squad_id', new_squad_id, 'target_time', target_time)
        );
      end if;
    end loop;
  end if;

  return new_squad_id;
end;
$$;

create or replace function public.respond_alarm_squad_invite(squad_id uuid, accept_invite boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  update public.alarm_wake_squad_members
  set status = case when accept_invite then 'joined' else 'declined' end
  where alarm_wake_squad_members.squad_id = respond_alarm_squad_invite.squad_id
    and user_id = caller_id;

  return true;
end;
$$;

create or replace function public.send_alarm_friend_nudge(target_user_id uuid, action_kind text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_name text;
  recent_count integer;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;
  if action_kind not in ('cheer', 'nudge') then
    raise exception 'Invalid action kind';
  end if;
  if not public.are_alarm_friends(caller_id, target_user_id) then
    raise exception 'You can only cheer or nudge accepted friends';
  end if;

  select count(*) into recent_count
  from public.alarm_friend_nudges n
  where n.sender_id = caller_id
    and n.recipient_id = target_user_id
    and n.created_at > now() - interval '5 minutes';

  if recent_count > 0 then
    raise exception 'Please wait a few minutes before sending another cheer or nudge';
  end if;

  insert into public.alarm_friend_nudges (sender_id, recipient_id, kind)
  values (caller_id, target_user_id, action_kind);

  select coalesce(p.display_name, 'Your friend') into caller_name
  from public.profiles p where p.id = caller_id;

  insert into public.alarm_notifications (recipient_id, actor_id, kind, title, body, metadata)
  values (
    target_user_id,
    caller_id,
    action_kind,
    case when action_kind = 'cheer' then 'Morning Cheer!' else 'Wake-Up Nudge!' end,
    case
      when action_kind = 'cheer' then caller_name || ' cheered your morning consistency!'
      else caller_name || ' sent you a wake-up nudge!'
    end,
    jsonb_build_object('sender_id', caller_id)
  );

  return true;
end;
$$;

create or replace function public.mark_alarm_notifications_read(notification_ids uuid[])
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  update public.alarm_notifications
  set read_at = now()
  where recipient_id = caller_id
    and read_at is null
    and (notification_ids is null or id = any(notification_ids));

  return true;
end;
$$;

create or replace function public.get_alarm_friends_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  friends_json jsonb;
  incoming_json jsonb;
  outgoing_json jsonb;
  my_status_json jsonb;
  squads_json jsonb;
  notifications_json jsonb;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(jsonb_agg(item order by item->>'display_name'), '[]'::jsonb)
  into friends_json
  from (
    select jsonb_build_object(
      'user_id', p.id,
      'display_name', p.display_name,
      'exam_id', p.exam_id,
      'target_wake_time', ws.target_wake_time,
      'last_wake_status', coalesce(ws.last_wake_status, 'unknown'),
      'last_wake_at', ws.last_wake_at,
      'current_streak', coalesce(ws.current_streak, 0),
      'recently_nudged', exists (
        select 1 from public.alarm_friend_nudges n
        where n.sender_id = caller_id
          and n.recipient_id = p.id
          and n.created_at > now() - interval '5 minutes'
      )
    ) as item
    from public.alarm_friendships f
    join public.profiles p
      on p.id = case when f.requester_id = caller_id then f.addressee_id else f.requester_id end
    left join public.alarm_wake_status ws on ws.user_id = p.id
    where f.status = 'accepted'
      and (f.requester_id = caller_id or f.addressee_id = caller_id)
  ) sub;

  select coalesce(jsonb_agg(jsonb_build_object(
    'request_id', f.id,
    'user_id', p.id,
    'display_name', p.display_name,
    'exam_id', p.exam_id,
    'created_at', f.created_at
  ) order by f.created_at desc), '[]'::jsonb)
  into incoming_json
  from public.alarm_friendships f
  join public.profiles p on p.id = f.requester_id
  where f.status = 'pending' and f.addressee_id = caller_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'request_id', f.id,
    'user_id', p.id,
    'display_name', p.display_name,
    'exam_id', p.exam_id,
    'created_at', f.created_at
  ) order by f.created_at desc), '[]'::jsonb)
  into outgoing_json
  from public.alarm_friendships f
  join public.profiles p on p.id = f.addressee_id
  where f.status = 'pending' and f.requester_id = caller_id;

  select jsonb_build_object(
    'target_wake_time', coalesce(ws.target_wake_time, '06:00'),
    'last_wake_status', coalesce(ws.last_wake_status, 'unknown'),
    'last_wake_at', ws.last_wake_at,
    'current_streak', coalesce(ws.current_streak, 0)
  )
  into my_status_json
  from public.alarm_wake_status ws
  where ws.user_id = caller_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'squad_id', s.id,
    'name', s.name,
    'target_wake_time', s.target_wake_time,
    'owner_id', s.owner_id,
    'my_status', m.status,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', mp.id,
        'display_name', mp.display_name,
        'status', m2.status,
        'last_wake_status', coalesce(mws.last_wake_status, 'unknown')
      ) order by mp.display_name)
      from public.alarm_wake_squad_members m2
      join public.profiles mp on mp.id = m2.user_id
      left join public.alarm_wake_status mws on mws.user_id = mp.id
      where m2.squad_id = s.id and m2.status in ('joined', 'invited')
    ), '[]'::jsonb)
  ) order by s.created_at desc), '[]'::jsonb)
  into squads_json
  from public.alarm_wake_squads s
  join public.alarm_wake_squad_members m on m.squad_id = s.id and m.user_id = caller_id
  where m.status in ('joined', 'invited');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id,
    'kind', n.kind,
    'title', n.title,
    'body', n.body,
    'read_at', n.read_at,
    'created_at', n.created_at
  ) order by n.created_at desc), '[]'::jsonb)
  into notifications_json
  from (
    select * from public.alarm_notifications
    where recipient_id = caller_id
    order by created_at desc
    limit 20
  ) n;

  return jsonb_build_object(
    'friends', friends_json,
    'incoming_requests', incoming_json,
    'outgoing_requests', outgoing_json,
    'my_status', coalesce(my_status_json, jsonb_build_object('target_wake_time', '06:00', 'last_wake_status', 'unknown', 'last_wake_at', null, 'current_streak', 0)),
    'squads', squads_json,
    'notifications', notifications_json
  );
end;
$$;

revoke all on function public.are_alarm_friends(uuid, uuid) from public;
grant execute on function public.are_alarm_friends(uuid, uuid) to authenticated;

revoke all on function public.search_alarm_users(text) from public;
grant execute on function public.search_alarm_users(text) to authenticated;

revoke all on function public.send_alarm_friend_request(uuid) from public;
grant execute on function public.send_alarm_friend_request(uuid) to authenticated;

revoke all on function public.respond_alarm_friend_request(uuid, text) from public;
grant execute on function public.respond_alarm_friend_request(uuid, text) to authenticated;

revoke all on function public.remove_alarm_friend(uuid) from public;
grant execute on function public.remove_alarm_friend(uuid) to authenticated;

revoke all on function public.upsert_my_alarm_wake_status(text, text, integer) from public;
grant execute on function public.upsert_my_alarm_wake_status(text, text, integer) to authenticated;

revoke all on function public.create_alarm_wake_squad(text, text, uuid[]) from public;
grant execute on function public.create_alarm_wake_squad(text, text, uuid[]) to authenticated;

revoke all on function public.respond_alarm_squad_invite(uuid, boolean) from public;
grant execute on function public.respond_alarm_squad_invite(uuid, boolean) to authenticated;

revoke all on function public.send_alarm_friend_nudge(uuid, text) from public;
grant execute on function public.send_alarm_friend_nudge(uuid, text) to authenticated;

revoke all on function public.mark_alarm_notifications_read(uuid[]) from public;
grant execute on function public.mark_alarm_notifications_read(uuid[]) to authenticated;

revoke all on function public.get_alarm_friends_dashboard() from public;
grant execute on function public.get_alarm_friends_dashboard() to authenticated;
