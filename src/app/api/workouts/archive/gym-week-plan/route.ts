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

/** POST /api/workouts/archive/gym-week-plan — store gym week as archive weekly plan (Day 1, Day 2, …). */
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

    const body = await request.json();
    const plan = body?.plan;
    const goals = Array.isArray(body?.goals) ? body.goals : [];
    const metadata = body?.metadata;

    if (!plan?.days?.length) {
      return NextResponse.json({ error: 'Invalid gym week plan' }, { status: 400 });
    }

    if (!metadata?.code?.trim() || !metadata?.title?.trim()) {
      return NextResponse.json({ error: 'Code and title are required' }, { status: 400 });
    }

    if (!metadata?.periodId) {
      return NextResponse.json({ error: 'Period is required' }, { status: 400 });
    }

    if (!metadata?.expirationDate) {
      return NextResponse.json({ error: 'Expiring date is required' }, { status: 400 });
    }

    const expDate = new Date(metadata.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(expDate.getTime()) || expDate <= today) {
      return NextResponse.json({ error: 'Expiring date must be in the future' }, { status: 400 });
    }

    let archivePlan = await prisma.workoutPlan.findFirst({
      where: { userId: dbUserId, type: 'ARCHIVE' },
      include: { weeks: { select: { weekNumber: true }, orderBy: { weekNumber: 'desc' }, take: 1 } },
    });

    if (!archivePlan) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(today);
      startDate.setFullYear(startDate.getFullYear() - 2);
      const endDate = new Date(today);
      endDate.setFullYear(endDate.getFullYear() + 1);

      archivePlan = await prisma.workoutPlan.create({
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

    const nextWeekNumber = (archivePlan.weeks[0]?.weekNumber ?? 0) + 1;

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

    let defaultPeriod = await prisma.period.findFirst({
      where: { userId: dbUserId, id: metadata.periodId },
    });
    if (!defaultPeriod) {
      defaultPeriod = await prisma.period.findFirst({ where: { userId: dbUserId } });
    }
    if (!defaultPeriod) {
      defaultPeriod = await prisma.period.create({
        data: {
          userId: dbUserId,
          name: metadata.periodName?.trim() || 'Base Period',
          description: 'Default training period',
          color: '#3b82f6',
        },
      });
    }

    const savedAt = new Date().toISOString();
    const planPayload = JSON.stringify({
      type: 'gym_week_plan',
      plan,
      goals,
      savedAt,
      metadata: {
        ...metadata,
        workoutCount: plan.days.length,
        createdAt: metadata.createdAt ?? savedAt,
      },
    });

    const week = await prisma.workoutWeek.create({
      data: {
        workoutPlanId: archivePlan.id,
        weekNumber: nextWeekNumber,
        notes: planPayload,
        periodId: defaultPeriod.id,
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

    for (let i = 0; i < plan.days.length; i++) {
      const routine = plan.days[i];
      const day = days[i];
      if (!day) break;

      await prisma.workoutSession.create({
        data: {
          workoutDayId: day.id,
          sessionNumber: 1,
          name: routine.routineName?.trim() || `Day ${i + 1}`,
          code: metadata.code?.trim() || `GW${i + 1}`,
          time: '',
          notes: JSON.stringify({
            type: 'gym_week_routine',
            routineDayIndex: i,
            routine,
            goal: goals[i] ?? metadata.goal ?? null,
          }),
          status: 'PLANNED_FUTURE',
          mainSport: 'BODY_BUILDING',
          mainGoal: typeof goals[i] === 'string' ? goals[i] : metadata.goal ?? null,
          intensity: metadata.level ?? null,
          tags: metadata.tags?.trim() || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      weekId: week.id,
      weekNumber: nextWeekNumber,
    });
  } catch (error: unknown) {
    console.error('Error saving gym week plan to archive:', error);
    return NextResponse.json(
      {
        error: 'Failed to save gym week plan to archive',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 },
    );
  }
}
