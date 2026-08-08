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
    const existing = await prisma.userExerciseTopic.findFirst({
      where: isAdmin ? { id } : { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    const oldName = existing.name;
    if (oldName === name) {
      return NextResponse.json(existing);
    }
    // Interactive tx: batch $transaction([...]) requires PrismaPromises; our prisma proxy wraps
    // model calls as plain Promises, so we run sequential updates on the real tx client.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.userExerciseTopic.update({
        where: { id },
        data: { name },
      });
      await tx.exerciseOgpArticle.updateMany({
        where: { userId: existing.userId, category: existing.category, topic: oldName },
        data: { topic: name },
      });
      await tx.exerciseOgpGroup.updateMany({
        where: { userId: existing.userId, category: existing.category, topic: oldName },
        data: { topic: name },
      });
      return result;
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A topic with this name already exists' }, { status: 409 });
    }
    console.error('PATCH /api/exercises/topics/[id]', e);
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
    const existing = await prisma.userExerciseTopic.findFirst({
      where: isAdmin ? { id } : { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    await prisma.userExerciseTopic.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/exercises/topics/[id]', e);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}
