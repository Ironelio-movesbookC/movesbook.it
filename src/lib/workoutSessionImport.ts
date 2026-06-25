import type { PrismaClient } from '@prisma/client';
import {
  buildFavoriteSessionCreateData,
  parseFavoriteMainSport,
  parseFavoriteWorkoutData,
} from '@/lib/favoriteWorkoutApply';
import {
  buildWorkoutSessionCreate,
  mapPrismaWorkoutForSessionCreate,
} from '@/lib/workoutDayCopy';
import { importGlobalArchiveEntry, createWorkoutOnDay } from '@/lib/importGlobalArchiveEntry';
import {
  extractCoachWorkoutFromPayload,
  parseAuthorizedWeekNumbers,
} from '@/lib/coachAnnualPlanPayload';
import { structureSlotToSessionCreate } from '@/lib/weeklyStructureMaterialize';
import type { PlannedWorkout, WeeklyStructurePlanPersist } from '@/lib/weeklyStructureTypes';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function clearWorkoutSession(tx: Tx, workoutSessionId: string) {
  const moveframes = await tx.moveframe.findMany({
    where: { workoutSessionId },
    select: { id: true },
  });
  for (const mf of moveframes) {
    await tx.movelap.deleteMany({ where: { moveframeId: mf.id } });
  }
  await tx.moveframe.deleteMany({ where: { workoutSessionId } });
  await tx.workoutSessionSport.deleteMany({ where: { workoutSessionId } });
  await tx.workoutSession.delete({ where: { id: workoutSessionId } });
}

async function getDefaultSectionId(tx: Tx, userId: string): Promise<string> {
  let section = await tx.workoutSection.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  if (!section) {
    section = await tx.workoutSection.create({
      data: {
        userId,
        name: 'Default',
        code: 'DEF',
        description: 'Default section',
        color: '#3B82F6',
      },
    });
  }
  return section.id;
}

export async function importWorkoutSessionToSlot(
  tx: Tx,
  userId: string,
  opts: {
    targetDayId: string;
    sessionNumber: number;
    replaceExisting: boolean;
    sourceWorkoutId: string;
  }
) {
  const { targetDayId, sessionNumber, replaceExisting, sourceWorkoutId } = opts;

  const targetDay = await tx.workoutDay.findFirst({
    where: { id: targetDayId, userId },
  });
  if (!targetDay) throw new Error('Target day not found');

  const existingAtSlot = await tx.workoutSession.findFirst({
    where: { workoutDayId: targetDayId, sessionNumber },
  });

  if (existingAtSlot && !replaceExisting) {
    throw new Error('Target workout slot is occupied. Confirm replace to overwrite.');
  }

  const sourceWorkout = await tx.workoutSession.findUnique({
    where: { id: sourceWorkoutId },
    include: {
      sports: true,
      moveframes: {
        include: { movelaps: { orderBy: { repetitionNumber: 'asc' } } },
        orderBy: { letter: 'asc' },
      },
      workoutDay: { include: { workoutWeek: { include: { workoutPlan: true } } } },
    },
  });

  if (!sourceWorkout) throw new Error('Source workout not found');
  if (sourceWorkout.workoutDay.userId !== userId) {
    throw new Error('Unauthorized to import this workout');
  }

  if (existingAtSlot) {
    await clearWorkoutSession(tx, existingAtSlot.id);
  } else {
    const count = await tx.workoutSession.count({ where: { workoutDayId: targetDayId } });
    if (count >= 3) throw new Error('Maximum 3 workouts per day allowed');
  }

  const mapped = mapPrismaWorkoutForSessionCreate(sourceWorkout);
  mapped.sessionNumber = sessionNumber;

  const session = await tx.workoutSession.create({
    data: {
      workoutDayId: targetDayId,
      mainSport: sourceWorkout.mainSport,
      mainGoal: sourceWorkout.mainGoal,
      intensity: sourceWorkout.intensity,
      tags: sourceWorkout.tags,
      ...buildWorkoutSessionCreate(mapped),
    },
    include: {
      sports: true,
      moveframes: { include: { movelaps: true } },
    },
  });

  return session;
}

export async function importFavoriteToSlot(
  tx: Tx,
  userId: string,
  opts: {
    targetDayId: string;
    sessionNumber: number;
    replaceExisting: boolean;
    favoriteId: string;
  }
) {
  const { targetDayId, sessionNumber, replaceExisting, favoriteId } = opts;

  const favorite = await tx.favoriteWorkout.findFirst({
    where: { id: favoriteId, userId },
  });
  if (!favorite?.workoutData) throw new Error('Favourite workout not found');

  const parsed = parseFavoriteWorkoutData(favorite.workoutData);
  if (!parsed) throw new Error('Favourite workout data is invalid');

  const targetDay = await tx.workoutDay.findFirst({
    where: { id: targetDayId, userId },
  });
  if (!targetDay) throw new Error('Target day not found');

  const existingAtSlot = await tx.workoutSession.findFirst({
    where: { workoutDayId: targetDayId, sessionNumber },
  });

  if (existingAtSlot && !replaceExisting) {
    throw new Error('Target workout slot is occupied. Confirm replace to overwrite.');
  }

  if (existingAtSlot) {
    await clearWorkoutSession(tx, existingAtSlot.id);
  } else {
    const count = await tx.workoutSession.count({ where: { workoutDayId: targetDayId } });
    if (count >= 3) throw new Error('Maximum 3 workouts per day allowed');
  }

  const defaultSectionId = await getDefaultSectionId(tx, userId);

  const session = await tx.workoutSession.create({
    data: {
      workoutDayId: targetDayId,
      mainSport: parseFavoriteMainSport(parsed.workout.mainSport),
      mainGoal: parsed.workout.mainGoal ?? null,
      intensity: parsed.workout.intensity ?? 'Medium',
      tags: parsed.workout.tags ?? null,
      ...buildFavoriteSessionCreateData(parsed, sessionNumber, defaultSectionId),
    },
    include: {
      sports: true,
      moveframes: { include: { movelaps: true } },
    },
  });

  return session;
}

export async function importStructureSlotToSlot(
  tx: Tx,
  userId: string,
  opts: {
    targetDayId: string;
    sessionNumber: number;
    replaceExisting: boolean;
    planData: WeeklyStructurePlanPersist;
    structureDayOfWeek: number;
    structureSessionNumber: number;
  }
) {
  const {
    targetDayId,
    sessionNumber,
    replaceExisting,
    planData,
    structureDayOfWeek,
    structureSessionNumber,
  } = opts;

  const targetDay = await tx.workoutDay.findFirst({
    where: { id: targetDayId, userId },
  });
  if (!targetDay) throw new Error('Target day not found');

  const ids = planData.grid[structureDayOfWeek]?.[structureSessionNumber] || [];
  if (!ids.length) throw new Error('Selected structure slot is empty');

  const plannedById = new Map(planData.planned.map((p) => [p.id, p]));
  const items = ids
    .map((id) => plannedById.get(id))
    .filter((p): p is PlannedWorkout => Boolean(p));
  if (!items.length) throw new Error('Selected structure slot has no valid assignments');

  const existingAtSlot = await tx.workoutSession.findFirst({
    where: { workoutDayId: targetDayId, sessionNumber },
  });

  if (existingAtSlot && !replaceExisting) {
    throw new Error('Target workout slot is occupied. Confirm replace to overwrite.');
  }

  if (existingAtSlot) {
    await clearWorkoutSession(tx, existingAtSlot.id);
  } else {
    const count = await tx.workoutSession.count({ where: { workoutDayId: targetDayId } });
    if (count >= 3) throw new Error('Maximum 3 workouts per day allowed');
  }

  const defaultSectionId = await getDefaultSectionId(tx, userId);
  const sessionSource = structureSlotToSessionCreate(
    items,
    sessionNumber,
    defaultSectionId
  );

  const session = await tx.workoutSession.create({
    data: {
      workoutDayId: targetDayId,
      mainSport: parseFavoriteMainSport(sessionSource.sports[0]?.sport),
      mainGoal: sessionSource.code || null,
      intensity: 'Medium',
      tags: 'weekly-structure',
      ...buildWorkoutSessionCreate(sessionSource),
    },
    include: {
      sports: true,
      moveframes: { include: { movelaps: true } },
    },
  });

  return session;
}

export async function importGlobalArchiveWorkoutToSlot(
  prisma: PrismaClient,
  userId: string,
  opts: {
    targetDayId: string;
    sessionNumber: number;
    replaceExisting: boolean;
    globalEntryId: string;
  }
) {
  const { targetDayId, sessionNumber, replaceExisting, globalEntryId } = opts;

  await prisma.$transaction(async (tx) => {
    const existingAtSlot = await tx.workoutSession.findFirst({
      where: { workoutDayId: targetDayId, sessionNumber },
    });

    if (existingAtSlot && !replaceExisting) {
      throw new Error('Target workout slot is occupied. Confirm replace to overwrite.');
    }

    if (existingAtSlot) {
      await clearWorkoutSession(tx, existingAtSlot.id);
    }
  });

  return importGlobalArchiveEntry(prisma, userId, globalEntryId, {
    targetDayId,
    sessionNumber,
  });
}

export async function importCoachAnnualWorkoutToSlot(
  tx: Tx,
  userId: string,
  opts: {
    targetDayId: string;
    sessionNumber: number;
    replaceExisting: boolean;
    globalEntryId: string;
    coachWeekNumber: number;
    coachDayOfWeek: number;
    coachSessionNumber: number;
    anchorWeekNumber: number;
    maxWeekNumber?: number;
  }
) {
  const {
    targetDayId,
    sessionNumber,
    replaceExisting,
    globalEntryId,
    coachWeekNumber,
    coachDayOfWeek,
    coachSessionNumber,
    anchorWeekNumber,
    maxWeekNumber = 52,
  } = opts;

  const targetDay = await tx.workoutDay.findFirst({
    where: { id: targetDayId, userId },
  });
  if (!targetDay) throw new Error('Target day not found');

  const coachLink = await tx.coachAthlete.findFirst({
    where: { athleteId: userId },
    select: { coachId: true },
  });
  if (!coachLink) throw new Error('No coach linked to your account');

  const entry = await tx.globalWorkoutArchiveEntry.findFirst({
    where: {
      id: globalEntryId,
      disabled: false,
      recordType: 'COACH_PLAN',
      sharedByUserId: coachLink.coachId,
    },
  });
  if (!entry) throw new Error('Coach annual plan not found or not authorized');

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(entry.payloadData) as Record<string, unknown>;
  } catch {
    throw new Error('Coach plan data is invalid');
  }

  const authorizedWeekNumbers = parseAuthorizedWeekNumbers(
    payload,
    anchorWeekNumber,
    maxWeekNumber
  );
  if (!authorizedWeekNumbers.includes(coachWeekNumber)) {
    throw new Error('This week is not authorized for import by your coach');
  }

  const extracted = extractCoachWorkoutFromPayload(
    payload,
    coachWeekNumber,
    coachDayOfWeek,
    coachSessionNumber
  );
  if (!extracted) throw new Error('Coach workout not found in plan');

  const existingAtSlot = await tx.workoutSession.findFirst({
    where: { workoutDayId: targetDayId, sessionNumber },
  });

  if (existingAtSlot && !replaceExisting) {
    throw new Error('Target workout slot is occupied. Confirm replace to overwrite.');
  }

  if (existingAtSlot) {
    await clearWorkoutSession(tx, existingAtSlot.id);
  } else {
    const count = await tx.workoutSession.count({ where: { workoutDayId: targetDayId } });
    if (count >= 3) throw new Error('Maximum 3 workouts per day allowed');
  }

  return createWorkoutOnDay(
    tx,
    userId,
    targetDayId,
    extracted.workout,
    extracted.sports,
    extracted.moveframes,
    entry,
    sessionNumber
  );
}
