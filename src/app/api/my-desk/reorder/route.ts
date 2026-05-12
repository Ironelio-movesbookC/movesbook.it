import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaConnect } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';

export const dynamic = 'force-dynamic';

function getTokenUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ? String(decoded.userId) : null;
}

export async function PATCH(request: NextRequest) {
  try {
    const tokenUserId = getTokenUserId(request);
    if (!tokenUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const userId = await resolveWorkoutDatabaseUserId(tokenUserId);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = (await request.json()) as {
      parentId?: string | null;
      orderedIds?: string[];
    };

    const parentId = body.parentId ? String(body.parentId) : null;
    const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.map(String) : [];
    if (!orderedIds.length) {
      return NextResponse.json({ error: 'orderedIds is required' }, { status: 400 });
    }

    const siblings = await prisma.myDeskItem.findMany({
      where: {
        userId,
        parentId,
        id: { in: orderedIds }
      },
      select: { id: true }
    });

    if (siblings.length !== orderedIds.length) {
      return NextResponse.json({ error: 'Invalid sibling list' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < orderedIds.length; index++) {
        const id = orderedIds[index];
        await tx.myDeskItem.update({
          where: { id },
          data: { sortOrder: index },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/my-desk/reorder failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
