import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  buildWorkoutSessionCreate,
  isSameCalendarDay,
  mapPrismaWorkoutForSessionCreate,
} from '@/lib/workoutDayCopy';

type SourceDayWithTree = Awaited<ReturnType<typeof loadSourceDay>>;

async function loadSourceDay(sourceDayId: string) {
  return prisma.workoutDay.findUnique({
    where: { id: sourceDayId },
    include: {
      workouts: {
        include: {
          sports: true,
          moveframes: {
            include: {
              movelaps: true,
              section: true,
            },
          },
        },
      },
      period: true,
    },
  });
}

async function replaceTargetDayWorkouts(
  targetDayId: string,
  sourceDay: NonNullable<SourceDayWithTree>
) {
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
  });
}

// POST /api/workouts/days/copy - Copy a day to another slot (template) or date (yearly)
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

    const sourceDay = await loadSourceDay(sourceDayId);
    if (!sourceDay) {
      return NextResponse.json({ error: 'Source day not found' }, { status: 404 });
    }

    if (sourceDayId === targetDayId) {
      return NextResponse.json({ error: 'Cannot copy a day onto itself' }, { status: 400 });
    }

    // Template plan: copy workouts into an existing day slot (week + dayOfWeek)
    if (targetDayId) {
      const targetDay = await prisma.workoutDay.findFirst({
        where: {
          id: targetDayId,
          userId: decoded.userId,
        },
        include: {
          workoutWeek: { include: { workoutPlan: { select: { type: true } } } },
        },
      });

      if (!targetDay) {
        return NextResponse.json({ error: 'Target day not found' }, { status: 404 });
      }

      await replaceTargetDayWorkouts(targetDayId, sourceDay);

      const updated = await prisma.workoutDay.findUnique({
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

      return NextResponse.json({ success: true, day: updated }, { status: 200 });
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

    if (!targetWeek?.workoutPlan) {
      return NextResponse.json({ error: 'Target week not found' }, { status: 404 });
    }

    const targetDateObj = new Date(targetDate);

    // Yearly plan: each date already has a day row (often with zero workouts) — replace in place
    if (targetWeek.workoutPlan.type !== 'TEMPLATE_WEEKS') {
      const weekDays = await prisma.workoutDay.findMany({
        where: {
          userId: decoded.userId,
          workoutWeekId: targetWeekId,
        },
      });

      const targetDayInWeek = weekDays.find((d) =>
        isSameCalendarDay(d.date, targetDateObj)
      );

      if (targetDayInWeek) {
        if (targetDayInWeek.id === sourceDayId) {
          return NextResponse.json(
            { error: 'Cannot copy a day onto itself' },
            { status: 400 }
          );
        }

        await replaceTargetDayWorkouts(targetDayInWeek.id, sourceDay);

        const updated = await prisma.workoutDay.findUnique({
          where: { id: targetDayInWeek.id },
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

        return NextResponse.json({ success: true, day: updated }, { status: 200 });
      }
    }

    let storageZone: 'A' | 'B' | 'C' | 'D' = sourceDay.storageZone || 'B';
    if (targetWeek.workoutPlan.type === 'TEMPLATE_WEEKS') storageZone = 'A';
    else if (targetWeek.workoutPlan.type === 'YEARLY_PLAN') storageZone = 'B';
    else if (targetWeek.workoutPlan.type === 'WORKOUTS_DONE') storageZone = 'C';
    else if (targetWeek.workoutPlan.type === 'ARCHIVE') storageZone = 'D';

    const newDay = await prisma.workoutDay.create({
      data: {
        userId: decoded.userId,
        workoutWeekId: targetWeekId,
        date: new Date(targetDate),
        weekNumber: sourceDay.weekNumber,
        dayOfWeek: sourceDay.dayOfWeek,
        periodId: sourceDay.periodId,
        storageZone,
        weather: sourceDay.weather,
        feelingStatus: sourceDay.feelingStatus,
        notes: sourceDay.notes
          ? `${sourceDay.notes} (Copied)`
          : '(Copied)',
        workouts: {
          create: sourceDay.workouts.map((workout) =>
            buildWorkoutSessionCreate(mapPrismaWorkoutForSessionCreate(workout))
          ),
        },
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

    return NextResponse.json({ success: true, day: newDay }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error copying day:', error);
    return NextResponse.json(
      {
        error: 'Failed to copy day',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
