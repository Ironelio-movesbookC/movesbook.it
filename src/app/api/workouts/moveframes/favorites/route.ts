import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';
import { formatFavoriteMoveframe } from '@/lib/favoriteMoveframeFormat';

export const dynamic = 'force-dynamic';

const moveframeInclude = {
  movelaps: {
    orderBy: { repetitionNumber: 'asc' as const },
  },
  section: {
    select: { name: true, color: true },
  },
  workoutSession: {
    select: {
      name: true,
      sessionNumber: true,
      workoutDay: {
        select: { date: true, userId: true },
      },
    },
  },
};

// GET - Fetch all favorite moveframes for the current user
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const favoriteMoveframes = await prisma.moveframe.findMany({
      where: {
        favourite: true,
        workoutSession: {
          workoutDay: {
            userId: dbUserId,
          },
        },
      },
      include: moveframeInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedMoveframes = favoriteMoveframes.map((mf) => formatFavoriteMoveframe(mf));

    return NextResponse.json({ moveframes: formattedMoveframes }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching favorite moveframes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorite moveframes', details: message },
      { status: 500 }
    );
  }
}

// POST - Save a moveframe to favourites (sets favourite flag on planner moveframe)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const moveframeId =
      typeof body.moveframeId === 'string' ? body.moveframeId.trim() : '';

    if (!moveframeId) {
      return NextResponse.json({ error: 'moveframeId is required' }, { status: 400 });
    }

    const existing = await prisma.moveframe.findFirst({
      where: {
        id: moveframeId,
        workoutSession: {
          workoutDay: { userId: dbUserId },
        },
      },
      include: moveframeInclude,
    });

    if (!existing) {
      return NextResponse.json({ error: 'Moveframe not found' }, { status: 404 });
    }

    const updated = await prisma.moveframe.update({
      where: { id: moveframeId },
      data: { favourite: true },
      include: moveframeInclude,
    });

    return NextResponse.json({
      message: 'Moveframe saved to favourites',
      moveframe: formatFavoriteMoveframe(updated),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving favorite moveframe:', error);
    return NextResponse.json(
      { error: 'Failed to save moveframe to favourites', details: message },
      { status: 500 }
    );
  }
}

// DELETE - Remove a moveframe from favourites
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const moveframeId = searchParams.get('moveframeId')?.trim() || '';

    if (!moveframeId) {
      return NextResponse.json({ error: 'moveframeId query param is required' }, { status: 400 });
    }

    const existing = await prisma.moveframe.findFirst({
      where: {
        id: moveframeId,
        workoutSession: {
          workoutDay: { userId: dbUserId },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Moveframe not found' }, { status: 404 });
    }

    await prisma.moveframe.update({
      where: { id: moveframeId },
      data: { favourite: false },
    });

    return NextResponse.json({ message: 'Moveframe removed from favourites' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error removing favorite moveframe:', error);
    return NextResponse.json(
      { error: 'Failed to remove moveframe from favourites', details: message },
      { status: 500 }
    );
  }
}
