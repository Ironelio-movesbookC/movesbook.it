import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


// POST /api/nutrition/nutrition_foods/move - Move a nutritionFood to another workout
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
    const {
      nutritionFoodId,
      targetWorkoutId,
      position = 'after',
      targetNutritionFoodId
    } = body;

    console.log('📝 Moving nutritionFood:', { 
      nutritionFoodId, 
      targetWorkoutId, 
      position, 
      targetNutritionFoodId 
    });

    // Validate required fields
    if (!nutritionFoodId || !targetWorkoutId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get source nutritionFood
    const nutritionFood = await prisma.nutritionFood.findUnique({
      where: { id: nutritionFoodId },
      include: {
        nutritionComponents: true,
        section: true
      }
    });

    if (!nutritionFood) {
      return NextResponse.json(
        { error: 'NutritionFood not found' },
        { status: 404 }
      );
    }

    // Handle position-based operations
    let newLetter = nutritionFood.letter;
    
    if (position === 'replace' && targetNutritionFoodId) {
      // Delete the target nutritionFood first
      const targetNutritionFood = await prisma.nutritionFood.findUnique({
        where: { id: targetNutritionFoodId },
        select: { letter: true }
      });
      
      await prisma.nutritionFood.delete({
        where: { id: targetNutritionFoodId }
      });
      
      newLetter = targetNutritionFood?.letter || nutritionFood.letter;
    } else if (targetWorkoutId !== nutritionFood.nutritionMealId) {
      // Moving to a different workout - get next available letter
      const existingNutritionFoods = await prisma.nutritionFood.findMany({
        where: { nutritionMealId: targetWorkoutId },
        select: { letter: true }
      });
      
      const usedLetters = new Set(existingNutritionFoods.map(mf => mf.letter));
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      newLetter = letters.split('').find(l => !usedLetters.has(l)) || nutritionFood.letter;
    }

    // Update nutritionFood with new workout and letter
    const updatedNutritionFood = await prisma.nutritionFood.update({
      where: { id: nutritionFoodId },
      data: {
        nutritionMealId: targetWorkoutId,
        letter: newLetter
      },
      include: {
        nutritionComponents: {
          orderBy: { repetitionNumber: 'asc' }
        },
        section: true
      }
    });

    console.log('✅ NutritionFood moved successfully:', updatedNutritionFood.id);

    return NextResponse.json(updatedNutritionFood);
  } catch (error: any) {
    console.error('❌ Error moving nutritionFood:', error);
    return NextResponse.json(
      { error: 'Failed to move nutritionFood', details: error.message },
      { status: 500 }
    );
  }
}
