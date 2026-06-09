import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * PATCH /api/nutrition/weeks/[id]/notes
 * Update weekly notes and period for a specific week
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const userId = decoded.userId;
    const weekId = params.id;
    const { periodId, notes } = await request.json();

    console.log('📝 Updating week notes:', { weekId, periodId, notesLength: notes?.length });

    // Update the NutritionWeek with notes and optionally periodId
    const updatedWeek = await prisma.nutritionWeek.update({
      where: { 
        id: weekId,
        nutritionPlan: { userId } // Ensure the week belongs to this user
      },
      data: {
        notes: notes || '',
        ...(periodId && { periodId })
      },
      include: {
        period: true
      }
    });

    console.log('✅ Week notes updated successfully');

    return NextResponse.json({
      message: 'Week notes updated successfully',
      week: updatedWeek
    });
  } catch (error) {
    console.error('❌ Error updating week notes:', error);
    return NextResponse.json({ 
      error: 'Failed to update week notes', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * GET /api/nutrition/weeks/[id]/notes
 * Get weekly notes for a specific week
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const userId = decoded.userId;
    const weekId = params.id;

    const week = await prisma.nutritionWeek.findFirst({
      where: { 
        id: weekId,
        nutritionPlan: { userId }
      },
      select: {
        id: true,
        weekNumber: true,
        notes: true,
        periodId: true,
        period: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    });

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    return NextResponse.json({
      weekId: week.id,
      weekNumber: week.weekNumber,
      notes: week.notes || '',
      periodId: week.periodId || '',
      period: week.period
    });
  } catch (error) {
    console.error('❌ Error fetching week notes:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch week notes', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

