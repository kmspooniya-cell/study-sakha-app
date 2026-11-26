import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ExpoLinking from 'expo-linking';

const configuredDistributionUrl = process.env.EXPO_PUBLIC_APP_DISTRIBUTION_URL?.trim();
const configuredGroupInviteBaseUrl = process.env.EXPO_PUBLIC_GROUP_INVITE_BASE_URL?.trim();
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const PENDING_INVITE_STORAGE_KEY = 'sakha-pending-group-invite-v1';

export type PendingGroupInvite = {
  inviteToken?: string;
  inviteGroupId?: string;
  receivedAt: number;
};

function withPath(base: string, path: string) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function normalizeHttpOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname) {
      return parsed.origin + parsed.pathname.replace(/\/$/, '');
    }
  } catch {
    // Ignore malformed URLs
  }
  return null;
}

export function resolveGroupInviteBaseUrl(): string | null {
  const explicit = normalizeHttpOrigin(configuredGroupInviteBaseUrl);
  if (explicit) return explicit;
  const apiOrigin = normalizeHttpOrigin(configuredApiBaseUrl);
  if (apiOrigin) return apiOrigin;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeHttpOrigin(window.location.origin);
  }
  return null;
}

export function getDeepLinkPrefixes(): string[] {
  const prefixes = ['studysakha://'];
  const webOrigin = resolveGroupInviteBaseUrl();
  if (webOrigin) {
    try {
      prefixes.push(new URL(webOrigin).origin);
    } catch {
      // Ignore invalid origin
    }
  }
  return Array.from(new Set(prefixes));
}

/**
 * Resolves a link for the environment the user is actually running.
 * Expo Go links are intentionally generated at runtime: Expo documents that
 * they are not stable enough to use as a production distribution URL.
 */
export function getAppShareUrl(): string | null {
  if (Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo') {
    return ExpoLinking.createURL('');
  }
  return configuredDistributionUrl || null;
}

export function getGroupInviteUrl(inviteTokenOrGroupId: string): string | null {
  const cleaned = inviteTokenOrGroupId.trim();
  if (!cleaned) return null;
  const path = `groups/invite/${encodeURIComponent(cleaned)}`;
  if (Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo') {
    return ExpoLinking.createURL(path);
  }
  const webBase = resolveGroupInviteBaseUrl();
  if (webBase) return withPath(webBase, path);
  return `studysakha://${path}`;
}

export function getGroupAppDeepLinkUrl(inviteTokenOrGroupId: string): string | null {
  const cleaned = inviteTokenOrGroupId.trim();
  if (!cleaned) return null;
  return `studysakha://groups/invite/${encodeURIComponent(cleaned)}`;
}

export function extractGroupInviteFromUrl(
  rawUrl: string | null | undefined,
): { inviteToken?: string; inviteGroupId?: string } | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const queryToken = parsed.searchParams.get('token')?.trim() || parsed.searchParams.get('inviteToken')?.trim();
    const queryGroupId = parsed.searchParams.get('groupId')?.trim() || parsed.searchParams.get('inviteGroupId')?.trim();

    if (queryToken) return { inviteToken: queryToken };
    if (queryGroupId) return { inviteGroupId: queryGroupId };

    // Handle studysakha://groups/invite/<value> (host='groups', pathname='/invite/<value>')
    // and https://domain/groups/invite/<value> (pathname='/groups/invite/<value>')
    // and exp://host/--/groups/invite/<value>
    const combinedPath = parsed.protocol === 'studysakha:'
      ? `/${parsed.hostname}${parsed.pathname}`
      : parsed.pathname;
    const match = /\/groups\/invite\/([^/?#]+)/i.exec(combinedPath);
    if (match?.[1]) {
      const value = decodeURIComponent(match[1]).trim();
      if (!value) return null;
      if (value.startsWith('grp-')) {
        return { inviteGroupId: value };
      }
      return { inviteToken: value };
    }
  } catch {
    const fallbackMatch = /groups\/invite\/([^/?#]+)/i.exec(trimmed);
    if (fallbackMatch?.[1]) {
      const value = decodeURIComponent(fallbackMatch[1]).trim();
      if (!value) return null;
      return value.startsWith('grp-') ? { inviteGroupId: value } : { inviteToken: value };
    }
  }

  return null;
}

export async function savePendingGroupInvite(invite: { inviteToken?: string; inviteGroupId?: string }): Promise<void> {
  if (!invite.inviteToken && !invite.inviteGroupId) return;
  const payload: PendingGroupInvite = {
    ...(invite.inviteToken ? { inviteToken: invite.inviteToken } : {}),
    ...(invite.inviteGroupId ? { inviteGroupId: invite.inviteGroupId } : {}),
    receivedAt: Date.now(),
  };
  await AsyncStorage.setItem(PENDING_INVITE_STORAGE_KEY, JSON.stringify(payload));
}

export async function getPendingGroupInvite(): Promise<PendingGroupInvite | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_INVITE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingGroupInvite>;
    if (!parsed || (typeof parsed.inviteToken !== 'string' && typeof parsed.inviteGroupId !== 'string')) {
      return null;
    }
    return {
      inviteToken: typeof parsed.inviteToken === 'string' ? parsed.inviteToken : undefined,
      inviteGroupId: typeof parsed.inviteGroupId === 'string' ? parsed.inviteGroupId : undefined,
      receivedAt: typeof parsed.receivedAt === 'number' ? parsed.receivedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export async function clearPendingGroupInvite(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
}

export function getDistributionLinkMessage(): string {
  return configuredDistributionUrl
    ? 'Open the link to install Study Sakha.'
    : 'Study Sakha is being tested through Expo Go. Open this link on a device with Expo Go installed.';
}
