import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/nutrition/nutrition_foods/cleanup-annotations
 * Clean up annotation fields from non-ANNOTATION type nutrition_foods
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

    console.log('🧹 Starting cleanup of annotation fields from non-ANNOTATION nutrition_foods...');

    // Find all nutritionFoods that are NOT ANNOTATION type but have annotation colors set
    const nutrition_foodsToClean = await prisma.nutritionFood.findMany({
      where: {
        type: { not: 'ANNOTATION' },
        OR: [
          { annotationBgColor: { not: null } },
          { annotationTextColor: { not: null } },
          { annotationText: { not: null } }
        ]
      },
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

    // Filter to only user's nutrition_foods
    const userNutritionFoods = nutrition_foodsToClean.filter(
      mf => mf.nutritionMeal.nutritionDay.userId === decoded.userId
    );

    console.log(`📊 Found ${userNutritionFoods.length} nutritionFoods to clean for user ${decoded.userId}`);

    // Update all found nutritionFoods to clear annotation fields
    const updatePromises = userNutritionFoods.map(mf =>
      prisma.nutritionFood.update({
        where: { id: mf.id },
        data: {
          annotationText: null,
          annotationBgColor: null,
          annotationTextColor: null,
          annotationBold: false
        }
      })
    );

    await Promise.all(updatePromises);

    console.log(`✅ Cleaned ${userNutritionFoods.length} nutrition_foods`);

    return NextResponse.json({
      success: true,
      cleanedCount: userNutritionFoods.length,
      message: `Cleaned annotation fields from ${userNutritionFoods.length} non-annotation nutrition_foods`
    });

  } catch (error) {
    console.error('❌ Error cleaning up annotations:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup annotations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

