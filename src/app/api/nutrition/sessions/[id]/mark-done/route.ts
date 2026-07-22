import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// PATCH /api/nutrition/sessions/[id]/mark-done - Mark workout as done with completion status
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

    const { id } = params;
    const body = await request.json();
    const { 
      completionPercentage, 
      asDifferent, 
      actualHeartRateMax,
      actualHeartRateAvg,
      actualCalories,
      actualFeelingStatus,
      actualNotes,
      completedAt
    } = body;

    // Validate input
    if (typeof completionPercentage !== 'number' || completionPercentage < 0 || completionPercentage > 100) {
      return NextResponse.json({ error: 'Invalid completion percentage' }, { status: 400 });
    }

    // Verify workout session belongs to user
    const session = await prisma.nutritionMeal.findUnique({
      where: { id },
      include: {
        nutritionDay: {
          include: {
            nutritionWeek: {
              include: {
                nutritionPlan: true
              }
            }
          }
        }
      }
    });

    if (!session || session.nutritionDay.nutritionWeek.nutritionPlan.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Workout session not found or unauthorized' }, { status: 404 });
    }

    // Determine status based on completion
    let newStatus: string;
    if (asDifferent) {
      // Nutrition meal enum has no shifted blues — map to mid green band
      newStatus = 'DONE_DIFFERENTLY';
    } else if (completionPercentage < 60) {
      newStatus = 'DONE_LESS_75';
    } else if (completionPercentage <= 80) {
      newStatus = 'DONE_DIFFERENTLY';
    } else {
      newStatus = 'DONE_MORE_75';
    }

    // Update workout session
    const updatedSession = await prisma.nutritionMeal.update({
      where: { id },
      data: {
        status: newStatus as any,
        heartRateMax: actualHeartRateMax !== undefined ? actualHeartRateMax : session.heartRateMax,
        heartRateAvg: actualHeartRateAvg !== undefined ? actualHeartRateAvg : session.heartRateAvg,
        calories: actualCalories !== undefined ? actualCalories : session.calories,
        feelingStatus: actualFeelingStatus !== undefined ? actualFeelingStatus : session.feelingStatus,
        notes: actualNotes !== undefined ? actualNotes : session.notes
      }
    });

    return NextResponse.json({ nutritionMeal: updatedSession });
  } catch (error) {
    console.error('Error marking workout as done:', error);
    return NextResponse.json(
      { error: 'Failed to mark workout as done' },
      { status: 500 }
    );
  }
}

