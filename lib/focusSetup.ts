import type { PlannerScheduleOccurrence } from './planner';

export const FOCUS_DURATION_PRESETS = [15, 25, 40] as const;
export const MIN_FOCUS_DURATION_MINUTES = 1;
export const MAX_FOCUS_DURATION_MINUTES = 360;

export type FocusDurationPreset = (typeof FOCUS_DURATION_PRESETS)[number];

export function isFocusDurationPreset(minutes: number): minutes is FocusDurationPreset {
  return (FOCUS_DURATION_PRESETS as readonly number[]).includes(minutes);
}

export type CustomDurationValidation =
  | { valid: true; minutes: number; error: null }
  | { valid: false; minutes: null; error: string };

/**
 * Validates user-entered custom focus duration in minutes.
 * Only positive integers within [MIN_FOCUS_DURATION_MINUTES, MAX_FOCUS_DURATION_MINUTES]
 * are accepted; empty, zero, negative, decimal, or non-numeric inputs are rejected.
 */
export function validateCustomFocusDuration(rawInput: string): CustomDurationValidation {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      minutes: null,
      error: `Enter a duration between ${MIN_FOCUS_DURATION_MINUTES} and ${MAX_FOCUS_DURATION_MINUTES} minutes.`,
    };
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      valid: false,
      minutes: null,
      error: 'Enter a whole number of minutes (positive integers only).',
    };
  }
  const minutes = Number(trimmed);
  if (!Number.isSafeInteger(minutes) || minutes < MIN_FOCUS_DURATION_MINUTES) {
    return {
      valid: false,
      minutes: null,
      error: `Duration must be at least ${MIN_FOCUS_DURATION_MINUTES} minute.`,
    };
  }
  if (minutes > MAX_FOCUS_DURATION_MINUTES) {
    return {
      valid: false,
      minutes: null,
      error: `Duration cannot exceed ${MAX_FOCUS_DURATION_MINUTES} minutes.`,
    };
  }
  return { valid: true, minutes, error: null };
}

export type ScheduleFocusDurationSummary = {
  plannedSeconds: number | null;
  actualFocusedSeconds: number;
  remainingSeconds: number | null;
  remainingMinutes: number | null;
  isTaskComplete: boolean;
};

/**
 * Calculates remaining focus duration for a Study Planner schedule occurrence
 * from its actual planned duration and aggregated eligible focus sessions.
 */
export function calculateScheduleFocusDuration(
  occurrence: Pick<PlannerScheduleOccurrence, 'plannedSeconds' | 'actualSeconds' | 'status'>,
): ScheduleFocusDurationSummary {
  const actualFocusedSeconds = Math.max(0, Math.floor(occurrence.actualSeconds));
  if (occurrence.plannedSeconds === null) {
    return {
      plannedSeconds: null,
      actualFocusedSeconds,
      remainingSeconds: null,
      remainingMinutes: null,
      isTaskComplete: occurrence.status === 'completed',
    };
  }

  const plannedSeconds = Math.max(0, Math.floor(occurrence.plannedSeconds));
  const remainingSeconds = Math.max(0, plannedSeconds - actualFocusedSeconds);
  const remainingMinutes = remainingSeconds === 0 ? 0 : Math.ceil(remainingSeconds / 60);
  const isTaskComplete = occurrence.status === 'completed' || remainingSeconds === 0;

  return {
    plannedSeconds,
    actualFocusedSeconds,
    remainingSeconds,
    remainingMinutes,
    isTaskComplete,
  };
}
