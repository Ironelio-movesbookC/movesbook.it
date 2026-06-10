import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { clearWeekWorkouts, copyWeekContentToTarget } from '@/lib/workoutWeekTransfer';

const weekInclude = {
  days: {
    orderBy: { dayOfWeek: 'asc' as const },
    include: {
      workouts: {
        orderBy: { sessionNumber: 'asc' as const },
        include: {
          sports: true,
          moveframes: {
            include: {
              movelaps: true,
            },
          },
        },
      },
    },
  },
};

/**
 * POST /api/workouts/weeks/move
 * Move week content: copy to target (by dayOfWeek) then clear source week.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { sourceWeekId, targetWeekId } = body;

    if (!sourceWeekId || !targetWeekId) {
      return NextResponse.json(
        { error: 'Source and target week IDs are required' },
        { status: 400 }
      );
    }

    if (sourceWeekId === targetWeekId) {
      return NextResponse.json(
        { error: 'Cannot move a week onto itself' },
        { status: 400 }
      );
    }

    const sourceWeek = await prisma.workoutWeek.findFirst({
      where: {
        id: sourceWeekId,
        workoutPlan: { userId: decoded.userId },
      },
      include: weekInclude,
    });

    if (!sourceWeek) {
      return NextResponse.json({ error: 'Source week not found' }, { status: 404 });
    }

    const targetWeek = await prisma.workoutWeek.findFirst({
      where: {
        id: targetWeekId,
        workoutPlan: { userId: decoded.userId },
      },
      include: weekInclude,
    });

    if (!targetWeek) {
      return NextResponse.json({ error: 'Target week not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await clearWeekWorkouts(tx, targetWeek);
      await copyWeekContentToTarget(tx, sourceWeek, targetWeek, decoded.userId);
      await clearWeekWorkouts(tx, sourceWeek);
    });

    return NextResponse.json({
      success: true,
      message: `Week ${sourceWeek.weekNumber} moved to week ${targetWeek.weekNumber}`,
    });
  } catch (error: unknown) {
    console.error('Error moving week:', error);
    return NextResponse.json(
      {
        error: 'Failed to move week',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
