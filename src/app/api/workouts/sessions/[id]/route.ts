import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// PATCH /api/workouts/sessions/[id] - Update a workout session
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params for Next.js compatibility
    const params = context.params instanceof Promise ? await context.params : context.params;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      code,
      time,
      location,
      surface,
      notes,
      weather,
      heartRateMax,
      heartRateAvg,
      calories,
      feelingStatus,
      status,
      sports,
      mainSport,
      mainGoal,
      intensity,
      tags,
      includeStretching
    } = body;

    console.log('📝 Updating workout session:', params.id, body);

    // First verify user ownership through day
    const existingSession = await prisma.workoutSession.findUnique({
      where: { id: params.id },
      include: {
        workoutDay: {
          select: { userId: true }
        }
      }
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Workout session not found' }, { status: 404 });
    }

    if (existingSession.workoutDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your workout session' }, { status: 403 });
    }

    const parseOptionalInt = (value: unknown) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      const n = parseInt(String(value), 10);
      return Number.isFinite(n) ? n : null;
    };

    // Update workout session (explicit undefined = leave unchanged; null/'' = clear)
    const session = await prisma.workoutSession.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? (name || existingSession.name) : undefined,
        code: code !== undefined ? (code ?? '') : undefined,
        time: time !== undefined ? (time ?? '') : undefined,
        location: location !== undefined ? (location ?? '') : undefined,
        surface: surface !== undefined ? (surface || null) : undefined,
        notes: notes !== undefined ? (notes ?? '') : undefined,
        weather: weather !== undefined ? (weather || null) : undefined,
        heartRateMax: parseOptionalInt(heartRateMax),
        heartRateAvg: parseOptionalInt(heartRateAvg),
        calories: parseOptionalInt(calories),
        feelingStatus: feelingStatus !== undefined ? (feelingStatus || null) : undefined,
        status: status as any || undefined,
        mainSport: mainSport !== undefined ? (mainSport || null) : undefined,
        mainGoal: mainGoal !== undefined ? (mainGoal || null) : undefined,
        intensity: intensity !== undefined ? (intensity || null) : undefined,
        tags: tags !== undefined ? (tags || null) : undefined,
        includeStretching: includeStretching !== undefined ? includeStretching : undefined
      },
      include: {
        sports: true,
        moveframes: {
          include: {
            movelaps: {
              orderBy: { repetitionNumber: 'asc' }
            },
            section: true
          },
          orderBy: { letter: 'asc' }
        }
      }
    });

    // Update sports if provided
    if (sports && Array.isArray(sports)) {
      // Delete existing sports
      await prisma.workoutSessionSport.deleteMany({
        where: { workoutSessionId: params.id }
      });

      // Add new sports
      for (const sportItem of sports) {
        if (sportItem) {
          // Extract the sport type - handle both object and string formats
          const sportType = typeof sportItem === 'object' && sportItem.sport 
            ? sportItem.sport 
            : sportItem;
          
          await prisma.workoutSessionSport.create({
            data: {
              workoutSessionId: params.id,
              sport: sportType
            }
          });
        }
      }
    }

    console.log('✅ Workout session updated:', session.id);

    return NextResponse.json(session);
  } catch (error: any) {
    console.error('❌ Error updating workout session:', error);
    return NextResponse.json(
      { error: 'Failed to update workout session', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/workouts/sessions/[id] - Delete a workout session
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params for Next.js compatibility
    const params = context.params instanceof Promise ? await context.params : context.params;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('🗑️ Deleting workout session:', params.id);

    // First verify user ownership through day
    const existingSession = await prisma.workoutSession.findUnique({
      where: { id: params.id },
      include: {
        workoutDay: {
          select: { userId: true }
        }
      }
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Workout session not found' }, { status: 404 });
    }

    if (existingSession.workoutDay.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized - not your workout session' }, { status: 403 });
    }

    // Delete workout session (cascade will delete moveframes and movelaps)
    await prisma.workoutSession.delete({
      where: { id: params.id }
    });

    console.log('✅ Workout session deleted');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting workout session:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout session', details: error.message },
      { status: 500 }
    );
  }
}
