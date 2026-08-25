import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireClubAdmin } from '@/lib/clubNewsShareAuth';

export const dynamic = 'force-dynamic';

/** Returns which clubs the current club admin has shared each item to. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireClubAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const kind = request.nextUrl.searchParams.get('kind');
    const idsParam = request.nextUrl.searchParams.get('ids') ?? '';
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);

    if (!kind || (kind !== 'ogp' && kind !== 'news' && kind !== 'ogp-group')) {
      return NextResponse.json({ error: 'kind must be ogp, ogp-group, or news' }, { status: 400 });
    }
    if (ids.length === 0) {
      return NextResponse.json({ sharedByItem: {} });
    }

    if (kind === 'ogp-group') {
      const rows = await prisma.clubSharedOgpGroup.findMany({
        where: {
          sharedById: auth.userId,
          ogpNewsGroupId: { in: ids },
        },
        select: { ogpNewsGroupId: true, clubId: true },
      });
      const sharedByItem: Record<string, string[]> = {};
      for (const row of rows) {
        if (!sharedByItem[row.ogpNewsGroupId]) sharedByItem[row.ogpNewsGroupId] = [];
        sharedByItem[row.ogpNewsGroupId].push(row.clubId);
      }
      return NextResponse.json({ sharedByItem });
    }

    if (kind === 'ogp') {
      const rows = await prisma.clubSharedOgpArticle.findMany({
        where: {
          sharedById: auth.userId,
          ogpArticleId: { in: ids },
        },
        select: { ogpArticleId: true, clubId: true },
      });
      const sharedByItem: Record<string, string[]> = {};
      for (const row of rows) {
        if (!sharedByItem[row.ogpArticleId]) sharedByItem[row.ogpArticleId] = [];
        sharedByItem[row.ogpArticleId].push(row.clubId);
      }
      return NextResponse.json({ sharedByItem });
    }

    const rows = await prisma.clubSharedNews.findMany({
      where: {
        sharedById: auth.userId,
        newsId: { in: ids },
      },
      select: { newsId: true, clubId: true },
    });
    const sharedByItem: Record<string, string[]> = {};
    for (const row of rows) {
      if (!sharedByItem[row.newsId]) sharedByItem[row.newsId] = [];
      sharedByItem[row.newsId].push(row.clubId);
    }
    return NextResponse.json({ sharedByItem });
  } catch (error) {
    console.error('Club shared news status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
