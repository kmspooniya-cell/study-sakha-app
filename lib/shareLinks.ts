import Constants from 'expo-constants';
import * as ExpoLinking from 'expo-linking';

const configuredDistributionUrl = process.env.EXPO_PUBLIC_APP_DISTRIBUTION_URL?.trim();
const configuredGroupInviteBaseUrl = process.env.EXPO_PUBLIC_GROUP_INVITE_BASE_URL?.trim();

function withPath(base: string, path: string) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
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

export function getGroupInviteUrl(groupId: string): string | null {
  if (!groupId.trim()) return null;
  const path = `groups/invite/${encodeURIComponent(groupId)}`;
  if (Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo') {
    return ExpoLinking.createURL(path);
  }
  if (configuredGroupInviteBaseUrl) return withPath(configuredGroupInviteBaseUrl, path);
  return null;
}

export function getDistributionLinkMessage(): string {
  return configuredDistributionUrl
    ? 'Open the link to install Study Sakha.'
    : 'Study Sakha is being tested through Expo Go. Open this link on a device with Expo Go installed.';
}
