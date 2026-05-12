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
    const userId = await resolveWorkoutDatabaseUserId(tokenUserId);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const itemId = params.itemId;
    const existing = await prisma.myDeskItem.findFirst({
      where: { id: itemId, userId },
      select: { id: true }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
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
    if (Object.prototype.hasOwnProperty.call(body, 'path')) data.path = body.path ? String(body.path) : null;
    if (Object.prototype.hasOwnProperty.call(body, 'faIconClass')) {
      data.faIconClass = body.faIconClass ? String(body.faIconClass) : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'bgColor')) data.bgColor = body.bgColor ? String(body.bgColor) : null;
    if (Object.prototype.hasOwnProperty.call(body, 'titleColor')) {
      data.titleColor = body.titleColor ? String(body.titleColor) : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'displayMode')) {
      data.displayMode = body.displayMode ? String(body.displayMode) : null;
    }
    if (typeof body.visible === 'boolean') data.visible = body.visible;

    const item = await prisma.myDeskItem.update({
      where: { id: itemId },
      data
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('PATCH /api/my-desk/[itemId] failed:', error);
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
    const userId = await resolveWorkoutDatabaseUserId(tokenUserId);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const itemId = params.itemId;
    const existing = await prisma.myDeskItem.findFirst({
      where: { id: itemId, userId },
      select: { id: true }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.myDeskItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/my-desk/[itemId] failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
