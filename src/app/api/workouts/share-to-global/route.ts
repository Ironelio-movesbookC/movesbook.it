import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { mapGlobalEntryToGridRecord } from '@/lib/globalWorkoutArchiveMapper';
import {
  computeWeeklyPlanMetrics,
  computeWorkoutArchiveMetrics,
} from '@/lib/workoutArchiveMetrics';
import type { GlobalArchiveRecordType } from '@prisma/client';
import {
  buildWeeklyPlanSharePayload,
  parseWeeklyPlanShareMeta,
  type WeeklyPlanShareSourceType,
} from '@/lib/globalWeeklyPlanShare';
import {
  buildWorkoutSharePayload,
  parseWorkoutShareMeta,
} from '@/lib/globalWorkoutShare';
import { resolveAuthorCountryFields } from '@/lib/shareAuthorCountry';

/**
 * POST — User shares a workout or weekly plan to the Global Archive for all Movesbook users.
 * Body: { recordType, sourceId, sourcePlanType?, title, mainSport, mainGoal, trainingLevel, period,
 *         originalLanguages, shortDescription, expirationDate?, tags? }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        name: true,
        firstName: true,
        surname: true,
        country: true,
        image: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      recordType,
      sourceId,
      originalLanguages,
      shortDescription,
      expirationDate,
      title: titleOverride,
      mainSport,
      mainGoal,
      trainingLevel,
      period,
      tags,
      sourcePlanType,
    } = body as {
      recordType: GlobalArchiveRecordType;
      sourceId: string;
      sourcePlanType?: WeeklyPlanShareSourceType;
      originalLanguages?: string;
      shortDescription?: string;
      expirationDate?: string;
      title?: string;
      mainSport?: string;
      mainGoal?: string;
      trainingLevel?: string;
      period?: string;
      tags?: string;
    };

    if (!recordType || !sourceId) {
      return NextResponse.json({ error: 'recordType and sourceId are required' }, { status: 400 });
    }

    const validateShareMetadata = (): string | null => {
      const missing: string[] = [];
      if (!titleOverride?.trim()) missing.push('title');
      if (!mainSport?.trim()) missing.push('main sport');
      if (!mainGoal?.trim()) missing.push('main goal');
      if (!trainingLevel?.trim()) missing.push('training level');
      if (!period?.trim()) missing.push('period');
      if (!originalLanguages?.trim()) missing.push('language');
      if (!shortDescription?.trim()) missing.push('short description');
      if (missing.length > 0) {
        return `Required for sharing: ${missing.join(', ')}`;
      }
      if (expirationDate) {
        const exp = new Date(expirationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(exp.getTime()) || exp <= today) {
          return 'Expiration date must be a future date';
        }
      }
      return null;
    };

    if (recordType === 'WEEKLY_PLAN' || recordType === 'WORKOUT') {
      const validationError = validateShareMetadata();
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    if (recordType === 'WEEKLY_PLAN') {
      const existingShares = await prisma.globalWorkoutArchiveEntry.findMany({
        where: {
          sharedByUserId: user.id,
          disabled: false,
          recordType: 'WEEKLY_PLAN',
        },
        select: { id: true, payloadData: true, title: true },
      });
      const duplicate = existingShares.find((entry) => {
        const meta = parseWeeklyPlanShareMeta(entry.payloadData);
        return meta?.sourceWeekId === sourceId;
      });
      if (duplicate) {
        return NextResponse.json(
          {
            error: 'This weekly plan is already shared with Movesbook users',
            existingEntryId: duplicate.id,
            existingTitle: duplicate.title,
          },
          { status: 409 }
        );
      }
    }

    if (recordType === 'WORKOUT') {
      const existingShares = await prisma.globalWorkoutArchiveEntry.findMany({
        where: {
          sharedByUserId: user.id,
          disabled: false,
          recordType: 'WORKOUT',
        },
        select: { id: true, payloadData: true, title: true },
      });
      const duplicate = existingShares.find((entry) => {
        const meta = parseWorkoutShareMeta(entry.payloadData);
        return meta?.sourceWorkoutId === sourceId;
      });
      if (duplicate) {
        return NextResponse.json(
          {
            error: 'This workout is already shared with Movesbook users',
            existingEntryId: duplicate.id,
            existingTitle: duplicate.title,
          },
          { status: 409 }
        );
      }
    }

    let payloadData = '';
    let title = titleOverride?.trim() || 'Shared record';
    let workoutCount = 1;
    let totalMeters = 0;
    let totalTimeSeconds = 0;
    let totalSeries = 0;
    let resolvedMainSport = mainSport ?? null;
    let resolvedMainGoal = mainGoal ?? null;
    let resolvedTrainingLevel = trainingLevel ?? null;
    let resolvedPeriod = period ?? null;
    let resolvedTags = tags ?? null;

    /** Weekly plans shared to the global catalog must include the shareable tag for import-by-users. */
    const ensureShareableTag = (value: string | null): string => {
      const parts = value
        ? value.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      if (!parts.some((t) => t.toLowerCase() === 'shareable')) {
        parts.push('shareable');
      }
      return parts.join(', ');
    };

    if (recordType === 'WORKOUT') {
      const workout = await prisma.workoutSession.findUnique({
        where: { id: sourceId },
        include: {
          sports: true,
          moveframes: { include: { movelaps: true, section: true } },
          workoutDay: {
            include: {
              period: true,
              workoutWeek: { include: { period: true } },
            },
          },
        },
      });
      if (!workout || workout.workoutDay.userId !== user.id) {
        return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
      }

      const metrics = computeWorkoutArchiveMetrics(workout);
      totalMeters = metrics.totalMeters;
      totalTimeSeconds = metrics.totalTimeSeconds;
      totalSeries = metrics.totalSeries;
      workoutCount = 1;
      title = titleOverride?.trim() || workout.name || `Workout #${workout.sessionNumber}`;
      resolvedMainSport =
        mainSport ?? workout.mainSport ?? workout.sports[0]?.sport ?? workout.moveframes[0]?.sport ?? null;
      resolvedMainGoal = mainGoal ?? workout.mainGoal ?? null;
      resolvedTrainingLevel = trainingLevel ?? workout.intensity ?? null;
      resolvedTags = tags ?? workout.tags ?? null;
      resolvedPeriod =
        period ?? workout.workoutDay.period?.name ?? workout.workoutDay.workoutWeek?.period?.name ?? null;
      resolvedTags = ensureShareableTag(resolvedTags);

      const snapshot = {
        workout: {
          id: workout.id,
          name: workout.name,
          code: workout.code,
          notes: workout.notes,
          sessionNumber: workout.sessionNumber,
          mainSport: workout.mainSport,
          mainGoal: workout.mainGoal,
        },
        sports: workout.sports,
        moveframes: workout.moveframes,
      };
      payloadData = buildWorkoutSharePayload(snapshot, {
        sourceWorkoutId: sourceId,
        sourceCreatedAt: workout.createdAt.toISOString(),
      });
    } else if (recordType === 'WEEKLY_PLAN') {
      const fav = await prisma.favoriteWeeklyPlan.findFirst({
        where: { id: sourceId, userId: user.id },
      });
      if (fav) {
        title = titleOverride?.trim() || fav.name;
        payloadData = fav.planData;
        try {
          const parsed = JSON.parse(fav.planData);
          const metrics = computeWeeklyPlanMetrics(parsed);
          workoutCount = metrics.workoutCount;
          totalMeters = metrics.totalMeters;
          totalTimeSeconds = metrics.totalTimeSeconds;
          totalSeries = metrics.totalSeries;
        } catch {
          workoutCount = fav.workoutsCount ?? 0;
        }
      } else {
        const week = await prisma.workoutWeek.findUnique({
          where: { id: sourceId },
          include: {
            period: true,
            workoutPlan: true,
            days: {
              include: {
                workouts: {
                  include: {
                    sports: true,
                    moveframes: { include: { movelaps: true } },
                  },
                },
              },
            },
          },
        });
        if (!week || week.workoutPlan.userId !== user.id) {
          return NextResponse.json({ error: 'Weekly plan not found' }, { status: 404 });
        }
        title = titleOverride?.trim() || `Week ${week.weekNumber}`;
        resolvedPeriod = period ?? week.period?.name ?? null;
        const snapshot = {
          weekNumber: week.weekNumber,
          notes: week.notes,
          days: week.days,
        };
        const planType: WeeklyPlanShareSourceType =
          sourcePlanType ??
          (week.workoutPlan.type === 'ARCHIVE'
            ? 'ARCHIVE'
            : week.workoutPlan.type === 'YEARLY_PLAN'
              ? 'YEARLY_PLAN'
              : 'TEMPLATE');
        payloadData = buildWeeklyPlanSharePayload(snapshot, {
          sourceWeekId: sourceId,
          sourcePlanType: planType,
          sourceCreatedAt: week.createdAt.toISOString(),
        });
        const metrics = computeWeeklyPlanMetrics({ weeks: [{ days: week.days }] });
        workoutCount = metrics.workoutCount;
        totalMeters = metrics.totalMeters;
        totalTimeSeconds = metrics.totalTimeSeconds;
        totalSeries = metrics.totalSeries;
      }
      resolvedTags = ensureShareableTag(resolvedTags);
    } else {
      return NextResponse.json({ error: 'Unsupported recordType for share' }, { status: 400 });
    }

    const countryFields = resolveAuthorCountryFields(user.country);
    const fullName =
      [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name;
    const sharedAt = new Date();

    const entry = await prisma.globalWorkoutArchiveEntry.create({
      data: {
        recordType,
        title,
        mainSport: resolvedMainSport,
        mainGoal: resolvedMainGoal,
        trainingLevel: resolvedTrainingLevel,
        period: resolvedPeriod,
        tags: resolvedTags,
        originalLanguages: originalLanguages ?? null,
        authorCountry: countryFields.authorCountry,
        shortDescription: shortDescription ?? null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        sharedByUserId: user.id,
        sharedByUsername: user.username,
        authorFullName: fullName,
        authorAvatarUrl: user.image ?? null,
        authorCountryName: countryFields.authorCountryName,
        authorCountryFlag: countryFields.authorCountryFlag,
        workoutCount,
        totalMeters,
        totalTimeSeconds,
        totalSeries,
        sharedAt,
        payloadData,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shared to Global archive of shared workouts & weekly plans',
      record: mapGlobalEntryToGridRecord(entry),
    });
  } catch (error) {
    console.error('POST share-to-global:', error);
    return NextResponse.json({ error: 'Failed to share to global archive' }, { status: 500 });
  }
}
