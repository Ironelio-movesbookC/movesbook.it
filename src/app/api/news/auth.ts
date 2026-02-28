import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const NEWS_SYSTEM_USERNAME = 'movesbook-news-system';
const NEWS_SYSTEM_EMAIL = 'movesbook-news-system@internal';

/** Get or create the shared User used for news data when the request is from a SuperAdmin (no User row). */
export async function getOrCreateNewsSystemUser(): Promise<string> {
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: NEWS_SYSTEM_USERNAME },
        { email: NEWS_SYSTEM_EMAIL },
      ],
    },
    select: { id: true },
  });
  if (user) return user.id;
  const hashedPassword = await hashPassword('movesbook-news-system-no-login-' + NEWS_SYSTEM_EMAIL);
  user = await prisma.user.create({
    data: {
      username: NEWS_SYSTEM_USERNAME,
      email: NEWS_SYSTEM_EMAIL,
      password: hashedPassword,
      name: 'News (Admin)',
      userType: 'ADMIN',
    },
    select: { id: true },
  });
  return user.id;
}

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

/** Use for news routes that read/write by userId. Returns effective userId (User table id); for SuperAdmin uses news system user. */
export async function requireAuthForNews(request: NextRequest): Promise<
  { userId: string; userType: string; country: string | null; isAdmin: boolean; isSuperAdmin: boolean } | NextResponse
> {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.isSuperAdmin) {
    const systemUserId = await getOrCreateNewsSystemUser();
    return { ...auth, userId: systemUserId };
  }
  return auth;
}
