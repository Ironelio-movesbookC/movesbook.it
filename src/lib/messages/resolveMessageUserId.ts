import { prisma } from '@/lib/prisma';
import { getOrCreateUserForSuperAdmin } from '@/app/api/news/auth';
import { isStaffUserType } from '@/lib/panelAuth';

/** Map JWT userId to a users_new row for message thread FK constraints. */
export async function resolveMessageDatabaseUserId(
  tokenUserId: string,
  userType?: string,
): Promise<string | null> {
  const direct = await prisma.user.findUnique({
    where: { id: tokenUserId },
    select: { id: true },
  });
  if (direct) return direct.id;

  const superAdmin = await prisma.superAdmin.findUnique({
    where: { id: tokenUserId },
    select: { id: true, isActive: true },
  });
  if (superAdmin?.isActive) {
    return getOrCreateUserForSuperAdmin(superAdmin.id);
  }

  if (isStaffUserType(userType)) {
    const staff = await prisma.staffAccount.findUnique({
      where: { id: tokenUserId },
      select: { email: true },
    });
    if (staff?.email) {
      const byEmail = await prisma.user.findFirst({
        where: { email: staff.email },
        select: { id: true },
      });
      if (byEmail) return byEmail.id;
    }
  }

  return null;
}
