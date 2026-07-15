import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  isManualDoneStatus,
  isYearlyWorkoutStatus,
  type YearlyWorkoutStatus,
} from '@/utils/workoutSessionStatus';

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
}

/**
 * PATCH /api/workouts/days/[id]/match-done
 * Set Match Done color for all planned workouts on a Workouts Done day,
 * and sync the same statuses onto the Yearly Plan day for that calendar date.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const params = context.params instanceof Promise ? await context.params : context.params;

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
    const status = body?.status as string | undefined;

    if (!isYearlyWorkoutStatus(status) || !isManualDoneStatus(status as YearlyWorkoutStatus)) {
      return NextResponse.json(
        { error: 'status must be a Match Done color (greens/blues)' },
        { status: 400 },
      );
    }

    const doneStatus = status as YearlyWorkoutStatus;

    const doneDay = await prisma.workoutDay.findUnique({
      where: { id: params.id },
      include: {
        workouts: {
          select: { id: true, status: true, moveframes: { select: { id: true } } },
        },
        workoutWeek: { include: { workoutPlan: true } },
      },
    });

    if (!doneDay || doneDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    if (
      doneDay.storageZone !== 'C' ||
      doneDay.workoutWeek.workoutPlan.type !== 'WORKOUTS_DONE'
    ) {
      return NextResponse.json(
        { error: 'Match Done colors can only be set from Workouts Done' },
        { status: 400 },
      );
    }

    const plannedWorkoutIds = doneDay.workouts
      .filter((w) => w.moveframes.length > 0)
      .map((w) => w.id);

    if (plannedWorkoutIds.length === 0) {
      return NextResponse.json(
        { error: 'No planned workouts on this day to color' },
        { status: 400 },
      );
    }

    await prisma.workoutSession.updateMany({
      where: { id: { in: plannedWorkoutIds } },
      data: { status: doneStatus as any },
    });

    // Sync onto Yearly Plan day for the same calendar date (always).
    // If originalPlannedDate is set (shifted), prefer that planned day.
    const yearlyPlan = await prisma.workoutPlan.findFirst({
      where: { userId: decoded.userId, type: 'YEARLY_PLAN' },
      select: { id: true },
    });

    let yearlyUpdated = 0;
    if (yearlyPlan) {
      const preferDate = doneDay.originalPlannedDate
        ? startOfUtcDay(new Date(doneDay.originalPlannedDate))
        : startOfUtcDay(new Date(doneDay.date));

      const yearlyDay =
        (await prisma.workoutDay.findFirst({
          where: {
            userId: decoded.userId,
            date: preferDate,
            storageZone: 'B',
            workoutWeek: { workoutPlanId: yearlyPlan.id },
          },
          include: {
            workouts: {
              select: { id: true, moveframes: { select: { id: true } } },
            },
          },
        })) ||
        (preferDate.getTime() !== startOfUtcDay(new Date(doneDay.date)).getTime()
          ? await prisma.workoutDay.findFirst({
              where: {
                userId: decoded.userId,
                date: startOfUtcDay(new Date(doneDay.date)),
                storageZone: 'B',
                workoutWeek: { workoutPlanId: yearlyPlan.id },
              },
              include: {
                workouts: {
                  select: { id: true, moveframes: { select: { id: true } } },
                },
              },
            })
          : null);

      if (yearlyDay) {
        const yearlyIds = yearlyDay.workouts
          .filter((w) => w.moveframes.length > 0)
          .map((w) => w.id);
        if (yearlyIds.length > 0) {
          const result = await prisma.workoutSession.updateMany({
            where: { id: { in: yearlyIds } },
            data: { status: doneStatus as any },
          });
          yearlyUpdated = result.count;
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: doneStatus,
      updatedDoneWorkouts: plannedWorkoutIds.length,
      updatedYearlyWorkouts: yearlyUpdated,
    });
  } catch (error) {
    console.error('Error setting Match Done color:', error);
    return NextResponse.json({ error: 'Failed to set Match Done color' }, { status: 500 });
  }
}
