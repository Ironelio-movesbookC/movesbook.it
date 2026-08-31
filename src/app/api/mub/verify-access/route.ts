import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminPassword } from '@/lib/messages/verifySuperAdminPassword';
import { verifyClubCompanyPassword } from '@/lib/club/clubDirectLogin';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';

export const dynamic = 'force-dynamic';

/**
 * Gear password gate:
 * - Super Admin password → staff templates
 * - Club Admin (club entity "My Password") for a club this user admins → unlock user MUB settings
 * - Personal account password (fallback) → unlock user MUB settings
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = token ? verifyToken(token) : null;
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { password?: string };
    const password = body.password?.trim() ?? '';
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    if (await verifySuperAdminPassword(password)) {
      return NextResponse.json({ access: 'staff' });
    }

    const clubs = await prisma.club.findMany({
      where: { adminId: decoded.userId },
      select: { id: true, description: true },
    });
    for (const club of clubs) {
      const hash = parseClubDescriptionMeta(club.description).clubPasswordHash;
      if (await verifyClubCompanyPassword(password, hash)) {
        return NextResponse.json({ access: 'club', clubId: club.id });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { password: true },
    });
    if (user?.password && (await verifyPassword(password, user.password))) {
      return NextResponse.json({ access: 'club' });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
  } catch (error) {
    console.error('POST /api/mub/verify-access failed:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
