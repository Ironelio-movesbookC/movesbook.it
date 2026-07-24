import { NextRequest, NextResponse } from 'next/server';
import { loadClubAdminInfoForUser } from '@/lib/user/clubAdminInfoPersistence';
import { userCanViewClubDesk, getTokenUserId } from '@/lib/club/clubDeskAccess';
import { prisma } from '@/lib/prisma';
import { buildClubSocialSiteLaunchUrls } from '@/lib/club/clubSocialSiteUrls';

export const dynamic = 'force-dynamic';

/**
 * Launch URLs for Website editor Social Sites rows (from club admin Contact Info).
 * Available to club admin or club members.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const userId = getTokenUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clubId = params.clubId;
    if (!(await userCanViewClubDesk(userId, clubId))) {
      return NextResponse.json({ error: 'Club not found or access denied' }, { status: 404 });
    }

    const club = await prisma.club.findFirst({
      where: { id: clubId },
      select: { adminId: true },
    });
    if (!club?.adminId) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const { clubAdminInfo } = await loadClubAdminInfoForUser(club.adminId);

    return NextResponse.json({ urls: buildClubSocialSiteLaunchUrls(clubAdminInfo) });
  } catch (error) {
    console.error('Error loading club social launch URLs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
