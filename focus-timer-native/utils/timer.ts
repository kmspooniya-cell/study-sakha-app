export function formatTime(seconds: number) {
  const clamped = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

export function remainingSecondsAt(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}