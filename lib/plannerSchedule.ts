export type PlannerScheduleCategory = 'Tasks' | 'Classes' | 'Exams' | 'Vacations' | 'Activities';

export type PlannerScheduleTimeSlot = {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
};

export type PlannerScheduleItem = {
  id: string;
  category: PlannerScheduleCategory;
  title: string;
  subject?: string;
  type?: string;
  teacher?: string;
  date?: string;
  time?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  occurs?: 'Once' | 'Repeating';
  days?: string[];
  dateRange?: 'None' | 'Term' | 'Manual';
  whereType?: 'In Person' | 'Online';
  room?: string;
  building?: string;
  seat?: string;
  notes?: string;
  daysCount?: number;
  hasCoverPhoto?: boolean;
  completed?: boolean;
  timeSlots?: PlannerScheduleTimeSlot[];
  fromDate?: string;
  untilDate?: string;
  taskType?: string;
  instructor?: string;
  whereMode?: 'in_person' | 'online';
  seatNumber?: string;
  onlineLink?: string;
  location?: string;
  examType?: string;
  durationMinutes?: number;
  durationLabel?: string;
  vacationPreset?: string;
  coverPhotoName?: string;
  dateRangeMode?: 'none' | 'term' | 'manual';
  termName?: string;
  rangeFrom?: string;
  rangeUntil?: string;
  activityType?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeatDays?: number[];
  repeatUntil?: string;
};

export type PlannerRecoveryFieldHint =
  | 'time'
  | 'startTime'
  | 'endTime'
  | 'date'
  | 'category'
  | 'title'
  | 'conflict'
  | 'timeSlots'
  | 'other';

export type PlannerRecoveryEntry = {
  index: number;
  fingerprint: string;
  id: string;
  title: string;
  categoryLabel: string;
  dateLabel: string;
  timeLabel: string;
  reason: string;
  guidance: string;
  fieldHint: PlannerRecoveryFieldHint;
  canClearInvalidTime: boolean;
  canDuplicateOnConflict: boolean;
  record: unknown;
};

const DATE_FIELDS = [
  'date',
  'endDate',
  'fromDate',
  'untilDate',
  'rangeFrom',
  'rangeUntil',
  'repeatUntil',
] as const;

const TIME_FIELDS = ['time', 'startTime', 'endTime'] as const;

const OPTIONAL_TEXT_FIELDS = [
  'subject',
  'type',
  'teacher',
  'room',
  'building',
  'seat',
  'notes',
  'taskType',
  'instructor',
  'seatNumber',
  'onlineLink',
  'location',
  'examType',
  'durationLabel',
  'vacationPreset',
  'coverPhotoName',
  'termName',
  'activityType',
] as const;

const CATEGORY_MAP: Record<string, PlannerScheduleCategory> = {
  tasks: 'Tasks',
  task: 'Tasks',
  classes: 'Classes',
  class: 'Classes',
  exams: 'Exams',
  exam: 'Exams',
  vacations: 'Vacations',
  vacation: 'Vacations',
  activities: 'Activities',
  activity: 'Activities',
};

const CANONICAL_TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPlannerDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isCanonical24HourTime(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL_TIME_RE.test(value);
}

export function isPlannerScheduleCategory(value: unknown): value is PlannerScheduleCategory {
  return (
    value === 'Tasks' ||
    value === 'Classes' ||
    value === 'Exams' ||
    value === 'Vacations' ||
    value === 'Activities'
  );
}

export function normalizePlannerCategory(value: unknown): PlannerScheduleCategory | null {
  if (typeof value !== 'string') return null;
  return CATEGORY_MAP[value.trim().toLowerCase()] ?? null;
}

type NormalizeResult<T> = { ok: true; value: T } | { ok: false; reason: string };

export function normalizePlannerDate(value: unknown): NormalizeResult<string | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== 'string') return { ok: false, reason: 'must be text' };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: undefined };
  const match = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(trimmed);
  if (match && isPlannerDate(match[1])) {
    return { ok: true, value: match[1] };
  }
  return { ok: false, reason: 'is not a valid YYYY-MM-DD date' };
}

/**
 * Normalizes unambiguous legacy 12-hour (e.g. "9:30 AM", "12:00 PM", "9 pm")
 * and 24-hour (e.g. "9:00", "09:30", "17:00:00") strings to canonical "HH:mm".
 * Empty, whitespace-only, null, or undefined optional fields normalize to undefined.
 * Malformed or ambiguous values (e.g. "25:00", "09:60", "13:00 PM", "09:5") fail.
 */
export function normalizePlannerTime(value: unknown): NormalizeResult<string | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== 'string') return { ok: false, reason: 'must be text' };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: undefined };

  const twelveHour = /^(\d{1,2})(?::(\d{2})(?::(\d{2}))?)?\s*(A\.?M\.?|P\.?M\.?)$/i.exec(trimmed);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minute = twelveHour[2] !== undefined ? Number(twelveHour[2]) : 0;
    const second = twelveHour[3] !== undefined ? Number(twelveHour[3]) : 0;
    if (
      Number.isInteger(hour) &&
      hour >= 1 &&
      hour <= 12 &&
      Number.isInteger(minute) &&
      minute >= 0 &&
      minute <= 59 &&
      Number.isInteger(second) &&
      second >= 0 &&
      second <= 59
    ) {
      const isPm = /^p/i.test(twelveHour[4]);
      const normalizedHour = (hour % 12) + (isPm ? 12 : 0);
      return {
        ok: true,
        value: `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      };
    }
    return { ok: false, reason: 'is not a valid 24-hour time' };
  }

  const twentyFourHour = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    const second = twentyFourHour[3] !== undefined ? Number(twentyFourHour[3]) : 0;
    if (
      Number.isInteger(hour) &&
      hour >= 0 &&
      hour <= 23 &&
      Number.isInteger(minute) &&
      minute >= 0 &&
      minute <= 59 &&
      Number.isInteger(second) &&
      second >= 0 &&
      second <= 59
    ) {
      return {
        ok: true,
        value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      };
    }
    return { ok: false, reason: 'is not a valid 24-hour time' };
  }

  return { ok: false, reason: 'is not a valid 24-hour time' };
}

function normalizeOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): NormalizeResult<T | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== 'string') return { ok: false, reason: 'has an invalid value' };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: undefined };
  return (allowed as readonly string[]).includes(trimmed)
    ? { ok: true, value: trimmed as T }
    : { ok: false, reason: 'has an invalid value' };
}

export function migratePlannerScheduleItem(value: unknown): PlannerScheduleItem | null {
  if (!isRecord(value)) return null;

  if (typeof value.id !== 'string' || !value.id.trim()) return null;
  const category = normalizePlannerCategory(value.category);
  if (!category) return null;
  if (typeof value.title !== 'string') return null;

  const result: PlannerScheduleItem = {
    id: value.id,
    category,
    title: value.title,
  };

  for (const field of OPTIONAL_TEXT_FIELDS) {
    const candidate = value[field];
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate !== 'string') return null;
    result[field] = candidate;
  }

  for (const field of DATE_FIELDS) {
    const normalized = normalizePlannerDate(value[field]);
    if (!normalized.ok) return null;
    if (normalized.value !== undefined) result[field] = normalized.value;
  }

  for (const field of TIME_FIELDS) {
    const normalized = normalizePlannerTime(value[field]);
    if (!normalized.ok) return null;
    if (normalized.value !== undefined) result[field] = normalized.value;
  }

  if (value.duration !== undefined && value.duration !== null) {
    if (typeof value.duration !== 'number' || !Number.isFinite(value.duration) || value.duration <= 0) {
      return null;
    }
    result.duration = value.duration;
  }

  if (value.daysCount !== undefined && value.daysCount !== null) {
    if (typeof value.daysCount !== 'number' || !Number.isInteger(value.daysCount) || value.daysCount < 1) {
      return null;
    }
    result.daysCount = value.daysCount;
  }

  if (value.durationMinutes !== undefined && value.durationMinutes !== null) {
    if (
      typeof value.durationMinutes !== 'number' ||
      !Number.isFinite(value.durationMinutes) ||
      value.durationMinutes < 0
    ) {
      return null;
    }
    result.durationMinutes = value.durationMinutes;
  }

  const occurs = normalizeOptionalEnum(value.occurs, ['Once', 'Repeating'] as const);
  if (!occurs.ok) return null;
  if (occurs.value !== undefined) result.occurs = occurs.value;

  const dateRange = normalizeOptionalEnum(value.dateRange, ['None', 'Term', 'Manual'] as const);
  if (!dateRange.ok) return null;
  if (dateRange.value !== undefined) result.dateRange = dateRange.value;

  const whereType = normalizeOptionalEnum(value.whereType, ['In Person', 'Online'] as const);
  if (!whereType.ok) return null;
  if (whereType.value !== undefined) result.whereType = whereType.value;

  const whereMode = normalizeOptionalEnum(value.whereMode, ['in_person', 'online'] as const);
  if (!whereMode.ok) return null;
  if (whereMode.value !== undefined) result.whereMode = whereMode.value;

  const dateRangeMode = normalizeOptionalEnum(value.dateRangeMode, ['none', 'term', 'manual'] as const);
  if (!dateRangeMode.ok) return null;
  if (dateRangeMode.value !== undefined) result.dateRangeMode = dateRangeMode.value;

  const recurrence = normalizeOptionalEnum(
    value.recurrence,
    ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const,
  );
  if (!recurrence.ok) return null;
  if (recurrence.value !== undefined) result.recurrence = recurrence.value;

  if (value.hasCoverPhoto !== undefined && value.hasCoverPhoto !== null) {
    if (typeof value.hasCoverPhoto !== 'boolean') return null;
    result.hasCoverPhoto = value.hasCoverPhoto;
  }

  if (value.completed !== undefined && value.completed !== null) {
    if (typeof value.completed !== 'boolean') return null;
    result.completed = value.completed;
  }

  if (value.days !== undefined && value.days !== null) {
    if (!Array.isArray(value.days) || !value.days.every((day) => typeof day === 'string')) {
      return null;
    }
    result.days = value.days;
  }

  if (value.repeatDays !== undefined && value.repeatDays !== null) {
    if (
      !Array.isArray(value.repeatDays) ||
      !value.repeatDays.every((day) => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6)
    ) {
      return null;
    }
    result.repeatDays = value.repeatDays;
  }

  if (value.timeSlots !== undefined && value.timeSlots !== null) {
    if (!Array.isArray(value.timeSlots)) return null;
    const normalizedSlots: PlannerScheduleTimeSlot[] = [];
    for (const slot of value.timeSlots) {
      if (
        !isRecord(slot) ||
        typeof slot.id !== 'string' ||
        !slot.id.trim() ||
        !Array.isArray(slot.days) ||
        !slot.days.every((day) => typeof day === 'string')
      ) {
        return null;
      }
      const slotStart = normalizePlannerTime(slot.startTime);
      const slotEnd = normalizePlannerTime(slot.endTime);
      if (!slotStart.ok || !slotStart.value || !slotEnd.ok || !slotEnd.value) {
        return null;
      }
      normalizedSlots.push({
        id: slot.id,
        days: slot.days,
        startTime: slotStart.value,
        endTime: slotEnd.value,
      });
    }
    result.timeSlots = normalizedSlots;
  }

  return result;
}

export const normalizePlannerScheduleItem = migratePlannerScheduleItem;

export function plannerScheduleIssue(value: unknown): string {
  if (!isRecord(value)) return 'record must be an object';
  if (typeof value.id !== 'string' || !value.id.trim()) return 'id is missing or invalid';
  if (!normalizePlannerCategory(value.category)) return 'category is unsupported or invalid';
  if (typeof value.title !== 'string') return 'title is missing or invalid';

  for (const field of OPTIONAL_TEXT_FIELDS) {
    const candidate = value[field];
    if (candidate !== undefined && candidate !== null && typeof candidate !== 'string') {
      return `${field} must be text`;
    }
  }

  for (const field of DATE_FIELDS) {
    const candidate = value[field];
    if (candidate === undefined || candidate === null) continue;
    const normalized = normalizePlannerDate(candidate);
    if (!normalized.ok) {
      return normalized.reason === 'must be text'
        ? `${field} must be text`
        : `${field} is not a valid YYYY-MM-DD date`;
    }
  }

  for (const field of TIME_FIELDS) {
    const candidate = value[field];
    if (candidate === undefined || candidate === null) continue;
    const normalized = normalizePlannerTime(candidate);
    if (!normalized.ok) {
      return normalized.reason === 'must be text'
        ? `${field} must be text`
        : `${field} is not a valid 24-hour time`;
    }
  }

  if (value.timeSlots !== undefined && value.timeSlots !== null) {
    if (!Array.isArray(value.timeSlots)) return 'timeSlots contains an invalid entry';
    for (const slot of value.timeSlots) {
      if (
        !isRecord(slot) ||
        typeof slot.id !== 'string' ||
        !slot.id.trim() ||
        !Array.isArray(slot.days) ||
        !slot.days.every((day) => typeof day === 'string')
      ) {
        return 'timeSlots contains an invalid entry';
      }
      const slotStart = normalizePlannerTime(slot.startTime);
      const slotEnd = normalizePlannerTime(slot.endTime);
      if (!slotStart.ok || !slotStart.value || !slotEnd.ok || !slotEnd.value) {
        return 'timeSlots contains an invalid entry';
      }
    }
  }

  for (const field of [
    'duration',
    'daysCount',
    'occurs',
    'dateRange',
    'whereType',
    'hasCoverPhoto',
    'completed',
    'durationMinutes',
    'whereMode',
    'dateRangeMode',
    'recurrence',
    'repeatDays',
    'days',
  ]) {
    if (value[field] === undefined || value[field] === null) continue;
    if (migratePlannerScheduleItem({ id: value.id, category: value.category, title: value.title, [field]: value[field] }) === null) {
      return `${field} has an invalid value`;
    }
  }

  return 'schedule record has an invalid value';
}

function classifyFieldHint(reason: string): PlannerRecoveryFieldHint {
  if (reason.startsWith('endTime ')) return 'endTime';
  if (reason.startsWith('startTime ')) return 'startTime';
  if (reason.startsWith('time ')) return 'time';
  if (reason.includes('YYYY-MM-DD date') || /^(date|endDate|fromDate|untilDate|rangeFrom|rangeUntil|repeatUntil) /.test(reason)) {
    return 'date';
  }
  if (reason.startsWith('category ')) return 'category';
  if (reason.startsWith('title ')) return 'title';
  if (reason.includes('conflicts')) return 'conflict';
  if (reason.startsWith('timeSlots')) return 'timeSlots';
  return 'other';
}

function formatRawValueForHint(value: unknown): string {
  if (value === null) return 'empty';
  if (value === undefined) return 'missing';
  if (typeof value === 'string') return value.trim() ? `"${value}"` : 'blank';
  return String(value);
}

export function describePlannerRecoveryIssue(reason: string, record: unknown): string {
  const hint = classifyFieldHint(reason);
  const raw = isRecord(record) ? record : {};

  switch (hint) {
    case 'endTime':
      return `The end time (${formatRawValueForHint(raw.endTime)}) couldn't be recognized. Edit the entry to pick a valid end time, or restore it without an end time.`;
    case 'startTime':
      return `The start time (${formatRawValueForHint(raw.startTime)}) couldn't be recognized. Edit the entry to choose a valid time, or restore it as an all-day plan.`;
    case 'time':
      return `The saved time (${formatRawValueForHint(raw.time)}) couldn't be recognized. Edit the entry to set a valid time, or restore it without that time.`;
    case 'date': {
      const dateVal = raw.date ?? raw.endDate ?? raw.fromDate ?? raw.untilDate ?? raw.rangeFrom ?? raw.rangeUntil ?? raw.repeatUntil;
      return `A saved calendar date (${formatRawValueForHint(dateVal)}) isn't a real calendar date. Edit the entry to select a valid date.`;
    }
    case 'category':
      return 'The plan category is missing or unrecognized. Edit the entry to assign it to Tasks, Classes, Exams, Vacations, or Activities.';
    case 'title':
      return 'This saved entry is missing a title. Edit the entry to add a title before restoring it.';
    case 'conflict':
      return 'This entry has the same ID as another plan in your schedule with different details. Save it as a separate entry to keep both.';
    case 'timeSlots':
      return 'One of the repeating time slots has an incomplete day or time range. Edit the entry to update its schedule.';
    default:
      return 'Some saved details on this entry are incomplete or in an older format. Review and edit the entry to restore it safely.';
  }
}

export function stripInvalidTimeFromRecord(
  record: unknown,
  field: 'time' | 'startTime' | 'endTime',
): PlannerScheduleItem | null {
  if (!isRecord(record)) return null;
  const patched: Record<string, unknown> = { ...record };
  delete patched[field];
  return migratePlannerScheduleItem(patched);
}

export function buildPlannerRecoveryEntry(entry: {
  index: number;
  reason: string;
  record: unknown;
  fingerprint: string;
}): PlannerRecoveryEntry {
  const raw = isRecord(entry.record) ? entry.record : {};
  const category = normalizePlannerCategory(raw.category);
  const fieldHint = classifyFieldHint(entry.reason);
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Untitled planner entry';
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `recovered-${entry.index + 1}`;
  const dateRaw = typeof raw.date === 'string' && raw.date.trim()
    ? raw.date.trim()
    : typeof raw.fromDate === 'string' && raw.fromDate.trim()
      ? raw.fromDate.trim()
      : 'No date';
  const timeParts = [raw.startTime ?? raw.time, raw.endTime]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
  const timeLabel = timeParts.length > 0 ? timeParts.join(' – ') : 'No time set';

  const canClearInvalidTime =
    (fieldHint === 'time' || fieldHint === 'startTime' || fieldHint === 'endTime') &&
    stripInvalidTimeFromRecord(entry.record, fieldHint) !== null;
  const canDuplicateOnConflict =
    fieldHint === 'conflict' &&
    migratePlannerScheduleItem({
      ...raw,
      id: `${id}_restored_${entry.index + 1}`,
    }) !== null;

  return {
    index: entry.index,
    fingerprint: entry.fingerprint,
    id,
    title,
    categoryLabel: category ?? (typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : 'Uncategorized'),
    dateLabel: dateRaw,
    timeLabel,
    reason: entry.reason,
    guidance: describePlannerRecoveryIssue(entry.reason, entry.record),
    fieldHint,
    canClearInvalidTime,
    canDuplicateOnConflict,
    record: entry.record,
  };
}
