import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Club admin: update club profile fields (e.g. members' dashboard YouTube URL).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId as string;
    const clubId = params.clubId;

    const body = (await request.json()) as {
      youtubeChannelUrl?: string | null;
    };

    if (!('youtubeChannelUrl' in body)) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const v = body.youtubeChannelUrl;
    const nextUrl =
      v === null || v === undefined || String(v).trim() === ''
        ? null
        : String(v).trim();

    const ownerCheck = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*) AS c FROM clubs_new WHERE id = ${clubId} AND adminId = ${userId}
    `;
    const owns = Number(ownerCheck[0]?.c ?? 0) > 0;
    if (!owns) {
      return NextResponse.json(
        { error: 'Club not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.$executeRaw`
      UPDATE clubs_new
      SET youtubeChannelUrl = ${nextUrl},
          updatedAt = NOW(3)
      WHERE id = ${clubId} AND adminId = ${userId}
    `;

    const rows = await prisma.$queryRaw<
      {
        id: string;
        name: string;
        description: string | null;
        location: string | null;
        youtubeChannelUrl: string | null;
      }[]
    >`
      SELECT id, name, description, location, youtubeChannelUrl
      FROM clubs_new
      WHERE id = ${clubId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    return NextResponse.json({
      club: {
        id: row.id,
        name: row.name,
        description: row.description,
        location: row.location,
        youtubeChannelUrl: row.youtubeChannelUrl
      }
    });
  } catch (e) {
    console.error('PATCH /api/clubs/[clubId]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
