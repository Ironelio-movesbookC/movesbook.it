import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveMessageDatabaseUserId } from '@/lib/messages/resolveMessageUserId';
import { resolvePanelAuth, type PanelAuthContext } from '@/lib/panelAuth';

export type ClubChannelAuthOk = {
  ok: true;
  userId: string;
  clubId: string;
  clubName: string;
};

export type ClubChannelAuthResult =
  | ClubChannelAuthOk
  | { ok: false; status: number; error: string };

/**
 * Club Channel write/admin access: club owner (adminId) for the given club.
 */
export async function resolveClubChannelAuth(
  request: NextRequest,
  clubId: string
): Promise<ClubChannelAuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded?.userId) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  const userId = await resolveMessageDatabaseUserId(decoded.userId, decoded.userType);
  if (!userId) {
    return { ok: false, status: 401, error: 'User not found' };
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true, adminId: true },
  });
  if (!club) {
    return { ok: false, status: 404, error: 'Club not found' };
  }
  if (club.adminId !== userId) {
    return { ok: false, status: 403, error: 'Club admin access required' };
  }

  return { ok: true, userId, clubId: club.id, clubName: club.name };
}

/**
 * Platform panel admin OR club admin for club-scoped broadcast writes.
 */
export async function resolveBroadcastAdminAuth(
  request: NextRequest,
  clubId?: string | null
): Promise<
  | { ok: true; kind: 'panel'; panel: Extract<PanelAuthContext, { ok: true }> }
  | { ok: true; kind: 'club'; club: ClubChannelAuthOk }
  | { ok: false; status: number; error: string }
> {
  const trimmed = typeof clubId === 'string' ? clubId.trim() : '';
  if (trimmed) {
    const clubAuth = await resolveClubChannelAuth(request, trimmed);
    if (!clubAuth.ok) return clubAuth;
    return { ok: true, kind: 'club', club: clubAuth };
  }

  const panelAuth = await resolvePanelAuth(request);
  if (!panelAuth.ok) return panelAuth;
  return { ok: true, kind: 'panel', panel: panelAuth };
}

/** Member user IDs for a club (for audience / stats scoping). */
export async function getClubMemberUserIds(clubId: string): Promise<string[]> {
  const rows = await prisma.clubMember.findMany({
    where: { clubId },
    select: { memberId: true },
  });
  return rows.map((r) => r.memberId);
}
