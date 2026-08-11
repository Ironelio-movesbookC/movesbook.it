import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClubAuthContext } from '@/lib/procedures';
import { listClubMembersArchive } from '@/lib/club/archives/clubArchiveService';
import { computeClubMemberCapacityFromClub } from '@/lib/club/clubMemberCapacity';
import { getMemberRegistrationInfoForUser } from '@/lib/registration/memberRegistrationInfoService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const club = await prisma.club.findUnique({
      where: { id: auth.ctx.club.id },
      select: {
        id: true,
        description: true,
        createdAt: true,
      },
    });

    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const membersArchive = await listClubMembersArchive(auth.ctx, { page: 1, pageSize: 1 });
    const registrationInfo = await getMemberRegistrationInfoForUser(auth.ctx.userId);

    const capacity = computeClubMemberCapacityFromClub({
      description: club.description,
      createdAt: club.createdAt,
      membersAdded: membersArchive.total,
      subscriptionSettingId: registrationInfo?.subscriptionSettingId ?? null,
    });

    return NextResponse.json({
      clubId: club.id,
      subscriptionSettingId: registrationInfo?.subscriptionSettingId ?? null,
      capacity,
    });
  } catch (error) {
    console.error('GET /api/club/member-capacity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
