import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../../../auth';

/** POST /api/exercises/ogp-groups/[id]/like — toggle like for current user. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id: groupId } = await params;

  try {
    const group = await prisma.exerciseOgpGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const existing = await prisma.exerciseOgpGroupLike.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existing) {
      await prisma.exerciseOgpGroupLike.delete({ where: { id: existing.id } });
      const count = await prisma.exerciseOgpGroupLike.count({ where: { groupId } });
      return NextResponse.json({ count, liked: false });
    }

    await prisma.exerciseOgpGroupLike.create({ data: { groupId, userId } });
    const count = await prisma.exerciseOgpGroupLike.count({ where: { groupId } });
    return NextResponse.json({ count, liked: true });
  } catch (e) {
    console.error('POST /api/exercises/ogp-groups/[id]/like', e);
    return NextResponse.json({ error: 'Failed to update like' }, { status: 500 });
  }
}
