with duplicate_active_sessions as (
  select
    id,
    row_number() over (
      partition by group_id, room_id, user_id
      order by started_at desc, id desc
    ) as position
  from public.study_room_sessions
  where status = 'active'
)
update public.study_room_sessions session
set status = 'left',
    focusing = false,
    ended_at = coalesce(session.ended_at, now())
from duplicate_active_sessions duplicate
where session.id = duplicate.id
  and duplicate.position > 1;

create unique index study_room_sessions_one_active_member_idx
  on public.study_room_sessions(group_id, room_id, user_id)
  where status = 'active';

create or replace function public.join_study_room(
  group_key text,
  room_key text,
  room_subject text,
  camera_consented boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  session_key uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before joining a study room.';
  end if;
  if room_key not in ('silent-focus', 'pomodoro', 'exam-simulation', 'desk-cam') then
    raise exception 'This study room is not available.';
  end if;
  if not public.is_study_group_member(group_key) then
    raise exception 'Join this study group before entering its rooms.';
  end if;
  if room_key = 'desk-cam' and camera_consented is not true then
    raise exception 'Confirm camera-off session consent before joining Desk-Cam.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(auth.uid()::text || ':' || group_key || ':' || room_key, 0)
  );

  select session.id
  into session_key
  from public.study_room_sessions session
  where session.group_id = group_key
    and session.room_id = room_key
    and session.user_id = auth.uid()
    and session.status = 'active'
  order by session.started_at desc
  limit 1;

  if session_key is not null then
    return session_key;
  end if;

  insert into public.study_room_sessions (
    group_id,
    user_id,
    room_id,
    subject,
    camera_mode,
    consent_at
  )
  values (
    group_key,
    auth.uid(),
    room_key,
    coalesce(nullif(btrim(room_subject), ''), 'Current Affairs'),
    case when room_key = 'desk-cam' then 'camera-off' else null end,
    case when room_key = 'desk-cam' then now() else null end
  )
  returning id into session_key;

  return session_key;
end;
$$;

revoke all on function public.join_study_room(text, text, text, boolean) from public, anon;
grant execute on function public.join_study_room(text, text, text, boolean) to authenticated;

revoke insert on public.study_room_sessions from authenticated;
revoke insert (group_id, user_id, room_id, subject, camera_mode, consent_at)
  on public.study_room_sessions from authenticated;
