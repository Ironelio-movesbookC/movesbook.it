import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthorizedContext } from '@/lib/clubCardReadersApi';

type ReadAccessResult =
  | { ok: true; clubId: string }
  | { ok: false; error: NextResponse };

export async function getBachecaReadAccess(
  request: NextRequest,
  requestedClubId: string | null,
): Promise<ReadAccessResult> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { ok: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return { ok: false, error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };
  }

  const userId = String(decoded.userId);

  if (requestedClubId) {
    const owned = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM clubs_new
      WHERE id = ${requestedClubId} AND adminId = ${userId}
      LIMIT 1
    `;
    if (owned[0]?.id) {
      return { ok: true, clubId: owned[0].id };
    }

    const membership = await prisma.clubMember.findFirst({
      where: { clubId: requestedClubId, memberId: userId },
      select: { clubId: true },
    });
    if (membership) {
      return { ok: true, clubId: requestedClubId };
    }
  } else {
    const context = await getAuthorizedContext(request);
    if (!('error' in context) && context.club?.id) {
      return { ok: true, clubId: context.club.id };
    }
  }

  return { ok: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
}
