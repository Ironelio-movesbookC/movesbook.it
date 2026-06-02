import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { applyFavoriteSnapshotToTargetWeek } from '@/lib/workoutWeekTransfer';

const weekInclude = {
  days: {
    orderBy: { dayOfWeek: 'asc' as const },
    include: {
      workouts: {
        include: {
          sports: true,
          moveframes: { include: { movelaps: true } },
        },
      },
    },
  },
};

/**
 * POST /api/workouts/plans/favorites/apply
 * Copy a saved favourite week into one or more yearly-plan weeks (replaces target content).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { favoriteId, targetWeekIds } = await req.json();

    if (!favoriteId || !Array.isArray(targetWeekIds) || targetWeekIds.length === 0) {
      return NextResponse.json(
        { error: 'favoriteId and targetWeekIds[] are required' },
        { status: 400 }
      );
    }

    const favorite = await prisma.favoriteWeeklyPlan.findFirst({
      where: { id: favoriteId, userId: decoded.userId },
    });

    if (!favorite) {
      return NextResponse.json({ error: 'Favourite week not found' }, { status: 404 });
    }

    let planData: any;
    try {
      planData = JSON.parse(favorite.planData);
    } catch {
      return NextResponse.json({ error: 'Corrupted favourite data' }, { status: 400 });
    }

    const snapshotWeek = planData?.weeks?.[0];
    if (!snapshotWeek?.days?.length) {
      return NextResponse.json(
        { error: 'This favourite has no week content to apply' },
        { status: 400 }
      );
    }

    const applied: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const targetWeekId of targetWeekIds) {
        const targetWeek = await tx.workoutWeek.findFirst({
          where: {
            id: targetWeekId,
            workoutPlan: { userId: decoded.userId, type: 'YEARLY_PLAN' },
          },
          include: weekInclude,
        });

        if (!targetWeek) {
          throw new Error(`Target week not found: ${targetWeekId}`);
        }

        await applyFavoriteSnapshotToTargetWeek(
          tx,
          snapshotWeek,
          targetWeek,
          decoded.userId
        );
        applied.push(targetWeekId);
      }

      await tx.favoriteWeeklyPlan.update({
        where: { id: favoriteId },
        data: { updatedAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Applied to ${applied.length} week(s)`,
      appliedWeekIds: applied,
    });
  } catch (error: unknown) {
    console.error('Error applying favourite week:', error);
    return NextResponse.json(
      {
        error: 'Failed to apply favourite week',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
