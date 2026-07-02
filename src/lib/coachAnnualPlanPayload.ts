export type CoachWeekPayload = {
  weekNumber?: number;
  days?: unknown[];
  period?: { name?: string; description?: string };
  periodName?: string;
  notes?: string;
};

export function parseAuthorizedWeekNumbers(
  payload: Record<string, unknown>,
  anchorWeekNumber: number,
  maxWeekNumber: number
): number[] {
  const raw =
    payload.authorizedWeekNumbers ??
    payload.importAuthorizedWeekNumbers ??
    payload.authorizedWeeks;

  if (Array.isArray(raw)) {
    return raw
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= maxWeekNumber);
  }

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v === true || v === 'YES' || v === 'yes')
      .map(([k]) => Number(k))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= maxWeekNumber);
  }

  const result: number[] = [];
  for (let n = anchorWeekNumber + 1; n <= maxWeekNumber; n++) {
    result.push(n);
  }
  return result;
}

/** Extract one week from a COACH_PLAN global archive payload. */
export function extractCoachWeekFromPayload(
  payload: Record<string, unknown>,
  weekNumber: number
): CoachWeekPayload | null {
  if (Array.isArray(payload.weeks)) {
    const weeks = payload.weeks as CoachWeekPayload[];
    const match = weeks.find((w) => w.weekNumber === weekNumber);
    if (match) return { ...match, weekNumber };
    const byIndex = weeks[weekNumber - 1];
    if (byIndex) return { ...byIndex, weekNumber: byIndex.weekNumber ?? weekNumber };
  }

  if (Array.isArray(payload.days)) {
    const payloadWeekNumber =
      payload.weekNumber != null ? Number(payload.weekNumber) : null;
    if (payloadWeekNumber == null || payloadWeekNumber === weekNumber) {
      return {
        weekNumber,
        days: payload.days,
        period: payload.period as CoachWeekPayload['period'],
        periodName: payload.periodName as string | undefined,
      };
    }
  }

  return null;
}

function dayForWeek(week: CoachWeekPayload | null, dayOfWeek: number) {
  if (!week?.days?.length) return null;
  const days = week.days as Array<{ dayOfWeek?: number }>;
  return (
    days.find((d) => d.dayOfWeek === dayOfWeek) ??
    (days[dayOfWeek - 1] as (typeof days)[number] | undefined) ??
    null
  );
}

function sortedPayloadWorkouts(workouts: unknown[]) {
  return [...workouts].sort((a, b) => {
    const wa = a as { sessionNumber?: number; createdAt?: string };
    const wb = b as { sessionNumber?: number; createdAt?: string };
    const snA = wa.sessionNumber ?? 999;
    const snB = wb.sessionNumber ?? 999;
    if (snA !== snB) return snA - snB;
    if (wa.createdAt && wb.createdAt) {
      return new Date(wa.createdAt).getTime() - new Date(wb.createdAt).getTime();
    }
    return 0;
  });
}

/** Extract a workout snapshot from coach plan payload. */
export function extractCoachWorkoutFromPayload(
  payload: Record<string, unknown>,
  weekNumber: number,
  dayOfWeek: number,
  sessionNumber: number
): {
  workout: Record<string, unknown>;
  sports: Array<{ sport?: string }>;
  moveframes: Array<Record<string, unknown>>;
} | null {
  const week = extractCoachWeekFromPayload(payload, weekNumber);
  if (!week) return null;

  const day = dayForWeek(week, dayOfWeek) as { workouts?: unknown[] } | null;
  if (!day?.workouts?.length) return null;

  const workouts = sortedPayloadWorkouts(day.workouts);
  const workout =
    (workouts.find((w) => (w as { sessionNumber?: number }).sessionNumber === sessionNumber) as
      | Record<string, unknown>
      | undefined) ??
    (workouts[sessionNumber - 1] as Record<string, unknown> | undefined);

  if (!workout) return null;

  const moveframes = Array.isArray(workout.moveframes) ? workout.moveframes : [];
  if (!moveframes.length) return null;

  const sports = Array.isArray(workout.sports)
    ? (workout.sports as Array<{ sport?: string }>)
    : [];

  return { workout, sports, moveframes: moveframes as Array<Record<string, unknown>> };
}

/** Merge coach week workouts with user yearly week dates/period for display. */
export function mergeCoachWeekWithUserWeek(
  coachWeek: CoachWeekPayload | null,
  userWeek: { weekNumber?: number; days?: unknown[]; period?: unknown; periodName?: string } | null
) {
  return Array.from({ length: 7 }, (_, idx) => {
    const dayOfWeek = idx + 1;
    const userDay = userWeek ? dayForWeek(userWeek as CoachWeekPayload, dayOfWeek) : null;
    const coachDay = coachWeek ? dayForWeek(coachWeek, dayOfWeek) : null;
    const ud = userDay as Record<string, unknown> | null;
    const cd = coachDay as Record<string, unknown> | null;

    return {
      id:
        (cd?.id as string) ??
        (ud?.id as string) ??
        `coach-${userWeek?.weekNumber ?? coachWeek?.weekNumber ?? 0}-d${dayOfWeek}`,
      dayOfWeek,
      date: ud?.date ?? cd?.date,
      period: cd?.period ?? ud?.period ?? coachWeek?.period ?? userWeek?.period,
      workouts: (cd?.workouts as unknown[]) ?? [],
    };
  });
}
