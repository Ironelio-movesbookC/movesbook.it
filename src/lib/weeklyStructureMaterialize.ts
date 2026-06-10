import {
  WEEKLY_STRUCTURE_SESSIONS,
  type PlannedWorkout,
  type WeeklyStructureDayGrid,
  type WeeklyStructurePlanPersist,
} from '@/lib/weeklyStructureTypes';
import type { WorkoutSessionCreateSource } from '@/lib/workoutDayCopy';

function parseMeters(dist: string): number {
  const m = dist.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function sportLabel(key: string): string {
  return key.replace(/_/g, ' ');
}

export function getStructureAssignmentCount(plan: WeeklyStructurePlanPersist): number {
  let count = 0;
  for (let d = 1; d <= 7; d++) {
    const day = plan.grid[d];
    if (!day) continue;
    for (const sn of WEEKLY_STRUCTURE_SESSIONS) {
      count += (day[sn] || []).length;
    }
  }
  return count;
}

export function isStructurePlanEmpty(plan: WeeklyStructurePlanPersist): boolean {
  return getStructureAssignmentCount(plan) === 0 && plan.planned.length === 0;
}

export function isStructureGridEmpty(plan: WeeklyStructurePlanPersist): boolean {
  return getStructureAssignmentCount(plan) === 0;
}

export function structureSlotToSessionCreate(
  plannedItems: PlannedWorkout[],
  sessionNumber: number,
  defaultSectionId: string
): WorkoutSessionCreateSource {
  const uniqueSports = Array.from(new Set(plannedItems.map((p) => p.sportKey)));
  const name =
    plannedItems.length === 1
      ? sportLabel(plannedItems[0].sportKey)
      : plannedItems.map((p) => sportLabel(p.sportKey)).join(' + ');
  const time = plannedItems.map((p) => p.time).filter(Boolean).join(' / ') || '';
  const notes = plannedItems
    .map((p) => {
      const parts: string[] = [];
      if (p.goalCode) parts.push(`Goal: ${p.goalCode}`);
      if (p.distance) parts.push(p.distance);
      if (p.description) parts.push(p.description);
      return parts.join(' — ');
    })
    .filter(Boolean)
    .join('\n');

  const moveframes = plannedItems.map((p, idx) => {
    const distM = parseMeters(p.distance);
    const hasMovelap = distM > 0 || Boolean(p.time?.trim());
    return {
      letter: String.fromCharCode(65 + idx),
      code: null,
      type: 'STANDARD',
      description: p.description || `${p.goalCode} ${p.distance} ${p.time}`.trim(),
      sport: p.sportKey,
      distance: distM > 0 ? distM : null,
      distanceUnit: distM > 0 ? 'm' : null,
      speed: null,
      pace: null,
      pause: null,
      repetitions: null,
      style: null,
      notes: p.goalCode ? `Goal: ${p.goalCode}` : null,
      sectionId: defaultSectionId,
      movelaps: hasMovelap
        ? [
            {
              repetitionNumber: 1,
              distance: distM > 0 ? distM : null,
              speed: null,
              style: null,
              pace: null,
              time: p.time?.trim() || null,
              pause: null,
              alarm: null,
              sound: null,
              notes: p.description || null,
              reps: null,
              weight: null,
              exercise: null,
              restType: null,
            },
          ]
        : [],
    };
  });

  return {
    sessionNumber,
    name: name || `Session ${sessionNumber}`,
    code: plannedItems.map((p) => p.goalCode).filter(Boolean).join('-') || '',
    time,
    location: null,
    notes: notes || null,
    status: 'NOT_PLANNED',
    includeStretching: false,
    sports: uniqueSports.map((sport) => ({ sport })),
    moveframes,
  };
}

export function buildSessionsForStructurePlan(
  plan: WeeklyStructurePlanPersist,
  defaultSectionId: string
): Array<{ dayOfWeek: number; sessions: WorkoutSessionCreateSource[] }> {
  const plannedById = new Map(plan.planned.map((p) => [p.id, p]));
  const days: Array<{ dayOfWeek: number; sessions: WorkoutSessionCreateSource[] }> = [];

  for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
    const dayGrid = plan.grid[dayOfWeek];
    if (!dayGrid) continue;
    const sessions: WorkoutSessionCreateSource[] = [];

    for (const sessionNumber of WEEKLY_STRUCTURE_SESSIONS) {
      const ids = dayGrid[sessionNumber] || [];
      if (!ids.length) continue;
      const items = ids.map((id) => plannedById.get(id)).filter(Boolean) as PlannedWorkout[];
      if (!items.length) continue;
      sessions.push(structureSlotToSessionCreate(items, sessionNumber, defaultSectionId));
    }

    if (sessions.length) days.push({ dayOfWeek, sessions });
  }

  return days;
}

export function plannedWorkoutToFavoriteSnapshot(planned: PlannedWorkout) {
  const distM = parseMeters(planned.distance);
  const sports = [{ sport: planned.sportKey }];
  const notesParts: string[] = [];
  if (planned.goalCode) notesParts.push(`Goal: ${planned.goalCode}`);
  if (planned.distance) notesParts.push(planned.distance);
  if (planned.description) notesParts.push(planned.description);

  return {
    sourceType: 'WEEKLY_STRUCTURE' as const,
    workout: {
      name: sportLabel(planned.sportKey),
      code: planned.goalCode || '',
      sessionNumber: 1,
      time: planned.time || '',
      location: null,
      notes: notesParts.join(' — ') || null,
      status: 'NOT_PLANNED',
      mainSport: planned.sportKey,
      mainGoal: planned.goalCode || null,
      intensity: 'Medium',
      tags: 'weekly-structure',
    },
    sports,
    moveframes: [
      {
        letter: 'A',
        sport: planned.sportKey,
        type: 'STANDARD',
        description: planned.description || `${planned.goalCode} ${planned.distance}`.trim(),
        notes: planned.goalCode ? `Goal: ${planned.goalCode}` : null,
        movelaps:
          distM > 0 || planned.time
            ? [
                {
                  repetitionNumber: 1,
                  distance: distM > 0 ? distM : null,
                  time: planned.time || null,
                  notes: planned.description || null,
                },
              ]
            : [],
      },
    ],
  };
}

export function structurePlanToFavoriteWeekSnapshot(
  plan: WeeklyStructurePlanPersist,
  planKey: string,
  planName: string
) {
  const days: Array<{
    dayOfWeek: number;
    workouts: ReturnType<typeof plannedWorkoutToFavoriteSnapshot>[];
  }> = [];
  const plannedById = new Map(plan.planned.map((p) => [p.id, p]));
  let workoutCount = 0;

  for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
    const dayGrid = plan.grid[dayOfWeek];
    if (!dayGrid) continue;
    const workouts: ReturnType<typeof plannedWorkoutToFavoriteSnapshot>[] = [];

    for (const sessionNumber of WEEKLY_STRUCTURE_SESSIONS) {
      for (const id of dayGrid[sessionNumber] || []) {
        const row = plannedById.get(id);
        if (!row) continue;
        const snap = plannedWorkoutToFavoriteSnapshot(row);
        snap.workout.sessionNumber = sessionNumber;
        workouts.push(snap);
        workoutCount++;
      }
    }

    if (workouts.length) days.push({ dayOfWeek, workouts });
  }

  return {
    sourceType: 'WEEKLY_STRUCTURE' as const,
    sourcePlanKey: planKey,
    name: planName,
    meta: plan.meta,
    weeksCount: 1,
    daysCount: days.length,
    workoutsCount: workoutCount,
    weeks: [
      {
        weekNumber: 1,
        notes: plan.meta.name || null,
        days,
      },
    ],
  };
}

export function countStructureWorkoutsInGrid(grid: WeeklyStructureDayGrid): number {
  return getStructureAssignmentCount({ meta: { name: '', color: '', periodId: '' }, planned: [], grid });
}
