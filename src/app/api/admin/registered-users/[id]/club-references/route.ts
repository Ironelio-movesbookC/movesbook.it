import { NextRequest, NextResponse } from 'next/server';
import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { pickClubForAdminProfile } from '@/lib/admin/pickClubForAdminProfile';
import { mergeClubReferencesForSave } from '@/lib/club/clubProfilePayload';

export const dynamic = 'force-dynamic';

const CLUB_OWNER_TYPES: UserType[] = [UserType.CLUB, UserType.CLUB_TRAINER];

/** PATCH — Save club references (admin PCU Club Profile tab). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = params?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    clubId?: string;
    referencesHtml?: string;
    referencesLevel?: string;
  } | null;

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      userType: true,
      ownedClubs: {
        select: {
          id: true,
          name: true,
          location: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user || !CLUB_OWNER_TYPES.includes(user.userType)) {
    return NextResponse.json({ error: 'Club owner not found' }, { status: 404 });
  }

  const clubIdParam = String(body.clubId ?? '').trim();
  const club = pickClubForAdminProfile(user.ownedClubs, {
    clubId: clubIdParam || null,
    searchQuery: null,
  });

  if (!club) {
    return NextResponse.json({ error: 'Club not found for this user' }, { status: 404 });
  }

  const referencesHtml = String(body.referencesHtml ?? '');
  const referencesLevel = String(body.referencesLevel ?? '1').trim() || '1';
  const description = mergeClubReferencesForSave(club.description, {
    referencesHtml,
    referencesLevel,
  });

  await prisma.club.update({
    where: { id: club.id },
    data: { description },
  });

  return NextResponse.json({
    ok: true,
    clubId: club.id,
    referencesHtml,
    referencesLevel,
  });
}
