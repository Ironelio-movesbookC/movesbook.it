import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../../../auth';

/**
 * POST /api/news/ogp/[id]/like
 * Toggle like for the current user. Returns { count, liked }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id: ogpArticleId } = await params;

  try {
    const article = await prisma.ogpArticle.findUnique({
      where: { id: ogpArticleId },
      select: { id: true },
    });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const existing = await prisma.ogpArticleLike.findUnique({
      where: {
        ogpArticleId_userId: { ogpArticleId, userId },
      },
    });

    if (existing) {
      await prisma.ogpArticleLike.delete({
        where: { id: existing.id },
      });
      const count = await prisma.ogpArticleLike.count({
        where: { ogpArticleId },
      });
      return NextResponse.json({ count, liked: false });
    }

    await prisma.ogpArticleLike.create({
      data: { ogpArticleId, userId },
    });
    const count = await prisma.ogpArticleLike.count({
      where: { ogpArticleId },
    });
    return NextResponse.json({ count, liked: true });
  } catch (e) {
    console.error('POST /api/news/ogp/[id]/like', e);
    return NextResponse.json({ error: 'Failed to update like' }, { status: 500 });
  }
}
