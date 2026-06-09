import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { restTypeDisplayToDb } from '@/utils/restTypeDb';

function convertRestTypeToEnum(restType: string | null | undefined) {
  return restTypeDisplayToDb(restType ?? undefined) as any;
}

/**
 * GET /api/nutrition/nutrition_components/[id]
 * Get a specific nutritionComponent
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

    const nutritionComponent = await prisma.nutritionComponent.findUnique({
      where: { id: params.id },
      include: {
        nutritionFood: {
          include: {
            nutritionMeal: {
              include: {
                nutritionDay: true
              }
            }
          }
        }
      }
    });

    if (!nutritionComponent) {
      return NextResponse.json({ error: 'NutritionComponent not found' }, { status: 404 });
    }

    return NextResponse.json({ nutritionComponent });
  } catch (error: any) {
    console.error('Error fetching nutritionComponent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nutritionComponent' },
      { status: 500 }
    );
  }
}

/**
 * PUT/PATCH /api/nutrition/nutrition_components/[id]
 * Update a nutritionComponent
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
    console.log('PUT /api/nutrition/nutrition_components/[id] - Updating nutritionComponent:', params.id);
    console.log('Request body:', body);

    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const parseIntOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) ? n : null;
    };

    /** Same partial-update rules as PATCH /api/nutrition/nutrition_components?id= — keeps Fast planner / circuit saves valid. */
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

    const nutritionComponent = await prisma.nutritionComponent.update({
      where: { id: params.id },
      data: updateData as any
    });

    console.log('✅ NutritionComponent updated successfully:', nutritionComponent.id);

    return NextResponse.json({ nutritionComponent });
  } catch (error: any) {
    console.error('❌ Error updating nutritionComponent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update nutritionComponent',
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
 * DELETE /api/nutrition/nutrition_components/[id]
 * Delete a nutritionComponent
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

    console.log('DELETE /api/nutrition/nutrition_components/[id] - Deleting nutritionComponent:', params.id);

    await prisma.nutritionComponent.delete({
      where: { id: params.id }
    });

    console.log('✅ NutritionComponent deleted successfully');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting nutritionComponent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete nutritionComponent',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

