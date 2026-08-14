import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../../../auth';

/**
 * POST /api/news/ogp/[id]/view
 * Increment global viewCount for News Headlines / Top Stories ranking.
 * Returns { viewCount }.
 *
 * Uses raw SQL so it works even if Prisma client generate is locked (dev).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { id: ogpArticleId } = await params;

  try {
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM ogp_articles WHERE id = ${ogpArticleId} LIMIT 1
    `;
    if (!existing.length) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    await prisma.$executeRaw`
      UPDATE ogp_articles SET viewCount = viewCount + 1 WHERE id = ${ogpArticleId}
    `;

    const views = await prisma.$queryRaw<{ viewCount: number }[]>`
      SELECT viewCount FROM ogp_articles WHERE id = ${ogpArticleId} LIMIT 1
    `;

    return NextResponse.json({
      viewCount: views[0]?.viewCount ?? 0,
    });
  } catch (e) {
    console.error('POST /api/news/ogp/[id]/view', e);
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
  }
}
