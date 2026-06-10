import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/workouts/days/[id]/clear
 * Removes all workouts (and nested moveframes/movelaps) but keeps the day slot.
 * Used for template plans where day rows must stay stable for copy/paste and week copy.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dayId = params.id;
    const existingDay = await prisma.workoutDay.findUnique({
      where: { id: dayId },
      select: { id: true, userId: true },
    });

    if (!existingDay) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    if (existingDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      const workouts = await tx.workoutSession.findMany({
        where: { workoutDayId: dayId },
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

      await tx.workoutSession.deleteMany({ where: { workoutDayId: dayId } });
    });

    const day = await prisma.workoutDay.findUnique({
      where: { id: dayId },
      include: {
        period: true,
        workouts: {
          include: {
            sports: true,
            moveframes: { include: { movelaps: true, section: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, day });
  } catch (error: unknown) {
    console.error('Error clearing workout day:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear workout day',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
