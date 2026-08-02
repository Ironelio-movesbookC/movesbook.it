import { prisma } from '@/lib/prisma';
import type { WorkoutStatus } from '@prisma/client';

const VALID_STATUSES = new Set<string>([
  'PLANNED_FUTURE',
  'PLANNED_NEXT_WEEK',
  'PLANNED_CURRENT_WEEK',
  'DONE_DIFFERENTLY',
  'DONE_LESS_75',
  'DONE_MORE_75',
  'DONE_SHIFTED_LESS_60',
  'DONE_SHIFTED_50_80',
  'DONE_SHIFTED_MORE_80',
]);

function resolveStatus(
  sourceStatus: WorkoutStatus,
  override?: string | null,
): WorkoutStatus {
  if (override && VALID_STATUSES.has(override)) {
    return override as WorkoutStatus;
  }
  if (VALID_STATUSES.has(sourceStatus) && sourceStatus !== 'NOT_PLANNED') {
    return sourceStatus;
  }
  return 'PLANNED_CURRENT_WEEK';
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 12, 0, 0));
}

async function findOrCreateDoneDay(userId: string, sourceDay: {
  date: Date;
  periodId: string;
  weather: string | null;
  feelingStatus: string | null;
  notes: string | null;
  weekNumber: number;
  dayOfWeek: number;
}) {
  const donePlan = await prisma.workoutPlan.findFirst({
    where: { userId, type: 'WORKOUTS_DONE' },
    include: { weeks: { orderBy: { weekNumber: 'asc' } } },
  });

  if (!donePlan) {
    throw new Error('Workouts Done plan not found. Please create a yearly plan first.');
  }

  const workoutDate = startOfUtcDay(new Date(sourceDay.date));
  const planStartDate = new Date(donePlan.startDate);
  const diffDays = Math.floor(
    (workoutDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);

  let targetWeek = donePlan.weeks.find((w) => w.weekNumber === weekNumber);
  if (!targetWeek) {
    targetWeek = await prisma.workoutWeek.create({
      data: { workoutPlanId: donePlan.id, weekNumber },
    });
  }

  let targetDay = await prisma.workoutDay.findUnique({
    where: {
      userId_date_storageZone: {
        userId,
        date: workoutDate,
        storageZone: 'C',
      },
    },
  });

  if (!targetDay) {
    targetDay = await prisma.workoutDay.create({
      data: {
        workoutWeekId: targetWeek.id,
        userId,
        dayOfWeek: sourceDay.dayOfWeek,
        weekNumber,
        date: workoutDate,
        periodId: sourceDay.periodId,
        storageZone: 'C',
        weather: sourceDay.weather,
        feelingStatus: sourceDay.feelingStatus,
        notes: sourceDay.notes,
      },
    });
  }

  return targetDay;
}

async function assertDoneDayOwned(userId: string, targetDayId: string) {
  const day = await prisma.workoutDay.findUnique({
    where: { id: targetDayId },
    include: {
      workoutWeek: { include: { workoutPlan: true } },
      workouts: { select: { id: true, sessionNumber: true } },
    },
  });
  if (!day || day.workoutWeek.workoutPlan.userId !== userId) {
    throw new Error('Target day not found');
  }
  if (day.storageZone !== 'C' || day.workoutWeek.workoutPlan.type !== 'WORKOUTS_DONE') {
    throw new Error('Target day must be in Workouts Done');
  }
  return day;
}

async function replaceWorkoutAtSession(targetDayId: string, sessionNumber: number) {
  const existing = await prisma.workoutSession.findFirst({
    where: { workoutDayId: targetDayId, sessionNumber },
    select: { id: true },
  });
  if (!existing) return;

  const moveframes = await prisma.moveframe.findMany({
    where: { workoutSessionId: existing.id },
    select: { id: true },
  });
  for (const mf of moveframes) {
    await prisma.movelap.deleteMany({ where: { moveframeId: mf.id } });
  }
  await prisma.moveframe.deleteMany({ where: { workoutSessionId: existing.id } });
  await prisma.workoutSession.delete({ where: { id: existing.id } });
}

async function copyWorkoutTree(
  sourceWorkoutId: string,
  targetDayId: string,
  sessionNumber: number,
  status: WorkoutStatus,
  markSourceExported: boolean,
) {
  const sourceWorkout = await prisma.workoutSession.findUnique({
    where: { id: sourceWorkoutId },
    include: {
      sports: true,
      moveframes: {
        include: { movelaps: { orderBy: { repetitionNumber: 'asc' } } },
        orderBy: { letter: 'asc' },
      },
    },
  });

  if (!sourceWorkout) {
    throw new Error('Source workout not found');
  }

  if (!sourceWorkout.moveframes.length) {
    return null;
  }

  await replaceWorkoutAtSession(targetDayId, sessionNumber);

  const newWorkout = await prisma.workoutSession.create({
    data: {
      workoutDayId: targetDayId,
      sessionNumber,
      name: sourceWorkout.name,
      code: sourceWorkout.code,
      time: sourceWorkout.time || '',
      weather: sourceWorkout.weather,
      location: sourceWorkout.location,
      surface: sourceWorkout.surface,
      heartRateMax: sourceWorkout.heartRateMax,
      heartRateAvg: sourceWorkout.heartRateAvg,
      calories: sourceWorkout.calories,
      feelingStatus: sourceWorkout.feelingStatus,
      notes: sourceWorkout.notes,
      status,
      mainSport: sourceWorkout.mainSport,
      mainGoal: sourceWorkout.mainGoal,
      intensity: sourceWorkout.intensity,
      tags: sourceWorkout.tags,
      includeStretching: sourceWorkout.includeStretching ?? true,
      sports: {
        create: sourceWorkout.sports.map((s) => ({ sport: s.sport })),
      },
      moveframes: {
        create: sourceWorkout.moveframes.map((mf) => ({
          letter: mf.letter,
          sport: mf.sport,
          type: mf.type,
          description: mf.description,
          sectionId: mf.sectionId,
          notes: mf.notes,
          macroFinal: mf.macroFinal,
          alarm: mf.alarm,
          annotationText: mf.annotationText,
          annotationBgColor: mf.annotationBgColor,
          annotationTextColor: mf.annotationTextColor,
          annotationBold: mf.annotationBold,
          workType: mf.workType,
          manualMode: mf.manualMode,
          manualPriority: mf.manualPriority,
          favourite: mf.favourite,
          repetitions: mf.repetitions,
          distance: mf.distance,
          manualInputType: mf.manualInputType,
          appliedTechnique: mf.appliedTechnique,
          aerobicSeries: mf.aerobicSeries,
          movelaps: {
            create: mf.movelaps.map((ml) => ({
              repetitionNumber: ml.repetitionNumber,
              distance: ml.distance,
              speed: ml.speed,
              style: ml.style,
              pace: ml.pace,
              time: ml.time,
              reps: ml.reps,
              restType: ml.restType,
              pause: ml.pause,
              alarm: ml.alarm,
              sound: ml.sound,
              notes: ml.notes,
              status: ml.status || 'PENDING',
              isSkipped: ml.isSkipped ?? false,
              isDisabled: ml.isDisabled ?? false,
              isNewlyAdded: ml.isNewlyAdded ?? false,
              macroFinal: ml.macroFinal,
              r1: ml.r1,
              r2: ml.r2,
              exercise: ml.exercise,
              muscularSector: ml.muscularSector,
              rowPerMin: ml.rowPerMin,
              weight: ml.weight,
              tools: ml.tools,
            })),
          },
        })),
      },
    },
  });

  if (markSourceExported) {
    await prisma.workoutSession.update({
      where: { id: sourceWorkoutId },
      data: {
        status,
        exportedToDoneAt: new Date(),
      },
    });
  }

  return newWorkout;
}

function resolveSessionNumber(
  targetWorkouts: { sessionNumber: number }[],
  preferredSession: number,
): number {
  const taken = new Set(targetWorkouts.map((w) => w.sessionNumber));
  if (!taken.has(preferredSession)) return preferredSession;
  for (let n = 1; n <= 3; n++) {
    if (!taken.has(n)) return n;
  }
  return preferredSession;
}

export async function exportWorkoutsToDone(params: {
  userId: string;
  mode: 'workout' | 'day';
  sourceWorkoutId?: string;
  sourceDayId?: string;
  /** Explicit Workouts Done day ids (supports multi-week). */
  targetDayIds?: string[];
  statusByWorkoutId?: Record<string, string>;
}) {
  const now = new Date();
  const exported: string[] = [];
  const targetDayIds = Array.from(new Set(params.targetDayIds?.filter(Boolean) ?? []));

  if (params.mode === 'workout') {
    if (!params.sourceWorkoutId) {
      throw new Error('sourceWorkoutId is required');
    }

    const sourceWorkout = await prisma.workoutSession.findUnique({
      where: { id: params.sourceWorkoutId },
      include: {
        workoutDay: true,
        moveframes: { select: { id: true } },
      },
    });

    if (!sourceWorkout) throw new Error('Workout not found');
    if (sourceWorkout.workoutDay.storageZone !== 'B') {
      throw new Error('Only Yearly Plan workouts can be exported to Workouts Done');
    }
    if (!sourceWorkout.moveframes.length) {
      throw new Error('Workout has no moveframes to export');
    }

    const status = resolveStatus(
      sourceWorkout.status,
      params.statusByWorkoutId?.[sourceWorkout.id],
    );

    const targets =
      targetDayIds.length > 0
        ? await Promise.all(targetDayIds.map((id) => assertDoneDayOwned(params.userId, id)))
        : [await findOrCreateDoneDay(params.userId, sourceWorkout.workoutDay)];

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const currentSessions = await prisma.workoutSession.findMany({
        where: { workoutDayId: target.id },
        select: { sessionNumber: true },
      });
      if (currentSessions.length >= 3) {
        const preferredTaken = currentSessions.some(
          (w) => w.sessionNumber === sourceWorkout.sessionNumber,
        );
        if (!preferredTaken) {
          throw new Error('A target day already has 3 workouts');
        }
      }
      const sessionNumber = resolveSessionNumber(
        currentSessions,
        sourceWorkout.sessionNumber,
      );
      const created = await copyWorkoutTree(
        sourceWorkout.id,
        target.id,
        sessionNumber,
        status,
        i === targets.length - 1,
      );
      if (created) exported.push(created.id);
    }

    return {
      exportedCount: exported.length,
      exportedWorkoutIds: exported,
      weekCount: targets.length,
    };
  }

  if (!params.sourceDayId) {
    throw new Error('sourceDayId is required');
  }

  const sourceDay = await prisma.workoutDay.findUnique({
    where: { id: params.sourceDayId },
    include: {
      workouts: {
        include: { moveframes: { select: { id: true } } },
        orderBy: { sessionNumber: 'asc' },
      },
    },
  });

  if (!sourceDay) throw new Error('Day not found');
  if (sourceDay.storageZone !== 'B') {
    throw new Error('Only Yearly Plan days can be exported to Workouts Done');
  }

  const exportable = sourceDay.workouts.filter((w) => w.moveframes.length > 0);
  if (!exportable.length) {
    throw new Error('No planned workouts on this day');
  }

  const targets =
    targetDayIds.length > 0
      ? await Promise.all(targetDayIds.map((id) => assertDoneDayOwned(params.userId, id)))
      : [await findOrCreateDoneDay(params.userId, sourceDay)];

  for (const target of targets) {
    for (const workout of exportable) {
      const status = resolveStatus(
        workout.status,
        params.statusByWorkoutId?.[workout.id],
      );
      const sessionNumber = resolveSessionNumber(
        await prisma.workoutSession.findMany({
          where: { workoutDayId: target.id },
          select: { sessionNumber: true },
        }),
        workout.sessionNumber,
      );
      const created = await copyWorkoutTree(
        workout.id,
        target.id,
        sessionNumber,
        status,
        true,
      );
      if (created) exported.push(created.id);
    }
  }

  await prisma.workoutDay.update({
    where: { id: sourceDay.id },
    data: { exportedToDoneAt: now },
  });

  return {
    exportedCount: exported.length,
    exportedWorkoutIds: exported,
    weekCount: targets.length,
  };
}
