import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../../auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, isAdmin } = auth;
  const { id } = await params;

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Topic name is required' }, { status: 400 });
    }
    const existing = await prisma.userMusicTopic.findFirst({
      where: isAdmin ? { id } : { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    const oldName = existing.name;
    if (oldName === name) {
      return NextResponse.json(existing);
    }
    const [updated] = await prisma.$transaction([
      prisma.userMusicTopic.update({
        where: { id },
        data: { name },
      }),
      prisma.musicOgpArticle.updateMany({
        where: { userId: existing.userId, topic: oldName },
        data: { topic: name },
      }),
    ]);
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A topic with this name already exists' }, { status: 409 });
    }
    console.error('PATCH /api/music/topics/[id]', e);
    return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, isAdmin } = auth;
  const { id } = await params;

  try {
    const existing = await prisma.userMusicTopic.findFirst({
      where: isAdmin ? { id } : { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    await prisma.userMusicTopic.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/music/topics/[id]', e);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}
