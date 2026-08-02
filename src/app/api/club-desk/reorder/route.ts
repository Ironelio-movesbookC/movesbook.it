import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaConnect } from '@/lib/prisma';
import { getTokenUserId, userIsClubAdmin } from '@/lib/club/clubDeskAccess';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const tokenUserId = getTokenUserId(request);
    if (!tokenUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const body = (await request.json()) as {
      clubId?: string;
      parentId?: string | null;
      orderedIds?: string[];
    };

    const clubId = String(body.clubId ?? '').trim();
    if (!clubId) {
      return NextResponse.json({ error: 'clubId is required' }, { status: 400 });
    }
    if (!(await userIsClubAdmin(tokenUserId, clubId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parentId = body.parentId ? String(body.parentId) : null;
    const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.map(String) : [];
    if (!orderedIds.length) {
      return NextResponse.json({ error: 'orderedIds is required' }, { status: 400 });
    }

    const siblings = await prisma.clubDeskItem.findMany({
      where: {
        clubId,
        parentId,
        id: { in: orderedIds },
      },
      select: { id: true },
    });

    if (siblings.length !== orderedIds.length) {
      return NextResponse.json({ error: 'Invalid sibling list' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < orderedIds.length; index++) {
        const id = orderedIds[index];
        await tx.clubDeskItem.update({
          where: { id },
          data: { sortOrder: index },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/club-desk/reorder failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
