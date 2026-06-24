import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';

export const dynamic = 'force-dynamic';

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.club.findFirst({
      where: { id: requestedClubId, adminId: userId },
      select: { id: true },
    });
    if (selected) return selected;
  }
  return prisma.club.findFirst({
    where: { adminId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
}

async function resolveLegacyMemberId(legacyId: string): Promise<string | null> {
  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (mappingTable) {
    const rows = await prisma.$queryRawUnsafe<{ new_id: string }[]>(
      `SELECT new_id FROM \`${mappingTable}\`
       WHERE legacy_table = 'users' AND legacy_id = ?
       LIMIT 1`,
      legacyId
    );
    if (rows[0]?.new_id) return rows[0].new_id;
  }

  const user = await prisma.user.findUnique({ where: { id: legacyId }, select: { id: true } });
  return user?.id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { legacyId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = request.nextUrl.searchParams.get('clubId');
    const club = await getOwnedClub(String(decoded.userId), clubId);
    if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 });

    const memberId = await resolveLegacyMemberId(params.legacyId);
    if (!memberId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const membership = await prisma.clubMember.findFirst({
      where: { clubId: club.id, memberId },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Member is not in this club' }, { status: 404 });
    }

    return NextResponse.json({ memberId });
  } catch (error) {
    console.error('GET resolve-legacy member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
