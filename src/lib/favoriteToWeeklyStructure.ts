import {
  WEEKLY_STRUCTURE_SESSIONS,
  type PlannedWorkout,
  type WeeklyStructureDayGrid,
  type WeeklyStructurePlanPersist,
} from '@/lib/weeklyStructureTypes';
import { newWeeklyStructureId } from '@/lib/weeklyStructureStorage';
import { getStructureAssignmentCount } from '@/lib/weeklyStructureMaterialize';

function normalizeWorkoutEntry(entry: any) {
  if (entry?.workout) return entry;
  return { workout: entry, sports: entry.sports, moveframes: entry.moveframes };
}

function workoutEntryToPlanned(entry: any): PlannedWorkout {
  const { workout, sports, moveframes } = normalizeWorkoutEntry(entry);
  const mf = (moveframes ?? [])[0];
  const movelap = mf?.movelaps?.[0];
  const sport =
    workout?.mainSport ||
    sports?.[0]?.sport ||
    mf?.sport ||
    'GENERAL';

  return {
    id: newWeeklyStructureId(),
    sportKey: String(sport),
    distance: movelap?.distance ? `${movelap.distance}m` : '',
    time: String(movelap?.time ?? workout?.time ?? ''),
    goalCode: String(workout?.mainGoal ?? workout?.code ?? ''),
    description: String(mf?.description ?? workout?.name ?? workout?.notes ?? ''),
  };
}

/** Convert a favourite weekly-plan snapshot into a weekly-structure plan blob. */
export function favoritePlanDataToStructurePlan(
  planData: any,
  fallbackName = 'Imported week'
): WeeklyStructurePlanPersist {
  const snapshot = planData?.weeks?.[0];
  const meta = planData?.meta ?? {};
  const planned: PlannedWorkout[] = [];
  const grid: WeeklyStructureDayGrid = {};

  for (const day of snapshot?.days ?? []) {
    const dayOfWeek = Number(day.dayOfWeek);
    if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7) continue;

    for (const workoutEntry of day.workouts ?? []) {
      const normalized = normalizeWorkoutEntry(workoutEntry);
      const sessionNumber = Number(
        normalized.workout?.sessionNumber ?? workoutEntry.sessionNumber ?? 1
      );
      if (!WEEKLY_STRUCTURE_SESSIONS.includes(sessionNumber as 1 | 2 | 3)) continue;

      const row = workoutEntryToPlanned(workoutEntry);
      planned.push(row);

      if (!grid[dayOfWeek]) grid[dayOfWeek] = {};
      if (!grid[dayOfWeek][sessionNumber]) grid[dayOfWeek][sessionNumber] = [];
      grid[dayOfWeek][sessionNumber].push(row.id);
    }
  }

  return {
    meta: {
      name: String(meta.name ?? planData?.name ?? fallbackName),
      color: String(meta.color ?? '#f97316'),
      periodId: String(meta.periodId ?? ''),
    },
    planned,
    grid,
  };
}

/** Convert a favourite workout snapshot into a single planned-workout row. */
export function favoriteWorkoutDataToPlannedWorkout(workoutData: any): PlannedWorkout | null {
  try {
    const parsed =
      typeof workoutData === 'string' ? JSON.parse(workoutData) : workoutData;
    if (!parsed?.workout) return null;
    return workoutEntryToPlanned(parsed);
  } catch {
    return null;
  }
}

export function isStructureSlotEmpty(
  plan: WeeklyStructurePlanPersist,
  dayOfWeek: number,
  sessionNumber: number
): boolean {
  return !(plan.grid[dayOfWeek]?.[sessionNumber]?.length);
}

export { getStructureAssignmentCount };
