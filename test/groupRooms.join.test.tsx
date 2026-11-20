import { beforeEach, describe, expect, it, jest } from '@jest/globals';

let mockSupabaseConfigured = true;
const mockRpc = jest.fn(async (): Promise<{ data: string | null; error: { message: string } | null }> => ({
  data: 'session-id',
  error: null,
}));
const mockSupabase = { rpc: mockRpc };

jest.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
  get supabaseConfigured() {
    return mockSupabaseConfigured;
  },
}));

const { createRoomSession } = require('../lib/groupRooms') as typeof import('../lib/groupRooms');

describe('createRoomSession', () => {
  beforeEach(() => {
    mockSupabaseConfigured = true;
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: 'session-id', error: null });
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
});
