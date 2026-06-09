import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


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
    const { nutritionPlanId, weekNumber, date, periodId } = body;

    console.log('POST /api/nutrition/days - Creating new day:', { nutritionPlanId, weekNumber, date });

    // Find or create the week
    let week = await prisma.nutritionWeek.findFirst({
      where: {
        nutritionPlanId,
        weekNumber
      }
    });

    if (!week) {
      console.log('Week not found, creating week:', weekNumber);
      week = await prisma.nutritionWeek.create({
        data: {
          nutritionPlanId,
          weekNumber
        }
      });
    }

    // Get default period if not provided
    let finalPeriodId = periodId;
    if (!finalPeriodId) {
      const defaultPeriod = await prisma.period.findFirst({
        where: { userId: decoded.userId }
      });
      
      if (!defaultPeriod) {
        return NextResponse.json(
          { error: 'No period found. Please create a period first.' },
          { status: 400 }
        );
      }
      finalPeriodId = defaultPeriod.id;
    }

    // Calculate dayOfWeek from date
    const dayDate = new Date(date);
    const dayOfWeek = dayDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1-7 (Monday-Sunday)

    // Determine storageZone based on the workout plan type
    const plan = await prisma.nutritionPlan.findUnique({
      where: { id: nutritionPlanId },
      select: { type: true }
    });

    let storageZone: 'A' | 'B' | 'C' | 'D' = 'B';
    if (plan) {
      if (plan.type === 'TEMPLATE_WEEKS') storageZone = 'A';
      else if (plan.type === 'YEARLY_PLAN') storageZone = 'B';
      else if (plan.type === 'MEALS_DONE') storageZone = 'C';
      else if (plan.type === 'ARCHIVE') storageZone = 'D';
    }

    // Create the day
    const day = await prisma.nutritionDay.create({
      data: {
        userId: decoded.userId,
        nutritionWeekId: week.id,
        date: dayDate,
        weekNumber,
        dayOfWeek: adjustedDayOfWeek,
        periodId: finalPeriodId,
        storageZone,
        weather: '',
        feelingStatus: '5',
        notes: ''
      },
      include: {
        period: true,
        meals: true
      }
    });

    console.log('Day created successfully:', day.id);

    return NextResponse.json({ day });
  } catch (error) {
    console.error('Error creating workout day:', error);
    return NextResponse.json(
      { error: 'Failed to create workout day', details: (error as Error).message },
      { status: 500 }
    );
  }
}

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
    const { dayId, weather, feelingStatus, notes, periodId } = body;

    console.log('PATCH /api/nutrition/days - Updating day:', dayId);

    const day = await prisma.nutritionDay.update({
      where: { id: dayId },
      data: {
        ...(weather !== undefined && { weather }),
        ...(feelingStatus !== undefined && { feelingStatus }),
        ...(notes !== undefined && { notes }),
        ...(periodId !== undefined && { periodId })
      },
      include: {
        period: true,
        meals: true
      }
    });

    console.log('Day updated successfully:', day.id);

    return NextResponse.json({ day });
  } catch (error) {
    console.error('Error updating workout day:', error);
    return NextResponse.json(
      { error: 'Failed to update workout day', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const dayId = searchParams.get('dayId');

    if (!dayId) {
      return NextResponse.json({ error: 'Day ID is required' }, { status: 400 });
    }

    console.log('DELETE /api/nutrition/days - Deleting day:', dayId);

    await prisma.nutritionDay.delete({
      where: { id: dayId }
    });

    console.log('Day deleted successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout day:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout day', details: (error as Error).message },
      { status: 500 }
    );
  }
}

