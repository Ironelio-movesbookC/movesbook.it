import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  buildFavoriteSessionCreateData,
  parseFavoriteMainSport,
  parseFavoriteWorkoutData,
} from '@/lib/favoriteWorkoutApply';

/**
 * POST /api/workouts/favorites/apply
 * Copy a favourite workout snapshot onto a yearly-plan day.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { favoriteId, dayId } = await req.json();
    if (!favoriteId || !dayId) {
      return NextResponse.json(
        { error: 'favoriteId and dayId are required' },
        { status: 400 }
      );
    }

    const favorite = await prisma.favoriteWorkout.findFirst({
      where: { id: favoriteId, userId: decoded.userId },
    });

    if (!favorite?.workoutData) {
      return NextResponse.json({ error: 'Favourite workout not found' }, { status: 404 });
    }

    const parsed = parseFavoriteWorkoutData(favorite.workoutData);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Favourite workout data is invalid or corrupted' },
        { status: 400 }
      );
    }

    const workoutDay = await prisma.workoutDay.findFirst({
      where: { id: dayId, userId: decoded.userId },
      include: {
        workoutWeek: { include: { workoutPlan: true } },
      },
    });

    if (!workoutDay) {
      return NextResponse.json({ error: 'Target day not found' }, { status: 404 });
    }

    const existingCount = await prisma.workoutSession.count({
      where: { workoutDayId: dayId },
    });

    if (existingCount >= 3) {
      return NextResponse.json(
        { error: 'Maximum 3 workouts per day allowed' },
        { status: 400 }
      );
    }

    const lastSession = await prisma.workoutSession.findFirst({
      where: { workoutDayId: dayId },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true },
    });

    const sessionNumber = (lastSession?.sessionNumber ?? 0) + 1;

    let defaultSection = await prisma.workoutSection.findFirst({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!defaultSection) {
      defaultSection = await prisma.workoutSection.create({
        data: {
          userId: decoded.userId,
          name: 'Default',
          code: 'DEF',
          description: 'Default section',
          color: '#3B82F6',
        },
      });
    }

    const session = await prisma.workoutSession.create({
      data: {
        workoutDayId: dayId,
        mainSport: parseFavoriteMainSport(parsed.workout.mainSport),
        mainGoal: parsed.workout.mainGoal ?? null,
        intensity: parsed.workout.intensity ?? 'Medium',
        tags: parsed.workout.tags ?? null,
        ...buildFavoriteSessionCreateData(parsed, sessionNumber, defaultSection.id),
      },
      include: {
        sports: true,
        moveframes: {
          include: {
            movelaps: { orderBy: { repetitionNumber: 'asc' } },
            section: true,
          },
          orderBy: { letter: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      session,
      moveframesCopied: session.moveframes?.length ?? 0,
      movelapsCopied: session.moveframes?.reduce(
        (n, mf) => n + (mf.movelaps?.length ?? 0),
        0
      ),
    });
  } catch (error: unknown) {
    console.error('Error applying favourite workout:', error);
    return NextResponse.json(
      {
        error: 'Failed to add favourite workout to planner',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
