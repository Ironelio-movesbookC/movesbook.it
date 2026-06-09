import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


/**
 * POST /api/nutrition/weeks/move
 * Move all workouts from source week to target week
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { sourceWeekId, targetWeekId } = body;

    console.log('🚚 [API] Move week request:', {
      sourceWeekId,
      targetWeekId,
      userId: decoded.userId
    });

    if (!sourceWeekId || !targetWeekId) {
      return NextResponse.json(
        { error: 'Source and target week IDs are required' },
        { status: 400 }
      );
    }

    // Get source week with all workouts
    const sourceWeek = await prisma.nutritionWeek.findUnique({
      where: { id: sourceWeekId },
      include: {
        nutritionPlan: true,
        days: {
          include: {
            meals: {
              orderBy: { sessionNumber: 'asc' }
            }
          },
          orderBy: { date: 'asc' }
        }
      }
    });

    console.log('🔍 [API] Source week query result:', {
      found: !!sourceWeek,
      weekNumber: sourceWeek?.weekNumber,
      planType: sourceWeek?.nutritionPlan?.type,
      daysCount: sourceWeek?.days?.length
    });

    if (!sourceWeek) {
      console.error('❌ [API] Source week not found:', sourceWeekId);
      return NextResponse.json({ error: 'Source week not found' }, { status: 404 });
    }

    // Get target week
    const targetWeek = await prisma.nutritionWeek.findUnique({
      where: { id: targetWeekId },
      include: {
        nutritionPlan: true,
        days: {
          orderBy: { date: 'asc' }
        }
      }
    });

    console.log('🔍 [API] Target week query result:', {
      found: !!targetWeek,
      weekNumber: targetWeek?.weekNumber,
      planType: targetWeek?.nutritionPlan?.type,
      daysCount: targetWeek?.days?.length
    });

    if (!targetWeek) {
      console.error('❌ [API] Target week not found:', targetWeekId);
      return NextResponse.json({ error: 'Target week not found' }, { status: 404 });
    }

    // Delete existing workouts in target week
    for (const day of targetWeek.days) {
      await prisma.nutritionMeal.deleteMany({
        where: { nutritionDayId: day.id } // Changed from dayId to nutritionDayId
      });
    }

    // Move workouts from source to target by updating nutritionDayId
    for (let i = 0; i < sourceWeek.days.length; i++) {
      const sourceDay = sourceWeek.days[i];
      const targetDay = targetWeek.days[i];
      
      if (!targetDay) continue; // Skip if target week has fewer days

      // Update all workouts to point to the target day
      await prisma.nutritionMeal.updateMany({
        where: { nutritionDayId: sourceDay.id }, // Changed from dayId
        data: { nutritionDayId: targetDay.id } // Changed from dayId
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Week moved successfully' 
    });
  } catch (error) {
    console.error('Error moving week:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
