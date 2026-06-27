import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  importCoachAnnualWorkoutToSlot,
  importFavoriteToSlot,
  importGlobalArchiveWorkoutToSlot,
  importStructureSlotToSlot,
  importWorkoutSessionToSlot,
} from '@/lib/workoutSessionImport';
import type { WeeklyStructurePlanPersist } from '@/lib/weeklyStructureTypes';

export const dynamic = 'force-dynamic';

/** POST — Import a workout into a specific day slot (replace optional). */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      targetDayId,
      sessionNumber,
      replaceExisting = false,
      source,
    } = body as {
      targetDayId?: string;
      sessionNumber?: number;
      replaceExisting?: boolean;
      source?: {
        type: 'session' | 'favorite' | 'global_archive' | 'weekly_structure' | 'coach_annual';
        sourceWorkoutId?: string;
        favoriteId?: string;
        globalEntryId?: string;
        planData?: WeeklyStructurePlanPersist;
        structureDayOfWeek?: number;
        structureSessionNumber?: number;
        coachWeekNumber?: number;
        coachDayOfWeek?: number;
        coachSessionNumber?: number;
        anchorWeekNumber?: number;
        maxWeekNumber?: number;
      };
    };

    if (!targetDayId || !sessionNumber || sessionNumber < 1 || sessionNumber > 3) {
      return NextResponse.json(
        { error: 'targetDayId and sessionNumber (1–3) are required' },
        { status: 400 }
      );
    }

    if (!source?.type) {
      return NextResponse.json({ error: 'source.type is required' }, { status: 400 });
    }

    if (source.type === 'session') {
      if (!source.sourceWorkoutId) {
        return NextResponse.json({ error: 'sourceWorkoutId is required' }, { status: 400 });
      }

      const session = await prisma.$transaction((tx) =>
        importWorkoutSessionToSlot(tx, decoded.userId, {
          targetDayId,
          sessionNumber,
          replaceExisting,
          sourceWorkoutId: source.sourceWorkoutId!,
        })
      );

      return NextResponse.json({ success: true, session });
    }

    if (source.type === 'favorite') {
      if (!source.favoriteId) {
        return NextResponse.json({ error: 'favoriteId is required' }, { status: 400 });
      }

      const session = await prisma.$transaction((tx) =>
        importFavoriteToSlot(tx, decoded.userId, {
          targetDayId,
          sessionNumber,
          replaceExisting,
          favoriteId: source.favoriteId!,
        })
      );

      return NextResponse.json({ success: true, session });
    }

    if (source.type === 'global_archive') {
      if (!source.globalEntryId) {
        return NextResponse.json({ error: 'globalEntryId is required' }, { status: 400 });
      }

      const result = await importGlobalArchiveWorkoutToSlot(prisma, decoded.userId, {
        targetDayId,
        sessionNumber,
        replaceExisting,
        globalEntryId: source.globalEntryId,
      });

      return NextResponse.json({ success: true, ...result });
    }

    if (source.type === 'weekly_structure') {
      if (!source.planData?.grid || !source.structureDayOfWeek || !source.structureSessionNumber) {
        return NextResponse.json(
          { error: 'planData, structureDayOfWeek and structureSessionNumber are required' },
          { status: 400 }
        );
      }

      const session = await prisma.$transaction((tx) =>
        importStructureSlotToSlot(tx, decoded.userId, {
          targetDayId,
          sessionNumber,
          replaceExisting,
          planData: source.planData!,
          structureDayOfWeek: source.structureDayOfWeek!,
          structureSessionNumber: source.structureSessionNumber!,
        })
      );

      return NextResponse.json({ success: true, session });
    }

    if (source.type === 'coach_annual') {
      if (
        !source.globalEntryId ||
        !source.coachWeekNumber ||
        !source.coachDayOfWeek ||
        !source.coachSessionNumber
      ) {
        return NextResponse.json(
          {
            error:
              'globalEntryId, coachWeekNumber, coachDayOfWeek and coachSessionNumber are required',
          },
          { status: 400 }
        );
      }

      const session = await prisma.$transaction((tx) =>
        importCoachAnnualWorkoutToSlot(tx, decoded.userId, {
          targetDayId,
          sessionNumber,
          replaceExisting,
          globalEntryId: source.globalEntryId!,
          coachWeekNumber: source.coachWeekNumber!,
          coachDayOfWeek: source.coachDayOfWeek!,
          coachSessionNumber: source.coachSessionNumber!,
          anchorWeekNumber: source.anchorWeekNumber ?? 1,
          maxWeekNumber: source.maxWeekNumber,
        })
      );

      return NextResponse.json({ success: true, session });
    }

    return NextResponse.json({ error: 'Unsupported source type' }, { status: 400 });
  } catch (error) {
    console.error('POST sessions/import:', error);
    const message = error instanceof Error ? error.message : 'Import failed';
    const status = message.includes('occupied') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
