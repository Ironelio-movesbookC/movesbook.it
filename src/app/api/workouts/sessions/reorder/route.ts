import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/workouts/sessions/reorder
 * Reorder workout sessions within the same day
 * 
 * Request Body:
 * {
 *   workouts: [
 *     { id: string, sessionNumber: number },
 *     ...
 *   ]
 * }
 */
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
    const { workouts } = body;

    if (!workouts || !Array.isArray(workouts)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { workouts: [{ id, sessionNumber }] }' },
        { status: 400 }
      );
    }

    // Validate that all workouts belong to the user
    const workoutIds = workouts.map((w: any) => w.id);
    
    const existingWorkouts = await prisma.workoutSession.findMany({
      where: {
        id: { in: workoutIds },
        workoutDay: {
          userId: decoded.userId
        }
      },
      select: { id: true }
    });

    if (existingWorkouts.length !== workoutIds.length) {
      return NextResponse.json(
        { error: 'Some workouts do not exist or do not belong to the user' },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const w of workouts as { id: string; sessionNumber: number }[]) {
        await tx.workoutSession.update({
          where: { id: w.id },
          data: { sessionNumber: w.sessionNumber },
        });
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Workouts reordered successfully',
        updatedCount: workouts.length
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error reordering workouts:', error);
    return NextResponse.json(
      { error: 'Failed to reorder workouts' },
      { status: 500 }
    );
  }
}
