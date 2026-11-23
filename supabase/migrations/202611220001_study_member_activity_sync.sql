create table if not exists public.study_member_activity_events (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  activity_type text not null check (activity_type in ('focus_session', 'planner_task_completed')),
  task_id text,
  subject text,
  actual_seconds integer not null default 0 check (actual_seconds >= 0),
  focus_status text check (focus_status in ('completed', 'interrupted', 'abandoned')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (group_id, user_id, event_id)
);

create index if not exists study_member_activity_events_group_time_idx
  on public.study_member_activity_events(group_id, occurred_at desc);
create index if not exists study_member_activity_events_user_idx
  on public.study_member_activity_events(user_id, occurred_at desc);

alter table public.study_member_activity_events enable row level security;

create policy study_member_activity_events_member_read
on public.study_member_activity_events
for select to authenticated
using (public.is_study_group_member(group_id));

revoke all on table public.study_member_activity_events from anon;
revoke all on table public.study_member_activity_events from authenticated;
grant select on public.study_member_activity_events to authenticated;

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
  if session_status is not null and session_status not in ('completed', 'interrupted', 'abandoned') then
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

create or replace function public.get_study_group_activity_insights(group_key text)
returns table (
  user_id uuid,
  focus_seconds integer,
  focus_sessions integer,
  completed_focus_sessions integer,
  completed_tasks integer
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    event.user_id,
    coalesce(sum(event.actual_seconds) filter (where event.activity_type = 'focus_session'), 0)::integer,
    coalesce(count(*) filter (where event.activity_type = 'focus_session'), 0)::integer,
    coalesce(count(*) filter (where event.activity_type = 'focus_session' and event.focus_status = 'completed'), 0)::integer,
    coalesce(count(distinct event.task_id) filter (where event.activity_type = 'planner_task_completed'), 0)::integer
  from public.study_member_activity_events event
  where event.group_id = group_key
    and public.is_study_group_member(group_key)
  group by event.user_id
  order by focus_seconds desc;
$$;

revoke all on function public.get_study_group_activity_insights(text) from public, anon;
grant execute on function public.get_study_group_activity_insights(text) to authenticated;
