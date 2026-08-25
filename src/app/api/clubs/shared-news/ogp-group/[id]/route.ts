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

    const { id: ogpNewsGroupId } = await context.params;
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

    const group = await prisma.ogpNewsGroup.findFirst({
      where: { id: ogpNewsGroupId, deletedAt: null },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ error: 'OGP News group not found' }, { status: 404 });
    }

    const share = await prisma.clubSharedOgpGroup.upsert({
      where: { clubId_ogpNewsGroupId: { clubId, ogpNewsGroupId } },
      create: {
        clubId,
        ogpNewsGroupId,
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
        ogpNewsGroupId: true,
        inClubGlobalNews: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      shareId: share.id,
      clubId: share.clubId,
      ogpNewsGroupId: share.ogpNewsGroupId,
      inClubGlobalNews: share.inClubGlobalNews,
      sharedAt: share.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Share OGP group to club:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireClubAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: ogpNewsGroupId } = await context.params;
    const clubId = request.nextUrl.searchParams.get('clubId')?.trim();
    if (!clubId) {
      return NextResponse.json({ error: 'clubId query param is required' }, { status: 400 });
    }

    const ownsClub = await verifyClubOwnership(auth.userId, clubId);
    if (!ownsClub) {
      return NextResponse.json({ error: 'Club not found or access denied' }, { status: 403 });
    }

    await prisma.clubSharedOgpGroup.deleteMany({
      where: { clubId, ogpNewsGroupId, sharedById: auth.userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unshare OGP group from club:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH — Club Global News toggle and/or Club OGP audience mode. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireClubAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id: ogpNewsGroupId } = await context.params;
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

    const group = await prisma.ogpNewsGroup.findFirst({
      where: { id: ogpNewsGroupId, deletedAt: null },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ error: 'OGP News group not found' }, { status: 404 });
    }

    const updated = await prisma.clubSharedOgpGroup.upsert({
      where: { clubId_ogpNewsGroupId: { clubId, ogpNewsGroupId } },
      create: {
        clubId,
        ogpNewsGroupId,
        sharedById: auth.userId,
        ...(hasGlobalFlag ? { inClubGlobalNews: body.inClubGlobalNews } : {}),
        ...(audienceMode ? { audienceMode } : {}),
      },
      update: {
        ...(hasGlobalFlag ? { inClubGlobalNews: body.inClubGlobalNews } : {}),
        ...(audienceMode ? { audienceMode } : {}),
      },
      select: {
        id: true,
        clubId: true,
        ogpNewsGroupId: true,
        inClubGlobalNews: true,
        audienceMode: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH club shared OGP group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
