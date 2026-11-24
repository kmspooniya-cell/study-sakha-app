import { beforeEach, describe, expect, it, jest } from '@jest/globals';

let mockSupabaseConfigured = true;
const mockRpc = jest.fn(async (): Promise<{ data: string | boolean | unknown[] | null; error: { code?: string; message: string } | null }> => ({
  data: 'session-id',
  error: null,
}));
let membershipData: { group_id: string }[] = [
  { group_id: 'group-1' },
  { group_id: 'group-2' },
  { group_id: 'group-1' },
];
const mockMembershipQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  then: (resolve: (value: { data: { group_id: string }[]; error: null }) => unknown) =>
    Promise.resolve({ data: membershipData, error: null }).then(resolve),
};
mockMembershipQuery.select.mockReturnValue(mockMembershipQuery);
mockMembershipQuery.eq.mockReturnValue(mockMembershipQuery);
const mockFrom = jest.fn(() => mockMembershipQuery);
const mockSupabase = { rpc: mockRpc, from: mockFrom };

jest.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
  get supabaseConfigured() {
    return mockSupabaseConfigured;
  },
}));

const { createRoomSession, createStudyGroup, getStudyRoomLogs, submitStudyMemberActivity, submitStudyMemberActivityToJoinedGroups } =
  require('../lib/groupRooms') as typeof import('../lib/groupRooms');

describe('createRoomSession', () => {
  beforeEach(() => {
    mockSupabaseConfigured = true;
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: 'session-id', error: null });
    mockFrom.mockClear();
    mockMembershipQuery.select.mockClear();
    mockMembershipQuery.eq.mockClear();
    membershipData = [{ group_id: 'group-1' }, { group_id: 'group-2' }, { group_id: 'group-1' }];
  });

  it('creates a session through the authenticated join RPC', async () => {
    await expect(createRoomSession({
      groupId: 'group-1',
      roomId: 'silent-focus',
      subject: 'Polity',
    })).resolves.toBe('session-id');
    expect(mockRpc).toHaveBeenCalledWith('join_study_room', {
      group_key: 'group-1',
      room_key: 'silent-focus',
      room_subject: 'Polity',
      camera_consented: false,
    });
  });

  it('requires camera-off consent before Desk-Cam can join', async () => {
    await expect(createRoomSession({
      groupId: 'group-1',
      roomId: 'desk-cam',
      subject: 'Polity',
    })).rejects.toThrow('Confirm the Desk-Cam privacy consent');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('surfaces RPC failures and rejects success responses without a session ID', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'not a member' } });
    await expect(createRoomSession({
      groupId: 'group-1',
      roomId: 'pomodoro',
      subject: 'Polity',
    })).rejects.toThrow('not a member');

    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(createRoomSession({
      groupId: 'group-1',
      roomId: 'pomodoro',
      subject: 'Polity',
    })).rejects.toThrow('no session was created');
  });

  it('fails explicitly when Supabase is not configured', async () => {
    mockSupabaseConfigured = false;
    await expect(createRoomSession({
      groupId: 'group-1',
      roomId: 'silent-focus',
      subject: 'Polity',
    })).rejects.toThrow('Connect Supabase to join a study room');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('submits one deduplicated event to every active group membership', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    await expect(submitStudyMemberActivityToJoinedGroups({
      userId: 'user-1',
      eventId: 'focus-session-1',
      activityType: 'focus_session',
      actualSeconds: 240,
      occurredAt: '2026-11-20T12:00:00.000Z',
      startedAt: '2026-11-20T11:56:00.000Z',
      endedAt: '2026-11-20T12:00:00.000Z',
      plannedSeconds: 1500,
      mode: 'timer',
      scheduleId: 'schedule-1',
      scheduleOccurrenceId: 'schedule-1::2026-11-20',
    })).resolves.toEqual({ groupIds: ['group-1', 'group-2'], failures: [] });

    expect(mockFrom).toHaveBeenCalledWith('study_group_memberships');
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenNthCalledWith(1, 'submit_study_member_activity', expect.objectContaining({
      group_key: 'group-1',
      event_key: 'focus-session-1',
      activity_kind: 'focus_session',
      task_key: null,
      subject_name: null,
      seconds_count: 240,
      session_status: null,
      event_time: '2026-11-20T12:00:00.000Z',
      started_at_value: '2026-11-20T11:56:00.000Z',
      ended_at_value: '2026-11-20T12:00:00.000Z',
      planned_seconds_count: 1500,
      mode_value: 'timer',
      schedule_key: 'schedule-1',
      occurrence_key: 'schedule-1::2026-11-20',
    }));
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'submit_study_member_activity', expect.objectContaining({
      group_key: 'group-2',
      event_key: 'focus-session-1',
      seconds_count: 240,
    }));
  });

  it('rejects an RPC response that does not confirm the event was recorded', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    await expect(submitStudyMemberActivity({
      groupId: 'group-1',
      eventId: 'focus-session-1',
      activityType: 'focus_session',
      actualSeconds: 240,
      occurredAt: '2026-11-20T12:00:00.000Z',
    })).rejects.toThrow('The server did not confirm the group activity sync');
  });

  it('reports per-group failures without blocking the remaining groups', async () => {
    mockRpc
      .mockRejectedValueOnce(new Error('group-1 is unavailable'))
      .mockResolvedValue({ data: true, error: null });

    const result = await submitStudyMemberActivityToJoinedGroups({
      userId: 'user-1',
      eventId: 'focus-session-1',
      activityType: 'focus_session',
      actualSeconds: 240,
      occurredAt: '2026-11-20T12:00:00.000Z',
    });

    expect(result).toEqual({
      groupIds: ['group-1', 'group-2'],
      failures: [{ groupId: 'group-1', message: 'group-1 is unavailable' }],
    });
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it('does not call the activity RPC when the user has no active group memberships', async () => {
    membershipData = [];

    const result = await submitStudyMemberActivityToJoinedGroups({
      userId: 'user-1',
      eventId: 'focus-session-1',
      activityType: 'focus_session',
      actualSeconds: 240,
      occurredAt: '2026-11-20T12:00:00.000Z',
    });

    expect(result).toEqual({ groupIds: [], failures: [] });
    expect(mockRpc).not.toHaveBeenCalledWith('submit_study_member_activity', expect.anything());
  });
});

describe('group backend RPC contracts', () => {
  beforeEach(() => {
    mockSupabaseConfigured = true;
    mockRpc.mockReset();
  });

  it('calls create_study_group with the deployed named arguments', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(createStudyGroup({
      groupId: 'group-1',
      name: 'Study Group',
      privacy: 'Private',
      joinMethod: 'Leader Approval',
    })).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith('create_study_group', {
      group_key: 'group-1',
      group_name: 'Study Group',
      group_privacy: 'Private',
      group_join_method: 'Leader Approval',
    });
  });

  it('calls get_study_room_insights with group_key and reports an unavailable function distinctly', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getStudyRoomLogs('group-1')).resolves.toEqual([]);
    expect(mockRpc).toHaveBeenCalledWith('get_study_room_insights', { group_key: 'group-1' });

    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'missing function' } });
    await expect(getStudyRoomLogs('group-1')).rejects.toThrow('Group insights is unavailable because its Supabase function is not deployed');
  });
});
