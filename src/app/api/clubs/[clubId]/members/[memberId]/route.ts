import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * DELETE — Remove a user from the club (Archive of Members).
 * Does not delete the Movesbook user account.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } },
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { clubId, memberId } = params;

    const club = await prisma.club.findFirst({
      where: { id: clubId, adminId: decoded.userId },
      select: { id: true },
    });
    if (!club) {
      return NextResponse.json({ error: 'Club not found or access denied' }, { status: 404 });
    }

    const existing = await prisma.clubMember.findFirst({
      where: { clubId, memberId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Member not found in this club' }, { status: 404 });
    }

    await prisma.clubMember.delete({ where: { id: existing.id } });

    return NextResponse.json({ success: true, memberId });
  } catch (error: unknown) {
    console.error('Error removing club member:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
