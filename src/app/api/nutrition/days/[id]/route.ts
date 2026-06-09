import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const day = await prisma.nutritionDay.findUnique({
      where: { id: params.id },
      include: {
        period: true,
        meals: {
          include: {
            nutritionFoods: {
              include: {
                section: true,
                nutritionComponents: {
                  orderBy: { repetitionNumber: 'asc' }
                }
              },
              orderBy: { letter: 'asc' }
            }
          }
        }
      }
    });

    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    // Verify user ownership
    if (day.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your workout day' }, { status: 403 });
    }

    return NextResponse.json({ day });
  } catch (error) {
    console.error('Error fetching workout day:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout day' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      periodId,
      weather,
      feelingStatus,
      notes
    } = body;

    // First verify user ownership
    const existingDay = await prisma.nutritionDay.findUnique({
      where: { id: params.id },
      select: { userId: true }
    });

    if (!existingDay) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    if (existingDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your workout day' }, { status: 403 });
    }

    const day = await prisma.nutritionDay.update({
      where: { id: params.id },
      data: {
        periodId,
        weather,
        feelingStatus,
        notes
      }
    });

    return NextResponse.json({ day });
  } catch (error) {
    console.error('Error updating workout day:', error);
    return NextResponse.json(
      { error: 'Failed to update workout day' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      periodId,
      weather,
      feelingStatus,
      notes
    } = body;

    // First verify user ownership
    const existingDay = await prisma.nutritionDay.findUnique({
      where: { id: params.id },
      select: { userId: true }
    });

    if (!existingDay) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    if (existingDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your workout day' }, { status: 403 });
    }

    const day = await prisma.nutritionDay.update({
      where: { id: params.id },
      data: {
        periodId,
        weather,
        feelingStatus,
        notes
      }
    });

    return NextResponse.json({ day });
  } catch (error) {
    console.error('Error updating workout day:', error);
    return NextResponse.json(
      { error: 'Failed to update workout day' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // First verify user ownership
    const existingDay = await prisma.nutritionDay.findUnique({
      where: { id: params.id },
      select: { userId: true }
    });

    if (!existingDay) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    if (existingDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your workout day' }, { status: 403 });
    }

    // Get all workouts for this day
    const workouts = await prisma.nutritionMeal.findMany({
      where: { nutritionDayId: params.id },
      select: { id: true }
    });

    // Delete all nutritionFoods and nutrition_components for all workouts
    for (const workout of workouts) {
      // Get all nutrition_foods
      const nutritionFoods = await prisma.nutritionFood.findMany({
        where: { nutritionMealId: workout.id },
        select: { id: true }
      });

      // Delete nutrition_components for each nutritionFood
      for (const nutritionFood of nutritionFoods) {
        await prisma.nutritionComponent.deleteMany({
          where: { nutritionFoodId: nutritionFood.id }
        });
      }

      // Delete nutrition_foods
      await prisma.nutritionFood.deleteMany({
        where: { nutritionMealId: workout.id }
      });
    }

    // Delete all workouts for this day
    await prisma.nutritionMeal.deleteMany({
      where: { nutritionDayId: params.id }
    });

    // Delete the day
    await prisma.nutritionDay.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout day:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout day' },
      { status: 500 }
    );
  }
}

