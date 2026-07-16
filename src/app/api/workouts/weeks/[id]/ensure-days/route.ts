import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';

/**
 * POST /api/workouts/weeks/[id]/ensure-days
 * Create Mon–Sun day slots for a yearly-plan week that has none.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id: weekId } = await params;

    const week = await prisma.workoutWeek.findUnique({
      where: { id: weekId },
      include: {
        workoutPlan: { select: { id: true, userId: true, type: true, startDate: true } },
        days: { select: { id: true } },
      },
    });

    if (!week?.workoutPlan) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    if (week.workoutPlan.userId !== dbUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (week.workoutPlan.type !== 'YEARLY_PLAN') {
      return NextResponse.json(
        { error: 'Day repair is only available for Yearly Plan weeks' },
        { status: 400 }
      );
    }

    if (!week.workoutPlan.startDate) {
      return NextResponse.json(
        { error: 'Yearly plan has no start date. Use Set Start Date first.' },
        { status: 400 }
      );
    }

    let defaultPeriod = await prisma.period.findFirst({
      where: { userId: dbUserId },
    });

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

    const startDate = new Date(week.workoutPlan.startDate);
    startDate.setHours(0, 0, 0, 0);

    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(weekStartDate.getDate() + (week.weekNumber - 1) * 7);

    let createdCount = 0;
    let linkedCount = 0;

    for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(weekStartDate.getDate() + (dayOfWeek - 1));
      dayDate.setHours(0, 0, 0, 0);

      const existing = await prisma.workoutDay.findUnique({
        where: {
          userId_date_storageZone: {
            userId: dbUserId,
            date: dayDate,
            storageZone: 'B',
          },
        },
      });

      if (existing) {
        if (existing.workoutWeekId !== week.id) {
          await prisma.workoutDay.update({
            where: { id: existing.id },
            data: {
              workoutWeekId: week.id,
              weekNumber: week.weekNumber,
              dayOfWeek,
            },
          });
          linkedCount++;
        }
        continue;
      }

      await prisma.workoutDay.create({
        data: {
          workoutWeekId: week.id,
          userId: dbUserId,
          dayOfWeek,
          weekNumber: week.weekNumber,
          date: dayDate,
          periodId: defaultPeriod.id,
          storageZone: 'B',
          weather: '',
          feelingStatus: '5',
          notes: '',
        },
      });
      createdCount++;
    }

    const updatedWeek = await prisma.workoutWeek.findUnique({
      where: { id: weekId },
      include: {
        period: true,
        days: {
          where: { storageZone: 'B' },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      week: updatedWeek,
      createdCount,
      linkedCount,
      message:
        createdCount + linkedCount > 0
          ? `Week ${week.weekNumber}: ${createdCount} day(s) created, ${linkedCount} re-linked.`
          : `Week ${week.weekNumber} already has all 7 days.`,
    });
  } catch (error) {
    console.error('POST /api/workouts/weeks/[id]/ensure-days failed:', error);
    return NextResponse.json(
      { error: 'Failed to create days for this week', details: (error as Error).message },
      { status: 500 }
    );
  }
}
