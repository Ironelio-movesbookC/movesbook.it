import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ClubAuthContext } from './types';

function isClubUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.club.findFirst({
      where: { id: requestedClubId, adminId: userId },
      select: { id: true, name: true },
    });
    if (selected) return selected;
  }
  return prisma.club.findFirst({
    where: { adminId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  });
}

export async function getClubAuthContext(
  request: NextRequest
): Promise<{ ctx: ClubAuthContext } | { error: NextResponse }> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const decoded = verifyToken(token);
  if (!decoded?.userId || !decoded.userType) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isClubUserType(String(decoded.userType))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const userId = String(decoded.userId);
  const requestedClubId = request.nextUrl.searchParams.get('clubId');
  const club = await getOwnedClub(userId, requestedClubId);

  if (!club) {
    return { error: NextResponse.json({ error: 'Club not found' }, { status: 404 }) };
  }

  return { ctx: { userId, club } };
}
