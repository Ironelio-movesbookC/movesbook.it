import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Save a single week as favorite
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
    const { weekId, name, description } = await req.json();
    
    if (!weekId) {
      return NextResponse.json({ error: 'Week ID is required' }, { status: 400 });
    }
    
    // Fetch the complete week with all its data
    const week = await prisma.nutritionWeek.findUnique({
      where: { id: weekId },
      include: {
        period: true,
        days: {
          include: {
            period: true,
            meals: {
              include: {
                sports: true,
                nutritionFoods: {
                  include: {
                    nutritionComponents: {
                      orderBy: { repetitionNumber: 'asc' }
                    },
                    section: true
                  },
                  orderBy: { letter: 'asc' }
                }
              }
            }
          },
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });
    
    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }
    
    // Calculate statistics
    let totalWorkouts = 0;
    const sportsSet = new Set<string>();
    
    week.days.forEach(day => {
      totalWorkouts += day.meals.length;
      day.meals.forEach(workout => {
        workout.nutritionFoods.forEach(mf => {
          sportsSet.add(mf.sport);
        });
      });
    });
    
    // Create favorite weekly plan (using the existing favoriteNutritionWeeklyPlan table)
    const favoritePlan = await prisma.favoriteNutritionWeeklyPlan.create({
      data: {
        userId,
        name: name || `Week ${week.weekNumber}`,
        description: description || `Saved from ${new Date().toLocaleDateString()}`,
        planData: JSON.stringify({
          name: name || `Week ${week.weekNumber}`,
          weeksCount: 1,
          daysCount: week.days.length,
          workoutsCount: totalWorkouts,
          weeks: [{
            weekNumber: week.weekNumber,
            notes: week.notes,
            periodId: week.periodId,
            periodName: week.period?.name,
            days: week.days.map(day => ({
              dayOfWeek: day.dayOfWeek,
              date: day.date,
              notes: day.notes,
              periodId: day.periodId,
              periodName: day.period?.name,
              meals: day.meals.map(workout => ({
                name: workout.name,
                code: workout.code,
                sessionNumber: workout.sessionNumber,
                time: workout.time,
                weather: workout.weather,
                location: workout.location,
                surface: workout.surface,
                notes: workout.notes,
                status: workout.status,
                sports: workout.sports.map(s => ({ sport: s.sport })),
                nutritionFoods: workout.nutritionFoods.map(mf => ({
                  letter: mf.letter,
                  sport: mf.sport,
                  type: mf.type,
                  description: mf.description,
                  notes: mf.notes,
                  workType: mf.workType,
                  sectionId: mf.sectionId,
                  sectionName: mf.section?.name,
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
                    notes: ml.notes,
                    status: ml.status,
                    isSkipped: ml.isSkipped,
                    isDisabled: ml.isDisabled
                  }))
                }))
              }))
            }))
          }]
        }),
      }
    });
    
    return NextResponse.json({ 
      message: 'Week saved to favorites successfully',
      favorite: favoritePlan 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving favorite week:', error);
    return NextResponse.json(
      { error: 'Failed to save week to favorites', details: error.message },
      { status: 500 }
    );
  }
}

