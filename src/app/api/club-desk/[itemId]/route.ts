import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaConnect } from '@/lib/prisma';
import { getTokenUserId, userIsClubAdmin } from '@/lib/club/clubDeskAccess';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const tokenUserId = getTokenUserId(request);
    if (!tokenUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const itemId = params.itemId;
    const existing = await prisma.clubDeskItem.findFirst({
      where: { id: itemId },
      select: { id: true, clubId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if (!(await userIsClubAdmin(tokenUserId, existing.clubId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      title?: string;
      path?: string | null;
      faIconClass?: string | null;
      bgColor?: string | null;
      titleColor?: string | null;
      displayMode?: 'new_label' | 'central_page' | null;
      visible?: boolean;
    };

    const data: {
      title?: string;
      path?: string | null;
      faIconClass?: string | null;
      bgColor?: string | null;
      titleColor?: string | null;
      displayMode?: string | null;
      visible?: boolean;
    } = {};

    if (typeof body.title === 'string') data.title = body.title.trim();
    if (Object.prototype.hasOwnProperty.call(body, 'path')) {
      data.path = body.path ? String(body.path) : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'faIconClass')) {
      data.faIconClass = body.faIconClass ? String(body.faIconClass) : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'bgColor')) {
      data.bgColor = body.bgColor ? String(body.bgColor) : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'titleColor')) {
      data.titleColor = body.titleColor ? String(body.titleColor) : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'displayMode')) {
      data.displayMode = body.displayMode ? String(body.displayMode) : null;
    }
    if (typeof body.visible === 'boolean') data.visible = body.visible;

    const item = await prisma.clubDeskItem.update({
      where: { id: itemId },
      data,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('PATCH /api/club-desk/[itemId] failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const tokenUserId = getTokenUserId(request);
    if (!tokenUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const itemId = params.itemId;
    const existing = await prisma.clubDeskItem.findFirst({
      where: { id: itemId },
      select: { id: true, clubId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if (!(await userIsClubAdmin(tokenUserId, existing.clubId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.clubDeskItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/club-desk/[itemId] failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
