import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/nutrition/nutrition_foods/move-to-workout
 * Move a nutritionFood to a different workout (cross-workout drag)
 * 
 * Request Body:
 * {
 *   nutritionFoodId: string,
 *   targetWorkoutId: string,
 *   targetIndex: number (optional, position in target workout)
 * }
 */
export async function PATCH(request: NextRequest) {
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
    const { nutritionFoodId, targetWorkoutId, targetIndex } = body;

    if (!nutritionFoodId || !targetWorkoutId) {
      return NextResponse.json(
        { error: 'nutritionFoodId and targetWorkoutId are required' },
        { status: 400 }
      );
    }

    // Verify the nutritionFood belongs to the user
    const nutritionFood = await prisma.nutritionFood.findUnique({
      where: { id: nutritionFoodId },
      include: {
        nutritionMeal: {
          include: {
            nutritionDay: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!nutritionFood) {
      return NextResponse.json({ error: 'NutritionFood not found' }, { status: 404 });
    }

    if (nutritionFood.nutritionMeal.nutritionDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify the target workout belongs to the user
    const targetWorkout = await prisma.nutritionMeal.findUnique({
      where: { id: targetWorkoutId },
      include: {
        nutritionDay: {
          select: { userId: true }
        },
        nutritionFoods: {
          orderBy: { letter: 'asc' }
        }
      }
    });

    if (!targetWorkout) {
      return NextResponse.json({ error: 'Target workout not found' }, { status: 404 });
    }

    if (targetWorkout.nutritionDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Move the nutritionFood to the target workout
    await prisma.$transaction(async (tx) => {
      // Update the nutritionFood's nutritionMealId
      await tx.nutritionFood.update({
        where: { id: nutritionFoodId },
        data: {
          nutritionMealId: targetWorkoutId
        }
      });

      // Get all nutritionFoods in the target workout (including the one we just moved)
      const allNutritionFoods = await tx.nutritionFood.findMany({
        where: { nutritionMealId: targetWorkoutId },
        orderBy: { letter: 'asc' }
      });

      // If targetIndex is provided, reorder accordingly
      if (typeof targetIndex === 'number' && targetIndex >= 0) {
        const reordered = [...allNutritionFoods];
        const movedItem = reordered.find(mf => mf.id === nutritionFoodId);
        const currentIndex = reordered.findIndex(mf => mf.id === nutritionFoodId);
        
        if (movedItem && currentIndex !== -1) {
          reordered.splice(currentIndex, 1);
          reordered.splice(Math.min(targetIndex, reordered.length), 0, movedItem);
          
          // Re-assign letters alphabetically
          for (let i = 0; i < reordered.length; i++) {
            await tx.nutritionFood.update({
              where: { id: reordered[i].id },
              data: { letter: String.fromCharCode(65 + i) } // A, B, C, D...
            });
          }
        }
      } else {
        // Just re-letter all nutritionFoods alphabetically
        for (let i = 0; i < allNutritionFoods.length; i++) {
          await tx.nutritionFood.update({
            where: { id: allNutritionFoods[i].id },
            data: { letter: String.fromCharCode(65 + i) }
          });
        }
      }
    });

    return NextResponse.json(
      { success: true, message: 'NutritionFood moved successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error moving nutritionFood:', error);
    return NextResponse.json(
      { error: 'Failed to move nutritionFood' },
      { status: 500 }
    );
  }
}

