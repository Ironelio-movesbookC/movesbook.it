import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaConnect } from '@/lib/prisma';
import {
  buildClubDeskTree,
  getTokenUserId,
  userCanViewClubDesk,
  userIsClubAdmin,
  type ClubDeskRecord,
} from '@/lib/club/clubDeskAccess';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tokenUserId = getTokenUserId(request);
    if (!tokenUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clubId = request.nextUrl.searchParams.get('clubId')?.trim() || '';
    if (!clubId) {
      return NextResponse.json({ error: 'clubId is required' }, { status: 400 });
    }

    await prismaConnect();
    if (!(await userCanViewClubDesk(tokenUserId, clubId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const items = await prisma.clubDeskItem.findMany({
      where: { clubId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ items: buildClubDeskTree(items as ClubDeskRecord[]) });
  } catch (error) {
    console.error('GET /api/club-desk failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenUserId = getTokenUserId(request);
    if (!tokenUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const body = (await request.json()) as {
      clubId?: string;
      parentId?: string | null;
      title?: string;
      path?: string | null;
      faIconClass?: string | null;
      bgColor?: string | null;
      titleColor?: string | null;
      displayMode?: 'new_label' | 'central_page' | null;
      visible?: boolean;
    };

    const clubId = String(body.clubId ?? '').trim();
    if (!clubId) {
      return NextResponse.json({ error: 'clubId is required' }, { status: 400 });
    }
    if (!(await userIsClubAdmin(tokenUserId, clubId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const title = String(body.title ?? '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const parentId = body.parentId ? String(body.parentId) : null;
    if (parentId) {
      const parent = await prisma.clubDeskItem.findFirst({
        where: { id: parentId, clubId },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
      }
    }

    const maxSibling = await prisma.clubDeskItem.aggregate({
      where: { clubId, parentId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSibling._max.sortOrder ?? -1) + 1;

    const item = await prisma.clubDeskItem.create({
      data: {
        clubId,
        parentId,
        title,
        path: body.path ? String(body.path) : null,
        faIconClass: body.faIconClass ? String(body.faIconClass) : null,
        bgColor: body.bgColor ? String(body.bgColor) : null,
        titleColor: body.titleColor ? String(body.titleColor) : null,
        displayMode: body.displayMode ? String(body.displayMode) : null,
        visible: typeof body.visible === 'boolean' ? body.visible : true,
        sortOrder,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('POST /api/club-desk failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
