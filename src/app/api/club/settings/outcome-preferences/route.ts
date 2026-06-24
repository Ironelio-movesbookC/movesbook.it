import { NextRequest, NextResponse } from 'next/server';
import { ClubOutcomeMode } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

function parseMode(value: unknown): ClubOutcomeMode | null {
  const raw = String(value ?? '').toUpperCase();
  if (raw === 'EN' || raw === 'ENGLISH') return ClubOutcomeMode.EN;
  if (raw === 'COUNTRY_STANDARD' || raw === 'COUNTRY' || raw === 'DEFAULT') {
    return ClubOutcomeMode.COUNTRY_STANDARD;
  }
  if (raw === 'CUSTOM') return ClubOutcomeMode.CUSTOM;
  return null;
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

    const clubId = request.nextUrl.searchParams.get('clubId');
    const club = await getOwnedClub(String(decoded.userId), clubId);
    if (!club) return NextResponse.json({ error: 'Club not found.' }, { status: 404 });

    const prefs = await outcomeService.getClubPreferences(club.id);
    const languages = await outcomeService.listLanguages();

    return NextResponse.json({
      clubId: club.id,
      mode: prefs.mode,
      languages,
      modes: [
        { value: ClubOutcomeMode.EN, label: 'English (system)' },
        { value: ClubOutcomeMode.COUNTRY_STANDARD, label: 'Country standard language' },
        { value: ClubOutcomeMode.CUSTOM, label: 'Custom club messages' },
      ],
    });
  } catch (error) {
    console.error('GET /api/club/settings/outcome-preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const clubIdParam = body.clubId != null ? String(body.clubId) : null;
    const club = await getOwnedClub(String(decoded.userId), clubIdParam);
    if (!club) return NextResponse.json({ error: 'Club not found.' }, { status: 404 });

    const mode = parseMode(body.mode);
    if (!mode) {
      return NextResponse.json({ error: 'Invalid mode. Use EN, COUNTRY_STANDARD, or CUSTOM.' }, { status: 400 });
    }

    const prefs = await outcomeService.setClubPreferences(club.id, mode);
    return NextResponse.json({
      success: true,
      message: 'Outcome preference updated.',
      ...prefs,
    });
  } catch (error) {
    console.error('PUT /api/club/settings/outcome-preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
