import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLatestMembershipDates } from '@/lib/club/memberMembershipArchive';

export const dynamic = 'force-dynamic';

function getUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token)?.userId ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } },
) {
  const viewerUserId = getUserId(request);
  if (!viewerUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const club = await prisma.club.findUnique({
    where: { id: params.clubId },
    select: { adminId: true },
  });
  if (!club) {
    return NextResponse.json({ error: 'Club not found' }, { status: 404 });
  }

  const clubMember = await prisma.clubMember.findUnique({
    where: {
      clubId_memberId: { clubId: params.clubId, memberId: params.memberId },
    },
    select: { joinedAt: true },
  });
  if (!clubMember) {
    return NextResponse.json({ error: 'Member not found in this club' }, { status: 404 });
  }

  const isClubAdmin = club.adminId === viewerUserId;
  const isSelf = params.memberId === viewerUserId;
  if (!isClubAdmin && !isSelf) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const dates = await getLatestMembershipDates(
    params.clubId,
    params.memberId,
    clubMember.joinedAt,
  );

  return NextResponse.json({ dates });
}
