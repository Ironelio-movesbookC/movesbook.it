import { buildWorkoutSessionCreate } from '@/lib/workoutDayCopy';

export function computeDayDateForWeek(
  _weekNumber: number,
  dayOfWeek: number,
  reference: { date: Date; dayOfWeek: number }
): Date {
  const weekStart = new Date(reference.date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (reference.dayOfWeek - 1));
  const dayDate = new Date(weekStart);
  dayDate.setDate(weekStart.getDate() + (dayOfWeek - 1));
  return dayDate;
}

export async function ensureTargetDaySlot(
  tx: any,
  sourceDay: {
    dayOfWeek: number;
    weekNumber: number;
    periodId: string;
    storageZone: string;
    date: Date;
  },
  targetWeek: { id: string; weekNumber: number; days: any[] },
  userId: string
) {
  const existing = targetWeek.days.find((d: any) => d.dayOfWeek === sourceDay.dayOfWeek);
  if (existing) return existing;

  const referenceDay =
    targetWeek.days.find((d: any) => d.dayOfWeek === 1) ??
    targetWeek.days[0] ??
    sourceDay;

  const dayDate = computeDayDateForWeek(
    targetWeek.weekNumber,
    sourceDay.dayOfWeek,
    { date: new Date(referenceDay.date), dayOfWeek: referenceDay.dayOfWeek }
  );

  const created = await tx.workoutDay.create({
    data: {
      workoutWeekId: targetWeek.id,
      userId,
      dayOfWeek: sourceDay.dayOfWeek,
      weekNumber: targetWeek.weekNumber,
      date: dayDate,
      periodId: sourceDay.periodId,
      storageZone: sourceDay.storageZone,
      weather: '',
      feelingStatus: '5',
      notes: '',
    },
  });

  targetWeek.days.push(created);
  return created;
}

export async function clearWeekWorkouts(tx: any, week: { days: { id: string }[] }) {
  for (const day of week.days) {
    const workouts = await tx.workoutSession.findMany({
      where: { workoutDayId: day.id },
      select: { id: true },
    });

    for (const workout of workouts) {
      const moveframes = await tx.moveframe.findMany({
        where: { workoutSessionId: workout.id },
        select: { id: true },
      });

      for (const moveframe of moveframes) {
        await tx.movelap.deleteMany({ where: { moveframeId: moveframe.id } });
      }

      await tx.moveframe.deleteMany({ where: { workoutSessionId: workout.id } });
    }

    await tx.workoutSession.deleteMany({ where: { workoutDayId: day.id } });
  }
}

type WeekWithTree = {
  id: string;
  weekNumber?: number;
  periodId: string | null;
  notes: string | null;
  days: any[];
};

function weekSlotTarget(week: WeekWithTree): { id: string; weekNumber: number; days: any[] } {
  return {
    id: week.id,
    weekNumber: week.weekNumber ?? week.days[0]?.weekNumber ?? 1,
    days: week.days,
  };
}

/**
 * Copy all workouts/moveframes/movelaps from source week days to target week (by dayOfWeek).
 */
export async function copyWeekContentToTarget(
  tx: any,
  sourceWeek: WeekWithTree,
  targetWeek: WeekWithTree,
  userId: string
) {
  const sortedSourceDays = [...sourceWeek.days].sort(
    (a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0)
  );

  for (const sourceDay of sortedSourceDays) {
    const targetDay = await ensureTargetDaySlot(tx, sourceDay, weekSlotTarget(targetWeek), userId);

    for (const sourceWorkout of sourceDay.workouts ?? []) {
      await tx.workoutSession.create({
        data: {
          workoutDayId: targetDay.id,
          ...buildWorkoutSessionCreate(sourceWorkout),
        },
      });
    }
  }

  await tx.workoutWeek.update({
    where: { id: targetWeek.id },
    data: {
      periodId: sourceWeek.periodId,
      notes: sourceWeek.notes,
    },
  });
}

/** Normalize a workout saved inside favoriteWeeklyPlan.planData JSON. */
function snapshotWorkoutToCreateInput(workout: any) {
  return {
    sessionNumber: workout.sessionNumber ?? 1,
    name: workout.name ?? null,
    code: workout.code ?? null,
    time: workout.time ?? null,
    location: workout.location ?? null,
    notes: workout.notes ?? null,
    status: workout.status ?? 'NOT_PLANNED',
    symbol: workout.symbol ?? null,
    includeStretching: workout.includeStretching ?? false,
    sports: workout.sports ?? [],
    moveframes: (workout.moveframes ?? []).map((mf: any) => ({
      letter: mf.letter ?? 'A',
      code: mf.code ?? null,
      type: mf.type ?? 'NORMAL',
      description: mf.description ?? null,
      sport: mf.sport ?? 'GENERAL',
      distance: mf.distance ?? null,
      distanceUnit: mf.distanceUnit ?? null,
      speed: mf.speed ?? null,
      pace: mf.pace ?? null,
      pause: mf.pause ?? null,
      repetitions: mf.repetitions ?? null,
      style: mf.style ?? null,
      notes: mf.notes ?? null,
      sectionId: mf.sectionId ?? null,
      movelaps: (mf.movelaps ?? []).map((ml: any, idx: number) => ({
        repetitionNumber: ml.repetitionNumber ?? idx + 1,
        distance: ml.distance ?? null,
        speed: ml.speed ?? null,
        style: ml.style ?? null,
        pace: ml.pace ?? null,
        time: ml.time ?? null,
        pause: ml.pause ?? null,
        alarm: ml.alarm ?? null,
        sound: ml.sound ?? null,
        notes: ml.notes ?? null,
        reps: ml.reps ?? null,
        weight: ml.weight ?? null,
        exercise: ml.exercise ?? null,
        restType: ml.restType ?? null,
      })),
    })),
  };
}

/**
 * Apply a favourite week snapshot (from planData) onto a live target week.
 */
export async function applyFavoriteSnapshotToTargetWeek(
  tx: any,
  snapshotWeek: {
    weekNumber?: number;
    notes?: string | null;
    periodId?: string | null;
    days: any[];
  },
  targetWeek: WeekWithTree & { days: any[] },
  userId: string
) {
  await clearWeekWorkouts(tx, targetWeek);

  const storageZone =
    targetWeek.days[0]?.storageZone ?? snapshotWeek.days[0]?.storageZone ?? 'B';

  const sortedDays = [...(snapshotWeek.days ?? [])].sort(
    (a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0)
  );

  for (const daySnapshot of sortedDays) {
    const periodId =
      daySnapshot.periodId ??
      snapshotWeek.periodId ??
      targetWeek.periodId ??
      targetWeek.days[0]?.periodId;

    if (!periodId) continue;

    const targetDay = await ensureTargetDaySlot(
      tx,
      {
        dayOfWeek: daySnapshot.dayOfWeek,
        weekNumber: targetWeek.days[0]?.weekNumber ?? snapshotWeek.weekNumber ?? 1,
        periodId,
        storageZone,
        date: daySnapshot.date ? new Date(daySnapshot.date) : new Date(),
      },
      weekSlotTarget(targetWeek),
      userId
    );

    for (const workoutSnapshot of daySnapshot.workouts ?? []) {
      await tx.workoutSession.create({
        data: {
          workoutDayId: targetDay.id,
          ...buildWorkoutSessionCreate(snapshotWorkoutToCreateInput(workoutSnapshot)),
        },
      });
    }
  }

  if (snapshotWeek.notes != null || snapshotWeek.periodId != null) {
    await tx.workoutWeek.update({
      where: { id: targetWeek.id },
      data: {
        ...(snapshotWeek.periodId ? { periodId: snapshotWeek.periodId } : {}),
        ...(snapshotWeek.notes != null ? { notes: snapshotWeek.notes } : {}),
      },
    });
  }
}
