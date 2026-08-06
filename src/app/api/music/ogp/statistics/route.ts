import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthWithUser } from '../../auth';

function daysSince(date: Date, now: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfPost = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(0, Math.floor((startOfToday - startOfPost) / msPerDay));
}

/**
 * GET /api/music/ogp/statistics
 * Superadmin only: users who posted OG Music, alphabetical by username.
 * Query: `q` — optional username search (case-insensitive contains).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  try {
    const grouped = await prisma.musicOgpArticle.groupBy({
      by: ['userId'],
      where: { deletedAt: null },
      _count: { id: true },
      _max: { savedAt: true },
    });

    if (grouped.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const userIds = grouped.map((g) => g.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        ...(q
          ? { username: { contains: q } }
          : {}),
      },
      select: { id: true, username: true },
      orderBy: { username: 'asc' },
    });

    const statsByUserId = new Map(
      grouped.map((g) => [
        g.userId,
        { postCount: g._count.id, lastPostAt: g._max.savedAt },
      ])
    );

    const now = new Date();
    const result = users
      .map((u) => {
        const stats = statsByUserId.get(u.id);
        if (!stats?.lastPostAt) return null;
        return {
          userId: u.id,
          username: u.username,
          postCount: stats.postCount,
          lastPostAt: stats.lastPostAt.toISOString(),
          daysSinceLastPost: daysSince(stats.lastPostAt, now),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) =>
        a.username.localeCompare(b.username, undefined, { sensitivity: 'base' })
      );

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('Error fetching music OGP statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch music OGP statistics' },
      { status: 500 }
    );
  }
}
