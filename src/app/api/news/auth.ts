import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const decoded = verifyToken(authHeader.slice(7));
  return decoded?.userId ?? null;
}

export function requireAuth(request: NextRequest): { userId: string } | NextResponse {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return { userId };
}

export async function requireAuthWithUser(request: NextRequest): Promise<
  { userId: string; userType: string; country: string | null; isAdmin: boolean; isSuperAdmin: boolean } | NextResponse
> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, userType: true, country: true },
    });
    if (user) {
      const isAdmin = user.userType === 'ADMIN';
      return {
        userId: user.id,
        userType: user.userType,
        country: user.country,
        isAdmin,
        isSuperAdmin: false,
      };
    }
    // Token may be from Super Admin (admin panel login)
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });
    if (superAdmin?.isActive) {
      return {
        userId: superAdmin.id,
        userType: 'ADMIN',
        country: null,
        isAdmin: true,
        isSuperAdmin: true,
      };
    }
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
