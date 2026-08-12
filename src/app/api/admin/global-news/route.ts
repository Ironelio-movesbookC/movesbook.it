import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTableSuperAdmin, type GlobalNewsFeedItem } from '@/lib/globalNewsAuth';

export const dynamic = 'force-dynamic';

/** GET — merged News + OGP News marked for Global News, newest first. */
export async function GET(request: NextRequest) {
  const auth = await requireTableSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [newsRows, ogpRows] = await Promise.all([
      prisma.news.findMany({
        where: { inGlobalNews: true } as { inGlobalNews: boolean },
        orderBy: { date: 'desc' },
        include: {
          category: { select: { categoryName: true } },
        },
      }),
      prisma.ogpArticle.findMany({
        where: { inGlobalNews: true, deletedAt: null } as { inGlobalNews: boolean; deletedAt: null },
        orderBy: { savedAt: 'desc' },
        include: {
          user: { select: { username: true } },
        },
      }),
    ]);

    const items: GlobalNewsFeedItem[] = [
      ...newsRows.map((n) => ({
        kind: 'news' as const,
        id: n.id,
        title: n.title,
        date: n.date.toISOString(),
        author: n.author ?? n.originalAuthor,
        categoryName: n.category?.categoryName ?? null,
        method: n.method,
        image: n.image,
        inGlobalNews: true as const,
      })),
      ...ogpRows.map((a) => ({
        kind: 'ogp' as const,
        id: a.id,
        title: a.title,
        date: a.savedAt.toISOString(),
        topic: a.topic,
        creatorUsername: a.user?.username ?? null,
        image: a.image,
        url: a.url,
        description: a.description,
        customDescription: a.customDescription,
        inGlobalNews: true as const,
      })),
    ];

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ items });
  } catch (e) {
    console.error('GET /api/admin/global-news', e);
    return NextResponse.json({ error: 'Failed to load global news' }, { status: 500 });
  }
}
