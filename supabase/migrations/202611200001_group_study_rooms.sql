create table public.study_groups (
  id text primary key,
  name text not null,
  privacy text not null check (privacy in ('Public', 'Private')),
  join_method text not null check (join_method in ('Open Join', 'Password Protected', 'Answer-based Entry', 'Leader Approval')),
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.study_group_memberships (
  group_id text not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'Member' check (role in ('Owner', 'Admin', 'Moderator', 'Mentor', 'Member')),
  status text not null default 'active' check (status in ('active', 'pending')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.study_group_rooms (
  group_id text not null references public.study_groups(id) on delete cascade,
  room_id text not null check (room_id in ('silent-focus', 'pomodoro', 'exam-simulation', 'desk-cam')),
  phase text not null default 'focus' check (phase in ('focus', 'break')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (group_id, room_id)
);

create table public.study_room_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  room_id text not null check (room_id in ('silent-focus', 'pomodoro', 'exam-simulation', 'desk-cam')),
  status text not null default 'active' check (status in ('active', 'completed', 'left')),
  focusing boolean not null default false,
  focus_started_at timestamptz,
  focused_seconds integer not null default 0 check (focused_seconds >= 0),
  subject text not null default 'Current Affairs',
  ambient_audio text not null default 'muted' check (ambient_audio in ('muted', 'brown-noise', 'soft-rain', 'library-hum')),
  micro_goals jsonb not null default '[]'::jsonb check (jsonb_typeof(micro_goals) = 'array'),
  camera_mode text check (camera_mode in ('camera-off')),
  consent_at timestamptz,
  questions_attempted integer check (questions_attempted is null or questions_attempted >= 0),
  time_management_rating integer check (time_management_rating is null or time_management_rating between 1 and 5),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  foreign key (group_id, room_id) references public.study_group_rooms(group_id, room_id),
  check (room_id <> 'desk-cam' or (consent_at is not null and camera_mode = 'camera-off')),
  check (room_id <> 'exam-simulation' or status <> 'completed' or (questions_attempted is not null and time_management_rating is not null))
);

create table public.study_room_break_messages (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  room_id text not null default 'pomodoro' check (room_id = 'pomodoro'),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  foreign key (group_id, room_id) references public.study_group_rooms(group_id, room_id)
);

create table public.study_room_reports (
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

insert into public.study_groups (id, name, privacy, join_method) values
  ('grp-ras-mains', 'RAS Mains 2026 — Rajasthan Special', 'Private', 'Leader Approval'),
  ('grp-upsc-cam', 'UPSC CSE 2027 — Dawn Cam Batch', 'Public', 'Open Join'),
  ('grp-rssb-patwari', 'RSSB Patwari & VDO 2026 Rapid PYQ', 'Public', 'Open Join'),
  ('grp-ssc-cgl', 'SSC CGL Tier-II Quant & Reasoning', 'Private', 'Password Protected'),
  ('grp-ras-answer', 'Jodhpur RAS Peer Answer Writing Circle', 'Public', 'Open Join')
on conflict (id) do nothing;

insert into public.study_group_rooms (group_id, room_id)
select study_group.id, room.room_id
from public.study_groups study_group
cross join (
  values ('silent-focus'), ('pomodoro'), ('exam-simulation'), ('desk-cam')
) as room(room_id)
on conflict (group_id, room_id) do nothing;

create index study_group_memberships_user_status_idx
  on public.study_group_memberships(user_id, status);
create index study_room_sessions_group_active_idx
  on public.study_room_sessions(group_id, room_id, status)
  where status = 'active';
create index study_room_break_messages_group_created_idx
  on public.study_room_break_messages(group_id, created_at desc);

create or replace function public.track_study_room_focus_time()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new.focusing then
      new.focus_started_at := now();
    end if;
  elsif old.focusing and not new.focusing then
    new.focused_seconds := old.focused_seconds
      + greatest(0, floor(extract(epoch from (now() - coalesce(old.focus_started_at, now()))))::integer);
    new.focus_started_at := null;
  elsif not old.focusing and new.focusing then
    new.focus_started_at := now();
  else
    new.focus_started_at := old.focus_started_at;
    new.focused_seconds := old.focused_seconds;
  end if;
  return new;
end;
$$;

create trigger study_room_sessions_focus_time_insert
before insert on public.study_room_sessions
for each row execute function public.track_study_room_focus_time();

create trigger study_room_sessions_focus_time_update
before update of focusing on public.study_room_sessions
for each row execute function public.track_study_room_focus_time();

create or replace function public.is_study_group_member(group_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.study_group_memberships membership
    where membership.group_id = group_key
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function public.is_study_group_admin(group_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_admin() or exists (
    select 1
    from public.study_group_memberships membership
    where membership.group_id = group_key
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('Owner', 'Admin')
  );
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
  where study_group.id = group_key
    and study_group.privacy = 'Public'
    and study_group.join_method = 'Open Join'
  on conflict (group_id, user_id) do update
    set status = 'active';

  if not found then
    raise exception 'This group requires an invitation or approval.';
  end if;
end;
$$;

create or replace function public.create_study_group(
  group_key text,
  group_name text,
  group_privacy text,
  group_join_method text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to create a study group.';
  end if;
  if group_privacy not in ('Public', 'Private')
    or group_join_method not in ('Open Join', 'Password Protected', 'Answer-based Entry', 'Leader Approval')
    or (group_privacy = 'Private' and group_join_method = 'Open Join') then
    raise exception 'Invalid group access settings.';
  end if;

  insert into public.study_groups (id, name, privacy, join_method, owner_id)
  values (group_key, btrim(group_name), group_privacy, group_join_method, auth.uid());
  insert into public.study_group_memberships (group_id, user_id, role, status)
  values (group_key, auth.uid(), 'Owner', 'active');
  insert into public.study_group_rooms (group_id, room_id)
  values
    (group_key, 'silent-focus'),
    (group_key, 'pomodoro'),
    (group_key, 'exam-simulation'),
    (group_key, 'desk-cam');
end;
$$;

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

create or replace function public.get_study_room_insights(group_key text)
returns table (
  id uuid,
  user_id uuid,
  room_id text,
  subject text,
  focused_seconds integer,
  questions_attempted integer,
  time_management_rating integer,
  started_at timestamptz,
  ended_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    session.id,
    session.user_id,
    session.room_id,
    session.subject,
    session.focused_seconds,
    session.questions_attempted,
    session.time_management_rating,
    session.started_at,
    session.ended_at
  from public.study_room_sessions session
  where session.group_id = group_key
    and session.focused_seconds > 0
    and public.is_study_group_member(group_key)
  order by session.started_at desc
  limit 100;
$$;

create or replace function public.is_study_room_topic_member()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, realtime
as $$
  select exists (
    select 1
    from public.study_group_rooms room
    where realtime.topic() = 'study-room:' || room.group_id || ':' || room.room_id
      and public.is_study_group_member(room.group_id)
  );
$$;

revoke all on function public.is_study_group_member(text) from public, anon;
revoke all on function public.is_study_group_admin(text) from public, anon;
revoke all on function public.join_open_study_group(text) from public, anon;
revoke all on function public.create_study_group(text, text, text, text) from public, anon;
revoke all on function public.get_study_room_member_profiles(text, uuid[]) from public, anon;
revoke all on function public.get_study_room_insights(text) from public, anon;
revoke all on function public.is_study_room_topic_member() from public, anon;
grant execute on function public.is_study_group_member(text) to authenticated;
grant execute on function public.is_study_group_admin(text) to authenticated;
grant execute on function public.join_open_study_group(text) to authenticated;
grant execute on function public.create_study_group(text, text, text, text) to authenticated;
grant execute on function public.get_study_room_member_profiles(text, uuid[]) to authenticated;
grant execute on function public.get_study_room_insights(text) to authenticated;
grant execute on function public.is_study_room_topic_member() to authenticated;

alter table public.study_groups enable row level security;
alter table public.study_group_memberships enable row level security;
alter table public.study_group_rooms enable row level security;
alter table public.study_room_sessions enable row level security;
alter table public.study_room_break_messages enable row level security;
alter table public.study_room_reports enable row level security;

create policy study_groups_member_read on public.study_groups
for select to authenticated
using (privacy = 'Public' or public.is_study_group_member(id));

create policy study_group_memberships_group_read on public.study_group_memberships
for select to authenticated
using (user_id = auth.uid() or public.is_study_group_member(group_id));

create policy study_group_memberships_admin_manage on public.study_group_memberships
for all to authenticated
using (public.is_study_group_admin(group_id))
with check (public.is_study_group_admin(group_id));

create policy study_group_rooms_member_read on public.study_group_rooms
for select to authenticated
using (public.is_study_group_member(group_id));

create policy study_group_rooms_member_phase_update on public.study_group_rooms
for update to authenticated
using (public.is_study_group_member(group_id))
with check (public.is_study_group_member(group_id) and updated_by = auth.uid());

create policy study_room_sessions_owner_read on public.study_room_sessions
for select to authenticated
using (user_id = auth.uid() and public.is_study_group_member(group_id));

create policy study_room_sessions_member_insert on public.study_room_sessions
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_study_group_member(group_id)
  and (room_id <> 'desk-cam' or (consent_at is not null and camera_mode = 'camera-off'))
);

create policy study_room_sessions_owner_update on public.study_room_sessions
for update to authenticated
using (user_id = auth.uid() and public.is_study_group_member(group_id))
with check (user_id = auth.uid() and public.is_study_group_member(group_id));

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

create policy study_room_reports_admin_read on public.study_room_reports
for select to authenticated
using (public.is_study_group_admin(group_id));

grant select on public.study_groups, public.study_group_memberships, public.study_group_rooms,
  public.study_room_sessions, public.study_room_break_messages, public.study_room_reports to authenticated;
grant insert, update on public.study_group_memberships to authenticated;
grant update (phase, updated_by, updated_at) on public.study_group_rooms to authenticated;
grant insert (group_id, user_id, room_id, subject, camera_mode, consent_at)
  on public.study_room_sessions to authenticated;
grant update (status, focusing, subject, ambient_audio, micro_goals, questions_attempted,
  time_management_rating, ended_at) on public.study_room_sessions to authenticated;
grant insert on public.study_room_break_messages to authenticated;
grant insert on public.study_room_reports to authenticated;

comment on table public.study_room_reports is
  'Room moderation reports are visible only to group admins and platform admins.';

create policy study_room_topic_presence_read on realtime.messages
for select to authenticated
using (
  extension = 'presence'
  and public.is_study_room_topic_member()
);

create policy study_room_topic_presence_write on realtime.messages
for insert to authenticated
with check (
  extension = 'presence'
  and public.is_study_room_topic_member()
);

create policy silent_focus_reactions_read on realtime.messages
for select to authenticated
using (
  extension = 'broadcast'
  and split_part(realtime.topic(), ':', 3) = 'silent-focus'
  and event = 'silent-reaction'
  and public.is_study_room_topic_member()
);

create policy silent_focus_reactions_write on realtime.messages
for insert to authenticated
with check (
  extension = 'broadcast'
  and split_part(realtime.topic(), ':', 3) = 'silent-focus'
  and event = 'silent-reaction'
  and public.is_study_room_topic_member()
);

do $$
begin
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
end;
$$;
