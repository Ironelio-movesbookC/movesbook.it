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
  { userId: string; userType: string; country: string | null; isAdmin: boolean } | NextResponse
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
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
    const isAdmin = user.userType === 'ADMIN';
    return {
      userId: user.id,
      userType: user.userType,
      country: user.country,
      isAdmin,
    };
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
