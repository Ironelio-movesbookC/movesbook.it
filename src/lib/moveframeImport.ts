import type { PrismaClient } from '@prisma/client';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

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

async function resolveMoveframeSectionId(
  tx: Tx,
  userId: string,
  moveframe: Record<string, unknown>,
  defaultSectionId: string
): Promise<string> {
  const rawId = moveframe.sectionId as string | undefined;
  if (rawId) {
    const exists = await tx.workoutSection.findFirst({
      where: { id: rawId, userId },
      select: { id: true },
    });
    if (exists) return exists.id;
  }
  const embedded = moveframe.section as { id?: string } | undefined;
  if (embedded?.id) {
    const exists = await tx.workoutSection.findFirst({
      where: { id: embedded.id, userId },
      select: { id: true },
    });
    if (exists) return exists.id;
  }
  return defaultSectionId;
}

export async function getNextMoveframeLetter(tx: Tx, workoutSessionId: string): Promise<string> {
  const existingMoveframes = await tx.moveframe.findMany({
    where: { workoutSessionId },
    select: { letter: true },
  });
  const usedLetters = new Set(existingMoveframes.map((mf) => mf.letter));
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters.split('').find((l) => !usedLetters.has(l)) || 'A';
}

export async function appendMoveframeSnapshotToWorkout(
  tx: Tx,
  userId: string,
  targetWorkoutId: string,
  moveframe: Record<string, unknown>,
  fallbackSport?: string | null
) {
  const workout = await tx.workoutSession.findFirst({
    where: { id: targetWorkoutId, workoutDay: { userId } },
    select: { id: true },
  });
  if (!workout) throw new Error('Target workout not found');

  const defaultSectionId = await getDefaultSectionId(tx, userId);
  const sectionId = await resolveMoveframeSectionId(tx, userId, moveframe, defaultSectionId);
  const newLetter = await getNextMoveframeLetter(tx, targetWorkoutId);
  const movelaps = Array.isArray(moveframe.movelaps) ? moveframe.movelaps : [];

  const newMf = await tx.moveframe.create({
    data: {
      workoutSessionId: targetWorkoutId,
      sectionId,
      letter: newLetter,
      sport: (moveframe.sport as any) || fallbackSport || 'RUN',
      type: (moveframe.type as any) || 'STANDARD',
      description: String(moveframe.description || ''),
      notes: (moveframe.notes as string) || null,
      macroFinal: (moveframe.macroFinal as string) || null,
      alarm: (moveframe.alarm as number) ?? null,
      annotationText: (moveframe.annotationText as string) || null,
      annotationBgColor: (moveframe.annotationBgColor as string) || null,
      annotationTextColor: (moveframe.annotationTextColor as string) || null,
      annotationBold: (moveframe.annotationBold as boolean) ?? false,
      workType: (moveframe.workType as any) || 'NONE',
      manualMode: (moveframe.manualMode as boolean) ?? false,
      manualPriority: (moveframe.manualPriority as boolean) ?? false,
      manualInputType: (moveframe.manualInputType as string) || null,
      repetitions: (moveframe.repetitions as number) ?? null,
      distance: (moveframe.distance as number) ?? null,
      appliedTechnique: (moveframe.appliedTechnique as string) || null,
      favourite: false,
    },
  });

  for (const lap of movelaps) {
    const ml = lap as Record<string, unknown>;
    await tx.movelap.create({
      data: {
        moveframeId: newMf.id,
        repetitionNumber: (ml.repetitionNumber as number) ?? 1,
        distance: (ml.distance as number) ?? null,
        time: (ml.time as string) || null,
        speed: (ml.speed as string) || null,
        style: (ml.style as string) || null,
        pace: (ml.pace as string) || null,
        reps: (ml.reps as number) ?? null,
        r1: (ml.r1 as string) || null,
        r2: (ml.r2 as string) || null,
        muscularSector: (ml.muscularSector as string) || null,
        exercise: (ml.exercise as string) || null,
        weight: (ml.weight as string) || null,
        restType: (ml.restType as any) || null,
        pause: (ml.pause as string) || null,
        macroFinal: (ml.macroFinal as string) || null,
        alarm: (ml.alarm as number) ?? null,
        sound: (ml.sound as string) || null,
        notes: (ml.notes as string) || null,
        status: 'PENDING',
        isSkipped: false,
        isDisabled: false,
      },
    });
  }

  return tx.moveframe.findUnique({
    where: { id: newMf.id },
    include: {
      movelaps: { orderBy: { repetitionNumber: 'asc' } },
      section: true,
    },
  });
}

export function pickMoveframeFromPayload(
  moveframes: unknown[],
  opts: { moveframeLetter?: string; moveframeIndex?: number }
): Record<string, unknown> | null {
  if (!moveframes.length) return null;
  if (opts.moveframeLetter) {
    const found = moveframes.find(
      (mf) =>
        typeof mf === 'object' &&
        mf !== null &&
        String((mf as Record<string, unknown>).letter || '').toUpperCase() ===
          opts.moveframeLetter!.toUpperCase()
    );
    return found && typeof found === 'object' ? (found as Record<string, unknown>) : null;
  }
  if (opts.moveframeIndex != null && opts.moveframeIndex >= 0 && opts.moveframeIndex < moveframes.length) {
    const mf = moveframes[opts.moveframeIndex];
    return mf && typeof mf === 'object' ? (mf as Record<string, unknown>) : null;
  }
  return null;
}
