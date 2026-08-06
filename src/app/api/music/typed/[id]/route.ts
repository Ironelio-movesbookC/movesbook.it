import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../../auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id } = await params;

  try {
    const existing = await prisma.musicTypedArticle.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    await prisma.musicTypedArticle.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/music/typed/[id]', e);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
