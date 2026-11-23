alter table public.study_member_activity_events
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists planned_seconds integer check (planned_seconds is null or planned_seconds >= 0),
  add column if not exists mode text check (mode is null or mode in ('timer', 'stopwatch', 'pomodoro')),
  add column if not exists schedule_id text,
  add column if not exists schedule_occurrence_id text;

drop function if exists public.submit_study_member_activity(
  text, text, text, text, text, integer, text, timestamptz
);

create function public.submit_study_member_activity(
  group_key text,
  event_key text,
  activity_kind text,
  task_key text default null,
  subject_name text default null,
  seconds_count integer default 0,
  session_status text default null,
  event_time timestamptz default now(),
  started_at_value timestamptz default null,
  ended_at_value timestamptz default null,
  planned_seconds_count integer default null,
  mode_value text default null,
  schedule_key text default null,
  occurrence_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before synchronizing activity.';
  end if;
  if btrim(coalesce(event_key, '')) = '' then
    raise exception 'An activity event id is required.';
  end if;
  if activity_kind not in ('focus_session', 'planner_task_completed') then
    raise exception 'Invalid activity type.';
  end if;
  if seconds_count < 0 or coalesce(planned_seconds_count, 0) < 0 then
    raise exception 'Activity duration cannot be negative.';
  end if;
  if session_status is not null and session_status not in ('completed', 'saved_early', 'interrupted', 'abandoned') then
    raise exception 'Invalid focus session status.';
  end if;
  if mode_value is not null and mode_value not in ('timer', 'stopwatch', 'pomodoro') then
    raise exception 'Invalid focus session mode.';
  end if;
  if started_at_value is not null and ended_at_value is not null and started_at_value > ended_at_value then
    raise exception 'Focus session end time cannot be before its start time.';
  end if;
  if not public.is_study_group_member(group_key) then
    raise exception 'Join this study group before synchronizing activity.';
  end if;

  insert into public.study_member_activity_events (
    group_id,
    user_id,
    event_id,
    activity_type,
    task_id,
    subject,
    actual_seconds,
    focus_status,
    occurred_at,
    started_at,
    ended_at,
    planned_seconds,
    mode,
    schedule_id,
    schedule_occurrence_id
  )
  values (
    group_key,
    auth.uid(),
    event_key,
    activity_kind,
    nullif(btrim(coalesce(task_key, '')), ''),
    nullif(btrim(coalesce(subject_name, '')), ''),
    greatest(0, seconds_count),
    session_status,
    coalesce(event_time, now()),
    started_at_value,
    ended_at_value,
    planned_seconds_count,
    mode_value,
    nullif(btrim(coalesce(schedule_key, '')), ''),
    nullif(btrim(coalesce(occurrence_key, '')), '')
  )
  on conflict (group_id, user_id, event_id) do nothing;

  return true;
end;
$$;

revoke all on function public.submit_study_member_activity(
  text, text, text, text, text, integer, text, timestamptz,
  timestamptz, timestamptz, integer, text, text, text
) from public, anon;
grant execute on function public.submit_study_member_activity(
  text, text, text, text, text, integer, text, timestamptz,
  timestamptz, timestamptz, integer, text, text, text
) to authenticated;
