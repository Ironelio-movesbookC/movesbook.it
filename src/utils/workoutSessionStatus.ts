import { WORKOUT_SYMBOLS } from '@/constants/workout.constants';

/** Matches Prisma `WorkoutStatus` enum for yearly plan display. */
export type YearlyWorkoutStatus =
  | 'NOT_PLANNED'
  | 'PLANNED_FUTURE'
  | 'PLANNED_NEXT_WEEK'
  | 'PLANNED_CURRENT_WEEK'
  | 'DONE_DIFFERENTLY'
  | 'DONE_LESS_75'
  | 'DONE_MORE_75'
  | 'DONE_SHIFTED_LESS_60'
  | 'DONE_SHIFTED_50_80'
  | 'DONE_SHIFTED_MORE_80';

/**
 * Yearly Plan + Workouts Done symbol colors (product rule):
 *
 * AUTOMATIC (from moveframes + calendar week — not user-picked):
 * - White  = not planned
 * - Yellow = planned in a future week, not done
 * - Orange = planned in this week, not done
 * - Red    = planned in a previous week, not done
 *
 * MANUAL (double-click workout symbol → Assignment colors):
 * - Light green / Green / Dark green = same planned day, done by % band
 * - Light blue / Blue / Dark blue    = originally planned on a different day, done by % band
 *
 * Enum name notes (legacy DB values kept):
 * - `PLANNED_NEXT_WEEK` = previous week (red), not “next week”
 * - `DONE_DIFFERENTLY`  = green mid band (60–80%), not “done differently”
 * - `DONE_LESS_75` / `DONE_MORE_75` = light / dark green % bands (thresholds are 60 / 80)
 */

/** Auto colors when a workout has ≥1 moveframe and no Done override. */
export const YEARLY_WORKOUT_AUTO_PLANNED_STATUSES: YearlyWorkoutStatus[] = [
  'PLANNED_FUTURE',
  'PLANNED_CURRENT_WEEK',
  'PLANNED_NEXT_WEEK',
];

/** Statuses the operator can pick by double-clicking the symbol (Done greens/blues). */
export const YEARLY_WORKOUT_MANUAL_STATUSES: YearlyWorkoutStatus[] = [
  'DONE_LESS_75', // light green <60%
  'DONE_DIFFERENTLY', // green 60–80%
  'DONE_MORE_75', // dark green >80%
  'DONE_SHIFTED_LESS_60', // light blue <60%
  'DONE_SHIFTED_50_80', // blue 50–80%
  'DONE_SHIFTED_MORE_80', // dark blue >80%
];

/**
 * Match Done column colors — same greens/blues as workout symbols.
 * Selected ONLY in Workouts Done (Section C); choice applies to all workouts of the day
 * and syncs to the matching Yearly Plan day.
 */
export const MATCH_DONE_STATUSES: YearlyWorkoutStatus[] = [...YEARLY_WORKOUT_MANUAL_STATUSES];

export const YEARLY_WORKOUT_STATUS_CYCLE: YearlyWorkoutStatus[] = [
  ...YEARLY_WORKOUT_MANUAL_STATUSES,
];

/** Default when first planned before week date is known — orange (this week). */
export const DEFAULT_PLANNED_STATUS: YearlyWorkoutStatus = 'PLANNED_CURRENT_WEEK';

/** Default when assigning Done colors (light green). */
export const DEFAULT_DONE_COLOR_STATUS: YearlyWorkoutStatus = 'DONE_LESS_75';

const DONE_STATUSES = new Set<YearlyWorkoutStatus>(YEARLY_WORKOUT_MANUAL_STATUSES);

const AUTO_PLANNED_STATUSES = new Set<YearlyWorkoutStatus>(YEARLY_WORKOUT_AUTO_PLANNED_STATUSES);

export function isYearlyWorkoutStatus(value: unknown): value is YearlyWorkoutStatus {
  return (
    value === 'NOT_PLANNED' ||
    value === 'PLANNED_FUTURE' ||
    value === 'PLANNED_NEXT_WEEK' ||
    value === 'PLANNED_CURRENT_WEEK' ||
    value === 'DONE_DIFFERENTLY' ||
    value === 'DONE_LESS_75' ||
    value === 'DONE_MORE_75' ||
    value === 'DONE_SHIFTED_LESS_60' ||
    value === 'DONE_SHIFTED_50_80' ||
    value === 'DONE_SHIFTED_MORE_80'
  );
}

export function isWorkoutPlanned(workout: { moveframes?: unknown[] } | null | undefined): boolean {
  return Boolean(workout?.moveframes && workout.moveframes.length > 0);
}

export function isManualDoneStatus(status: YearlyWorkoutStatus): boolean {
  return DONE_STATUSES.has(status);
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

/**
 * Infer automatic planned color from calendar week of the workout day.
 * Yellow = future · Orange = this week · Red = previous week(s).
 */
export function inferPlannedStatusFromDate(
  dayDate: Date | string,
  today: Date = new Date(),
): YearlyWorkoutStatus {
  const day = new Date(dayDate);
  day.setHours(0, 0, 0, 0);
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const dayWeek = startOfWeekMonday(day).getTime();
  const todayWeek = startOfWeekMonday(now).getTime();
  const weekDiff = Math.round((dayWeek - todayWeek) / weekMs);

  if (weekDiff > 0) return 'PLANNED_FUTURE'; // yellow
  if (weekDiff === 0) return 'PLANNED_CURRENT_WEEK'; // orange
  return 'PLANNED_NEXT_WEEK'; // red — previous week (legacy enum name)
}

/**
 * Resolve display / effective status:
 * - no moveframes → white (NOT_PLANNED)
 * - manual Done green/blue → keep stored
 * - otherwise → automatic yellow/orange/red from day date
 */
export function resolveYearlyWorkoutStatus(
  workout: { status?: string; moveframes?: unknown[] } | null | undefined,
  dayDate?: Date | string,
): YearlyWorkoutStatus {
  if (!isWorkoutPlanned(workout)) return 'NOT_PLANNED';

  const stored = workout?.status;
  if (isYearlyWorkoutStatus(stored) && isManualDoneStatus(stored)) {
    return stored;
  }

  if (dayDate) {
    return inferPlannedStatusFromDate(dayDate);
  }

  if (isYearlyWorkoutStatus(stored) && AUTO_PLANNED_STATUSES.has(stored)) {
    return stored;
  }

  return DEFAULT_PLANNED_STATUS;
}

/** Calendar Narrow mode color tab — filters symbol fill per Planned / Done / Both. */
export type CalendarColorTab = 'planned' | 'done' | 'both';

/**
 * Symbol color for calendar tabs:
 * - planned: white + yellow/orange/red only (Done greens/blues → inferred planned week)
 * - done: white when not manually done; otherwise Done greens/blues
 * - both: full resolved status
 */
export function resolveCalendarDisplayStatus(
  workout: { status?: string; moveframes?: unknown[] } | null | undefined,
  dayDate: Date | string,
  tab: CalendarColorTab,
): YearlyWorkoutStatus {
  const resolved = resolveYearlyWorkoutStatus(workout, dayDate);

  if (tab === 'both') return resolved;
  if (!isWorkoutPlanned(workout)) return 'NOT_PLANNED';

  if (tab === 'planned') {
    if (isManualDoneStatus(resolved)) {
      return inferPlannedStatusFromDate(dayDate);
    }
    return resolved;
  }

  // done tab
  if (isManualDoneStatus(resolved)) return resolved;
  return 'NOT_PLANNED';
}

export function nextYearlyWorkoutStatus(current: YearlyWorkoutStatus): YearlyWorkoutStatus {
  if (current === 'NOT_PLANNED' || AUTO_PLANNED_STATUSES.has(current)) {
    return DEFAULT_DONE_COLOR_STATUS;
  }
  const idx = YEARLY_WORKOUT_STATUS_CYCLE.indexOf(current);
  if (idx === -1) return DEFAULT_DONE_COLOR_STATUS;
  return YEARLY_WORKOUT_STATUS_CYCLE[(idx + 1) % YEARLY_WORKOUT_STATUS_CYCLE.length];
}

export type YearlyWorkoutStatusStyle = {
  bg: string;
  fg: string;
  border: string;
  label: string;
};

export function yearlyWorkoutStatusStyle(status: YearlyWorkoutStatus): YearlyWorkoutStatusStyle {
  switch (status) {
    case 'NOT_PLANNED':
      return {
        bg: '#FFFFFF',
        fg: '#D1D5DB',
        border: '#D1D5DB',
        label: 'White = not planned',
      };
    case 'PLANNED_FUTURE':
      return {
        bg: '#FACC15',
        fg: '#1F2937',
        border: '#EAB308',
        label: 'Yellow = planned in a future week, not done',
      };
    case 'PLANNED_CURRENT_WEEK':
      return {
        bg: '#F97316',
        fg: '#FFFFFF',
        border: '#EA580C',
        label: 'Orange = planned in this week, not done',
      };
    case 'PLANNED_NEXT_WEEK':
      return {
        bg: '#EF4444',
        fg: '#FFFFFF',
        border: '#DC2626',
        label: 'Red = planned in a previous week, not done',
      };
    case 'DONE_LESS_75':
      return {
        bg: '#86EFAC',
        fg: '#14532D',
        border: '#4ADE80',
        label: 'Light green = planned and done at less than 60%',
      };
    case 'DONE_DIFFERENTLY':
      return {
        bg: '#22C55E',
        fg: '#FFFFFF',
        border: '#16A34A',
        label: 'Green = planned and done among 60 and 80%',
      };
    case 'DONE_MORE_75':
      return {
        bg: '#166534',
        fg: '#FFFFFF',
        border: '#14532D',
        label: 'Dark green = planned and done at more than 80%',
      };
    case 'DONE_SHIFTED_LESS_60':
      return {
        bg: '#93C5FD',
        fg: '#1E3A8A',
        border: '#60A5FA',
        label: 'Light blue = originally planned on a different day · done <60%',
      };
    case 'DONE_SHIFTED_50_80':
      return {
        bg: '#3B82F6',
        fg: '#FFFFFF',
        border: '#2563EB',
        label: 'Blue = originally planned on a different day · done 50–80%',
      };
    case 'DONE_SHIFTED_MORE_80':
      return {
        bg: '#1E3A8A',
        fg: '#FFFFFF',
        border: '#1E40AF',
        label: 'Dark blue = originally planned on a different day · done >80%',
      };
    default:
      return yearlyWorkoutStatusStyle('NOT_PLANNED');
  }
}

/** Short label for Match Done column, e.g. "Mon 7 March". */
export function formatOriginalPlannedDateLabel(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday} ${day} ${month}`;
}

/**
 * Match Done circle color when every planned workout on the day shares the same Done status.
 * Otherwise null → white/grey (not set).
 */
export function resolveMatchDoneStatus(
  day: { workouts?: { status?: string; moveframes?: unknown[] }[] | null } | null | undefined,
): YearlyWorkoutStatus | null {
  const planned = (day?.workouts ?? []).filter((w) => isWorkoutPlanned(w));
  if (!planned.length) return null;

  const first = planned[0]?.status;
  if (!isYearlyWorkoutStatus(first) || !isManualDoneStatus(first)) return null;
  if (!planned.every((w) => w.status === first)) return null;
  return first;
}

export function matchDoneCircleStyle(status: YearlyWorkoutStatus | null): {
  bg: string;
  border: string;
  label: string;
} {
  if (!status) {
    return {
      bg: '#FFFFFF',
      border: '#D1D5DB',
      label: 'Match Done — not set',
    };
  }
  const s = yearlyWorkoutStatusStyle(status);
  return { bg: s.bg, border: s.border, label: `Match Done — ${s.label}` };
}

const MATCH_DONE_DAY_LABELS: Record<string, string> = {
  DONE_LESS_75: 'Light green = all workouts of the day done at less than 60%',
  DONE_DIFFERENTLY: 'Green = all workouts of the day done among 60 and 80%',
  DONE_MORE_75: 'Dark green = all workouts of the day done at more than 80%',
  DONE_SHIFTED_LESS_60:
    'Light blue = all workouts originally planned on a different day · done <60%',
  DONE_SHIFTED_50_80:
    'Blue = all workouts originally planned on a different day · done 50–80%',
  DONE_SHIFTED_MORE_80:
    'Dark blue = all workouts originally planned on a different day · done >80%',
};

export function matchDoneStatusLabel(status: YearlyWorkoutStatus): string {
  return MATCH_DONE_DAY_LABELS[status] ?? yearlyWorkoutStatusStyle(status).label;
}

/** Same-day Done greens from completion %. */
export function doneStatusFromPct(pct: number): YearlyWorkoutStatus {
  if (pct < 60) return 'DONE_LESS_75';
  if (pct <= 80) return 'DONE_DIFFERENTLY';
  return 'DONE_MORE_75';
}

/** Shifted-day Done blues from completion %. */
export function shiftedDoneStatusFromPct(pct: number): YearlyWorkoutStatus {
  if (pct < 60) return 'DONE_SHIFTED_LESS_60';
  if (pct <= 80) return 'DONE_SHIFTED_50_80';
  return 'DONE_SHIFTED_MORE_80';
}

export function workoutForSessionSlot<
  T extends { sessionNumber?: number | null; id?: string; status?: string; moveframes?: unknown[] },
>(workouts: T[] | null | undefined, slotNum: 1 | 2 | 3): T | null {
  if (!workouts?.length) return null;
  const bySession = workouts.find((w) => w.sessionNumber === slotNum);
  if (bySession) return bySession;
  const sorted = [...workouts].sort(
    (a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0),
  );
  return sorted[slotNum - 1] ?? null;
}

export function workoutSymbolForSlot(slotNum: 1 | 2 | 3): string {
  return WORKOUT_SYMBOLS[slotNum]?.symbol ?? '○';
}

export async function patchWorkoutSessionStatus(
  workoutId: string,
  status: YearlyWorkoutStatus,
): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not signed in');

  const response = await fetch(`/api/workouts/sessions/${workoutId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update workout status');
  }
}

/** After moveframe add/remove — keep DB status aligned with plan rules. */
export async function syncWorkoutStatusAfterMoveframes(
  workout: { id: string; moveframes?: unknown[]; status?: string } | null | undefined,
  dayDate: Date | string,
  moveframeCount: number,
): Promise<void> {
  if (!workout?.id) return;

  if (moveframeCount <= 0) {
    if (workout.status !== 'NOT_PLANNED') {
      await patchWorkoutSessionStatus(workout.id, 'NOT_PLANNED');
    }
    return;
  }

  const stored = workout.status;
  if (isYearlyWorkoutStatus(stored) && isManualDoneStatus(stored)) {
    return;
  }

  const inferred = inferPlannedStatusFromDate(dayDate);
  if (stored !== inferred) {
    await patchWorkoutSessionStatus(workout.id, inferred);
  }
}
