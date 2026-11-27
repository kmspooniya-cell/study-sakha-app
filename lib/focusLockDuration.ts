export type ComputedFocusWindow = {
  startedAt: number;
  endsAt: number;
  durationMins: number;
};

export function computeDurationSession(mins: number, now: Date = new Date()): ComputedFocusWindow | null {
  if (!Number.isFinite(mins) || mins < 1) return null;
  const startedAt = now.getTime();
  const safeMins = Math.round(mins);
  return {
    startedAt,
    endsAt: startedAt + safeMins * 60_000,
    durationMins: safeMins,
  };
}

export function computeUntilTimeSession(untilTime: string, now: Date = new Date()): ComputedFocusWindow | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(untilTime.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const startedAt = now.getTime();

  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  if (target.getTime() <= startedAt) {
    target.setDate(target.getDate() + 1);
  }
  const endsAt = target.getTime();
  if (endsAt <= startedAt) return null;

  return {
    startedAt,
    endsAt,
    durationMins: Math.max(1, Math.ceil((endsAt - startedAt) / 60_000)),
  };
}

export function computeEndOfDaySession(now: Date = new Date()): ComputedFocusWindow {
  const startedAt = now.getTime();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const endsAt = Math.max(startedAt + 60_000, nextMidnight.getTime());
  return {
    startedAt,
    endsAt,
    durationMins: Math.max(1, Math.ceil((endsAt - startedAt) / 60_000)),
  };
}
