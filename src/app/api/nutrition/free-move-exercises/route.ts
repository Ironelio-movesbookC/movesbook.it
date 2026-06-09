import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/nutrition/free-move-exercises
 * Get all FREE_MOVES exercises for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    console.log('📚 Fetching FREE_MOVES exercises for user:', userId);

    // Fetch all exercises for this user, ordered by most recent first
    const exercises = await prisma.freeMoveExercise.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        exercise: true,
        createdAt: true,
      },
    });

    console.log(`✅ Found ${exercises.length} FREE_MOVES exercises`);

    return NextResponse.json({
      success: true,
      exercises: exercises.map(e => ({
        id: e.id,
        name: e.exercise,
        createdAt: e.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('❌ Error fetching FREE_MOVES exercises:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch exercises',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nutrition/free-move-exercises
 * Add a new FREE_MOVES exercise for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const body = await request.json();
    const { exercise } = body;

    if (!exercise || typeof exercise !== 'string' || exercise.trim() === '') {
      return NextResponse.json(
        { error: 'Exercise name is required' },
        { status: 400 }
      );
    }

    console.log('📝 Adding FREE_MOVES exercise:', exercise, 'for user:', userId);

    // Check if exercise already exists for this user
    const existing = await prisma.freeMoveExercise.findFirst({
      where: {
        userId,
        exercise: exercise.trim(),
      },
    });

    if (existing) {
      console.log('ℹ️ Exercise already exists:', existing.id);
      return NextResponse.json({
        success: true,
        exercise: {
          id: existing.id,
          name: existing.exercise,
          createdAt: existing.createdAt,
        },
        alreadyExists: true,
      });
    }

    // Create new exercise
    const newExercise = await prisma.freeMoveExercise.create({
      data: {
        userId,
        exercise: exercise.trim(),
      },
    });

    console.log('✅ Created FREE_MOVES exercise:', newExercise.id);

    return NextResponse.json({
      success: true,
      exercise: {
        id: newExercise.id,
        name: newExercise.exercise,
        createdAt: newExercise.createdAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Error creating FREE_MOVES exercise:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create exercise',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/nutrition/free-move-exercises
 * Delete a FREE_MOVES exercise
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('id');

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'Exercise ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting FREE_MOVES exercise:', exerciseId);

    // Verify ownership before deleting
    const exercise = await prisma.freeMoveExercise.findFirst({
      where: {
        id: exerciseId,
        userId, // Ensure user owns this exercise
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercise not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.freeMoveExercise.delete({
      where: { id: exerciseId },
    });

    console.log('✅ Deleted FREE_MOVES exercise:', exerciseId);

    return NextResponse.json({
      success: true,
      message: 'Exercise deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting FREE_MOVES exercise:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete exercise',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

