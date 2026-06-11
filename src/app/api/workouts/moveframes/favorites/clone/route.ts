import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';
import { formatFavoriteMoveframe } from '@/lib/favoriteMoveframeFormat';

const moveframeInclude = {
  movelaps: { orderBy: { repetitionNumber: 'asc' as const } },
  workoutSession: {
    select: {
      id: true,
      name: true,
      sessionNumber: true,
      workoutDay: { select: { date: true, userId: true } },
    },
  },
};

/**
 * POST /api/workouts/moveframes/favorites/clone
 * Duplicate a favourite moveframe on the same workout for editing/renaming.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const moveframeId = typeof body.moveframeId === 'string' ? body.moveframeId.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!moveframeId) {
      return NextResponse.json({ error: 'moveframeId is required' }, { status: 400 });
    }

    const source = await prisma.moveframe.findFirst({
      where: {
        id: moveframeId,
        favourite: true,
        workoutSession: { workoutDay: { userId: dbUserId } },
      },
      include: { movelaps: true },
    });

    if (!source) {
      return NextResponse.json({ error: 'Favourite moveframe not found' }, { status: 404 });
    }

    const existingMoveframes = await prisma.moveframe.findMany({
      where: { workoutSessionId: source.workoutSessionId },
      select: { letter: true },
    });
    const usedLetters = new Set(existingMoveframes.map((mf) => mf.letter));
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newLetter = letters.split('').find((l) => !usedLetters.has(l)) || 'A';

    const cloned = await prisma.moveframe.create({
      data: {
        workoutSessionId: source.workoutSessionId,
        letter: newLetter,
        sport: source.sport,
        type: source.type,
        description: name || `${source.description} (copy)`,
        notes: source.notes,
        sectionId: source.sectionId,
        macroFinal: source.macroFinal,
        alarm: source.alarm,
        workType: source.workType,
        favourite: true,
        movelaps: {
          create: source.movelaps.map((lap) => ({
            repetitionNumber: lap.repetitionNumber,
            distance: lap.distance,
            speed: lap.speed,
            style: lap.style,
            pace: lap.pace,
            time: lap.time,
            reps: lap.reps,
            r1: lap.r1,
            r2: lap.r2,
            muscularSector: lap.muscularSector,
            exercise: lap.exercise,
            weight: lap.weight,
            restType: lap.restType,
            pause: lap.pause,
            macroFinal: lap.macroFinal,
            alarm: lap.alarm,
            sound: lap.sound,
            notes: lap.notes,
            status: lap.status || 'PENDING',
            isSkipped: lap.isSkipped || false,
            isDisabled: lap.isDisabled || false,
          })),
        },
      },
      include: moveframeInclude,
    });

    return NextResponse.json({
      message: 'Moveframe cloned in favourites',
      moveframe: formatFavoriteMoveframe(cloned),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error cloning favourite moveframe:', error);
    return NextResponse.json(
      { error: 'Failed to clone moveframe', details: message },
      { status: 500 }
    );
  }
}
