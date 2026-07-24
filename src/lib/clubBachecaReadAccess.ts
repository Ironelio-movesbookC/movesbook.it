import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

type AccessResult =
  | { ok: true; clubId: string }
  | { ok: false; error: NextResponse };

function unauthorized(): AccessResult {
  return { ok: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
}

function forbidden(): AccessResult {
  return { ok: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
}

function getTokenUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ? String(decoded.userId) : null;
}

async function findOwnedClubId(
  userId: string,
  requestedClubId: string | null,
): Promise<string | null> {
  if (requestedClubId) {
    const owned = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM clubs_new
      WHERE id = ${requestedClubId} AND adminId = ${userId}
      LIMIT 1
    `;
    if (owned[0]?.id) return owned[0].id;
  }

  const fallback = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM clubs_new
    WHERE adminId = ${userId}
    ORDER BY createdAt DESC
    LIMIT 1
  `;
  return fallback[0]?.id ?? null;
}

/**
 * Club admin (any Movesbook role when adminId matches) may load/edit bacheca.
 * Does not require CLUB userType — aligns with canManageClubWebsite.
 */
export async function getBachecaManageAccess(
  request: NextRequest,
  requestedClubId: string | null,
): Promise<AccessResult> {
  const userId = getTokenUserId(request);
  if (!userId) return unauthorized();

  const clubId = await findOwnedClubId(userId, requestedClubId);
  if (!clubId) return forbidden();
  return { ok: true, clubId };
}

/** Members (or club admin) may read filtered bacheca labels. */
export async function getBachecaReadAccess(
  request: NextRequest,
  requestedClubId: string | null,
): Promise<AccessResult> {
  const userId = getTokenUserId(request);
  if (!userId) return unauthorized();

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
    const clubId = await findOwnedClubId(userId, null);
    if (clubId) return { ok: true, clubId };
  }

  return forbidden();
}
