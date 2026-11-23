export type FocusTimerMode = 'timer' | 'pomodoro' | 'stopwatch';

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