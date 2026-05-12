import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isClubAdminUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

/**
 * Create a default club row for the current user when they own none yet
 * (e.g. CLUB account with empty `clubs_new`).
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId || !decoded.userType) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!isClubAdminUserType(String(decoded.userType))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = decoded.userId as string;

    const existing = await prisma.$queryRaw<
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
      WHERE adminId = ${userId}
      ORDER BY createdAt DESC
      LIMIT 1
    `;

    if (existing[0]) {
      const row = existing[0];
      return NextResponse.json({
        club: {
          id: row.id,
          name: row.name,
          description: row.description,
          location: row.location,
          youtubeChannelUrl: row.youtubeChannelUrl
        },
        created: false
      });
    }

    const nameRows = await prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM users_new WHERE id = ${userId} LIMIT 1
    `;
    const nameBase = (nameRows[0]?.name ?? 'Club').trim() || 'Club';
    const clubName = `${nameBase} club`;
    const id = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO clubs_new (id, adminId, name, description, location, youtubeChannelUrl, createdAt, updatedAt)
      VALUES (${id}, ${userId}, ${clubName}, NULL, NULL, NULL, NOW(3), NOW(3))
    `;

    const created = await prisma.$queryRaw<
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
      WHERE id = ${id}
      LIMIT 1
    `;
    const row = created[0];
    if (!row) {
      return NextResponse.json({ error: 'Failed to create club' }, { status: 500 });
    }

    return NextResponse.json({
      club: {
        id: row.id,
        name: row.name,
        description: row.description,
        location: row.location,
        youtubeChannelUrl: row.youtubeChannelUrl
      },
      created: true
    });
  } catch (e) {
    console.error('POST /api/clubs:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
