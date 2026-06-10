import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** POST /api/workouts/archive/weeks — append a new week (7 days) to the archive plan */
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

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    let plan = await prisma.workoutPlan.findFirst({
      where: { userId: dbUserId, type: 'ARCHIVE' },
      include: { weeks: { select: { weekNumber: true }, orderBy: { weekNumber: 'desc' }, take: 1 } },
    });

    if (!plan) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(today);
      startDate.setFullYear(startDate.getFullYear() - 2);
      const endDate = new Date(today);
      endDate.setFullYear(endDate.getFullYear() + 1);

      plan = await prisma.workoutPlan.create({
        data: {
          userId: dbUserId,
          name: 'Archive',
          type: 'ARCHIVE',
          startDate,
          endDate,
        },
        include: { weeks: { select: { weekNumber: true } } },
      });
    }

    const nextWeekNumber = (plan.weeks[0]?.weekNumber ?? 0) + 1;

    // Each archive week needs distinct calendar dates (unique on userId + date + storageZone D).
    const latestArchiveDay = await prisma.workoutDay.findFirst({
      where: { userId: dbUserId, storageZone: 'D' },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    const weekStartDate = latestArchiveDay
      ? (() => {
          const next = getMondayOfWeek(new Date(latestArchiveDay.date));
          next.setDate(next.getDate() + 7);
          return next;
        })()
      : getMondayOfWeek(new Date());

    let defaultPeriod = await prisma.period.findFirst({ where: { userId: dbUserId } });
    if (!defaultPeriod) {
      defaultPeriod = await prisma.period.create({
        data: {
          userId: dbUserId,
          name: 'Base Period',
          description: 'Default training period',
          color: '#3b82f6',
        },
      });
    }

    const week = await prisma.workoutWeek.create({
      data: {
        workoutPlanId: plan.id,
        weekNumber: nextWeekNumber,
      },
    });

    const days = [];
    for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(weekStartDate.getDate() + (dayOfWeek - 1));

      const day = await prisma.workoutDay.create({
        data: {
          userId: dbUserId,
          workoutWeekId: week.id,
          dayOfWeek,
          weekNumber: nextWeekNumber,
          date: dayDate,
          periodId: defaultPeriod.id,
          storageZone: 'D',
          weather: '',
          feelingStatus: '5',
          notes: '',
        },
      });
      days.push(day);
    }

    return NextResponse.json({
      success: true,
      week: { ...week, days, period: defaultPeriod },
    });
  } catch (error: unknown) {
    console.error('Error creating archive week:', error);
    return NextResponse.json(
      {
        error: 'Failed to create archive week',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
