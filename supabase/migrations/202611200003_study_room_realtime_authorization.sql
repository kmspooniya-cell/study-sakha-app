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
    join public.study_group_memberships membership
      on membership.group_id = room.group_id
     and membership.user_id = auth.uid()
     and membership.status = 'active'
    where (select realtime.topic()) =
      'study-room:' || room.group_id || ':' || room.room_id
  );
$$;

revoke all on function public.is_study_room_topic_member() from public, anon;
grant execute on function public.is_study_room_topic_member() to authenticated;

drop policy if exists study_room_topic_presence_read on realtime.messages;
drop policy if exists study_room_topic_presence_write on realtime.messages;
drop policy if exists silent_focus_reactions_read on realtime.messages;
drop policy if exists silent_focus_reactions_write on realtime.messages;

create policy study_room_topic_presence_read on realtime.messages
for select to authenticated
using (
  extension = 'presence'
  and (select public.is_study_room_topic_member())
);

create policy study_room_topic_presence_write on realtime.messages
for insert to authenticated
with check (
  extension = 'presence'
  and (select public.is_study_room_topic_member())
);

create policy silent_focus_reactions_read on realtime.messages
for select to authenticated
using (
  extension = 'broadcast'
  and event = 'silent-reaction'
  and (select realtime.topic()) like 'study-room:%:silent-focus'
  and (select public.is_study_room_topic_member())
);

create policy silent_focus_reactions_write on realtime.messages
for insert to authenticated
with check (
  extension = 'broadcast'
  and event = 'silent-reaction'
  and (select realtime.topic()) like 'study-room:%:silent-focus'
  and (select public.is_study_room_topic_member())
);
