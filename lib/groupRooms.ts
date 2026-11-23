import { supabase, supabaseConfigured } from './supabase';

export const GROUP_ROOM_IDS = [
  'silent-focus',
  'pomodoro',
  'exam-simulation',
  'desk-cam',
] as const;

export type GroupRoomId = (typeof GROUP_ROOM_IDS)[number];
export type GroupRoomPhase = 'focus' | 'break';
export type AmbientAudio = 'muted' | 'brown-noise' | 'soft-rain' | 'library-hum';

export type RoomMicroGoal = {
  id: string;
  title: string;
  completed: boolean;
};

export type BreakRoomMessage = {
  id: string;
  group_id: string;
  room_id: 'pomodoro';
  user_id: string;
  body: string;
  created_at: string;
};

export type StudyRoomLog = {
  id: string;
  user_id: string;
  room_id: GroupRoomId;
  subject: string;
  focused_seconds: number;
  questions_attempted: number | null;
  time_management_rating: number | null;
  started_at: string;
  ended_at: string | null;
};

export type StudyGroupActivityInsight = {
  user_id: string;
  focus_seconds: number;
  focus_sessions: number;
  completed_focus_sessions: number;
  completed_tasks: number;
};

export type StudyRoomProfile = {
  user_id: string;
  display_name: string;
  streak: number;
};

function assertSupabaseConfigured() {
  if (!supabaseConfigured) {
    throw new Error('Connect Supabase to join a study room.');
  }
}

export async function createRoomSession({
  groupId,
  roomId,
  subject,
  cameraConsent,
}: {
  groupId: string;
  roomId: GroupRoomId;
  subject: string;
  cameraConsent?: boolean;
}) {
  assertSupabaseConfigured();
  if (roomId === 'desk-cam' && !cameraConsent) {
    throw new Error('Confirm the Desk-Cam privacy consent before joining.');
  }

  const { data, error } = await supabase.rpc('join_study_room', {
    group_key: groupId,
    room_key: roomId,
    room_subject: subject,
    camera_consented: roomId === 'desk-cam' && cameraConsent === true,
  });
  if (error) throw new Error(`Could not join this study room: ${error.message}`);
  if (typeof data !== 'string') throw new Error('Could not join this study room: no session was created.');
  return data;
}

export async function joinOpenStudyGroup(groupId: string) {
  assertSupabaseConfigured();
  const { error } = await supabase.rpc('join_open_study_group', { group_key: groupId });
  if (error) throw new Error(error.message);
}

export async function getActiveStudyGroupIds(userId: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('study_group_memberships')
    .select('group_id')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (error) throw new Error(`Could not load your group memberships: ${error.message}`);
  return data.map((membership) => membership.group_id as string);
}

export async function createStudyGroup({
  groupId,
  name,
  privacy,
  joinMethod,
}: {
  groupId: string;
  name: string;
  privacy: 'Public' | 'Private';
  joinMethod: 'Open Join' | 'Password Protected' | 'Answer-based Entry' | 'Leader Approval';
}) {
  assertSupabaseConfigured();
  const { error } = await supabase.rpc('create_study_group', {
    group_key: groupId,
    group_name: name,
    group_privacy: privacy,
    group_join_method: joinMethod,
  });
  if (error) throw new Error(error.message);
}

export async function updateRoomSession(
  sessionId: string,
  update: {
    focusing?: boolean;
    subject?: string;
    ambient_audio?: AmbientAudio;
    micro_goals?: RoomMicroGoal[];
  }
) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('study_room_sessions')
    .update(update)
    .eq('id', sessionId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Could not update your room session: ${error.message}`);
  if (!data) throw new Error('You no longer have permission to update this room session.');
}

export async function finishRoomSession(
  sessionId: string,
  result: {
    status: 'completed' | 'left';
    questions_attempted?: number;
    time_management_rating?: number;
  }
) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('study_room_sessions')
    .update({ ...result, focusing: false, ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Could not save your study session: ${error.message}`);
  if (!data) throw new Error('You no longer have permission to save this study session.');
}

export async function updateSharedRoomPhase(
  groupId: string,
  roomId: GroupRoomId,
  phase: GroupRoomPhase,
  userId: string
) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('study_group_rooms')
    .update({ phase, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('group_id', groupId)
    .eq('room_id', roomId)
    .select('room_id')
    .maybeSingle();
  if (error) throw new Error(`Could not sync the room phase: ${error.message}`);
  if (!data) throw new Error('You no longer have permission to sync this room phase.');
}

export async function sendBreakRoomMessage(groupId: string, body: string) {
  assertSupabaseConfigured();
  const { error } = await supabase
    .from('study_room_break_messages')
    .insert({ group_id: groupId, body: body.trim() });
  if (error) throw new Error(`Could not send your break message: ${error.message}`);
}

export async function getBreakRoomMessages(groupId: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('study_room_break_messages')
    .select('id, group_id, room_id, user_id, body, created_at')
    .eq('group_id', groupId)
    .eq('room_id', 'pomodoro')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(`Could not load break chat: ${error.message}`);
  return data as BreakRoomMessage[];
}

export async function getStudyRoomLogs(groupId: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc('get_study_room_insights', {
    group_key: groupId,
  });
  if (error) throw new Error(`Could not load group study logs: ${error.message}`);
  return (data ?? []) as StudyRoomLog[];
}

export async function submitStudyMemberActivity({
  groupId,
  eventId,
  activityType,
  taskId,
  subject,
  actualSeconds,
  status,
  occurredAt,
}: {
  groupId: string;
  eventId: string;
  activityType: 'focus_session' | 'planner_task_completed';
  taskId?: string;
  subject?: string;
  actualSeconds: number;
  status?: 'completed' | 'interrupted' | 'abandoned';
  occurredAt: string;
}) {
  assertSupabaseConfigured();
  const { error } = await supabase.rpc('submit_study_member_activity', {
    group_key: groupId,
    event_key: eventId,
    activity_kind: activityType,
    task_key: taskId ?? null,
    subject_name: subject ?? null,
    seconds_count: Math.max(0, Math.round(actualSeconds)),
    session_status: status ?? null,
    event_time: occurredAt,
  });
  if (error) throw new Error(`Could not synchronize group activity: ${error.message}`);
}

export async function getStudyGroupActivityInsights(groupId: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc('get_study_group_activity_insights', {
    group_key: groupId,
  });
  if (error) throw new Error(`Could not load group activity insights: ${error.message}`);
  return (data ?? []) as StudyGroupActivityInsight[];
}

export async function getStudyRoomProfiles(groupId: string, userIds: string[]) {
  assertSupabaseConfigured();
  if (!userIds.length) return [];
  const { data, error } = await supabase.rpc('get_study_room_member_profiles', {
    group_key: groupId,
    member_ids: userIds,
  });
  if (error) throw new Error(`Could not load room learner profiles: ${error.message}`);
  return data as StudyRoomProfile[];
}

export async function reportRoomMember({
  groupId,
  roomId,
  reportedUserId,
  reason,
}: {
  groupId: string;
  roomId: GroupRoomId;
  reportedUserId: string;
  reason: 'Harassment' | 'Unsafe behavior' | 'Spam' | 'Other';
}) {
  assertSupabaseConfigured();
  const { error } = await supabase.from('study_room_reports').insert({
    group_id: groupId,
    room_id: roomId,
    reported_user_id: reportedUserId,
    reason,
  });
  if (error) throw new Error(`Could not submit the room report: ${error.message}`);
}
