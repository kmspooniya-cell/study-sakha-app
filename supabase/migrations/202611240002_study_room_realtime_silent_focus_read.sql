-- Forward-only fix: private Broadcast channel joins authorize by topic access.
-- Supabase evaluates SELECT access during the private-channel join using a
-- synthetic Broadcast message, before a client event name exists.

drop policy if exists silent_focus_reactions_read on realtime.messages;

create policy silent_focus_reactions_read on realtime.messages
for select to authenticated
using (
  extension = 'broadcast'
  and split_part(realtime.topic(), ':', 3) = 'silent-focus'
  and public.is_study_room_topic_member()
);
