import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  buildWorkoutSessionCreate,
  mapPrismaWorkoutForSessionCreate,
} from '@/lib/workoutDayCopy';

async function loadYearlyDay(dayId: string, userId: string) {
  const day = await prisma.workoutDay.findUnique({
    where: { id: dayId },
    include: {
      workouts: {
        include: {
          sports: true,
          moveframes: {
            include: { movelaps: true, section: true },
          },
        },
        orderBy: { sessionNumber: 'asc' },
      },
      workoutWeek: { include: { workoutPlan: true } },
    },
  });
  if (!day || day.userId !== userId) return null;
  if (day.storageZone !== 'B') return null;
  return day;
}

/**
 * POST /api/workouts/days/relocate-planned
 * Move or exchange a Yearly Plan day onto the calendar date of a Workouts Done day.
 * Records originalPlannedDate on both Yearly Plan target day and matching Done day.
 */
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
    const { sourcePlannedDayId, targetDoneDayId, mode } = body as {
      sourcePlannedDayId?: string;
      targetDoneDayId?: string;
      mode?: 'move' | 'exchange';
    };

    if (!sourcePlannedDayId || !targetDoneDayId) {
      return NextResponse.json(
        { error: 'sourcePlannedDayId and targetDoneDayId are required' },
        { status: 400 },
      );
    }
    if (mode !== 'move' && mode !== 'exchange') {
      return NextResponse.json({ error: 'mode must be move or exchange' }, { status: 400 });
    }

    const sourceDay = await loadYearlyDay(sourcePlannedDayId, decoded.userId);
    if (!sourceDay) {
      return NextResponse.json({ error: 'Source planned day not found' }, { status: 404 });
    }

    const doneDay = await prisma.workoutDay.findUnique({
      where: { id: targetDoneDayId },
      include: {
        workoutWeek: { include: { workoutPlan: true } },
      },
    });
    if (!doneDay || doneDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Done day not found' }, { status: 404 });
    }
    if (doneDay.storageZone !== 'C') {
      return NextResponse.json({ error: 'Target must be a Workouts Done day' }, { status: 400 });
    }

    const targetDate = doneDay.date;
    const sameDate =
      new Date(sourceDay.date).toDateString() === new Date(targetDate).toDateString();
    if (sameDate) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Planned day already matches Done day date',
        targetYearlyDayId: sourceDay.id,
      });
    }

    // Find or create Yearly Plan day on the Done calendar date
    let targetYearlyDay = await prisma.workoutDay.findUnique({
      where: {
        userId_date_storageZone: {
          userId: decoded.userId,
          date: targetDate,
          storageZone: 'B',
        },
      },
      include: {
        workouts: {
          include: {
            sports: true,
            moveframes: { include: { movelaps: true, section: true } },
          },
          orderBy: { sessionNumber: 'asc' },
        },
      },
    });

    if (!targetYearlyDay) {
      // Create empty yearly day under same week structure as Done date
      const yearlyPlan = await prisma.workoutPlan.findFirst({
        where: { userId: decoded.userId, type: 'YEARLY_PLAN' },
        include: { weeks: true },
      });
      if (!yearlyPlan) {
        return NextResponse.json({ error: 'Yearly Plan not found' }, { status: 404 });
      }
      const planStart = new Date(yearlyPlan.startDate);
      const diffDays = Math.floor(
        (new Date(targetDate).getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);
      let week = yearlyPlan.weeks.find((w) => w.weekNumber === weekNumber);
      if (!week) {
        week = await prisma.workoutWeek.create({
          data: { workoutPlanId: yearlyPlan.id, weekNumber },
        });
      }
      const dow = new Date(targetDate).getUTCDay();
      const dayOfWeek = dow === 0 ? 7 : dow;
      targetYearlyDay = await prisma.workoutDay.create({
        data: {
          workoutWeekId: week.id,
          userId: decoded.userId,
          date: targetDate,
          weekNumber,
          dayOfWeek,
          periodId: sourceDay.periodId,
          storageZone: 'B',
        },
        include: {
          workouts: {
            include: {
              sports: true,
              moveframes: { include: { movelaps: true, section: true } },
            },
            orderBy: { sessionNumber: 'asc' },
          },
        },
      });
    }

    if (targetYearlyDay.id === sourceDay.id) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Already on target day',
        targetYearlyDayId: sourceDay.id,
      });
    }

    const originalDate = sourceDay.date;

    await prisma.$transaction(async (tx) => {
      const sourceSnapshot = sourceDay.workouts.map(mapPrismaWorkoutForSessionCreate);
      const targetSnapshot = targetYearlyDay!.workouts.map(mapPrismaWorkoutForSessionCreate);

      // Clear both days' workouts
      await tx.workoutSession.deleteMany({ where: { workoutDayId: sourceDay.id } });
      await tx.workoutSession.deleteMany({ where: { workoutDayId: targetYearlyDay!.id } });

      // Place source workouts onto target (Done date)
      for (const workout of sourceSnapshot) {
        await tx.workoutSession.create({
          data: {
            workoutDayId: targetYearlyDay!.id,
            ...buildWorkoutSessionCreate(workout),
          },
        });
      }

      if (mode === 'exchange') {
        // Put former target workouts onto the original planned date
        for (const workout of targetSnapshot) {
          await tx.workoutSession.create({
            data: {
              workoutDayId: sourceDay.id,
              ...buildWorkoutSessionCreate(workout),
            },
          });
        }
      }
      // mode === 'move': source day left empty

      await tx.workoutDay.update({
        where: { id: targetYearlyDay!.id },
        data: { originalPlannedDate: originalDate },
      });

      await tx.workoutDay.update({
        where: { id: doneDay.id },
        data: { originalPlannedDate: originalDate },
      });
    });

    return NextResponse.json({
      success: true,
      mode,
      originalPlannedDate: originalDate,
      targetYearlyDayId: targetYearlyDay.id,
      sourcePlannedDayId: sourceDay.id,
    });
  } catch (error) {
    console.error('relocate-planned error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to relocate planned workouts',
      },
      { status: 500 },
    );
  }
}
