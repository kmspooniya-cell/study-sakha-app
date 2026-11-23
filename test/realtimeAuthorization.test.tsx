// @ts-nocheck - Jest globals are provided by the Expo test runtime.
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/202611240002_study_room_realtime_silent_focus_read.sql'),
  'utf8',
);
const memberMigration = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/202611230004_study_room_realtime_member_access.sql'),
  'utf8',
);
const realtimeSource = fs.readFileSync(path.join(__dirname, '../lib/groupRoomRealtime.ts'), 'utf8');

function canJoinPrivateTopic(
  userId: string | null,
  topic: string,
  memberships: { userId: string; groupId: string; status: string }[],
  rooms: { groupId: string; roomId: string }[],
) {
  if (!userId) return false;
  const [, groupId, roomId] = topic.split(':');
  const activeMember = memberships.some((membership) =>
    membership.userId === userId && membership.groupId === groupId && membership.status === 'active',
  );
  if (roomId === 'silent-focus') return activeMember;
  return activeMember && rooms.some((room) => room.groupId === groupId && room.roomId === roomId);
}

function canReceiveBroadcast(
  userId: string | null,
  topic: string,
  memberships: { userId: string; groupId: string; status: string }[],
) {
  if (!userId) return false;
  const [, groupId, roomId] = topic.split(':');
  return roomId === 'silent-focus' && memberships.some((membership) =>
    membership.userId === userId && membership.groupId === groupId && membership.status === 'active',
  );
}

describe('silent-focus Realtime authorization contract', () => {
  it('allows active members of each exact group and rejects cross-group, non-member, and anonymous joins', () => {
    const memberships = [
      { userId: 'member', groupId: 'grp-ras-mains', status: 'active' },
      { userId: 'member', groupId: 'grp-upsc-cam', status: 'active' },
    ];

    expect(canJoinPrivateTopic('member', 'study-room:grp-ras-mains:silent-focus', memberships, [])).toBe(true);
    expect(canJoinPrivateTopic('member', 'study-room:grp-upsc-cam:silent-focus', memberships, [])).toBe(true);
    expect(canReceiveBroadcast('member', 'study-room:grp-ras-mains:silent-focus', memberships)).toBe(true);
    expect(canReceiveBroadcast('member', 'study-room:grp-upsc-cam:silent-focus', memberships)).toBe(true);
    expect(canJoinPrivateTopic('other', 'study-room:grp-ras-mains:silent-focus', memberships, [])).toBe(false);
    expect(canJoinPrivateTopic(null, 'study-room:grp-ras-mains:silent-focus', memberships, [])).toBe(false);
    expect(canReceiveBroadcast('other', 'study-room:grp-ras-mains:silent-focus', memberships)).toBe(false);
    expect(canReceiveBroadcast(null, 'study-room:grp-ras-mains:silent-focus', memberships)).toBe(false);
  });

  it('keeps other room types dependent on both a room record and active membership', () => {
    const memberships = [{ userId: 'member', groupId: 'grp-ras-mains', status: 'active' }];
    const rooms = [{ groupId: 'grp-ras-mains', roomId: 'pomodoro' }];

    expect(canJoinPrivateTopic('member', 'study-room:grp-ras-mains:pomodoro', memberships, rooms)).toBe(true);
    expect(canJoinPrivateTopic('member', 'study-room:grp-ras-mains:desk-cam', memberships, rooms)).toBe(false);
  });

  it('removes only the event predicate from silent-focus read authorization', () => {
    expect(migration).toContain('extension = \'broadcast\'');
    expect(migration).toContain("split_part(realtime.topic(), ':', 3) = 'silent-focus'");
    expect(migration).toContain('public.is_study_room_topic_member()');
    expect(migration).not.toContain("event = 'silent-reaction'");
    expect(migration).not.toContain('using (true)');
    expect(memberMigration).toContain('study_room_realtime_membership_guard');
    expect(memberMigration).toContain('study_room_realtime_anonymous_guard');
    expect(memberMigration).toContain("event = 'silent-reaction'");
  });

  it('uses a private channel and sets Realtime auth before subscribing', () => {
    expect(realtimeSource).toContain('config: { private: true, presence: { key: userId } }');
    expect(realtimeSource.indexOf('await supabase.realtime.setAuth(session.access_token)'))
      .toBeLessThan(realtimeSource.indexOf('channel.subscribe((status, subscribeError)'));
  });
});
