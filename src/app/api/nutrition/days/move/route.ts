import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


// POST /api/nutrition/days/move - Move a day to a new date
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
    const { sourceDayId, targetDate, targetWeekId } = body;

    console.log('🚚 Moving day:', { sourceDayId, targetDate, targetWeekId });

    // Validate required fields
    if (!sourceDayId || !targetDate || !targetWeekId) {
      return NextResponse.json(
        { error: 'sourceDayId, targetDate, and targetWeekId are required' },
        { status: 400 }
      );
    }

    // Check if target date already has a day
    const existingDay = await prisma.nutritionDay.findFirst({
      where: {
        userId: decoded.userId,
        date: new Date(targetDate),
        id: { not: sourceDayId } // Exclude the source day itself
      }
    });

    if (existingDay) {
      return NextResponse.json(
        { error: 'A workout day already exists on this date' },
        { status: 409 }
      );
    }

    // Update the day with new date and week
    const movedDay = await prisma.nutritionDay.update({
      where: { id: sourceDayId },
      data: {
        date: new Date(targetDate),
        nutritionWeekId: targetWeekId,
        notes: {
          set: undefined // Keep existing notes
        }
      },
      include: {
        meals: {
          include: {
            sports: true,
            nutritionFoods: {
              include: {
                nutritionComponents: true,
                section: true
              }
            }
          }
        },
        period: true
      }
    });

    console.log('✅ Day moved successfully:', movedDay.id);

    return NextResponse.json({ day: movedDay });
  } catch (error: any) {
    console.error('❌ Error moving day:', error);
    return NextResponse.json(
      { error: 'Failed to move day', details: error.message },
      { status: 500 }
    );
  }
}

