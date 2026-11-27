import { supabase, supabaseConfigured } from '../../../lib/supabase';

export type AlarmFriendStatusType = 'awake' | 'snoozing' | 'sleeping' | 'unknown';

export interface AlarmFriendRecord {
  user_id: string;
  display_name: string;
  exam_id: string | null;
  target_wake_time: string | null;
  last_wake_status: AlarmFriendStatusType;
  last_wake_at: string | null;
  current_streak: number;
  recently_nudged: boolean;
}

export interface AlarmFriendRequestRecord {
  request_id: string;
  user_id: string;
  display_name: string;
  exam_id: string | null;
  created_at: string;
}

export interface AlarmSquadMemberRecord {
  user_id: string;
  display_name: string;
  status: 'invited' | 'joined' | 'declined';
  last_wake_status: AlarmFriendStatusType;
}

export interface AlarmWakeSquadRecord {
  squad_id: string;
  name: string;
  target_wake_time: string;
  owner_id: string;
  my_status: 'invited' | 'joined' | 'declined';
  members: AlarmSquadMemberRecord[];
}

export interface AlarmNotificationRecord {
  id: string;
  kind: 'friend_request' | 'friend_accepted' | 'squad_invite' | 'cheer' | 'nudge';
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface AlarmMyWakeStatus {
  target_wake_time: string;
  last_wake_status: AlarmFriendStatusType;
  last_wake_at: string | null;
  current_streak: number;
}

export interface AlarmFriendsDashboard {
  friends: AlarmFriendRecord[];
  incoming_requests: AlarmFriendRequestRecord[];
  outgoing_requests: AlarmFriendRequestRecord[];
  my_status: AlarmMyWakeStatus;
  squads: AlarmWakeSquadRecord[];
  notifications: AlarmNotificationRecord[];
}

export interface AlarmUserSearchResult {
  user_id: string;
  display_name: string;
  exam_id: string | null;
  relationship_status: 'none' | 'accepted' | 'outgoing_pending' | 'incoming_pending';
}

export type AlarmFriendsLoadResult =
  | { ok: true; data: AlarmFriendsDashboard }
  | { ok: false; reason: 'unconfigured' | 'unauthenticated' | 'schema_missing' | 'network_or_error'; message: string };

const EMPTY_DASHBOARD: AlarmFriendsDashboard = {
  friends: [],
  incoming_requests: [],
  outgoing_requests: [],
  my_status: {
    target_wake_time: '06:00',
    last_wake_status: 'unknown',
    last_wake_at: null,
    current_streak: 0,
  },
  squads: [],
  notifications: [],
};

function classifySupabaseError(error: { code?: string; message?: string } | null | undefined): {
  reason: 'schema_missing' | 'unauthenticated' | 'network_or_error';
  message: string;
} {
  const msg = error?.message || 'Unable to reach friends service.';
  const code = error?.code || '';
  if (code === 'PGRST202' || code === '42P01' || /could not find the function/i.test(msg)) {
    return {
      reason: 'schema_missing',
      message: 'Friends backend migration is not deployed on this Supabase project yet.',
    };
  }
  if (/authentication required|jwt|not authenticated/i.test(msg)) {
    return {
      reason: 'unauthenticated',
      message: 'Sign in with your Study Sakha account to connect with friends.',
    };
  }
  return { reason: 'network_or_error', message: msg };
}

export async function fetchAlarmFriendsDashboard(): Promise<AlarmFriendsLoadResult> {
  if (!supabaseConfigured || !supabase) {
    return {
      ok: false,
      reason: 'unconfigured',
      message: 'Cloud sync is not configured in this build.',
    };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user) {
    return {
      ok: false,
      reason: 'unauthenticated',
      message: 'Sign in with your Study Sakha account to view and add friends.',
    };
  }
  const { data, error } = await supabase.rpc('get_alarm_friends_dashboard');
  if (error) {
    const classified = classifySupabaseError(error);
    return { ok: false, ...classified };
  }
  const payload = (data || {}) as Partial<AlarmFriendsDashboard>;
  return {
    ok: true,
    data: {
      friends: Array.isArray(payload.friends) ? payload.friends : [],
      incoming_requests: Array.isArray(payload.incoming_requests) ? payload.incoming_requests : [],
      outgoing_requests: Array.isArray(payload.outgoing_requests) ? payload.outgoing_requests : [],
      my_status: payload.my_status ?? EMPTY_DASHBOARD.my_status,
      squads: Array.isArray(payload.squads) ? payload.squads : [],
      notifications: Array.isArray(payload.notifications) ? payload.notifications : [],
    },
  };
}

export async function searchAlarmUsers(query: string): Promise<{ ok: true; users: AlarmUserSearchResult[] } | { ok: false; message: string }> {
  if (!supabaseConfigured || !supabase) {
    return { ok: false, message: 'Cloud sync is not configured.' };
  }
  const trimmed = query.trim();
  if (trimmed.length < 2) return { ok: true, users: [] };
  const { data, error } = await supabase.rpc('search_alarm_users', { query_text: trimmed });
  if (error) return { ok: false, message: classifySupabaseError(error).message };
  return { ok: true, users: Array.isArray(data) ? (data as AlarmUserSearchResult[]) : [] };
}

export async function sendAlarmFriendRequest(targetUserId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabaseConfigured || !supabase) return { ok: false, message: 'Cloud sync is not configured.' };
  const { error } = await supabase.rpc('send_alarm_friend_request', { target_user_id: targetUserId });
  if (error) return { ok: false, message: classifySupabaseError(error).message };
  return { ok: true };
}

export async function respondAlarmFriendRequest(
  requestId: string,
  decision: 'accept' | 'reject' | 'cancel'
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabaseConfigured || !supabase) return { ok: false, message: 'Cloud sync is not configured.' };
  const { error } = await supabase.rpc('respond_alarm_friend_request', { request_id: requestId, decision });
  if (error) return { ok: false, message: classifySupabaseError(error).message };
  return { ok: true };
}

export async function removeAlarmFriend(friendUserId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabaseConfigured || !supabase) return { ok: false, message: 'Cloud sync is not configured.' };
  const { error } = await supabase.rpc('remove_alarm_friend', { friend_user_id: friendUserId });
  if (error) return { ok: false, message: classifySupabaseError(error).message };
  return { ok: true };
}

export async function upsertMyAlarmWakeStatus(
  targetTime: string,
  wakeStatus: AlarmFriendStatusType,
  streakCount: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabaseConfigured || !supabase) return { ok: false, message: 'Cloud sync is not configured.' };
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user) return { ok: false, message: 'Not signed in.' };
  const { error } = await supabase.rpc('upsert_my_alarm_wake_status', {
    target_time: targetTime,
    wake_status: wakeStatus,
    streak_count: streakCount,
  });
  if (error) return { ok: false, message: classifySupabaseError(error).message };
  return { ok: true };
}

export async function createAlarmWakeSquad(
  squadName: string,
  targetTime: string,
  memberIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabaseConfigured || !supabase) return { ok: false, message: 'Cloud sync is not configured.' };
  const { error } = await supabase.rpc('create_alarm_wake_squad', {
    squad_name: squadName,
    target_time: targetTime,
    member_ids: memberIds,
  });
  if (error) return { ok: false, message: classifySupabaseError(error).message };
  return { ok: true };
}

export async function respondAlarmSquadInvite(
  squadId: string,
  acceptInvite: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabaseConfigured || !supabase) return { ok: false, message: 'Cloud sync is not configured.' };
  const { error } = await supabase.rpc('respond_alarm_squad_invite', {
    squad_id: squadId,
    accept_invite: acceptInvite,
  });
  if (error) return { ok: false, message: classifySupabaseError(error).message };
  return { ok: true };
}

export async function sendAlarmFriendNudge(
  targetUserId: string,
  actionKind: 'cheer' | 'nudge'
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabaseConfigured || !supabase) return { ok: false, message: 'Cloud sync is not configured.' };
  const { error } = await supabase.rpc('send_alarm_friend_nudge', {
    target_user_id: targetUserId,
    action_kind: actionKind,
  });
  if (error) return { ok: false, message: classifySupabaseError(error).message };
  return { ok: true };
}

export async function markAlarmNotificationsRead(
  notificationIds: string[] | null
): Promise<void> {
  if (!supabaseConfigured || !supabase) return;
  await supabase.rpc('mark_alarm_notifications_read', { notification_ids: notificationIds });
}
