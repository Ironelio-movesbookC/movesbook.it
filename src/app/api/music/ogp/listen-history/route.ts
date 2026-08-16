import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../../auth';

/**
 * GET /api/music/ogp/listen-history
 * Returns recently listened music OGP ids for the current user (Listen Again),
 * newest first. Optional ?limit= (default 24, max 50).
 *
 * Uses raw SQL so it works even if Prisma client generate is locked (dev).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get('limit') || '24');
    const limit = Number.isFinite(rawLimit)
      ? Math.min(50, Math.max(1, Math.floor(rawLimit)))
      : 24;

    const rows = await prisma.$queryRaw<
      { musicOgpArticleId: string; lastPlayedAt: Date }[]
    >`
      SELECT h.musicOgpArticleId, h.lastPlayedAt
      FROM music_ogp_listen_history h
      INNER JOIN music_ogp_articles a ON a.id = h.musicOgpArticleId
      WHERE h.userId = ${userId} AND a.deletedAt IS NULL
      ORDER BY h.lastPlayedAt DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.musicOgpArticleId,
        lastPlayedAt:
          r.lastPlayedAt instanceof Date
            ? r.lastPlayedAt.toISOString()
            : String(r.lastPlayedAt),
      })),
    });
  } catch (e) {
    console.error('GET /api/music/ogp/listen-history', e);
    return NextResponse.json({ error: 'Failed to load listen history' }, { status: 500 });
  }
}
