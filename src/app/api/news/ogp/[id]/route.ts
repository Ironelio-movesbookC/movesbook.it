import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthWithUser } from '../../auth';

/** Only admin (or super_admin) can delete OGP articles. Deleted articles are hidden from everyone (soft delete). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, isAdmin } = auth;
  const { id } = await params;

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Only admin can delete OGP articles' },
      { status: 403 }
    );
  }

  try {
    const existing = await prisma.ogpArticle.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    await prisma.ogpArticle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/news/ogp/[id]', e);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
