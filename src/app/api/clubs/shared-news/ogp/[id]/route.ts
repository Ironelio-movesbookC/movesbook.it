import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireClubAdmin,
  verifyClubAdminPassword,
  verifyClubOwnership,
  isClubOgpAudienceMode,
} from '@/lib/clubNewsShareAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireClubAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: ogpArticleId } = await context.params;
    const body = (await request.json()) as {
      clubId?: string;
      password?: string;
      inClubGlobalNews?: boolean;
    };
    const clubId = body.clubId?.trim();
    const password = body.password?.trim();
    const hasGlobalFlag = typeof body.inClubGlobalNews === 'boolean';

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

    const article = await prisma.ogpArticle.findFirst({
      where: { id: ogpArticleId, deletedAt: null },
      select: { id: true },
    });
    if (!article) {
      return NextResponse.json({ error: 'OGP article not found' }, { status: 404 });
    }

    const share = await prisma.clubSharedOgpArticle.upsert({
      where: { clubId_ogpArticleId: { clubId, ogpArticleId } },
      create: {
        clubId,
        ogpArticleId,
        sharedById: auth.userId,
        ...(hasGlobalFlag ? { inClubGlobalNews: body.inClubGlobalNews } : {}),
      },
      update: {
        sharedById: auth.userId,
        ...(hasGlobalFlag ? { inClubGlobalNews: body.inClubGlobalNews } : {}),
      },
      select: {
        id: true,
        clubId: true,
        ogpArticleId: true,
        inClubGlobalNews: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      shareId: share.id,
      clubId: share.clubId,
      ogpArticleId: share.ogpArticleId,
      inClubGlobalNews: share.inClubGlobalNews,
      sharedAt: share.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Share OGP to club:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireClubAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: ogpArticleId } = await context.params;
    const clubId = request.nextUrl.searchParams.get('clubId')?.trim();
    if (!clubId) {
      return NextResponse.json({ error: 'clubId query param is required' }, { status: 400 });
    }

    const ownsClub = await verifyClubOwnership(auth.userId, clubId);
    if (!ownsClub) {
      return NextResponse.json({ error: 'Club not found or access denied' }, { status: 403 });
    }

    await prisma.clubSharedOgpArticle.deleteMany({
      where: { clubId, ogpArticleId, sharedById: auth.userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unshare OGP from club:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH — Club Global News toggle and/or Club OGP audience mode. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireClubAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: ogpArticleId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      clubId?: string;
      inClubGlobalNews?: boolean;
      audienceMode?: string;
    };
    const clubId = body.clubId?.trim();
    if (!clubId) {
      return NextResponse.json({ error: 'clubId is required' }, { status: 400 });
    }

    const hasGlobalFlag = typeof body.inClubGlobalNews === 'boolean';
    const audienceMode = isClubOgpAudienceMode(body.audienceMode) ? body.audienceMode : null;
    if (!hasGlobalFlag && !audienceMode) {
      return NextResponse.json(
        { error: 'inClubGlobalNews (boolean) and/or audienceMode is required' },
        { status: 400 },
      );
    }

    const ownsClub = await verifyClubOwnership(auth.userId, clubId);
    if (!ownsClub) {
      return NextResponse.json({ error: 'Club not found or access denied' }, { status: 403 });
    }

    const existing = await prisma.clubSharedOgpArticle.findUnique({
      where: { clubId_ogpArticleId: { clubId, ogpArticleId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'OGP article is not shared to this club' },
        { status: 404 },
      );
    }

    const updated = await prisma.clubSharedOgpArticle.update({
      where: { clubId_ogpArticleId: { clubId, ogpArticleId } },
      data: {
        ...(hasGlobalFlag ? { inClubGlobalNews: body.inClubGlobalNews } : {}),
        ...(audienceMode ? { audienceMode } : {}),
      },
      select: {
        id: true,
        clubId: true,
        ogpArticleId: true,
        inClubGlobalNews: true,
        audienceMode: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH club shared OGP:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
