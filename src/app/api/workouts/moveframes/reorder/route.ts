import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/workouts/moveframes/reorder
 * Reorder moveframes and update their letters alphabetically
 * 
 * Request Body:
 * {
 *   moveframes: [
 *     { id: string, letter: string },
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
    const { moveframes } = body;

    if (!moveframes || !Array.isArray(moveframes)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { moveframes: [{ id, letter }] }' },
        { status: 400 }
      );
    }

    // Validate that all moveframes belong to the user's workouts
    const moveframeIds = moveframes.map((mf: any) => mf.id);
    
    const existingMoveframes = await prisma.moveframe.findMany({
      where: {
        id: { in: moveframeIds },
        workoutSession: {
          workoutDay: {
            userId: decoded.userId
          }
        }
      },
      select: { id: true }
    });

    if (existingMoveframes.length !== moveframeIds.length) {
      return NextResponse.json(
        { error: 'Some moveframes do not exist or do not belong to the user' },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const mf of moveframes as { id: string; letter: string }[]) {
        await tx.moveframe.update({
          where: { id: mf.id },
          data: { letter: mf.letter },
        });
      }
    });

    // Note: Movelap letters are dynamically derived from parent moveframe
    // No need to update movelaps separately - they will automatically 
    // display with the correct letter based on their parent moveframe

    return NextResponse.json(
      { 
        success: true, 
        message: 'Moveframes reordered successfully',
        updatedCount: moveframes.length
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error reordering moveframes:', error);
    return NextResponse.json(
      { error: 'Failed to reorder moveframes' },
      { status: 500 }
    );
  }
}
