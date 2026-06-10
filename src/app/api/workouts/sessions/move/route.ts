import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  mergeWorkoutIntoTarget,
  substituteExchangeWorkouts,
  substituteTransferWorkout,
  type WorkoutMoveStrategy,
} from '@/lib/workoutMoveOperations';

// POST /api/workouts/sessions/move - Move a workout session to another day
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      workoutId,
      targetDayId,
      sessionNumber,
      strategy = 'relocate',
      targetWorkoutId,
    } = body as {
      workoutId: string;
      targetDayId: string;
      sessionNumber?: number;
      strategy?: WorkoutMoveStrategy;
      targetWorkoutId?: string;
    };

    if (!workoutId || !targetDayId) {
      return NextResponse.json(
        { error: 'workoutId and targetDayId are required' },
        { status: 400 }
      );
    }

    const currentWorkout = await prisma.workoutSession.findUnique({
      where: { id: workoutId },
      select: { workoutDayId: true },
    });

    if (!currentWorkout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const targetDay = await prisma.workoutDay.findFirst({
      where: { id: targetDayId, userId: decoded.userId },
    });

    if (!targetDay) {
      return NextResponse.json({ error: 'Target day not found' }, { status: 404 });
    }

    const existingWorkouts = await prisma.workoutSession.findMany({
      where: { workoutDayId: targetDayId },
      select: { id: true, sessionNumber: true },
    });

    const otherWorkouts = existingWorkouts.filter((w) => w.id !== workoutId);
    const needsTargetWorkout = strategy !== 'relocate';

    if (needsTargetWorkout && !targetWorkoutId) {
      return NextResponse.json(
        { error: 'targetWorkoutId is required for this move strategy' },
        { status: 400 }
      );
    }

    if (targetWorkoutId && !existingWorkouts.some((w) => w.id === targetWorkoutId)) {
      return NextResponse.json(
        { error: 'Target workout not found on the selected day' },
        { status: 400 }
      );
    }

    if (strategy === 'merge' && otherWorkouts.length >= 3) {
      return NextResponse.json(
        {
          error:
            'Cannot add to an existing workout when the day already has 3 workouts. Use Substitute instead.',
        },
        { status: 400 }
      );
    }

    if (strategy === 'relocate' && currentWorkout.workoutDayId !== targetDayId) {
      if (existingWorkouts.length >= 3) {
        return NextResponse.json(
          {
            error:
              'Cannot move workout: target day already has 3 workouts. Select an existing workout and choose Add or Substitute.',
          },
          { status: 400 }
        );
      }
    }

    if (strategy === 'merge') {
      await prisma.$transaction(async (tx) => {
        await mergeWorkoutIntoTarget(tx, workoutId, targetWorkoutId!);
      });

      const target = await prisma.workoutSession.findUnique({
        where: { id: targetWorkoutId! },
        include: {
          sports: true,
          moveframes: { include: { movelaps: true, section: true } },
        },
      });

      return NextResponse.json({
        success: true,
        strategy,
        workout: target,
        message: 'Moveframes added to the selected workout',
      });
    }

    if (strategy === 'substitute_transfer') {
      await prisma.$transaction(async (tx) => {
        await substituteTransferWorkout(tx, workoutId, targetWorkoutId!);
      });

      const moved = await prisma.workoutSession.findUnique({
        where: { id: workoutId },
        include: {
          sports: true,
          moveframes: { include: { movelaps: true, section: true } },
        },
      });

      return NextResponse.json({
        success: true,
        strategy,
        workout: moved,
        message: 'Workout transferred to the selected slot',
      });
    }

    if (strategy === 'substitute_exchange') {
      await prisma.$transaction(async (tx) => {
        await substituteExchangeWorkouts(tx, workoutId, targetWorkoutId!);
      });

      const moved = await prisma.workoutSession.findUnique({
        where: { id: workoutId },
        include: {
          sports: true,
          moveframes: { include: { movelaps: true, section: true } },
        },
      });

      return NextResponse.json({
        success: true,
        strategy,
        workout: moved,
        message: 'Workouts exchanged',
      });
    }

    // Simple relocate
    let newSessionNumber = sessionNumber;
    if (!newSessionNumber) {
      newSessionNumber =
        Math.max(0, ...existingWorkouts.map((w) => w.sessionNumber)) + 1;
    }

    const movedWorkout = await prisma.workoutSession.update({
      where: { id: workoutId },
      data: {
        workoutDayId: targetDayId,
        sessionNumber: newSessionNumber,
      },
      include: {
        sports: true,
        moveframes: {
          include: {
            movelaps: true,
            section: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, strategy: 'relocate', workout: movedWorkout });
  } catch (error: unknown) {
    console.error('Error moving workout:', error);
    return NextResponse.json(
      {
        error: 'Failed to move workout',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
