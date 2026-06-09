import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

function countsFromPlanData(planData: string) {
  try {
    const data = JSON.parse(planData) as {
      weeks?: Array<{ days?: Array<{ meals?: unknown[]; workouts?: unknown[] }> }>;
    };
    const weeks = data.weeks ?? [];
    let daysCount = 0;
    let mealsCount = 0;
    for (const week of weeks) {
      const days = week.days ?? [];
      daysCount += days.length;
      for (const day of days) {
        const meals = day.meals ?? day.workouts ?? [];
        mealsCount += meals.length;
      }
    }
    return {
      weeksCount: weeks.length,
      daysCount,
      workoutsCount: mealsCount,
    };
  } catch {
    return { weeksCount: 0, daysCount: 0, workoutsCount: 0 };
  }
}

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
    
    const userId = decoded.userId;
    
    // Fetch all favorite weekly plans for this user
    const favoritePlans = await prisma.favoriteNutritionWeeklyPlan.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${favoritePlans.length} favorite weekly plans for user ${userId}`);
    
    // Parse and format the plans, skipping any with corrupted JSON
    const formattedPlans = favoritePlans.map(plan => {
      try {
        const counts = countsFromPlanData(plan.planData);
        return {
          id: plan.id,
          name: plan.name,
          description: plan.description || '',
          weeksCount: counts.weeksCount,
          daysCount: counts.daysCount,
          workoutsCount: counts.workoutsCount,
          lastUsed: plan.updatedAt.toISOString(),
          createdAt: plan.createdAt,
          planData: JSON.parse(plan.planData)
        };
      } catch (parseError) {
        console.error(`Error parsing plan ${plan.id}:`, parseError);
        // Delete corrupted plan from database
        prisma.favoriteNutritionWeeklyPlan.delete({ where: { id: plan.id } }).catch(err => 
          console.error('Error deleting corrupted plan:', err)
        );
        return null;
      }
    }).filter(plan => plan !== null);
    
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
    
    const userId = decoded.userId;
    const { planId, name, description } = await req.json();
    
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }
    
    // Fetch the complete plan with all its data
    const plan = await prisma.nutritionPlan.findUnique({
      where: { id: planId },
      include: {
        weeks: {
          include: {
            days: {
              include: {
                meals: {
                  include: {
                    sports: true,
                    nutritionFoods: {
                      include: {
                        nutritionComponents: {
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
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    // Calculate statistics
    let totalDays = 0;
    let totalMeals = 0;

    plan.weeks.forEach(week => {
      totalDays += week.days.length;
      week.days.forEach(day => {
        totalMeals += day.meals.length;
      });
    });

    // Create favorite plan snapshot
    const favoritePlan = await prisma.favoriteNutritionWeeklyPlan.create({
      data: {
        userId,
        name: name || plan.name,
        description: description || `Saved from ${new Date().toLocaleDateString()}`,
        planData: JSON.stringify({
          name: plan.name,
          type: plan.type,
          storageZone: plan.storageZone,
          weeksCount: plan.weeks.length,
          daysCount: totalDays,
          workoutsCount: totalMeals,
          weeks: plan.weeks.map(week => ({
            weekNumber: week.weekNumber,
            notes: week.notes,
            days: week.days.map(day => ({
              dayOfWeek: day.dayOfWeek,
              weather: day.weather,
              feelingStatus: day.feelingStatus,
              notes: day.notes,
              meals: day.meals.map(session => ({
                name: session.name,
                code: session.code,
                sessionNumber: session.sessionNumber,
                time: session.time,
                weather: session.weather,
                location: session.location,
                surface: session.surface,
                notes: session.notes,
                sports: session.sports.map(s => ({ sport: s.sport })),
                nutritionFoods: session.nutritionFoods.map(mf => ({
                  letter: mf.letter,
                  sport: mf.sport,
                  type: mf.type,
                  description: mf.description,
                  notes: mf.notes,
                  workType: mf.workType,
                  nutritionComponents: mf.nutritionComponents.map(ml => ({
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
    
    // Delete the favorite (user ownership is checked by Prisma)
    await prisma.favoriteNutritionWeeklyPlan.delete({
      where: {
        id: favoriteId,
        userId: decoded.userId
      }
    });
    
    return NextResponse.json({ message: 'Favorite plan deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting favorite plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete favorite plan', details: error.message },
      { status: 500 }
    );
  }
}

