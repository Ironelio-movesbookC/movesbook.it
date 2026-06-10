import type { Prisma } from '@prisma/client';

export type WorkoutMoveStrategy =
  | 'relocate'
  | 'merge'
  | 'substitute_transfer'
  | 'substitute_exchange';

function letterIndex(letter: string): number {
  const ch = (letter || 'A').trim().toUpperCase().charAt(0);
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 65;
  return 0;
}

function indexToLetter(index: number): string {
  return String.fromCharCode(65 + Math.max(0, index));
}

/** Next letters after existing moveframes on a workout (A,B,C → D,E,…). */
export function allocateMoveframeLetters(
  existingLetters: string[],
  count: number
): string[] {
  let start = 0;
  for (const l of existingLetters) {
    start = Math.max(start, letterIndex(l) + 1);
  }
  return Array.from({ length: count }, (_, i) => indexToLetter(start + i));
}

export async function mergeWorkoutIntoTarget(
  tx: Prisma.TransactionClient,
  sourceWorkoutId: string,
  targetWorkoutId: string
) {
  const source = await tx.workoutSession.findUnique({
    where: { id: sourceWorkoutId },
    include: {
      moveframes: {
        include: { movelaps: { orderBy: { repetitionNumber: 'asc' } } },
        orderBy: { letter: 'asc' },
      },
    },
  });

  const target = await tx.workoutSession.findUnique({
    where: { id: targetWorkoutId },
    include: {
      moveframes: { orderBy: { letter: 'asc' } },
    },
  });

  if (!source || !target) {
    throw new Error('Source or target workout not found');
  }

  const newLetters = allocateMoveframeLetters(
    target.moveframes.map((m) => m.letter),
    source.moveframes.length
  );

  for (let i = 0; i < source.moveframes.length; i++) {
    const mf = source.moveframes[i];
    await tx.moveframe.create({
      data: {
        workoutSessionId: targetWorkoutId,
        letter: newLetters[i],
        sport: mf.sport,
        type: mf.type,
        description: mf.description ?? '',
        sectionId: mf.sectionId,
        notes: mf.notes,
        macroFinal: mf.macroFinal,
        movelaps: {
          create: mf.movelaps.map((ml) => ({
            repetitionNumber: ml.repetitionNumber,
            distance: ml.distance,
            speed: ml.speed,
            style: ml.style,
            pace: ml.pace,
            time: ml.time,
            reps: ml.reps,
            muscularSector: ml.muscularSector,
            exercise: ml.exercise,
            weight: ml.weight,
            restType: ml.restType,
            pause: ml.pause,
            macroFinal: ml.macroFinal,
            alarm: ml.alarm,
            sound: ml.sound,
            notes: ml.notes,
            status: ml.status ?? 'PENDING',
            isSkipped: ml.isSkipped ?? false,
            isDisabled: ml.isDisabled ?? false,
          })),
        },
      },
    });
  }

  await tx.workoutSession.delete({ where: { id: sourceWorkoutId } });
}

export async function substituteTransferWorkout(
  tx: Prisma.TransactionClient,
  sourceWorkoutId: string,
  targetWorkoutId: string
) {
  const source = await tx.workoutSession.findUnique({
    where: { id: sourceWorkoutId },
  });
  const target = await tx.workoutSession.findUnique({
    where: { id: targetWorkoutId },
  });

  if (!source || !target) {
    throw new Error('Source or target workout not found');
  }

  const targetDayId = target.workoutDayId;
  const targetSessionNumber = target.sessionNumber;

  await tx.workoutSession.delete({ where: { id: targetWorkoutId } });

  await tx.workoutSession.update({
    where: { id: sourceWorkoutId },
    data: {
      workoutDayId: targetDayId,
      sessionNumber: targetSessionNumber,
    },
  });
}

export async function substituteExchangeWorkouts(
  tx: Prisma.TransactionClient,
  sourceWorkoutId: string,
  targetWorkoutId: string
) {
  const source = await tx.workoutSession.findUnique({
    where: { id: sourceWorkoutId },
  });
  const target = await tx.workoutSession.findUnique({
    where: { id: targetWorkoutId },
  });

  if (!source || !target) {
    throw new Error('Source or target workout not found');
  }

  const sourceDayId = source.workoutDayId;
  const sourceSession = source.sessionNumber;
  const targetDayId = target.workoutDayId;
  const targetSession = target.sessionNumber;

  await tx.workoutSession.update({
    where: { id: sourceWorkoutId },
    data: {
      workoutDayId: targetDayId,
      sessionNumber: targetSession,
    },
  });

  await tx.workoutSession.update({
    where: { id: targetWorkoutId },
    data: {
      workoutDayId: sourceDayId,
      sessionNumber: sourceSession,
    },
  });
}
