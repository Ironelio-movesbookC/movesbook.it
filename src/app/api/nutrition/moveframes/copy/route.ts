import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


// POST /api/nutrition/nutrition_foods/copy - Copy a nutritionFood to another workout
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
      sourceNutritionFoodId,
      targetWorkoutId,
      position = 'after',
      targetNutritionFoodId
    } = body;

    console.log('📝 Copying nutritionFood:', { 
      sourceNutritionFoodId, 
      targetWorkoutId, 
      position, 
      targetNutritionFoodId 
    });

    // Validate required fields
    if (!sourceNutritionFoodId || !targetWorkoutId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get source nutritionFood with all nutrition_components
    const sourceNutritionFood = await prisma.nutritionFood.findUnique({
      where: { id: sourceNutritionFoodId },
      include: {
        nutritionComponents: {
          orderBy: { repetitionNumber: 'asc' }
        },
        section: true
      }
    });

    if (!sourceNutritionFood) {
      return NextResponse.json(
        { error: 'Source nutritionFood not found' },
        { status: 404 }
      );
    }

    // Handle position-based insertion
    let newLetter = sourceNutritionFood.letter;
    
    if (position === 'replace' && targetNutritionFoodId) {
      // Delete the target nutritionFood first
      await prisma.nutritionFood.delete({
        where: { id: targetNutritionFoodId }
      });
      
      // Get the letter from the deleted nutritionFood
      const targetNutritionFood = await prisma.nutritionFood.findUnique({
        where: { id: targetNutritionFoodId },
        select: { letter: true }
      });
      newLetter = targetNutritionFood?.letter || sourceNutritionFood.letter;
    } else if (position === 'before' && targetNutritionFoodId) {
      // Get existing nutritionFoods to calculate new letter
      const targetNutritionFood = await prisma.nutritionFood.findUnique({
        where: { id: targetNutritionFoodId },
        select: { letter: true }
      });
      
      // For simplicity, we'll use the next available letter
      const existingNutritionFoods = await prisma.nutritionFood.findMany({
        where: { nutritionMealId: targetWorkoutId },
        select: { letter: true }
      });
      
      const usedLetters = new Set(existingNutritionFoods.map(mf => mf.letter));
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      newLetter = letters.split('').find(l => !usedLetters.has(l)) || 'A';
    } else {
      // position === 'after' - get next available letter
      const existingNutritionFoods = await prisma.nutritionFood.findMany({
        where: { nutritionMealId: targetWorkoutId },
        select: { letter: true }
      });
      
      const usedLetters = new Set(existingNutritionFoods.map(mf => mf.letter));
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      newLetter = letters.split('').find(l => !usedLetters.has(l)) || 'A';
    }

    // Create new nutritionFood (copy)
    const newNutritionFood = await prisma.nutritionFood.create({
      data: {
        nutritionMealId: targetWorkoutId,
        letter: newLetter,
        sport: sourceNutritionFood.sport,
        sectionId: sourceNutritionFood.sectionId,
        type: sourceNutritionFood.type,
        description: sourceNutritionFood.description
      }
    });

    // Copy all nutrition_components
    for (const nutritionComponent of sourceNutritionFood.nutritionComponents) {
      await prisma.nutritionComponent.create({
        data: {
          nutritionFoodId: newNutritionFood.id,
          repetitionNumber: nutritionComponent.repetitionNumber,
          distance: nutritionComponent.distance,
          speed: nutritionComponent.speed,
          style: nutritionComponent.style,
          pace: nutritionComponent.pace,
          time: nutritionComponent.time,
          reps: nutritionComponent.reps,
          restType: nutritionComponent.restType,
          pause: nutritionComponent.pause,
          alarm: nutritionComponent.alarm,
          sound: nutritionComponent.sound,
          notes: nutritionComponent.notes,
          status: 'PENDING', // Reset status for copied nutrition_components
          isSkipped: false,
          isDisabled: false
        }
      });
    }

    // Fetch the complete new nutritionFood with nutrition_components
    const completeNutritionFood = await prisma.nutritionFood.findUnique({
      where: { id: newNutritionFood.id },
      include: {
        nutritionComponents: {
          orderBy: { repetitionNumber: 'asc' }
        },
        section: true
      }
    });

    console.log('✅ NutritionFood copied successfully:', completeNutritionFood?.id);

    return NextResponse.json(completeNutritionFood, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error copying nutritionFood:', error);
    return NextResponse.json(
      { error: 'Failed to copy nutritionFood', details: error.message },
      { status: 500 }
    );
  }
}

