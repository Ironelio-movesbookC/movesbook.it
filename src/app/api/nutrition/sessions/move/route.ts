import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


// POST /api/nutrition/sessions/move - Move a workout session to another day
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
    const { workoutId, nutritionMealId: mealIdParam, targetDayId, sessionNumber } = body;
    const nutritionMealId = mealIdParam ?? workoutId;

    console.log('🚚 Moving workout:', { nutritionMealId, targetDayId, sessionNumber });

    // Validate required fields
    if (!nutritionMealId || !targetDayId) {
      return NextResponse.json(
        { error: 'nutritionMealId and targetDayId are required' },
        { status: 400 }
      );
    }

    // Get the current workout to check if it's moving to a different day
    const currentWorkout = await prisma.nutritionMeal.findUnique({
      where: { id: nutritionMealId },
      select: { nutritionDayId: true }
    });

    if (!currentWorkout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Check existing workouts for the target day
    const existingWorkouts = await prisma.nutritionMeal.findMany({
      where: { nutritionDayId: targetDayId },
      select: { id: true, sessionNumber: true }
    });

    // Validate: max 4 meals per day (only if moving to a DIFFERENT day)
    if (currentWorkout.nutritionDayId !== targetDayId) {
      // Moving to a different day
      if (existingWorkouts.length >= 4) {
        return NextResponse.json(
          { error: 'Cannot move meal: Maximum 4 meals per day allowed' },
          { status: 400 }
        );
      }
    }

    // Determine session number if not provided
    let newSessionNumber = sessionNumber;
    if (!newSessionNumber) {
      newSessionNumber = Math.max(0, ...existingWorkouts.map(w => w.sessionNumber)) + 1;
    }

    // Update the workout with new day and session number
    const movedWorkout = await prisma.nutritionMeal.update({
      where: { id: nutritionMealId },
      data: {
        nutritionDayId: targetDayId,
        sessionNumber: newSessionNumber
      },
      include: {
        sports: true,
        nutritionFoods: {
          include: {
            nutritionComponents: true,
            section: true
          }
        }
      }
    });

    console.log('✅ NutritionMeal moved successfully:', movedWorkout.id);

    return NextResponse.json({ workout: movedWorkout });
  } catch (error: any) {
    console.error('❌ Error moving workout:', error);
    return NextResponse.json(
      { error: 'Failed to move workout', details: error.message },
      { status: 500 }
    );
  }
}
