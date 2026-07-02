import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { outcomeService } from '@/lib/outcomes';

export const dynamic = 'force-dynamic';

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.club.findFirst({
      where: { id: requestedClubId, adminId: userId },
      select: { id: true, name: true, adminId: true },
    });
    if (selected) return selected;
  }

  return prisma.club.findFirst({
    where: { adminId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, adminId: true },
  });
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

/** Card reader / terminal: resolve outcome message for an access event. */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.userId || !decoded.userType) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isClubAccountUserType(String(decoded.userType))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = String(decoded.userId);
    const clubId = text(body.clubId) || request.nextUrl.searchParams.get('clubId');
    const memberUserId = text(body.memberUserId);
    const readerId = text(body.readerId);
    const outcomeTypeCode = text(body.outcomeTypeCode || body.code);
    const allowed = body.allowed !== false;

    if (!memberUserId) {
      return NextResponse.json({ error: 'memberUserId is required.' }, { status: 400 });
    }

    const club = await getOwnedClub(userId, clubId);
    if (!club) return NextResponse.json({ error: 'Club not found.' }, { status: 404 });

    const code = outcomeTypeCode || (allowed ? 'A01' : 'D05');

    const outcome = await outcomeService.resolveOutcomeMessage({
      clubId: club.id,
      outcomeTypeCode: code,
      clubAdminUserIds: [userId, club.adminId],
      memberUserIds: [memberUserId],
    });

    if (!outcome) {
      return NextResponse.json({ error: 'Outcome message not found.' }, { status: 404 });
    }

    return NextResponse.json({
      allowed,
      readerId: readerId || null,
      memberUserId,
      clubId: club.id,
      outcome: {
        code: outcome.code,
        message: outcome.message,
        audioFile: outcome.audioFile,
        audioUrl: outcome.audioUrl,
        mode: outcome.mode,
        source: outcome.source,
      },
    });
  } catch (error) {
    console.error('POST /api/club/access/evaluate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
