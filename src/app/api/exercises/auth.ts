import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const NEWS_SYSTEM_USERNAME = 'movesbook-news-system';
const NEWS_SYSTEM_EMAIL = 'movesbook-news-system@internal';

/** Get or create the shared User used for news/exercise data when the request is from a SuperAdmin (no User row). */
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

/** User IDs in users_new that represent super admins (for filtering topics/OGP for normal users). */
export async function getSuperAdminUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { superAdminId: { not: null } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  const systemUserId = await getOrCreateNewsSystemUser();
  if (!ids.includes(systemUserId)) ids.push(systemUserId);
  return ids;
}

/** All IDs that indicate "created by Super Admin": User ids (linked + news system) + raw super_admins table ids. Use for MB badge. */
export async function getSuperAdminCreatorIds(): Promise<string[]> {
  const [userIds, superAdmins] = await Promise.all([
    getSuperAdminUserIds(),
    prisma.superAdmin.findMany({ where: { isActive: true }, select: { id: true } }),
  ]);
  const superAdminTableIds = superAdmins.map((s) => s.id);
  const set = new Set<string>([...userIds, ...superAdminTableIds]);
  return Array.from(set);
}

/** Get or create a User in users_new for the given SuperAdmin so topics/OGP are attributed to the super admin. */
export async function getOrCreateUserForSuperAdmin(superAdminId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { superAdminId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const superAdmin = await prisma.superAdmin.findUnique({
    where: { id: superAdminId },
    select: { id: true, name: true, username: true, email: true },
  });
  if (!superAdmin) {
    throw new Error('Super admin not found');
  }

  const name = superAdmin.name?.trim() || superAdmin.username;
  const email = superAdmin.email.trim();
  const username = superAdmin.username.trim();
  const hashedPassword = await hashPassword('no-login-superadmin-' + superAdminId);

  try {
    const user = await prisma.user.create({
      data: {
        superAdminId: superAdmin.id,
        name,
        username,
        email,
        password: hashedPassword,
        userType: 'ADMIN',
      },
      select: { id: true },
    });
    return user.id;
  } catch (e: any) {
    if (e?.code === 'P2002') {
      const user = await prisma.user.create({
        data: {
          superAdminId: superAdmin.id,
          name,
          username: `sa-${superAdmin.id}`,
          email: `sa-${superAdmin.id}@movesbook.internal`,
          password: hashedPassword,
          userType: 'ADMIN',
        },
        select: { id: true },
      });
      return user.id;
    }
    throw e;
  }
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
      select: { id: true, userType: true, country: true, superAdminId: true },
    });
    if (user) {
      const isAdmin = user.userType === 'ADMIN';
      const linkedSuperAdmin =
        user.superAdminId != null
          ? await prisma.superAdmin.findFirst({
              where: { id: user.superAdminId, isActive: true },
              select: { id: true },
            })
          : null;
      return {
        userId: user.id,
        userType: user.userType,
        country: user.country,
        isAdmin,
        isSuperAdmin: Boolean(linkedSuperAdmin),
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

/** Use for exercise routes that read/write by userId. Returns effective userId (User table id); for SuperAdmin creates/uses a User in users_new with super admin info. */
export async function requireAuthForNews(request: NextRequest): Promise<
  { userId: string; userType: string; country: string | null; isAdmin: boolean; isSuperAdmin: boolean } | NextResponse
> {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.isSuperAdmin) {
    const userId = await getOrCreateUserForSuperAdmin(auth.userId);
    return { ...auth, userId };
  }
  return auth;
}
