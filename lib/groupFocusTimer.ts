import type { GroupRoomFocusStatus } from './groupRoomFocusBridge';

export function getDisplayedFocusElapsedSeconds(
  accumulatedSeconds: number,
  status: GroupRoomFocusStatus | 'available' | 'here',
  updatedAt: string | null | undefined,
  nowMilliseconds: number,
) {
  const base = Math.max(0, Math.floor(accumulatedSeconds || 0));
  if (status !== 'focusing' || !updatedAt) return base;
  const updatedMilliseconds = Date.parse(updatedAt);
  if (!Number.isFinite(updatedMilliseconds)) return base;
  return base + Math.max(0, Math.floor((nowMilliseconds - updatedMilliseconds) / 1000));
}
