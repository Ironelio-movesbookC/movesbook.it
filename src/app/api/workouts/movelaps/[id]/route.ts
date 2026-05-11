import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * GET /api/workouts/movelaps/[id]
 * Get a specific movelap
 */
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

    const movelap = await prisma.movelap.findUnique({
      where: { id: params.id },
      include: {
        moveframe: {
          include: {
            workoutSession: {
              include: {
                workoutDay: true
              }
            }
          }
        }
      }
    });

    if (!movelap) {
      return NextResponse.json({ error: 'Movelap not found' }, { status: 404 });
    }

    return NextResponse.json({ movelap });
  } catch (error: any) {
    console.error('Error fetching movelap:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movelap' },
      { status: 500 }
    );
  }
}

/**
 * PUT/PATCH /api/workouts/movelaps/[id]
 * Update a movelap
 */
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
    console.log('PUT /api/workouts/movelaps/[id] - Updating movelap:', params.id);
    console.log('Request body:', body);

    const {
      distance,
      speedCode,
      speed,
      style,
      pace,
      time,
      pause,
      restType,
      alarm,
      notes,
      status
    } = body;

    const updateData: any = {};
    if (distance !== undefined) updateData.distance = distance ? parseInt(distance.toString()) : null;
    if (speedCode !== undefined || speed !== undefined) updateData.speed = speedCode || speed || null;
    if (style !== undefined) updateData.style = style || null;
    if (pace !== undefined) updateData.pace = pace || null;
    if (time !== undefined) updateData.time = time || null;
    if (pause !== undefined) updateData.pause = pause || null;
    if (restType !== undefined) updateData.restType = restType || null;
    if (alarm !== undefined) updateData.alarm = alarm ? parseInt(alarm.toString()) : null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (status !== undefined) updateData.status = status;

    console.log('Update data:', updateData);

    const movelap = await prisma.movelap.update({
      where: { id: params.id },
      data: updateData
    });

    console.log('✅ Movelap updated successfully:', movelap.id);

    return NextResponse.json({ movelap });
  } catch (error: any) {
    console.error('❌ Error updating movelap:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update movelap',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Also support PATCH for partial updates
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}

/**
 * DELETE /api/workouts/movelaps/[id]
 * Delete a movelap
 */
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

    console.log('DELETE /api/workouts/movelaps/[id] - Deleting movelap:', params.id);

    await prisma.movelap.delete({
      where: { id: params.id }
    });

    console.log('✅ Movelap deleted successfully');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting movelap:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete movelap',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

