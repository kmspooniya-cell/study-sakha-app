-- Forward-only production repair for the profile exam catalog and group RPCs.
-- This migration does not modify user profiles or remove existing data.

insert into public.exams (id, name, short_name, color, aspirants_label)
values
  ('upsc', 'UPSC Civil Services', 'UPSC', '#243B80', '12.4L'),
  ('ras', 'Rajasthan Administrative Service', 'RAS', '#C2410C', '1.8L'),
  ('rpsc_rssb', 'RPSC / RSSB State Exams', 'RPSC/RSSB', '#0F766E', '3.4L'),
  ('ssc', 'SSC CGL & CHSL', 'SSC', '#4778F5', '28.1L'),
  ('banking', 'Banking (IBPS / SBI)', 'Banking', '#18B6A4', '19.7L'),
  ('neet', 'NEET UG', 'NEET', '#7C5CF0', '23.3L'),
  ('jee', 'JEE Main & Advanced', 'JEE', '#F5A524', '14.8L')
on conflict (id) do nothing;

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
  if btrim(coalesce(group_key, '')) !~ '^[a-z0-9][a-z0-9-]{2,63}$' then
    raise exception 'Group key must contain 3 to 64 lowercase letters, numbers, or hyphens.';
  end if;
  if char_length(btrim(coalesce(group_name, ''))) not between 2 and 120 then
    raise exception 'Group name must contain between 2 and 120 characters.';
  end if;
  if group_privacy not in ('Public', 'Private')
    or group_join_method not in ('Open Join', 'Password Protected', 'Answer-based Entry', 'Leader Approval')
    or (group_privacy = 'Private' and group_join_method = 'Open Join') then
    raise exception 'Invalid group access settings.';
  end if;

  insert into public.study_groups (id, name, privacy, join_method, owner_id)
  values (btrim(group_key), btrim(group_name), group_privacy, group_join_method, auth.uid());

  insert into public.study_group_memberships (group_id, user_id, role, status)
  values (btrim(group_key), auth.uid(), 'Owner', 'active');

  insert into public.study_group_rooms (group_id, room_id)
  values
    (btrim(group_key), 'silent-focus'),
    (btrim(group_key), 'pomodoro'),
    (btrim(group_key), 'exam-simulation'),
    (btrim(group_key), 'desk-cam');
end;
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
  where session.group_id = btrim(group_key)
    and session.focused_seconds > 0
    and public.is_study_group_member(btrim(group_key))
  order by session.started_at desc
  limit 100;
$$;

revoke all on function public.create_study_group(text, text, text, text) from public, anon;
grant execute on function public.create_study_group(text, text, text, text) to authenticated;
revoke all on function public.get_study_room_insights(text) from public, anon;
grant execute on function public.get_study_room_insights(text) to authenticated;

notify pgrst, 'reload schema';
