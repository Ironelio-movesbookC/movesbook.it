import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../../../auth';

/**
 * POST /api/exercises/ogp/[id]/like
 * Toggle like for the current user. Returns { count, liked }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id: exerciseOgpArticleId } = await params;

  try {
    const article = await prisma.exerciseOgpArticle.findUnique({
      where: { id: exerciseOgpArticleId },
      select: { id: true },
    });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const existing = await prisma.exerciseOgpArticleLike.findUnique({
      where: {
        exerciseOgpArticleId_userId: { exerciseOgpArticleId, userId },
      },
    });

    if (existing) {
      await prisma.exerciseOgpArticleLike.delete({
        where: { id: existing.id },
      });
      const count = await prisma.exerciseOgpArticleLike.count({
        where: { exerciseOgpArticleId },
      });
      return NextResponse.json({ count, liked: false });
    }

    await prisma.exerciseOgpArticleLike.create({
      data: { exerciseOgpArticleId, userId },
    });
    const count = await prisma.exerciseOgpArticleLike.count({
      where: { exerciseOgpArticleId },
    });
    return NextResponse.json({ count, liked: true });
  } catch (e) {
    console.error('POST /api/exercises/ogp/[id]/like', e);
    return NextResponse.json({ error: 'Failed to update like' }, { status: 500 });
  }
}
