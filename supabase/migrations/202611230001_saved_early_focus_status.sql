alter table public.study_member_activity_events
  drop constraint if exists study_member_activity_events_focus_status_check;

alter table public.study_member_activity_events
  add constraint study_member_activity_events_focus_status_check
  check (focus_status in ('completed', 'saved_early', 'interrupted', 'abandoned'));

create or replace function public.submit_study_member_activity(
  group_key text,
  event_key text,
  activity_kind text,
  task_key text default null,
  subject_name text default null,
  seconds_count integer default 0,
  session_status text default null,
  event_time timestamptz default now()
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
  if seconds_count < 0 then
    raise exception 'Activity duration cannot be negative.';
  end if;
  if session_status is not null and session_status not in ('completed', 'saved_early', 'interrupted', 'abandoned') then
    raise exception 'Invalid focus session status.';
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
    occurred_at
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
    coalesce(event_time, now())
  )
  on conflict (group_id, user_id, event_id) do nothing;

  return true;
end;
$$;

revoke all on function public.submit_study_member_activity(text, text, text, text, text, integer, text, timestamptz) from public, anon;
grant execute on function public.submit_study_member_activity(text, text, text, text, text, integer, text, timestamptz) to authenticated;
