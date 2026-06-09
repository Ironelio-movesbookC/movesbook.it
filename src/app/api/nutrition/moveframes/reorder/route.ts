import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/nutrition/nutrition_foods/reorder
 * Reorder nutritionFoods and update their letters alphabetically
 * 
 * Request Body:
 * {
 *   nutritionFoods: [
 *     { id: string, letter: string },
 *     ...
 *   ]
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
    const { nutritionFoods } = body;

    if (!nutritionFoods || !Array.isArray(nutritionFoods)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { nutritionFoods: [{ id, letter }] }' },
        { status: 400 }
      );
    }

    // Validate that all nutritionFoods belong to the user's workouts
    const nutritionFoodIds = nutritionFoods.map((mf: any) => mf.id);
    
    const existingNutritionFoods = await prisma.nutritionFood.findMany({
      where: {
        id: { in: nutritionFoodIds },
        nutritionMeal: {
          nutritionDay: {
            userId: decoded.userId
          }
        }
      },
      select: { id: true }
    });

    if (existingNutritionFoods.length !== nutritionFoodIds.length) {
      return NextResponse.json(
        { error: 'Some nutritionFoods do not exist or do not belong to the user' },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const mf of nutritionFoods as { id: string; letter: string }[]) {
        await tx.nutritionFood.update({
          where: { id: mf.id },
          data: { letter: mf.letter },
        });
      }
    });

    // Note: NutritionComponent letters are dynamically derived from parent nutritionFood
    // No need to update nutrition_components separately - they will automatically 
    // display with the correct letter based on their parent nutritionFood

    return NextResponse.json(
      { 
        success: true, 
        message: 'NutritionFoods reordered successfully',
        updatedCount: nutritionFoods.length
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error reordering nutritionFoods:', error);
    return NextResponse.json(
      { error: 'Failed to reorder nutrition_foods' },
      { status: 500 }
    );
  }
}
