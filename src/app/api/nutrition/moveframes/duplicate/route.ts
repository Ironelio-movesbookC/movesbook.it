import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/nutrition/nutrition_foods/duplicate
 * Duplicate a nutritionFood (with its nutrition_components) to another workout
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
    const { nutritionFoodId, targetWorkoutId, position, insertBeforeId } = body;

    if (!nutritionFoodId || !targetWorkoutId) {
      return NextResponse.json(
        { error: 'nutritionFoodId and targetWorkoutId are required' },
        { status: 400 }
      );
    }

    // Get the source nutritionFood with all its nutrition_components
    const sourceNutritionFood = await prisma.nutritionFood.findUnique({
      where: { id: nutritionFoodId },
      include: {
        nutritionComponents: true
      }
    });

    if (!sourceNutritionFood) {
      return NextResponse.json({ error: 'Source nutritionFood not found' }, { status: 404 });
    }

    // Verify target workout exists
    const targetWorkout = await prisma.nutritionMeal.findUnique({
      where: { id: targetWorkoutId }
    });

    if (!targetWorkout) {
      return NextResponse.json({ error: 'Target workout not found' }, { status: 404 });
    }

    // Create duplicate nutritionFood (ordering handled by createdAt timestamp)
    // Only include fields that exist in the NutritionFood model
    const duplicatedNutritionFood = await prisma.nutritionFood.create({
      data: {
        nutritionMealId: targetWorkoutId,
        letter: sourceNutritionFood.letter,
        sport: sourceNutritionFood.sport,
        type: sourceNutritionFood.type,
        description: sourceNutritionFood.description,
        sectionId: sourceNutritionFood.sectionId,
        nutritionComponents: {
          create: sourceNutritionFood.nutritionComponents.map((lap) => ({
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
      },
      include: {
        nutritionComponents: true
      }
    });

    console.log('✅ NutritionFood duplicated:', nutritionFoodId, '→', targetWorkoutId);

    return NextResponse.json({
      success: true,
      nutritionFood: duplicatedNutritionFood
    });
  } catch (error) {
    console.error('❌ Error duplicating nutritionFood:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate nutritionFood', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

