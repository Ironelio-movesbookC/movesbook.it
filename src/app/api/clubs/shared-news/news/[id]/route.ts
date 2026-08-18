import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireClubAdmin,
  verifyClubAdminPassword,
  verifyClubOwnership,
} from '@/lib/clubNewsShareAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireClubAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: newsId } = await context.params;
    const body = (await request.json()) as { clubId?: string; password?: string };
    const clubId = body.clubId?.trim();
    const password = body.password?.trim();

    if (!clubId) {
      return NextResponse.json({ error: 'clubId is required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'password is required' }, { status: 400 });
    }

    const validPassword = await verifyClubAdminPassword(auth.userId, password);
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const ownsClub = await verifyClubOwnership(auth.userId, clubId);
    if (!ownsClub) {
      return NextResponse.json({ error: 'Club not found or access denied' }, { status: 403 });
    }

    const article = await prisma.news.findUnique({
      where: { id: newsId },
      select: { id: true },
    });
    if (!article) {
      return NextResponse.json({ error: 'News article not found' }, { status: 404 });
    }

    const share = await prisma.clubSharedNews.upsert({
      where: { clubId_newsId: { clubId, newsId } },
      create: { clubId, newsId, sharedById: auth.userId },
      update: { sharedById: auth.userId },
      select: { id: true, clubId: true, newsId: true, createdAt: true },
    });

    return NextResponse.json({
      shareId: share.id,
      clubId: share.clubId,
      newsId: share.newsId,
      sharedAt: share.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Share news to club:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireClubAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: newsId } = await context.params;
    const clubId = request.nextUrl.searchParams.get('clubId')?.trim();
    if (!clubId) {
      return NextResponse.json({ error: 'clubId query param is required' }, { status: 400 });
    }

    const ownsClub = await verifyClubOwnership(auth.userId, clubId);
    if (!ownsClub) {
      return NextResponse.json({ error: 'Club not found or access denied' }, { status: 403 });
    }

    await prisma.clubSharedNews.deleteMany({
      where: { clubId, newsId, sharedById: auth.userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unshare news from club:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH — toggle Club Global News for a News article already shared into a club. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireClubAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: newsId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      clubId?: string;
      inClubGlobalNews?: boolean;
    };
    const clubId = body.clubId?.trim();
    if (!clubId) {
      return NextResponse.json({ error: 'clubId is required' }, { status: 400 });
    }
    if (typeof body.inClubGlobalNews !== 'boolean') {
      return NextResponse.json(
        { error: 'inClubGlobalNews (boolean) is required' },
        { status: 400 },
      );
    }

    const ownsClub = await verifyClubOwnership(auth.userId, clubId);
    if (!ownsClub) {
      return NextResponse.json({ error: 'Club not found or access denied' }, { status: 403 });
    }

    const existing = await prisma.clubSharedNews.findUnique({
      where: { clubId_newsId: { clubId, newsId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'News article is not shared to this club' },
        { status: 404 },
      );
    }

    const updated = await prisma.clubSharedNews.update({
      where: { clubId_newsId: { clubId, newsId } },
      data: { inClubGlobalNews: body.inClubGlobalNews },
      select: { id: true, clubId: true, newsId: true, inClubGlobalNews: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH club global news:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
