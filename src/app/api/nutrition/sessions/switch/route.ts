import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/nutrition/sessions/switch
 * Switch two workouts between days
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
    const { workout1Id, workout2Id } = body;

    if (!workout1Id || !workout2Id) {
      return NextResponse.json(
        { error: 'workout1Id and workout2Id are required' },
        { status: 400 }
      );
    }

    // Get both workouts
    const workout1 = await prisma.nutritionMeal.findUnique({
      where: { id: workout1Id },
      select: { id: true, nutritionDayId: true }
    });

    const workout2 = await prisma.nutritionMeal.findUnique({
      where: { id: workout2Id },
      select: { id: true, nutritionDayId: true }
    });

    if (!workout1 || !workout2) {
      return NextResponse.json({ error: 'One or both workouts not found' }, { status: 404 });
    }

    // Store original days
    const day1 = workout1.nutritionDayId;
    const day2 = workout2.nutritionDayId;

    // Switch the workouts between days
    // Use a transaction to ensure atomicity
    const [updatedWorkout1, updatedWorkout2] = await prisma.$transaction([
      prisma.nutritionMeal.update({
        where: { id: workout1Id },
        data: { nutritionDayId: day2 },
        include: {
          nutritionFoods: {
            include: {
              nutritionComponents: true
            }
          }
        }
      }),
      prisma.nutritionMeal.update({
        where: { id: workout2Id },
        data: { nutritionDayId: day1 },
        include: {
          nutritionFoods: {
            include: {
              nutritionComponents: true
            }
          }
        }
      })
    ]);

    console.log('✅ Workouts switched:', workout1Id, '↔', workout2Id);

    return NextResponse.json({
      success: true,
      meals: [updatedWorkout1, updatedWorkout2]
    });
  } catch (error) {
    console.error('❌ Error switching meals:', error);
    return NextResponse.json(
      { error: 'Failed to switch workouts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

