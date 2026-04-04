import { prisma } from '@/lib/prisma';
import { getOrCreateUserForSuperAdmin } from '@/app/api/news/auth';

/**
 * Maps JWT `userId` to a row in `users_new` for FK-safe workout/period/plan writes.
 * Super Admin panel tokens use `super_admins.id`; we use/create a linked User (`superAdminId`).
 */
export async function resolveWorkoutDatabaseUserId(tokenUserId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: tokenUserId },
    select: { id: true },
  });
  if (user) return user.id;

  const superAdmin = await prisma.superAdmin.findUnique({
    where: { id: tokenUserId },
    select: { id: true, isActive: true },
  });
  if (superAdmin?.isActive) {
    return getOrCreateUserForSuperAdmin(superAdmin.id);
  }

  return null;
}
