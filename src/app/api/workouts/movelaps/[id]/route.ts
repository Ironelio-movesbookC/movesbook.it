import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { restTypeDisplayToDb } from '@/utils/restTypeDb';

function convertRestTypeToEnum(restType: string | null | undefined) {
  return restTypeDisplayToDb(restType ?? undefined) as any;
}

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

    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const parseIntOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) ? n : null;
    };

    /** Same partial-update rules as PATCH /api/workouts/movelaps?id= — keeps Fast planner / circuit saves valid. */
    const updateData: Record<string, unknown> = {};

    if (has('repetitionNumber')) updateData.repetitionNumber = body.repetitionNumber;
    if (has('distance')) updateData.distance = parseIntOrNull(body.distance);
    if (has('speedCode') || has('speed')) updateData.speed = (body.speedCode || body.speed) ?? null;
    if (has('style')) updateData.style = body.style ?? null;
    if (has('pace')) updateData.pace = body.pace ?? null;
    if (has('time')) updateData.time = body.time ?? null;
    if (has('rowPerMin')) updateData.rowPerMin = parseIntOrNull(body.rowPerMin);
    if (has('pause')) updateData.pause = body.pause ?? null;
    if (has('alarm')) updateData.alarm = parseIntOrNull(body.alarm);
    if (has('sound')) updateData.sound = body.sound ?? null;
    if (has('notes')) updateData.notes = body.notes ?? null;
    if (has('reps')) updateData.reps = parseIntOrNull(body.reps);
    if (has('weight')) updateData.weight = body.weight ?? null;
    if (has('tools')) updateData.tools = body.tools ?? null;
    if (has('muscularSector')) updateData.muscularSector = body.muscularSector ?? null;
    if (has('exercise')) updateData.exercise = body.exercise ?? null;
    if (has('restType')) updateData.restType = convertRestTypeToEnum(body.restType);
    if (has('r1')) updateData.r1 = body.r1 ?? null;
    if (has('r2')) updateData.r2 = body.r2 ?? null;
    if (has('macroFinal')) updateData.macroFinal = body.macroFinal ?? null;
    if (has('status')) updateData.status = body.status as any;
    if (has('isSkipped')) updateData.isSkipped = !!body.isSkipped;
    if (has('isDisabled')) updateData.isDisabled = !!body.isDisabled;
    if (has('isNewlyAdded')) updateData.isNewlyAdded = !!body.isNewlyAdded;

    console.log('Update data:', updateData);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const movelap = await prisma.movelap.update({
      where: { id: params.id },
      data: updateData as any
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

