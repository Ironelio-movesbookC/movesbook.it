import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { mapGlobalEntryToGridRecord } from '@/lib/globalWorkoutArchiveMapper';
import {
  computeWeeklyPlanMetrics,
  computeWorkoutArchiveMetrics,
  flagEmojiFromCountryCode,
} from '@/lib/workoutArchiveMetrics';
import type { GlobalArchiveRecordType } from '@prisma/client';

/**
 * POST — User shares a workout or weekly plan to the Global Archive for all Movesbook users.
 * Body: { recordType: 'WORKOUT' | 'WEEKLY_PLAN', sourceId, originalLanguages?, shortDescription?, expirationDate? }
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
    } = body as {
      recordType: GlobalArchiveRecordType;
      sourceId: string;
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

      payloadData = JSON.stringify({
        workout: {
          id: workout.id,
          name: workout.name,
          code: workout.code,
          notes: workout.notes,
          sessionNumber: workout.sessionNumber,
        },
        sports: workout.sports,
        moveframes: workout.moveframes,
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
        payloadData = JSON.stringify(snapshot);
        const metrics = computeWeeklyPlanMetrics({ weeks: [{ days: week.days }] });
        workoutCount = metrics.workoutCount;
        totalMeters = metrics.totalMeters;
        totalTimeSeconds = metrics.totalTimeSeconds;
        totalSeries = metrics.totalSeries;
      }
    } else {
      return NextResponse.json({ error: 'Unsupported recordType for share' }, { status: 400 });
    }

    const countryCode = user.country?.trim().toUpperCase().slice(0, 2) ?? '';
    const fullName =
      [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name;

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
        authorCountry: user.country ?? null,
        shortDescription: shortDescription ?? null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        sharedByUserId: user.id,
        sharedByUsername: user.username,
        authorFullName: fullName,
        authorAvatarUrl: user.image ?? null,
        authorCountryName: user.country ?? null,
        authorCountryFlag: countryCode ? flagEmojiFromCountryCode(countryCode) : null,
        workoutCount,
        totalMeters,
        totalTimeSeconds,
        totalSeries,
        sharedAt: new Date(),
        payloadData,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shared to Global Archive of Workouts & Weekly Plans',
      record: mapGlobalEntryToGridRecord(entry),
    });
  } catch (error) {
    console.error('POST share-to-global:', error);
    return NextResponse.json({ error: 'Failed to share to global archive' }, { status: 500 });
  }
}
