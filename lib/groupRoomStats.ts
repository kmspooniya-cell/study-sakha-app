export function getRoomFocusStreak(
  sessions: readonly { user_id: string; started_at: string }[],
  userId: string,
  now = new Date()
) {
  const activeDays = new Set(
    sessions
      .filter((session) => session.user_id === userId)
      .map((session) => session.started_at.slice(0, 10))
  );
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!activeDays.has(day.toISOString().slice(0, 10))) day.setUTCDate(day.getUTCDate() - 1);

  let streak = 0;
  while (activeDays.has(day.toISOString().slice(0, 10))) {
    streak += 1;
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return streak;
}
