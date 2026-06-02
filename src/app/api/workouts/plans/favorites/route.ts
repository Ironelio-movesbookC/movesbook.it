import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';
import {
  getFavoriteWeeklyPlanDedupeKey,
  parseFavoriteWeeklyPlanData,
} from '@/lib/favoriteWeeklyPlanKeys';

// GET - Fetch all favorite weekly plans for the current user
export async function GET(req: NextRequest) {
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
    
    // Fetch all favorite weekly plans for this user
    const favoritePlans = await prisma.favoriteWeeklyPlan.findMany({
      where: { userId: dbUserId },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${favoritePlans.length} favorite weekly plans for user ${dbUserId}`);
    
    // Parse and format the plans, skipping any with corrupted JSON
    const parsedPlans = favoritePlans
      .map((plan) => {
        try {
          const planData = JSON.parse(plan.planData);
          return {
            id: plan.id,
            name: plan.name,
            description: plan.description || '',
            weeksCount: plan.weeksCount || 0,
            daysCount: plan.daysCount || 0,
            workoutsCount: plan.workoutsCount || 0,
            lastUsed: plan.updatedAt.toISOString(),
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
            planData,
          };
        } catch (parseError) {
          console.error(`Error parsing plan ${plan.id}:`, parseError);
          prisma.favoriteWeeklyPlan.delete({ where: { id: plan.id } }).catch((err) =>
            console.error('Error deleting corrupted plan:', err)
          );
          return null;
        }
      })
      .filter((plan): plan is NonNullable<typeof plan> => plan !== null);

    // One card per logical week (newest wins) — hides legacy 7× duplicates in the UI.
    const newestByKey = new Map<string, (typeof parsedPlans)[number]>();
    const noKeyPlans: (typeof parsedPlans)[number][] = [];
    for (const plan of parsedPlans) {
      const key = getFavoriteWeeklyPlanDedupeKey(plan.planData);
      if (!key) {
        noKeyPlans.push(plan);
        continue;
      }
      const existing = newestByKey.get(key);
      if (
        !existing ||
        new Date(plan.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
      ) {
        newestByKey.set(key, plan);
      }
    }

    const formattedPlans = [...Array.from(newestByKey.values()), ...noKeyPlans]
      .map(({ updatedAt: _u, ...rest }) => rest)
      .sort(
        (a, b) =>
          new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      );

    console.log(`✅ Returning ${formattedPlans.length} formatted plans`);
    
    return NextResponse.json({ plans: formattedPlans }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching favorite weekly plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorite weekly plans', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Save a weekly plan as favorite
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

    const { planId, name, description, duplicateFromFavoriteId } = await req.json();

    if (duplicateFromFavoriteId) {
      const source = await prisma.favoriteWeeklyPlan.findFirst({
        where: { id: duplicateFromFavoriteId, userId: dbUserId },
      });
      if (!source) {
        return NextResponse.json({ error: 'Source favourite not found' }, { status: 404 });
      }
      const duplicate = await prisma.favoriteWeeklyPlan.create({
        data: {
          userId: dbUserId,
          name: name || `${source.name} (copy)`,
          description: source.description,
          planData: source.planData,
          weeksCount: source.weeksCount,
          daysCount: source.daysCount,
          workoutsCount: source.workoutsCount,
        },
      });
      return NextResponse.json(
        { message: 'Favourite duplicated', favorite: duplicate },
        { status: 201 }
      );
    }
    
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }
    
    // Fetch the complete plan with all its data
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: planId },
      include: {
        weeks: {
          include: {
            days: {
              include: {
                workouts: {
                  include: {
                    sports: true,
                    moveframes: {
                      include: {
                        movelaps: {
                          orderBy: { repetitionNumber: 'asc' }
                        }
                      },
                      orderBy: { letter: 'asc' }
                    }
                  }
                }
              }
            }
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    });
    
    if (!plan || plan.userId !== dbUserId) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    // Calculate statistics
    let totalDays = 0;
    let totalWorkouts = 0;
    
    plan.weeks.forEach(week => {
      totalDays += week.days.length;
      week.days.forEach(day => {
        totalWorkouts += day.workouts.length;
      });
    });
    
    // Create favorite plan snapshot
    const favoritePlan = await prisma.favoriteWeeklyPlan.create({
      data: {
        userId: dbUserId,
        name: name || plan.name,
        description: description || `Saved from ${new Date().toLocaleDateString()}`,
        planData: JSON.stringify({
          name: plan.name,
          type: plan.type,
          storageZone: plan.storageZone,
          weeks: plan.weeks.map(week => ({
            weekNumber: week.weekNumber,
            notes: week.notes,
            days: week.days.map(day => ({
              dayOfWeek: day.dayOfWeek,
              weather: day.weather,
              feelingStatus: day.feelingStatus,
              notes: day.notes,
              workouts: day.workouts.map(session => ({
                name: session.name,
                code: session.code,
                sessionNumber: session.sessionNumber,
                time: session.time,
                weather: session.weather,
                location: session.location,
                surface: session.surface,
                notes: session.notes,
                sports: session.sports.map(s => ({ sport: s.sport })),
                moveframes: session.moveframes.map(mf => ({
                  letter: mf.letter,
                  sport: mf.sport,
                  type: mf.type,
                  description: mf.description,
                  notes: mf.notes,
                  workType: mf.workType,
                  movelaps: mf.movelaps.map(ml => ({
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
                    notes: ml.notes
                  }))
                }))
              }))
            }))
          }))
        }),
        weeksCount: plan.weeks.length,
        daysCount: totalDays,
        workoutsCount: totalWorkouts
      }
    });
    
    return NextResponse.json({ 
      message: 'Weekly plan saved to favorites successfully',
      favorite: favoritePlan 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving favorite weekly plan:', error);
    return NextResponse.json(
      { error: 'Failed to save weekly plan to favorites', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove a favorite weekly plan
export async function DELETE(req: NextRequest) {
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
    
    const { searchParams } = new URL(req.url);
    const favoriteId = searchParams.get('id');
    
    if (!favoriteId) {
      return NextResponse.json({ error: 'Favorite ID is required' }, { status: 400 });
    }
    
    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const target = await prisma.favoriteWeeklyPlan.findFirst({
      where: { id: favoriteId, userId: dbUserId },
      select: { id: true, planData: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    const targetKey = getFavoriteWeeklyPlanDedupeKey(
      parseFavoriteWeeklyPlanData(target.planData)
    );

    const idsToDelete = new Set<string>([favoriteId]);
    if (targetKey) {
      const allForUser = await prisma.favoriteWeeklyPlan.findMany({
        where: { userId: dbUserId },
        select: { id: true, planData: true },
      });
      for (const row of allForUser) {
        const key = getFavoriteWeeklyPlanDedupeKey(parseFavoriteWeeklyPlanData(row.planData));
        if (key === targetKey) idsToDelete.add(row.id);
      }
    }

    const result = await prisma.favoriteWeeklyPlan.deleteMany({
      where: {
        id: { in: Array.from(idsToDelete) },
        userId: dbUserId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message:
          result.count > 1
            ? `Removed ${result.count} duplicate favourite week entries`
            : 'Favorite plan deleted successfully',
        deletedCount: result.count,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting favorite plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete favorite plan', details: error.message },
      { status: 500 }
    );
  }
}

