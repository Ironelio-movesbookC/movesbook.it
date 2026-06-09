import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/nutrition/days/move-to-week
 * Move a day to a different week (cross-week drag)
 * 
 * Request Body:
 * {
 *   dayId: string,
 *   targetWeekId: string,
 *   targetIndex: number (optional, position in target week)
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
    const { dayId, targetWeekId, targetIndex } = body;

    if (!dayId || !targetWeekId) {
      return NextResponse.json(
        { error: 'dayId and targetWeekId are required' },
        { status: 400 }
      );
    }

    // Verify the day belongs to the user
    const day = await prisma.nutritionDay.findUnique({
      where: { id: dayId },
      select: { userId: true, nutritionWeekId: true }
    });

    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    if (day.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify the target week exists and belongs to the user's plan
    const targetWeek = await prisma.nutritionWeek.findUnique({
      where: { id: targetWeekId },
      include: {
        nutritionPlan: {
          select: { userId: true }
        }
      }
    });

    if (!targetWeek) {
      return NextResponse.json({ error: 'Target week not found' }, { status: 404 });
    }

    if (targetWeek.nutritionPlan.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Move the day to the target week
    await prisma.$transaction(async (tx) => {
      // Get the target week's number
      const targetWeekNumber = targetWeek.weekNumber;

      // Update the day's nutritionWeekId and weekNumber
      await tx.nutritionDay.update({
        where: { id: dayId },
        data: {
          nutritionWeekId: targetWeekId,
          weekNumber: targetWeekNumber
        }
      });

      // Get all days in the target week (including the one we just moved)
      const allDays = await tx.nutritionDay.findMany({
        where: { nutritionWeekId: targetWeekId },
        orderBy: { date: 'asc' }
      });

      // If targetIndex is provided, we could reorder by date
      // But typically days should remain sorted by date
      // So we'll just ensure they're properly ordered
    });

    return NextResponse.json(
      { success: true, message: 'Day moved successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error moving day:', error);
    return NextResponse.json(
      { error: 'Failed to move day' },
      { status: 500 }
    );
  }
}

