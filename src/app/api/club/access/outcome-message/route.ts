import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { outcomeService } from '@/lib/outcomes';
import { ClubOutcomeMode } from '@prisma/client';

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

function parseMode(value: string): ClubOutcomeMode | undefined {
  const raw = value.toUpperCase();
  if (raw === 'EN') return ClubOutcomeMode.EN;
  if (raw === 'COUNTRY' || raw === 'COUNTRY_STANDARD' || raw === 'PRIMARY') {
    return ClubOutcomeMode.COUNTRY_STANDARD;
  }
  if (raw === 'CUSTOM') return ClubOutcomeMode.CUSTOM;
  return undefined;
}

export async function GET(request: NextRequest) {
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

    const userId = String(decoded.userId);
    const clubId = request.nextUrl.searchParams.get('clubId');
    const memberUserId = request.nextUrl.searchParams.get('memberUserId');
    const messageTypeId = request.nextUrl.searchParams.get('messageTypeId');
    const code = request.nextUrl.searchParams.get('code');
    const languageModeParam = text(request.nextUrl.searchParams.get('languageMode'));

    if (!memberUserId) {
      return NextResponse.json({ error: 'memberUserId is required.' }, { status: 400 });
    }
    if (!messageTypeId && !code) {
      return NextResponse.json({ error: 'messageTypeId or code is required.' }, { status: 400 });
    }

    const club = await getOwnedClub(userId, clubId);
    if (!club) return NextResponse.json({ error: 'Club not found.' }, { status: 404 });

    const modeOverride = parseMode(languageModeParam);

    const outcome = await outcomeService.resolveOutcomeMessage({
      clubId: club.id,
      outcomeTypeId: messageTypeId || undefined,
      outcomeTypeCode: code ?? undefined,
      clubAdminUserIds: [userId, club.adminId],
      memberUserIds: [memberUserId],
      modeOverride,
    });

    if (!outcome) {
      return NextResponse.json({ error: 'Outcome message not found.' }, { status: 404 });
    }

    return NextResponse.json({
      messageTypeId: outcome.outcomeTypeId,
      code: outcome.code,
      message: outcome.message,
      audioFile: outcome.audioFile,
      audioUrl: outcome.audioUrl,
      languageId: outcome.legacyLanguageId ?? outcome.languageId,
      source: outcome.source === 'custom' ? 'club_custom' : 'club_primary',
      mode: outcome.mode,
      memberUserId,
      clubId: club.id,
    });
  } catch (error) {
    console.error('GET /api/club/access/outcome-message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
