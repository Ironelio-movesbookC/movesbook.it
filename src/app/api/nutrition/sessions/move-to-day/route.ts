import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/nutrition/sessions/move-to-day
 * Move a workout session to a different day (cross-day drag)
 * 
 * Request Body:
 * {
 *   nutritionMealId: string,
 *   targetDayId: string,
 *   targetIndex: number (optional, position in target day)
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
    const { workoutId, nutritionMealId: mealIdParam, targetDayId, targetIndex } = body;
    const nutritionMealId = mealIdParam ?? workoutId;

    if (!nutritionMealId || !targetDayId) {
      return NextResponse.json(
        { error: 'nutritionMealId and targetDayId are required' },
        { status: 400 }
      );
    }

    // Verify the workout belongs to the user
    const workout = await prisma.nutritionMeal.findUnique({
      where: { id: nutritionMealId },
      include: {
        nutritionDay: {
          select: { userId: true }
        }
      }
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    if (workout.nutritionDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify the target day belongs to the user
    const targetDay = await prisma.nutritionDay.findUnique({
      where: { id: targetDayId },
      select: { userId: true }
    });

    if (!targetDay) {
      return NextResponse.json({ error: 'Target day not found' }, { status: 404 });
    }

    if (targetDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if target day already has 4 meals (max limit)
    const existingWorkoutsCount = await prisma.nutritionMeal.count({
      where: { 
        nutritionDayId: targetDayId,
        id: { not: nutritionMealId } // Exclude the workout being moved if it's in the same day
      }
    });

    if (existingWorkoutsCount >= 4) {
      return NextResponse.json(
        { error: 'Cannot move meal: Maximum 4 meals per day allowed' },
        { status: 400 }
      );
    }

    // Move the workout to the target day
    await prisma.$transaction(async (tx) => {
      // Update the workout's nutritionDayId
      await tx.nutritionMeal.update({
        where: { id: nutritionMealId },
        data: {
          nutritionDayId: targetDayId
        }
      });

      // Get all workouts in the target day (including the one we just moved)
      const allWorkouts = await tx.nutritionMeal.findMany({
        where: { nutritionDayId: targetDayId },
        orderBy: { sessionNumber: 'asc' }
      });

      // Reassign session numbers (1, 2, 3)
      if (typeof targetIndex === 'number' && targetIndex >= 0) {
        const reordered = [...allWorkouts];
        const movedItem = reordered.find(w => w.id === nutritionMealId);
        const currentIndex = reordered.findIndex(w => w.id === nutritionMealId);
        
        if (movedItem && currentIndex !== -1) {
          reordered.splice(currentIndex, 1);
          reordered.splice(Math.min(targetIndex, reordered.length), 0, movedItem);
          
          // Re-assign session numbers
          for (let i = 0; i < reordered.length; i++) {
            await tx.nutritionMeal.update({
              where: { id: reordered[i].id },
              data: { sessionNumber: i + 1 } // 1, 2, 3
            });
          }
        }
      } else {
        // Just re-number all workouts sequentially
        for (let i = 0; i < allWorkouts.length; i++) {
          await tx.nutritionMeal.update({
            where: { id: allWorkouts[i].id },
            data: { sessionNumber: i + 1 }
          });
        }
      }
    });

    return NextResponse.json(
      { success: true, message: 'Workout moved successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error moving workout:', error);
    return NextResponse.json(
      { error: 'Failed to move workout' },
      { status: 500 }
    );
  }
}

