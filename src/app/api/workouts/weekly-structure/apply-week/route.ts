import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';
import { buildWorkoutSessionCreate } from '@/lib/workoutDayCopy';
import { parseFavoriteMainSport } from '@/lib/favoriteWorkoutApply';
import { buildSessionsForStructurePlan } from '@/lib/weeklyStructureMaterialize';
import type { WeeklyStructurePlanPersist } from '@/lib/weeklyStructureTypes';

function planTypeToStorageZone(type: string): 'A' | 'B' | 'C' | 'D' {
  if (type === 'TEMPLATE_WEEKS') return 'A';
  if (type === 'YEARLY_PLAN') return 'B';
  if (type === 'WORKOUTS_DONE') return 'C';
  if (type === 'ARCHIVE') return 'D';
  return 'B';
}

function computeDayDateForWeek(
  weekNumber: number,
  dayOfWeek: number,
  reference: { date: Date; dayOfWeek: number }
): Date {
  const weekStart = new Date(reference.date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (reference.dayOfWeek - 1));
  const dayDate = new Date(weekStart);
  dayDate.setDate(weekStart.getDate() + (dayOfWeek - 1));
  return dayDate;
}

function isValidPlanPersist(value: unknown): value is WeeklyStructurePlanPersist {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return Boolean(o.meta && Array.isArray(o.planned) && o.grid);
}

function getWeekWorkoutCount(week: { days?: { workouts?: unknown[] }[] }): number {
  if (!week?.days) return 0;
  return week.days.reduce((sum, day) => sum + (day.workouts?.length || 0), 0);
}

async function ensureDefaultSection(userId: string) {
  let section = await prisma.workoutSection.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  if (!section) {
    section = await prisma.workoutSection.create({
      data: {
        userId,
        name: 'Default',
        code: 'DEF',
        description: 'Default section',
        color: '#3B82F6',
      },
    });
  }
  return section;
}

async function ensureTargetDay(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  targetWeek: {
    id: string;
    weekNumber: number;
    days: Array<{ id: string; dayOfWeek: number; date: Date; periodId: string }>;
  },
  dayOfWeek: number,
  userId: string,
  periodId: string,
  storageZone: 'A' | 'B' | 'C' | 'D'
) {
  const existing = targetWeek.days.find((d) => d.dayOfWeek === dayOfWeek);
  if (existing) return existing;

  const referenceDay =
    targetWeek.days.find((d) => d.dayOfWeek === 1) ??
    targetWeek.days[0] ??
    ({ date: new Date(), dayOfWeek: 1 } as { date: Date; dayOfWeek: number });

  const dayDate = computeDayDateForWeek(targetWeek.weekNumber, dayOfWeek, {
    date: new Date(referenceDay.date),
    dayOfWeek: referenceDay.dayOfWeek,
  });

  const created = await tx.workoutDay.create({
    data: {
      workoutWeekId: targetWeek.id,
      userId,
      dayOfWeek,
      weekNumber: targetWeek.weekNumber,
      date: dayDate,
      periodId: periodId || referenceDay.periodId,
      storageZone: storageZone as never,
      weather: '',
      feelingStatus: '5',
      notes: '',
    },
  });

  targetWeek.days.push(created);
  return created;
}

async function applyStructureToWeek(
  userId: string,
  planData: WeeklyStructurePlanPersist,
  targetWeekId: string,
  overwrite: boolean
) {
  const targetWeek = await prisma.workoutWeek.findFirst({
    where: { id: targetWeekId, workoutPlan: { userId } },
    include: {
      days: { include: { workouts: { include: { moveframes: true } } } },
      workoutPlan: { select: { type: true } },
    },
  });

  if (!targetWeek) {
    return { ok: false as const, error: 'Target week not found', status: 404 };
  }

  const existingCount = getWeekWorkoutCount(targetWeek);
  if (existingCount > 0 && !overwrite) {
    return {
      ok: false as const,
      error: 'Target week already has workouts. Confirm overwrite to continue.',
      status: 409,
      hasContent: true,
    };
  }

  const storageZone = planTypeToStorageZone(targetWeek.workoutPlan.type);
  const defaultSection = await ensureDefaultSection(userId);
  const daySessions = buildSessionsForStructurePlan(planData, defaultSection.id);
  const periodId = planData.meta.periodId || targetWeek.days[0]?.periodId || '';

  await prisma.$transaction(async (tx) => {
    if (overwrite) {
      for (const day of targetWeek.days) {
        for (const workout of day.workouts) {
          for (const moveframe of workout.moveframes) {
            await tx.movelap.deleteMany({ where: { moveframeId: moveframe.id } });
          }
          await tx.moveframe.deleteMany({ where: { workoutSessionId: workout.id } });
        }
        await tx.workoutSession.deleteMany({ where: { workoutDayId: day.id } });
      }
    }

    for (const { dayOfWeek, sessions } of daySessions) {
      const targetDay = await ensureTargetDay(
        tx,
        targetWeek,
        dayOfWeek,
        userId,
        periodId,
        storageZone
      );

      for (const session of sessions) {
        await tx.workoutSession.create({
          data: {
            workoutDayId: targetDay.id,
            mainSport: parseFavoriteMainSport(session.sports[0]?.sport),
            mainGoal: session.code || null,
            intensity: 'Medium',
            ...buildWorkoutSessionCreate(session),
          },
        });
      }
    }
  });

  return { ok: true as const, weekNumber: targetWeek.weekNumber };
}

/**
 * POST /api/workouts/weekly-structure/apply-week
 * Materialize weekly structure grid onto template or yearly plan week(s).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const { planData, targetWeekId, targetWeekIds, overwrite } = body;

    if (!isValidPlanPersist(planData)) {
      return NextResponse.json({ error: 'Invalid weekly structure plan data' }, { status: 400 });
    }

    const weekIds: string[] = targetWeekIds?.length
      ? targetWeekIds
      : targetWeekId
        ? [targetWeekId]
        : [];

    if (!weekIds.length) {
      return NextResponse.json({ error: 'targetWeekId or targetWeekIds is required' }, { status: 400 });
    }

    const results: Array<{ weekId: string; weekNumber?: number; error?: string }> = [];

    for (const weekId of weekIds) {
      const result = await applyStructureToWeek(dbUserId, planData, weekId, Boolean(overwrite));
      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            hasContent: 'hasContent' in result ? result.hasContent : undefined,
            weekId,
          },
          { status: result.status }
        );
      }
      results.push({ weekId, weekNumber: result.weekNumber });
    }

    return NextResponse.json({
      success: true,
      message: `Structure applied to ${results.length} week(s)`,
      results,
    });
  } catch (error: unknown) {
    console.error('weekly-structure apply-week error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply structure' },
      { status: 500 }
    );
  }
}
