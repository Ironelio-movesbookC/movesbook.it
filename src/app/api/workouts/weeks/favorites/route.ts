import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';
import {
  getFavoriteWeeklyPlanDedupeKey,
  parseFavoriteWeeklyPlanData,
} from '@/lib/favoriteWeeklyPlanKeys';
import { computeWeeklyPlanMetrics } from '@/lib/workoutArchiveMetrics';
import { resolveAuthorCountryFields } from '@/lib/shareAuthorCountry';
import {
  WEEKLY_PLAN_SAVE_META_KEY,
  type WeeklyPlanSaveMetaInput,
} from '@/lib/weeklyPlanSaveMeta';

function planTypeToStorageZone(type: string): 'A' | 'B' | 'C' | 'D' {
  if (type === 'TEMPLATE_WEEKS') return 'A';
  if (type === 'YEARLY_PLAN') return 'B';
  if (type === 'WORKOUTS_DONE') return 'C';
  if (type === 'ARCHIVE') return 'D';
  return 'B';
}

function buildPlanDataSnapshot(
  week: {
    weekNumber: number;
    notes: string | null;
    periodId: string | null;
    period: { name: string } | null;
    workoutPlanId: string;
    id: string;
  },
  days: Array<{
    dayOfWeek: number;
    date: Date;
    notes: string | null;
    periodId: string;
    period: { name: string } | null;
    workouts: Array<{
      name: string;
      code: string | null;
      sessionNumber: number;
      time: string | null;
      weather: string | null;
      location: string | null;
      surface: string | null;
      notes: string | null;
      status: string | null;
      sports: Array<{ sport: string }>;
      moveframes: Array<{
        letter: string;
        sport: string;
        type: string | null;
        description: string | null;
        notes: string | null;
        workType: string | null;
        sectionId: string | null;
        section: { name: string } | null;
        movelaps: Array<{
          repetitionNumber: number;
          distance: number | null;
          speed: string | null;
          style: string | null;
          pace: string | null;
          time: string | null;
          reps: number | null;
          exercise: string | null;
          restType: string | null;
          pause: string | null;
          notes: string | null;
          status: string | null;
          isSkipped: boolean | null;
          isDisabled: boolean | null;
        }>;
      }>;
    }>;
  }>,
  name: string
) {
  return {
    sourcePlanId: week.workoutPlanId,
    sourceWeekNumber: week.weekNumber,
    sourceWeekId: week.id,
    name,
    weeks: [
      {
        weekNumber: week.weekNumber,
        notes: week.notes,
        periodId: week.periodId,
        periodName: week.period?.name,
        days: days.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          date: day.date,
          notes: day.notes,
          periodId: day.periodId,
          periodName: day.period?.name,
          workouts: day.workouts.map((workout) => ({
            name: workout.name,
            code: workout.code,
            sessionNumber: workout.sessionNumber,
            time: workout.time,
            weather: workout.weather,
            location: workout.location,
            surface: workout.surface,
            notes: workout.notes,
            status: workout.status,
            sports: workout.sports.map((s) => ({ sport: s.sport })),
            moveframes: workout.moveframes.map((mf) => ({
              letter: mf.letter,
              sport: mf.sport,
              type: mf.type,
              description: mf.description,
              notes: mf.notes,
              workType: mf.workType,
              sectionId: mf.sectionId,
              sectionName: mf.section?.name,
              movelaps: mf.movelaps.map((ml) => ({
                repetitionNumber: ml.repetitionNumber,
                distance: ml.distance,
                speed: ml.speed,
                style: ml.style,
                pace: ml.pace,
                time: ml.time,
                reps: ml.reps,
                exercise: ml.exercise,
                restType: ml.restType,
                pause: ml.pause,
                notes: ml.notes,
                status: ml.status,
                isSkipped: ml.isSkipped,
                isDisabled: ml.isDisabled,
              })),
            })),
          })),
        })),
      },
    ],
  };
}

// POST - Save a single calendar week as favorite (one entry per plan week, all days merged)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { weekId, name, description, saveMeta, sourceTemplate } = await req.json();

    if (!weekId) {
      return NextResponse.json({ error: 'Week ID is required' }, { status: 400 });
    }

    const week = await prisma.workoutWeek.findUnique({
      where: { id: weekId },
      include: {
        period: true,
        workoutPlan: { select: { id: true, userId: true, type: true } },
      },
    });

    if (!week || week.workoutPlan.userId !== dbUserId) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    const storageZone = planTypeToStorageZone(week.workoutPlan.type);

    // Load every day for this logical calendar week (handles fragmented week rows).
    const days = await prisma.workoutDay.findMany({
      where: {
        weekNumber: week.weekNumber,
        storageZone,
        workoutWeek: { workoutPlanId: week.workoutPlanId },
      },
      include: {
        period: true,
        workouts: {
          include: {
            sports: true,
            moveframes: {
              include: {
                movelaps: { orderBy: { repetitionNumber: 'asc' } },
                section: true,
              },
              orderBy: { letter: 'asc' },
            },
          },
        },
      },
      orderBy: { dayOfWeek: 'asc' },
    });

    let totalWorkouts = 0;
    days.forEach((day) => {
      totalWorkouts += day.workouts.length;
    });

    const metrics = computeWeeklyPlanMetrics({
      weeks: [{ days: days.map((day) => ({ workouts: day.workouts })) }],
    });

    const user = await prisma.user.findUnique({
      where: { id: dbUserId },
      select: {
        username: true,
        name: true,
        firstName: true,
        surname: true,
        image: true,
        country: true,
      },
    });

    const countryFields = resolveAuthorCountryFields(user?.country);
    const savedAt = new Date().toISOString();

    let displayName = name || `Week ${week.weekNumber}`;
    const planDataObject = buildPlanDataSnapshot(week, days, displayName) as Record<
      string,
      unknown
    >;

    if (saveMeta && typeof saveMeta === 'object') {
      const meta = saveMeta as WeeklyPlanSaveMetaInput;
      if (meta.title?.trim()) {
        displayName = meta.title.trim();
        planDataObject.name = displayName;
      }
      planDataObject[WEEKLY_PLAN_SAVE_META_KEY] = {
        ...meta,
        authorUsername: user?.username?.trim() || user?.name?.trim() || 'User',
        authorAvatarUrl: user?.image ?? null,
        authorCountryName: countryFields.authorCountryName ?? user?.country?.trim() ?? null,
        authorCountryFlag: countryFields.authorCountryFlag ?? null,
        workoutCount: metrics.workoutCount,
        totalMeters: metrics.totalMeters,
        totalTimeSeconds: metrics.totalTimeSeconds,
        totalSeries: metrics.totalSeries,
        createdAt: week.createdAt?.toISOString?.() ?? savedAt,
        savedAt,
        sharedAt: null,
        sourceTemplate: sourceTemplate ?? null,
      };
    }

    const planDataJson = JSON.stringify(planDataObject);

    // Replace any existing favourite for the same plan week (prevents duplicate saves).
    const existingFavorites = await prisma.favoriteWeeklyPlan.findMany({
      where: { userId: dbUserId },
      select: { id: true, planData: true, name: true },
    });

    const newKey = getFavoriteWeeklyPlanDedupeKey(planDataObject);

    const duplicateIds = existingFavorites
      .filter((fav) => {
        const parsed = parseFavoriteWeeklyPlanData(fav.planData);
        if (!parsed || typeof parsed !== 'object') return false;
        const p = parsed as Record<string, unknown>;
        if (newKey && getFavoriteWeeklyPlanDedupeKey(parsed) === newKey) return true;
        if (
          typeof p.sourcePlanId === 'string' &&
          p.sourcePlanId === week.workoutPlanId &&
          Number(p.sourceWeekNumber) === week.weekNumber
        ) {
          return true;
        }
        const weeksArr = p.weeks as Array<{ weekNumber?: number }> | undefined;
        if (
          weeksArr?.[0]?.weekNumber === week.weekNumber &&
          (fav.name === displayName ||
            fav.name === `Week ${week.weekNumber}` ||
            String(p.name ?? '') === displayName)
        ) {
          return true;
        }
        return false;
      })
      .map((fav) => fav.id);

    const favoritePlan = await prisma.$transaction(async (tx) => {
      if (duplicateIds.length > 0) {
        await tx.favoriteWeeklyPlan.deleteMany({
          where: { id: { in: duplicateIds }, userId: dbUserId },
        });
      }

      return tx.favoriteWeeklyPlan.create({
        data: {
          userId: dbUserId,
          name: displayName,
          description:
            (saveMeta as WeeklyPlanSaveMetaInput | undefined)?.shortDescription?.trim() ||
            description ||
            `Saved from ${new Date().toLocaleDateString()}`,
          planData: planDataJson,
          weeksCount: 1,
          daysCount: days.length,
          workoutsCount: totalWorkouts,
        },
      });
    });

    return NextResponse.json(
      {
        message:
          duplicateIds.length > 0
            ? 'Week favourite updated successfully'
            : 'Week saved to favorites successfully',
        duplicate: duplicateIds.length > 0,
        favorite: favoritePlan,
      },
      { status: duplicateIds.length > 0 ? 200 : 201 }
    );
  } catch (error: any) {
    console.error('Error saving favorite week:', error);
    return NextResponse.json(
      { error: 'Failed to save week to favorites', details: error.message },
      { status: 500 }
    );
  }
}
