export type FocusTimerMode = 'timer' | 'pomodoro' | 'stopwatch';
export const FOCUS_SESSION_SAVE_THRESHOLD_SECONDS = 120;

export function shouldPromptToSaveFocusSession(focusedSeconds: number) {
  return Number.isFinite(focusedSeconds) && Math.floor(focusedSeconds) >= FOCUS_SESSION_SAVE_THRESHOLD_SECONDS;
}

export type TimestampFocusSegment = {
  accumulatedMilliseconds: number;
  startedAtMilliseconds: number | null;
  plannedSeconds: number | null;
  mode: FocusTimerMode;
  phase: 'focus' | 'break' | 'paused';
};

export function getFocusedMilliseconds(segment: TimestampFocusSegment, nowMilliseconds: number) {
  const activeMilliseconds = segment.phase === 'focus' && segment.startedAtMilliseconds !== null
    ? Math.max(0, nowMilliseconds - segment.startedAtMilliseconds)
    : 0;
  const focusedMilliseconds = Math.max(0, segment.accumulatedMilliseconds) + activeMilliseconds;
  return segment.mode === 'stopwatch' || segment.plannedSeconds === null
    ? focusedMilliseconds
    : Math.min(focusedMilliseconds, segment.plannedSeconds * 1000);
}

export function getFocusedSeconds(segment: TimestampFocusSegment, nowMilliseconds: number) {
  return Math.floor(getFocusedMilliseconds(segment, nowMilliseconds) / 1000);
}

export function getActualFocusSeconds(
  accumulatedSeconds: number,
  mode: FocusTimerMode,
  durationSeconds: number,
  remainingSeconds: number,
  isBreak: boolean,
) {
  const completedFocus = Math.max(0, Math.floor(accumulatedSeconds));
  if (isBreak) return completedFocus;

  const currentSegment = mode === 'stopwatch'
    ? Math.max(0, Math.floor(remainingSeconds))
    : Math.max(0, Math.floor(durationSeconds - remainingSeconds));
  return completedFocus + currentSegment;
}

export function addPendingFocusSeconds(elapsedSeconds: number, pendingSeconds: number, isBreak: boolean) {
  const elapsed = Math.max(0, Math.floor(elapsedSeconds));
  return elapsed + (isBreak ? 0 : Math.max(0, Math.floor(pendingSeconds)));
}