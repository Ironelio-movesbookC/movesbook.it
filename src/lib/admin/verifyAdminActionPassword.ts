import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import type { AdminAuthContext } from '@/lib/adminAuth';

async function verifySuperAdminCredentials(
  password: string,
  username?: string,
): Promise<boolean> {
  const trimmed = password?.trim();
  if (!trimmed) return false;

  if (username?.trim()) {
    const key = username.trim().toLowerCase();
    const superAdmin = await prisma.superAdmin.findFirst({
      where: {
        OR: [{ username: key }, { email: key }],
        isActive: true,
      },
      select: { password: true },
    });
    if (superAdmin && (await verifyPassword(trimmed, superAdmin.password))) {
      return true;
    }
  }

  const activeSuperAdmins = await prisma.superAdmin.findMany({
    where: { isActive: true },
    select: { password: true },
  });
  for (const sa of activeSuperAdmins) {
    if (await verifyPassword(trimmed, sa.password)) return true;
  }

  const settings = await prisma.superAdminSettings.findFirst({
    select: { password: true },
  });
  if (settings?.password && (await verifyPassword(trimmed, settings.password))) {
    return true;
  }

  const fallbackPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  return trimmed === fallbackPassword;
}

/**
 * Confirm destructive admin actions: super admin credentials or the logged-in admin's own password.
 */
export async function verifyAdminActionPassword(
  password: string,
  auth: Extract<AdminAuthContext, { ok: true }>,
  usernameHint?: string,
): Promise<boolean> {
  if (await verifySuperAdminCredentials(password, usernameHint)) {
    return true;
  }

  if (auth.isSuperAdmin) {
    const superAdmin = await prisma.superAdmin.findFirst({
      where: { id: auth.adminUserId, isActive: true },
      select: { password: true },
    });
    if (superAdmin && (await verifyPassword(password, superAdmin.password))) {
      return true;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.adminUserId },
    select: { password: true, userType: true },
  });
  if (user?.userType === 'ADMIN' && (await verifyPassword(password, user.password))) {
    return true;
  }

  return false;
}
