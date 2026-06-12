/**
 * Match workout ordering/labels used in the planner (WorkoutHierarchyView, WorkoutTable).
 * Planner shows Workout #1, #2, #3 by creation time — not by sessionNumber from the API.
 */

export type WorkoutLike = {
  id?: string;
  createdAt?: string | Date | null;
  sessionNumber?: number | null;
  name?: string | null;
  moveframes?: unknown[] | null;
};

/** Same sort as WorkoutHierarchyView / DayRowTable (earliest created = Workout #1). */
function workoutSortKey(workout: WorkoutLike): number {
  if (workout.createdAt) {
    const t = new Date(workout.createdAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

export function sortWorkoutsForDisplay<T extends WorkoutLike>(
  workouts: T[] | null | undefined
): T[] {
  if (!workouts?.length) return [];
  return [...workouts].sort((a, b) => {
    const timeA = workoutSortKey(a);
    const timeB = workoutSortKey(b);
    if (timeA !== timeB) return timeA - timeB;
    // Stable planner order when createdAt is missing or identical
    const snA = a.sessionNumber ?? 999;
    const snB = b.sessionNumber ?? 999;
    if (snA !== snB) return snA - snB;
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });
}

export function findPlanDay(workoutPlan: unknown, dayId: string): { workouts?: WorkoutLike[] } | null {
  const plan = workoutPlan as { weeks?: { days?: { id?: string; workouts?: WorkoutLike[] }[] }[] };
  for (const week of plan?.weeks ?? []) {
    const day = week.days?.find((d) => d.id === dayId);
    if (day) return day;
  }
  return null;
}

export function getSortedWorkoutsForPlanDay(
  workoutPlan: unknown,
  dayId: string
): WorkoutLike[] {
  const day = findPlanDay(workoutPlan, dayId);
  return sortWorkoutsForDisplay(day?.workouts);
}

/** Planner slot #1, #2, #3 — matches WorkoutTable `workoutIndex + 1`. */
export function getWorkoutDisplayNumber(
  workouts: WorkoutLike[] | null | undefined,
  workoutId: string | undefined | null
): number | null {
  if (!workoutId || !workouts?.length) return null;
  const sorted = sortWorkoutsForDisplay(workouts);
  const idx = sorted.findIndex((w) => w.id === workoutId);
  return idx >= 0 ? idx + 1 : null;
}

export function countMoveframes(workout: WorkoutLike): number {
  return Array.isArray(workout.moveframes) ? workout.moveframes.length : 0;
}

/** Label for copy/move modals — uses display slot (#1, #2, #3), not sessionNumber. */
export function formatWorkoutSelectLabel(workout: WorkoutLike, displayIndex: number): string {
  const n = countMoveframes(workout);
  const moveframeLabel = n === 1 ? '1 moveframe' : `${n} moveframes`;
  const trimmedName = typeof workout.name === 'string' ? workout.name.trim() : '';
  const showName =
    trimmedName &&
    trimmedName !== `Workout ${workout.sessionNumber}` &&
    !/^Workout\s*#?\s*\d+$/i.test(trimmedName) &&
    !/^Workout\s+\d+$/i.test(trimmedName);

  return showName
    ? `Workout #${displayIndex + 1}: ${trimmedName} (${moveframeLabel})`
    : `Workout #${displayIndex + 1} (${moveframeLabel})`;
}
