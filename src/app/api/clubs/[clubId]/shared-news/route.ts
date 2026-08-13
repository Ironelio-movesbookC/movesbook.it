import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ClubSharedFeedItem } from '@/lib/clubNewsShareAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ clubId: string }> };

async function canAccessClub(userId: string, clubId: string): Promise<boolean> {
  const club = await prisma.club.findFirst({
    where: { id: clubId, adminId: userId },
    select: { id: true },
  });
  if (club) return true;

  const membership = await prisma.clubMember.findFirst({
    where: { clubId, memberId: userId },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId } = await context.params;
    const allowed = await canAccessClub(decoded.userId, clubId);
    if (!allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const type = request.nextUrl.searchParams.get('type') ?? 'all';
    const items: ClubSharedFeedItem[] = [];

    if (type === 'all' || type === 'news') {
      const newsShares = await prisma.clubSharedNews.findMany({
        where: { clubId },
        orderBy: { createdAt: 'desc' },
        include: {
          news: {
            select: {
              id: true,
              title: true,
              date: true,
              author: true,
              originalAuthor: true,
              method: true,
              image: true,
              category: { select: { categoryName: true } },
            },
          },
        },
      });
      for (const row of newsShares) {
        items.push({
          kind: 'news',
          id: row.news.id,
          shareId: row.id,
          title: row.news.title,
          date: row.news.date.toISOString(),
          author: row.news.author ?? row.news.originalAuthor,
          categoryName: row.news.category?.categoryName ?? null,
          method: row.news.method,
          image: row.news.image,
          sharedAt: row.createdAt.toISOString(),
        });
      }
    }

    if (type === 'all' || type === 'ogp') {
      const ogpShares = await prisma.clubSharedOgpArticle.findMany({
        where: { clubId },
        orderBy: { createdAt: 'desc' },
        include: {
          ogpArticle: {
            select: {
              id: true,
              title: true,
              savedAt: true,
              topic: true,
              image: true,
              url: true,
              description: true,
              customDescription: true,
              deletedAt: true,
              user: { select: { username: true } },
            },
          },
        },
      });
      for (const row of ogpShares) {
        if (row.ogpArticle.deletedAt) continue;
        items.push({
          kind: 'ogp',
          id: row.ogpArticle.id,
          shareId: row.id,
          title: row.ogpArticle.title,
          date: row.ogpArticle.savedAt.toISOString(),
          topic: row.ogpArticle.topic,
          creatorUsername: row.ogpArticle.user?.username ?? null,
          image: row.ogpArticle.image,
          url: row.ogpArticle.url,
          description: row.ogpArticle.description,
          customDescription: row.ogpArticle.customDescription,
          sharedAt: row.createdAt.toISOString(),
        });
      }
    }

    items.sort(
      (a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime(),
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Fetch club shared news:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
