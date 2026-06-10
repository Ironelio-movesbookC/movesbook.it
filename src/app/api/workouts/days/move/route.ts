import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  buildWorkoutSessionCreate,
  mapPrismaWorkoutForSessionCreate,
} from '@/lib/workoutDayCopy';

// POST /api/workouts/days/move - Move day workouts to another slot (template) or date
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { sourceDayId, targetDate, targetWeekId, targetDayId } = body;

    if (!sourceDayId) {
      return NextResponse.json({ error: 'sourceDayId is required' }, { status: 400 });
    }

    if (sourceDayId === targetDayId) {
      return NextResponse.json({ error: 'Cannot move a day onto itself' }, { status: 400 });
    }

    const sourceDay = await prisma.workoutDay.findUnique({
      where: { id: sourceDayId },
      include: {
        workouts: {
          include: {
            sports: true,
            moveframes: { include: { movelaps: true, section: true } },
          },
        },
      },
    });

    if (!sourceDay) {
      return NextResponse.json({ error: 'Source day not found' }, { status: 404 });
    }

    if (targetDayId) {
      const targetDay = await prisma.workoutDay.findFirst({
        where: { id: targetDayId, userId: decoded.userId },
      });

      if (!targetDay) {
        return NextResponse.json({ error: 'Target day not found' }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.workoutSession.deleteMany({ where: { workoutDayId: targetDayId } });
        for (const workout of sourceDay.workouts) {
          await tx.workoutSession.create({
            data: {
              workoutDayId: targetDayId,
              ...buildWorkoutSessionCreate(mapPrismaWorkoutForSessionCreate(workout)),
            },
          });
        }
        await tx.workoutSession.deleteMany({ where: { workoutDayId: sourceDayId } });
      });

      const moved = await prisma.workoutDay.findUnique({
        where: { id: targetDayId },
        include: {
          workouts: {
            include: {
              sports: true,
              moveframes: { include: { movelaps: true, section: true } },
            },
          },
          period: true,
        },
      });

      return NextResponse.json({ success: true, day: moved });
    }

    if (!targetDate || !targetWeekId) {
      return NextResponse.json(
        { error: 'targetDate and targetWeekId are required when targetDayId is omitted' },
        { status: 400 }
      );
    }

    const targetWeek = await prisma.workoutWeek.findUnique({
      where: { id: targetWeekId },
      include: { workoutPlan: { select: { type: true } } },
    });

    if (targetWeek?.workoutPlan?.type !== 'TEMPLATE_WEEKS') {
      const existingDay = await prisma.workoutDay.findFirst({
        where: {
          userId: decoded.userId,
          date: new Date(targetDate),
          id: { not: sourceDayId },
        },
      });

      if (existingDay) {
        return NextResponse.json(
          { error: 'A workout day already exists on this date' },
          { status: 409 }
        );
      }
    }

    const movedDay = await prisma.workoutDay.update({
      where: { id: sourceDayId },
      data: {
        date: new Date(targetDate),
        workoutWeekId: targetWeekId,
      },
      include: {
        workouts: {
          include: {
            sports: true,
            moveframes: { include: { movelaps: true, section: true } },
          },
        },
        period: true,
      },
    });

    return NextResponse.json({ success: true, day: movedDay });
  } catch (error: unknown) {
    console.error('Error moving day:', error);
    return NextResponse.json(
      {
        error: 'Failed to move day',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
