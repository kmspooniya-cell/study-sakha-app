import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockStorage = new Map<string, string>();
const mockRpc = jest.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>();
const mockFrom = jest.fn();

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    executionEnvironment: 'bare',
    appOwnership: null,
  },
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `exp://127.0.0.1:8081/--/${path}`),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
  },
}));

jest.mock('../lib/supabase', () => ({
  supabaseConfigured: true,
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  clearPendingGroupInvite,
  extractGroupInviteFromUrl,
  getDeepLinkPrefixes,
  getGroupInviteUrl,
  getPendingGroupInvite,
  savePendingGroupInvite,
} from '../lib/shareLinks';
import {
  createStudyGroupInvite,
  disbandStudyGroup,
  getStudyGroupInvitePreview,
  joinStudyGroupByInvite,
  leaveStudyGroup,
  listDiscoverableStudyGroups,
  revokeStudyGroupInvite,
} from '../lib/groupRooms';

const { renderGroupInviteLandingHtml } = require('../server/invitePage') as typeof import('../server/invitePage');

describe('Study Groups invite links, deep linking, and backend sync', () => {
  const originalGroupInviteBaseUrl = process.env.EXPO_PUBLIC_GROUP_INVITE_BASE_URL;
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    if (originalGroupInviteBaseUrl === undefined) delete process.env.EXPO_PUBLIC_GROUP_INVITE_BASE_URL;
    else process.env.EXPO_PUBLIC_GROUP_INVITE_BASE_URL = originalGroupInviteBaseUrl;
    if (originalApiBaseUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  });

  afterAll(() => {
    if (originalGroupInviteBaseUrl === undefined) delete process.env.EXPO_PUBLIC_GROUP_INVITE_BASE_URL;
    else process.env.EXPO_PUBLIC_GROUP_INVITE_BASE_URL = originalGroupInviteBaseUrl;
    if (originalApiBaseUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  });

  test('extractGroupInviteFromUrl parses custom scheme, HTTPS, and legacy group IDs', () => {
    expect(extractGroupInviteFromUrl('studysakha://groups/invite/tok_abc123456789012345')).toEqual({
      inviteToken: 'tok_abc123456789012345',
    });
    expect(extractGroupInviteFromUrl('https://study-sakha-app.vercel.app/groups/invite/tok_xyz987654321')).toEqual({
      inviteToken: 'tok_xyz987654321',
    });
    expect(extractGroupInviteFromUrl('https://study-sakha-app.vercel.app/groups/invite?token=tok_query12345')).toEqual({
      inviteToken: 'tok_query12345',
    });
    expect(extractGroupInviteFromUrl('studysakha://groups/invite/grp-ras-mains')).toEqual({
      inviteGroupId: 'grp-ras-mains',
    });
    expect(extractGroupInviteFromUrl('studysakha://library')).toBeNull();
  });

  test('getGroupInviteUrl falls back cleanly from explicit host to API host to custom scheme', () => {
    delete process.env.EXPO_PUBLIC_GROUP_INVITE_BASE_URL;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;

    // Reload module with clean env to verify fallback resolution
    jest.isolateModules(() => {
      const shareLinks = require('../lib/shareLinks') as typeof import('../lib/shareLinks');
      expect(shareLinks.getGroupInviteUrl('tok_secure_123')).toBe('studysakha://groups/invite/tok_secure_123');
    });

    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://study-sakha-app.vercel.app/';
    jest.isolateModules(() => {
      const shareLinks = require('../lib/shareLinks') as typeof import('../lib/shareLinks');
      expect(shareLinks.getGroupInviteUrl('tok_secure_123')).toBe(
        'https://study-sakha-app.vercel.app/groups/invite/tok_secure_123',
      );
      expect(shareLinks.getDeepLinkPrefixes()).toContain('https://study-sakha-app.vercel.app');
    });

    process.env.EXPO_PUBLIC_GROUP_INVITE_BASE_URL = 'https://invites.studysakha.in';
    jest.isolateModules(() => {
      const shareLinks = require('../lib/shareLinks') as typeof import('../lib/shareLinks');
      expect(shareLinks.getGroupInviteUrl('tok_secure_123')).toBe(
        'https://invites.studysakha.in/groups/invite/tok_secure_123',
      );
    });
  });

  test('pending group invite persists across auth redirect and clears after consumption', async () => {
    expect(await getPendingGroupInvite()).toBeNull();
    await savePendingGroupInvite({ inviteToken: 'tok_pending_123456' });
    const stored = await getPendingGroupInvite();
    expect(stored?.inviteToken).toBe('tok_pending_123456');
    await clearPendingGroupInvite();
    expect(await getPendingGroupInvite()).toBeNull();
  });

  test('listDiscoverableStudyGroups returns cross-account public and joined groups', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'grp-public-1',
          name: 'UPSC Prelims 2027',
          privacy: 'Public',
          join_method: 'Open Join',
          owner_id: 'account-a',
          created_at: '2026-11-26T06:00:00Z',
          member_count: 14,
          is_member: false,
          member_role: null,
        },
        {
          id: 'grp-private-1',
          name: 'RAS Mains Circle',
          privacy: 'Private',
          join_method: 'Leader Approval',
          owner_id: 'account-b',
          created_at: '2026-11-26T05:00:00Z',
          member_count: 3,
          is_member: true,
          member_role: 'Owner',
        },
      ],
      error: null,
    });

    const groups = await listDiscoverableStudyGroups('account-b');
    expect(mockRpc).toHaveBeenCalledWith('list_discoverable_study_groups');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      id: 'grp-public-1',
      privacy: 'Public',
      joinMethod: 'Open Join',
      memberCount: 14,
      isMember: false,
    });
    expect(groups[1]).toMatchObject({
      id: 'grp-private-1',
      privacy: 'Private',
      isMember: true,
      memberRole: 'Owner',
    });
  });

  test('invite lifecycle RPCs create, preview, join, revoke, leave, and disband', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: [{
          id: 'inv-1',
          group_id: 'grp-1',
          token: 'tok_generated_123456',
          expires_at: '2026-12-03T00:00:00Z',
          max_uses: null,
          use_count: 0,
          created_at: '2026-11-26T00:00:00Z',
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{
          valid: true,
          status_reason: 'ok',
          group_id: 'grp-1',
          group_name: 'UPSC Prelims 2027',
          privacy: 'Private',
          join_method: 'Leader Approval',
          member_count: 5,
          is_member: false,
          expires_at: '2026-12-03T00:00:00Z',
        }],
        error: null,
      })
      .mockResolvedValueOnce({ data: 'grp-1', error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const created = await createStudyGroupInvite({ groupId: 'grp-1' });
    expect(created.token).toBe('tok_generated_123456');

    const preview = await getStudyGroupInvitePreview('tok_generated_123456');
    expect(preview.valid).toBe(true);
    expect(preview.groupName).toBe('UPSC Prelims 2027');

    const joinedGroupId = await joinStudyGroupByInvite('tok_generated_123456');
    expect(joinedGroupId).toBe('grp-1');

    expect(await revokeStudyGroupInvite('inv-1')).toBe(true);
    await expect(leaveStudyGroup('grp-1')).resolves.toBeUndefined();
    await expect(disbandStudyGroup('grp-1')).resolves.toBeUndefined();
  });

  test('web invite landing page renders safe escaped deep link and browser fallback', () => {
    const html = renderGroupInviteLandingHtml({
      token: 'tok_<script>alert(1)</script>',
      webAppUrl: '/groups/invite/tok_test?web=1',
    });
    expect(html).toContain('studysakha://groups/invite/tok_%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(html).toContain('Open in Study Sakha App');
    expect(html).toContain('Continue in Browser');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  test('app.config.js injects Android App Link intentFilter when invite host is set', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://study-sakha-app.vercel.app';
    jest.isolateModules(() => {
      const appJson = require('../app.json');
      const appConfig = require('../app.config.js');
      const resolved = appConfig({ config: appJson.expo });
      expect(resolved.android.intentFilters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: 'VIEW',
            autoVerify: true,
            data: [
              expect.objectContaining({
                scheme: 'https',
                host: 'study-sakha-app.vercel.app',
                pathPrefix: '/groups/invite',
              }),
            ],
          }),
        ]),
      );
    });
  });
});
