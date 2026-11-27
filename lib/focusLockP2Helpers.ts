import type { PlannerScheduleItem } from './plannerSchedule';

export type FocusLockProfile = {
  id: string;
  name: string;
  desc: string;
  appIds: string[];
  strategy: 'block' | 'allow';
  modeId?: string;
  isPredefined?: boolean;
};

export const KNOWN_ANDROID_BROWSER_PACKAGES = new Set([
  'com.android.chrome',
  'com.chrome.beta',
  'com.chrome.dev',
  'com.brave.browser',
  'com.sec.android.app.sbrowser',
  'org.mozilla.firefox',
  'com.opera.browser',
  'com.opera.mini.native',
  'com.microsoft.emmx',
  'com.duckduckgo.mobile.android',
]);

const PREDEFINED_PROFILE_TEMPLATES: {
  id: string;
  name: string;
  desc: string;
  packages: string[];
}[] = [
  {
    id: 'social_shield',
    name: 'Social Media Shield',
    desc: 'Social feeds & messaging',
    packages: [
      'com.instagram.android',
      'com.twitter.android',
      'com.snapchat.android',
      'com.facebook.katana',
      'com.reddit.frontpage',
      'com.zhiliaoapp.musically',
    ],
  },
  {
    id: 'video_detox',
    name: 'Video & Streaming Detox',
    desc: 'Video & OTT apps',
    packages: [
      'com.google.android.youtube',
      'com.netflix.mediaclient',
      'in.startv.hotstar',
      'com.amazon.avod.thirdpartyclient',
    ],
  },
  {
    id: 'gaming_lockout',
    name: 'Gaming Lockout',
    desc: 'Installed mobile games',
    packages: [
      'com.pubg.imobile',
      'com.dts.freefiremax',
      'com.dts.freefireth',
      'com.supercell.clashofclans',
      'com.activision.callofduty.shooter',
    ],
  },
  {
    id: 'complete_shield',
    name: 'Complete Distraction Shield',
    desc: 'All detected social, video & games',
    packages: [
      'com.instagram.android',
      'com.twitter.android',
      'com.snapchat.android',
      'com.facebook.katana',
      'com.reddit.frontpage',
      'com.google.android.youtube',
      'com.netflix.mediaclient',
      'com.pubg.imobile',
      'com.dts.freefiremax',
    ],
  },
];

export function buildPredefinedProfiles(installedPackageIds: readonly string[]): FocusLockProfile[] {
  const installedSet = new Set(installedPackageIds);
  return PREDEFINED_PROFILE_TEMPLATES.map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    desc: tpl.desc,
    appIds: tpl.packages.filter((pkg) => installedSet.has(pkg)),
    strategy: 'block' as const,
    isPredefined: true,
  })).filter((profile) => profile.appIds.length > 0);
}

export function resolveEffectiveBlockedPackages(
  allApps: readonly { id: string; pkg: string }[],
  selectedAppIds: readonly string[],
  strategy: 'block' | 'allow',
  websiteBlockingEnabled: boolean,
): string[] {
  const selectedSet = new Set(selectedAppIds);
  if (strategy === 'allow') {
    return allApps.filter((app) => !selectedSet.has(app.id)).map((app) => app.pkg);
  }
  const blocked = new Set(
    allApps.filter((app) => selectedSet.has(app.id)).map((app) => app.pkg),
  );
  if (websiteBlockingEnabled) {
    allApps.forEach((app) => {
      if (KNOWN_ANDROID_BROWSER_PACKAGES.has(app.pkg)) {
        blocked.add(app.pkg);
      }
    });
  }
  return Array.from(blocked);
}

function parseClockTimeToMinutes(raw?: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match24 = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (match24) {
    return Number(match24[1]) * 60 + Number(match24[2]);
  }
  const match12 = /^(1[0-2]|0?[1-9]):([0-5]\d)\s*(AM|PM)$/i.exec(trimmed);
  if (match12) {
    let hours = Number(match12[1]) % 12;
    if (match12[3].toUpperCase() === 'PM') hours += 12;
    return hours * 60 + Number(match12[2]);
  }
  return null;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getNextFocusScheduleLabel(
  items: readonly PlannerScheduleItem[],
  now: Date = new Date(),
): string {
  if (!Array.isArray(items) || items.length === 0) return 'No schedule set';

  const nowMs = now.getTime();
  let earliestMs: number | null = null;

  for (const item of items) {
    if (item.completed) continue;
    const candidateTimes: { mins: number; days?: string[] }[] = [];

    if (Array.isArray(item.timeSlots) && item.timeSlots.length > 0) {
      for (const slot of item.timeSlots) {
        const mins = parseClockTimeToMinutes(slot.startTime);
        if (mins !== null) candidateTimes.push({ mins, days: slot.days });
      }
    } else {
      const mins = parseClockTimeToMinutes(item.startTime ?? item.time);
      if (mins !== null) candidateTimes.push({ mins, days: item.days });
    }

    for (const candidate of candidateTimes) {
      if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        const [y, m, d] = item.date.split('-').map(Number);
        const target = new Date(y, m - 1, d, Math.floor(candidate.mins / 60), candidate.mins % 60, 0, 0);
        const ms = target.getTime();
        if (ms > nowMs && (earliestMs === null || ms < earliestMs)) {
          earliestMs = ms;
        }
        continue;
      }

      const daySet = candidate.days && candidate.days.length > 0
        ? new Set(candidate.days.map((d) => d.slice(0, 3).toLowerCase()))
        : null;

      for (let offset = 0; offset <= 7; offset++) {
        const target = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + offset,
          Math.floor(candidate.mins / 60),
          candidate.mins % 60,
          0,
          0,
        );
        if (daySet && !daySet.has(WEEKDAY_NAMES[target.getDay()].toLowerCase())) continue;
        const ms = target.getTime();
        if (ms > nowMs && (earliestMs === null || ms < earliestMs)) {
          earliestMs = ms;
          break;
        }
      }
    }
  }

  if (earliestMs === null) return 'No schedule set';
  const nextDate = new Date(earliestMs);
  const sameDay =
    nextDate.getFullYear() === now.getFullYear() &&
    nextDate.getMonth() === now.getMonth() &&
    nextDate.getDate() === now.getDate();
  const timeText = nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `Today ${timeText}` : `${WEEKDAY_NAMES[nextDate.getDay()]} ${timeText}`;
}
