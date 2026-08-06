import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../../../auth';

/**
 * POST /api/music/ogp/[id]/listen
 * Record that the current user listened to this music (Listen Again),
 * and increment global viewCount (Suggested ranking).
 * Returns { viewCount, lastPlayedAt }.
 *
 * Uses raw SQL so it works even if Prisma client generate is locked (dev).
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
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM music_ogp_articles WHERE id = ${musicOgpArticleId} LIMIT 1
    `;
    if (!existing.length) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const now = new Date();
    const historyId = `clh${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

    await prisma.$executeRaw`
      UPDATE music_ogp_articles SET viewCount = viewCount + 1 WHERE id = ${musicOgpArticleId}
    `;

    // MySQL upsert for listen history
    await prisma.$executeRaw`
      INSERT INTO music_ogp_listen_history (id, userId, musicOgpArticleId, lastPlayedAt)
      VALUES (${historyId}, ${userId}, ${musicOgpArticleId}, ${now})
      ON DUPLICATE KEY UPDATE lastPlayedAt = ${now}
    `;

    const views = await prisma.$queryRaw<{ viewCount: number }[]>`
      SELECT viewCount FROM music_ogp_articles WHERE id = ${musicOgpArticleId} LIMIT 1
    `;

    return NextResponse.json({
      viewCount: views[0]?.viewCount ?? 0,
      lastPlayedAt: now.toISOString(),
    });
  } catch (e) {
    console.error('POST /api/music/ogp/[id]/listen', e);
    return NextResponse.json({ error: 'Failed to record listen' }, { status: 500 });
  }
}
