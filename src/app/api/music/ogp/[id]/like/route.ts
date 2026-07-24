import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../../../auth';

/**
 * POST /api/music/ogp/[id]/like
 * Toggle like for the current user. Returns { count, liked }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id: musicOgpArticleId } = await params;

  try {
    const article = await prisma.musicOgpArticle.findUnique({
      where: { id: musicOgpArticleId },
      select: { id: true },
    });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const existing = await prisma.musicOgpArticleLike.findUnique({
      where: {
        musicOgpArticleId_userId: { musicOgpArticleId, userId },
      },
    });

    if (existing) {
      await prisma.musicOgpArticleLike.delete({
        where: { id: existing.id },
      });
      const count = await prisma.musicOgpArticleLike.count({
        where: { musicOgpArticleId },
      });
      return NextResponse.json({ count, liked: false });
    }

    await prisma.musicOgpArticleLike.create({
      data: { musicOgpArticleId, userId },
    });
    const count = await prisma.musicOgpArticleLike.count({
      where: { musicOgpArticleId },
    });
    return NextResponse.json({ count, liked: true });
  } catch (e) {
    console.error('POST /api/music/ogp/[id]/like', e);
    return NextResponse.json({ error: 'Failed to update like' }, { status: 500 });
  }
}
