import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Helper function to convert display rest type to enum value
function convertRestTypeToEnum(restType: string | null | undefined) {
  if (!restType || restType.trim() === '') return null;
  
  const mapping: Record<string, string> = {
    'Set time': 'SET_TIME',
    'Restart time': 'RESTART_TIME',
    'Restart pulse': 'RESTART_PULSE',
    'SET_TIME': 'SET_TIME', // Already correct
    'RESTART_TIME': 'RESTART_TIME', // Already correct
    'RESTART_PULSE': 'RESTART_PULSE' // Already correct
  };
  
  const result = mapping[restType] || null;
  return result as any; // Cast to enum type for Prisma
}

// POST /api/workouts/movelaps - Create a new movelap
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
    const {
      moveframeId,
      repetitionNumber,
      distance,
      speed,
      style,
      pace,
      time,
      rowPerMin,
      pause,
      alarm,
      sound,
      notes,
      reps,
      weight,
      tools,
      muscularSector,
      exercise,
      restType,
      r1,
      r2,
      macroFinal,
      status = 'PENDING'
    } = body;

    console.log('📥 Creating movelap:', body);

    // Validate required fields
    if (!moveframeId) {
      return NextResponse.json({ error: 'moveframeId is required' }, { status: 400 });
    }

    if (!repetitionNumber) {
      return NextResponse.json({ error: 'repetitionNumber is required' }, { status: 400 });
    }

    // Create movelap
    const movelap = await prisma.movelap.create({
      data: {
        moveframeId,
        repetitionNumber,
        distance: distance ? parseInt(distance) : null,
        speed: speed || null,
        style: style || null,
        pace: pace || null,
        time: time || null,
        rowPerMin: rowPerMin ? parseInt(rowPerMin) : null,
        pause: pause || null,
        alarm: alarm ? parseInt(alarm) : null,
        sound: sound || null,
        notes: notes !== undefined ? notes : null,
        reps: reps ? parseInt(reps) : null,
        weight: weight || null,
        tools: tools || null,
        muscularSector: muscularSector || null,
        exercise: exercise || null,
        // Convert display value to enum value
        restType: convertRestTypeToEnum(restType),
        r1: r1 || null,
        r2: r2 || null,
        macroFinal: macroFinal || null,
        status: status as any,
        isSkipped: false,
        isDisabled: false
      }
    });

    console.log('✅ Movelap created:', movelap.id);

    return NextResponse.json(movelap, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating movelap:', error);
    console.error('❌ Error details:', error.message);
    return NextResponse.json(
      { error: 'Failed to create movelap', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/workouts/movelaps?id=<movelapId> - Update a movelap
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

    const { searchParams } = new URL(request.url);
    const movelapId = searchParams.get('id');

    if (!movelapId) {
      return NextResponse.json({ error: 'Movelap ID is required' }, { status: 400 });
    }

    const body = await request.json();
    console.log('📝 Updating movelap:', movelapId, body);
    console.log('📋 Notes field being updated:', body.notes);

    // Update movelap
    const movelap = await prisma.movelap.update({
      where: { id: movelapId },
      data: {
        repetitionNumber: body.repetitionNumber,
        distance: body.distance ? parseInt(body.distance) : null,
        speed: body.speed || null,
        style: body.style || null,
        pace: body.pace || null,
        time: body.time || null,
        rowPerMin: body.rowPerMin ? parseInt(body.rowPerMin) : null,
        pause: body.pause || null,
        alarm: body.alarm ? parseInt(body.alarm) : null,
        sound: body.sound || null,
        notes: body.notes !== undefined ? body.notes : null,
        reps: body.reps ? parseInt(body.reps) : null,
        weight: body.weight || null,
        tools: body.tools || null,
        muscularSector: body.muscularSector || null,
        exercise: body.exercise || null,
        // Convert display value to enum value
        restType: convertRestTypeToEnum(body.restType),
        r1: body.r1 || null,
        r2: body.r2 || null,
        macroFinal: body.macroFinal || null,
        status: body.status as any
      }
    });

    console.log('✅ Movelap updated:', movelap.id);
    console.log('✅ Updated notes value:', movelap.notes);

    return NextResponse.json(movelap);
  } catch (error: any) {
    console.error('❌ Error updating movelap:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Stack trace:', error.stack);
    return NextResponse.json(
      { error: 'Failed to update movelap', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/workouts/movelaps?id=<movelapId> - Delete a movelap
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
    const movelapId = searchParams.get('id');

    if (!movelapId) {
      return NextResponse.json({ error: 'Movelap ID is required' }, { status: 400 });
    }

    console.log('🗑️ Deleting movelap:', movelapId);

    await prisma.movelap.delete({
      where: { id: movelapId }
    });

    console.log('✅ Movelap deleted');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting movelap:', error);
    return NextResponse.json(
      { error: 'Failed to delete movelap', details: error.message },
      { status: 500 }
    );
  }
}
