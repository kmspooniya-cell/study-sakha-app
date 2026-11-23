-- Forward-only migration: Fix Realtime authorization for silent-focus topics.
-- Updates is_study_room_topic_member() to authorize silent-focus topics based on
-- active group membership alone, without requiring a study_group_rooms row.
-- For all other room types (pomodoro, exam-simulation, desk-cam), behavior is unchanged.

create or replace function public.is_study_room_topic_member()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, realtime
as $$
select auth.uid() is not null and (
  case
    when split_part(realtime.topic(), ':', 3) = 'silent-focus' then
      -- Special case: silent-focus topics authorize based on active group membership alone.
      -- No study_group_rooms row is required.
      exists (
        select 1
        from public.study_group_memberships membership
        where membership.group_id = split_part(realtime.topic(), ':', 2)
          and membership.user_id = auth.uid()
          and membership.status = 'active'
      )
    else
      -- All other room types: require both a study_group_rooms row and active membership.
      exists (
        select 1
        from public.study_group_rooms room
        join public.study_group_memberships membership
          on membership.group_id = room.group_id
         and membership.user_id = auth.uid()
         and membership.status = 'active'
        where realtime.topic() = 'study-room:' || room.group_id || ':' || room.room_id
      )
  end
);
$$;

-- Re-grant execute to authenticated users (idempotent if already granted)
revoke all on function public.is_study_room_topic_member() from public, anon;
grant execute on function public.is_study_room_topic_member() to authenticated;
