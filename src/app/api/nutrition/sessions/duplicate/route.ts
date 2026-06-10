import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/nutrition/sessions/duplicate
 * Duplicate a workout to another day
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { workoutId, nutritionMealId: mealIdParam, targetDayId } = body;
    const nutritionMealId = mealIdParam ?? workoutId;

    if (!nutritionMealId || !targetDayId) {
      return NextResponse.json(
        { error: 'nutritionMealId and targetDayId are required' },
        { status: 400 }
      );
    }

    // Get the source workout with all its nutritionFoods and nutrition_components
    const sourceWorkout = await prisma.nutritionMeal.findUnique({
      where: { id: nutritionMealId },
      include: {
        nutritionFoods: {
          include: {
            nutritionComponents: true
          }
        }
      }
    });

    if (!sourceWorkout) {
      return NextResponse.json({ error: 'Source workout not found' }, { status: 404 });
    }

    // Verify target day exists and get existing workouts to calculate sessionNumber
    const targetDay = await prisma.nutritionDay.findUnique({
      where: { id: targetDayId },
      include: {
        meals: {
          orderBy: { sessionNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!targetDay) {
      return NextResponse.json({ error: 'Target day not found' }, { status: 404 });
    }

    // Calculate next session number
    const nextSessionNumber = targetDay.meals.length > 0 
      ? (targetDay.meals[0].sessionNumber + 1) 
      : 1;

    // Create duplicate workout
    const duplicatedWorkout = await prisma.nutritionMeal.create({
      data: {
        nutritionDayId: targetDayId,
        sessionNumber: nextSessionNumber,
        name: sourceWorkout.name,
        code: sourceWorkout.code || '',
        time: sourceWorkout.time || '',
        status: sourceWorkout.status || 'NOT_PLANNED',
        weather: sourceWorkout.weather,
        location: sourceWorkout.location,
        surface: sourceWorkout.surface,
        heartRateMax: sourceWorkout.heartRateMax,
        heartRateAvg: sourceWorkout.heartRateAvg,
        calories: sourceWorkout.calories,
        feelingStatus: sourceWorkout.feelingStatus,
        notes: sourceWorkout.notes,
        nutritionFoods: {
          create: sourceWorkout.nutritionFoods.map((mf) => ({
            letter: mf.letter,
            sport: mf.sport,
            type: mf.type,
            description: mf.description,
            sectionId: mf.sectionId,
            nutritionComponents: {
              create: mf.nutritionComponents.map((lap) => ({
                repetitionNumber: lap.repetitionNumber,
                distance: lap.distance,
                speed: lap.speed,
                style: lap.style,
                pace: lap.pace,
                time: lap.time,
                reps: lap.reps,
                restType: lap.restType,
                pause: lap.pause,
                alarm: lap.alarm,
                sound: lap.sound,
                notes: lap.notes,
                status: lap.status || 'PENDING',
                isSkipped: lap.isSkipped || false,
                isDisabled: lap.isDisabled || false
              }))
            }
          }))
        }
      },
      include: {
        nutritionFoods: {
          include: {
            nutritionComponents: true
          }
        }
      }
    });

    console.log('✅ NutritionMeal duplicated:', nutritionMealId, '→', targetDayId);

    return NextResponse.json({
      success: true,
      workout: duplicatedWorkout
    });
  } catch (error) {
    console.error('❌ Error duplicating workout:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate workout', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

