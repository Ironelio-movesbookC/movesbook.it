import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  buildWorkoutSessionCreate,
  mapPrismaWorkoutForSessionCreate,
} from '@/lib/workoutDayCopy';

function sameCalendarDay(a: Date | string, b: Date | string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

async function loadDayTree(dayId: string, userId: string, zone: 'B' | 'C') {
  const day = await prisma.workoutDay.findUnique({
    where: { id: dayId },
    include: {
      workouts: {
        include: {
          sports: true,
          moveframes: {
            include: { movelaps: true, section: true },
            orderBy: { letter: 'asc' },
          },
        },
        orderBy: { sessionNumber: 'asc' },
      },
      workoutWeek: { include: { workoutPlan: true } },
    },
  });
  if (!day || day.userId !== userId) return null;
  if (day.storageZone !== zone) return null;
  return day;
}

/**
 * POST /api/workouts/days/apply-done-to-planned
 *
 * Reverse of Yearly → Done: apply Workouts Done onto Yearly Plan for the selected planned day.
 *
 * CASE 1 — same calendar date: copy Done workouts into that Yearly Plan day (overwrite).
 * CASE 2 — different dates: relocate Yearly Plan per mode (move overwrite OR exchange),
 *          then copy Done workouts onto the Yearly Plan day at the Done date.
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
    const {
      plannedDayId,
      doneDayId,
      mode,
      sourceWorkoutId,
    } = body as {
      plannedDayId?: string;
      doneDayId?: string;
      mode?: 'move' | 'exchange';
      /** Optional: apply only one Done workout session instead of the whole day */
      sourceWorkoutId?: string;
    };

    if (!plannedDayId || !doneDayId) {
      return NextResponse.json(
        { error: 'plannedDayId and doneDayId are required' },
        { status: 400 },
      );
    }

    const plannedDay = await loadDayTree(plannedDayId, decoded.userId, 'B');
    if (!plannedDay) {
      return NextResponse.json({ error: 'Yearly Plan day not found' }, { status: 404 });
    }

    const doneDay = await loadDayTree(doneDayId, decoded.userId, 'C');
    if (!doneDay) {
      return NextResponse.json({ error: 'Workouts Done day not found' }, { status: 404 });
    }

    const datesDiffer = !sameCalendarDay(plannedDay.date, doneDay.date);
    if (datesDiffer && mode !== 'move' && mode !== 'exchange') {
      return NextResponse.json(
        {
          error: 'mode must be move or exchange when Planned and Done dates differ',
          requiresRelocate: true,
        },
        { status: 400 },
      );
    }

    let targetYearlyDayId = plannedDay.id;
    let originalPlannedDate: Date | null = null;

    if (datesDiffer) {
      // Relocate Yearly Plan so it aligns with the Done calendar date
      let targetYearlyDay = await prisma.workoutDay.findUnique({
        where: {
          userId_date_storageZone: {
            userId: decoded.userId,
            date: doneDay.date,
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
        const yearlyPlan = await prisma.workoutPlan.findFirst({
          where: { userId: decoded.userId, type: 'YEARLY_PLAN' },
          include: { weeks: true },
        });
        if (!yearlyPlan) {
          return NextResponse.json({ error: 'Yearly Plan not found' }, { status: 404 });
        }
        const planStart = new Date(yearlyPlan.startDate);
        const diffDays = Math.floor(
          (new Date(doneDay.date).getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24),
        );
        const weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);
        let week = yearlyPlan.weeks.find((w) => w.weekNumber === weekNumber);
        if (!week) {
          week = await prisma.workoutWeek.create({
            data: { workoutPlanId: yearlyPlan.id, weekNumber },
          });
        }
        const dow = new Date(doneDay.date).getUTCDay();
        const dayOfWeek = dow === 0 ? 7 : dow;
        targetYearlyDay = await prisma.workoutDay.create({
          data: {
            workoutWeekId: week.id,
            userId: decoded.userId,
            date: doneDay.date,
            weekNumber,
            dayOfWeek,
            periodId: plannedDay.periodId,
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

      originalPlannedDate = plannedDay.date;

      await prisma.$transaction(async (tx) => {
        const sourceSnapshot = plannedDay.workouts.map(mapPrismaWorkoutForSessionCreate);
        const targetSnapshot = targetYearlyDay!.workouts.map(mapPrismaWorkoutForSessionCreate);

        await tx.workoutSession.deleteMany({ where: { workoutDayId: plannedDay.id } });
        await tx.workoutSession.deleteMany({ where: { workoutDayId: targetYearlyDay!.id } });

        for (const workout of sourceSnapshot) {
          await tx.workoutSession.create({
            data: {
              workoutDayId: targetYearlyDay!.id,
              ...buildWorkoutSessionCreate(workout),
            },
          });
        }

        if (mode === 'exchange') {
          for (const workout of targetSnapshot) {
            await tx.workoutSession.create({
              data: {
                workoutDayId: plannedDay.id,
                ...buildWorkoutSessionCreate(workout),
              },
            });
          }
        }

        await tx.workoutDay.update({
          where: { id: targetYearlyDay!.id },
          data: { originalPlannedDate },
        });
        await tx.workoutDay.update({
          where: { id: doneDay.id },
          data: { originalPlannedDate },
        });
      });

      targetYearlyDayId = targetYearlyDay.id;
    }

    // Copy Done workout(s) onto the (aligned) Yearly Plan day — overwrite matching sessions
    const doneWorkouts = sourceWorkoutId
      ? doneDay.workouts.filter((w) => w.id === sourceWorkoutId)
      : doneDay.workouts.filter((w) => w.moveframes.length > 0);

    if (!doneWorkouts.length) {
      return NextResponse.json(
        { error: 'No Done workouts with moveframes to apply' },
        { status: 400 },
      );
    }

    const snapshots = doneWorkouts.map(mapPrismaWorkoutForSessionCreate);

    await prisma.$transaction(async (tx) => {
      for (const snapshot of snapshots) {
        await tx.workoutSession.deleteMany({
          where: {
            workoutDayId: targetYearlyDayId,
            sessionNumber: snapshot.sessionNumber,
          },
        });
        await tx.workoutSession.create({
          data: {
            workoutDayId: targetYearlyDayId,
            ...buildWorkoutSessionCreate(snapshot),
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      case: datesDiffer ? 2 : 1,
      mode: datesDiffer ? mode : null,
      originalPlannedDate,
      targetYearlyDayId,
      appliedWorkouts: snapshots.length,
    });
  } catch (error) {
    console.error('apply-done-to-planned error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to apply Done workouts to Yearly Plan',
      },
      { status: 500 },
    );
  }
}
