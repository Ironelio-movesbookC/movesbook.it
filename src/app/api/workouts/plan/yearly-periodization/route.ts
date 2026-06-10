import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const daysToSubtract = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysToSubtract);
  return d;
}

function addDays(base: Date, days: number): Date {
  const x = new Date(base);
  x.setDate(x.getDate() + days);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * POST /api/workouts/plan/yearly-periodization
 * Body:
 * { mode: 'shift_calendar' | 'metadata_only' | 'reset_periods' | 'clear_period_assignments'
 *   | 'apply_favourite_template',
 *   newStartDate?: string (ISO), periodId?: string,
 *   applyStartDate?: string (ISO),
 *   weekPeriodByNumber?: Record<string, string>,
 *   notesByPeriodId?: Record<string, string>,
 *   attachmentsByPeriodId?: Record<string, unknown> }
 */
export async function POST(request: NextRequest) {
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
    const userId = decoded.userId;

    const body = await request.json();
    const mode = body.mode as string;
    const newStartDateRaw = body.newStartDate as string | undefined;

    const plan = await prisma.workoutPlan.findFirst({
      where: { userId, type: 'YEARLY_PLAN' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            days: { orderBy: { dayOfWeek: 'asc' } }
          }
        }
      }
    });

    if (!plan) {
      return NextResponse.json({ error: 'Yearly plan not found' }, { status: 404 });
    }

    if (mode === 'metadata_only') {
      if (!newStartDateRaw) {
        return NextResponse.json({ error: 'newStartDate required' }, { status: 400 });
      }
      const monday = getMondayOfWeek(new Date(newStartDateRaw));
      await prisma.userSettings.upsert({
        where: { userId },
        update: { yearlyPlanStartDate: monday },
        create: {
          userId,
          yearlyPlanStartDate: monday,
          colorSettings: '{}',
          toolsSettings: '{}',
          adminSettings: '{}',
          favouritesSettings: '{}',
          myBestSettings: '{}',
          notificationSettings: '{}',
          socialSettings: '{}',
          workoutPreferences: '{}',
          widgetArrangement: '[]'
        }
      });
      return NextResponse.json({ success: true, message: 'Saved preferred start date (plan weeks unchanged).' });
    }

    if (mode === 'clear_period_assignments') {
      const periodId = body.periodId as string | undefined;
      if (!periodId) {
        return NextResponse.json({ error: 'periodId required' }, { status: 400 });
      }
      const defaultPeriod = await prisma.period.findFirst({
        where: { userId },
        orderBy: { displayOrder: 'asc' }
      });
      if (!defaultPeriod) {
        return NextResponse.json({ error: 'No period defined.' }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        for (const week of plan.weeks) {
          if (week.periodId !== periodId) continue;
          await tx.workoutWeek.update({
            where: { id: week.id },
            data: { periodId: defaultPeriod.id }
          });
          await tx.workoutDay.updateMany({
            where: { workoutWeekId: week.id },
            data: { periodId: defaultPeriod.id }
          });
        }
      });
      return NextResponse.json({ success: true, message: 'Cleared assignments for that period.' });
    }

    if (mode === 'reset_periods') {
      const defaultPeriod = await prisma.period.findFirst({
        where: { userId },
        orderBy: { displayOrder: 'asc' }
      });
      if (!defaultPeriod) {
        return NextResponse.json({ error: 'No period defined. Add a period in settings first.' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        for (const week of plan.weeks) {
          await tx.workoutWeek.update({
            where: { id: week.id },
            data: { periodId: defaultPeriod.id }
          });
          await tx.workoutDay.updateMany({
            where: { workoutWeekId: week.id },
            data: { periodId: defaultPeriod.id }
          });
        }
      });

      return NextResponse.json({ success: true, message: 'All weeks reset to default period.' });
    }

    if (mode === 'apply_favourite_template') {
      const applyStartRaw = body.applyStartDate as string | undefined;
      const weekMap = body.weekPeriodByNumber as Record<string, string> | undefined;
      if (!applyStartRaw || !weekMap || typeof weekMap !== 'object') {
        return NextResponse.json(
          { error: 'applyStartDate and weekPeriodByNumber required' },
          { status: 400 }
        );
      }

      const applyMonday = getMondayOfWeek(new Date(applyStartRaw));
      const planMonday = getMondayOfWeek(new Date(plan.startDate));
      const diffDays = Math.round(
        (applyMonday.getTime() - planMonday.getTime()) / (24 * 60 * 60 * 1000)
      );
      const anchorWeek = Math.max(1, Math.floor(diffDays / 7) + 1);

      const sortedWeeks = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
      const weekByNumber = new Map(sortedWeeks.map((w) => [w.weekNumber, w]));

      const updates: { weekId: string; periodId: string }[] = [];
      for (let tplWeek = 1; tplWeek <= 52; tplWeek++) {
        const periodId = weekMap[String(tplWeek)]?.trim();
        if (!periodId) continue;
        const planWeekNum = anchorWeek + tplWeek - 1;
        const week = weekByNumber.get(planWeekNum);
        if (!week) continue;
        updates.push({ weekId: week.id, periodId });
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { error: 'No weeks could be matched for this start date. Check your yearly plan exists.' },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        for (const u of updates) {
          await tx.workoutWeek.update({
            where: { id: u.weekId },
            data: { periodId: u.periodId },
          });
          await tx.workoutDay.updateMany({
            where: { workoutWeekId: u.weekId },
            data: { periodId: u.periodId },
          });
        }
      });

      const notesByPeriodId = body.notesByPeriodId as Record<string, string> | undefined;
      const attachmentsByPeriodId = body.attachmentsByPeriodId as Record<string, unknown> | undefined;

      if (notesByPeriodId || attachmentsByPeriodId) {
        const settings = await prisma.userSettings.findUnique({ where: { userId } });
        let toolsSettings: Record<string, unknown> = {};
        if (settings?.toolsSettings) {
          try {
            toolsSettings =
              typeof settings.toolsSettings === 'string'
                ? JSON.parse(settings.toolsSettings)
                : (settings.toolsSettings as Record<string, unknown>);
          } catch {
            toolsSettings = {};
          }
        }
        const prevPer = (toolsSettings.periodization || {}) as Record<string, unknown>;
        toolsSettings.periodization = {
          ...prevPer,
          ...(notesByPeriodId ? { notesByPeriodId } : {}),
          ...(attachmentsByPeriodId ? { attachmentsByPeriodId } : {}),
        };
        await prisma.userSettings.upsert({
          where: { userId },
          update: { toolsSettings: JSON.stringify(toolsSettings) },
          create: {
            userId,
            toolsSettings: JSON.stringify(toolsSettings),
            colorSettings: '{}',
            adminSettings: '{}',
            favouritesSettings: '{}',
            myBestSettings: '{}',
            notificationSettings: '{}',
            socialSettings: '{}',
            workoutPreferences: '{}',
            widgetArrangement: '[]',
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Applied periodization to ${updates.length} week(s) starting at week ${anchorWeek}.`,
        anchorWeek,
        weeksUpdated: updates.length,
        planStartMonday: planMonday.toISOString(),
        applyStartMonday: applyMonday.toISOString(),
      });
    }

    if (mode === 'shift_calendar') {
      if (!newStartDateRaw) {
        return NextResponse.json({ error: 'newStartDate required' }, { status: 400 });
      }
      const monday = getMondayOfWeek(new Date(newStartDateRaw));
      const endDate = addDays(monday, 364);

      const sortedWeeks = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
      // Use unique temporary timestamps (second resolution) to avoid hitting the
      // unique key (userId + date + storageZone) while reshuffling calendar dates.
      const tempBase = new Date('2099-06-01T12:00:00.000Z');
      const displacedBase = new Date('2098-01-01T12:00:00.000Z');

      await prisma.$transaction(async (tx) => {
        let idx = 0;
        for (const week of sortedWeeks) {
          for (const day of week.days) {
            const tempDate = new Date(tempBase.getTime() + idx * 1000);
            idx += 1;
            await tx.workoutDay.update({
              where: { id: day.id },
              data: { date: tempDate }
            });
          }
        }

        let displacedIdx = 0;
        for (const week of sortedWeeks) {
          const weekMonday = addDays(monday, (week.weekNumber - 1) * 7);
          const sortedDays = [...week.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
          for (const day of sortedDays) {
            const dow = day.dayOfWeek >= 1 && day.dayOfWeek <= 7 ? day.dayOfWeek : 1;
            const newDate = addDays(weekMonday, dow - 1);

            // If another row already uses (userId, newDate, storageZone),
            // relocate it first to a unique displaced timestamp to satisfy
            // the unique constraint before assigning this day's final date.
            const conflicting = await tx.workoutDay.findFirst({
              where: {
                userId,
                storageZone: day.storageZone,
                date: newDate,
                NOT: { id: day.id }
              },
              select: { id: true }
            });
            if (conflicting) {
              const displacedDate = new Date(displacedBase.getTime() + displacedIdx * 1000);
              displacedIdx += 1;
              await tx.workoutDay.update({
                where: { id: conflicting.id },
                data: { date: displacedDate }
              });
            }

            await tx.workoutDay.update({
              where: { id: day.id },
              data: { date: newDate }
            });
          }
        }

        await tx.workoutPlan.update({
          where: { id: plan.id },
          data: { startDate: monday, endDate }
        });

        await tx.userSettings.upsert({
          where: { userId },
          update: { yearlyPlanStartDate: monday },
          create: {
            userId,
            yearlyPlanStartDate: monday,
            colorSettings: '{}',
            toolsSettings: '{}',
            adminSettings: '{}',
            favouritesSettings: '{}',
            myBestSettings: '{}',
            notificationSettings: '{}',
            socialSettings: '{}',
            workoutPreferences: '{}',
            widgetArrangement: '[]'
          }
        });
      });

      return NextResponse.json({ success: true, message: 'Yearly plan dates realigned to new start Monday.' });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (e) {
    console.error('yearly-periodization POST:', e);
    return NextResponse.json(
      { error: 'Failed to update yearly periodization', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}
