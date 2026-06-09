import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params for Next.js compatibility
    const params = context.params instanceof Promise ? await context.params : context.params;
    
    // Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { workType } = body;
    const nutritionFoodId = params.id;

    if (!['NONE', 'MAIN', 'SECONDARY'].includes(workType)) {
      return NextResponse.json({ success: false, error: 'Invalid work type' }, { status: 400 });
    }

    // Get the nutritionFood to know its sport and day
    const nutritionFood = await prisma.nutritionFood.findUnique({
      where: { id: nutritionFoodId },
      include: {
        nutritionMeal: {
          include: {
            nutritionDay: true
          }
        }
      }
    });

    if (!nutritionFood) {
      return NextResponse.json({ success: false, error: 'NutritionFood not found' }, { status: 404 });
    }

    const dayId = nutritionFood.nutritionMeal.nutritionDayId;
    const sport = nutritionFood.sport;

    console.log(`🎯 Setting work type for nutritionFood ${nutritionFoodId}:`);
    console.log(`   Sport: ${sport}, New work type: ${workType}`);

    // If setting to MAIN or SECONDARY, reset other nutritionFoods OF THE SAME SPORT in the day
    // (Per sport rule: only ONE MAIN and ONE SECONDARY per sport per day)
    if (workType === 'MAIN' || workType === 'SECONDARY') {
      // Find ALL nutritionFoods of the SAME SPORT in this day
      const dayWorkouts = await prisma.nutritionMeal.findMany({
        where: { nutritionDayId: dayId },
        include: {
          nutritionFoods: {
            where: {
              sport: sport, // Same sport only!
              NOT: { id: nutritionFoodId }
            }
          }
        }
      });

      // Get ALL nutritionFoods of this sport in the day
      const sameSportNutritionFoods = dayWorkouts.flatMap(w => w.nutritionFoods);
      console.log(`   Found ${sameSportNutritionFoods.length} other nutritionFoods of sport ${sport} in this day`);

      // Filter and reset ONLY those with the same work type we're trying to set
      const nutrition_foodsToReset = sameSportNutritionFoods.filter(mf => mf.workType === workType);
      console.log(`   Resetting ${nutrition_foodsToReset.length} nutritionFoods with workType=${workType}`);

      // Reset them to NONE
      for (const mfToReset of nutrition_foodsToReset) {
        await prisma.nutritionFood.update({
          where: { id: mfToReset.id },
          data: { workType: 'NONE' }
        });
        console.log(`   ✅ Reset nutritionFood ${mfToReset.id} to NONE`);
      }
    }

    // If RESETTING a MAIN work to NONE, promote SECONDARY to MAIN for this sport
    if (workType === 'NONE' && nutritionFood.workType === 'MAIN') {
      console.log(`   🔄 Resetting MAIN work, checking for SECONDARY to promote...`);
      
      // Find SECONDARY work of the same sport in this day
      const dayWorkouts = await prisma.nutritionMeal.findMany({
        where: { nutritionDayId: dayId },
        include: {
          nutritionFoods: {
            where: {
              sport: sport,
              workType: 'SECONDARY',
              NOT: { id: nutritionFoodId }
            }
          }
        }
      });

      const secondaryNutritionFoods = dayWorkouts.flatMap(w => w.nutritionFoods);
      
      if (secondaryNutritionFoods.length > 0) {
        const secondaryToPromote = secondaryNutritionFoods[0];
        await prisma.nutritionFood.update({
          where: { id: secondaryToPromote.id },
          data: { workType: 'MAIN' }
        });
        console.log(`   ⬆️ Promoted nutritionFood ${secondaryToPromote.id} from SECONDARY to MAIN`);
      } else {
        console.log(`   ℹ️ No SECONDARY work found to promote`);
      }
    }

    // Update the target nutritionFood
    const updatedNutritionFood = await prisma.nutritionFood.update({
      where: { id: nutritionFoodId },
      data: { workType },
      include: {
        section: true,
        nutritionComponents: {
          orderBy: { repetitionNumber: 'asc' }
        }
      }
    });

    // Get ALL nutritionFoods in the day to return updated state (all sports)
    const allDayWorkouts = await prisma.nutritionMeal.findMany({
      where: { nutritionDayId: dayId },
      include: {
        nutritionFoods: true
      }
    });

    const allDayNutritionFoods = allDayWorkouts.flatMap(w => w.nutritionFoods);

    console.log(`✅ Work type updated successfully`);
    console.log(`   Returning ${allDayNutritionFoods.length} nutritionFoods in this day`);

    return NextResponse.json({
      success: true,
      nutritionFood: updatedNutritionFood,
      affectedNutritionFoods: allDayNutritionFoods // Return ALL nutritionFoods in the day with their updated work types
    });
  } catch (error) {
    console.error('Error setting work type:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to set work type',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

