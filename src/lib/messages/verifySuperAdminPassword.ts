import { NextRequest } from 'next/server';
import { verifyPassword, verifyToken } from '@/lib/auth';
import { getBearerToken } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

/** Same default hash used by `/api/auth/admin/login` fallback admin. */
const FALLBACK_ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  '$2a$12$XabKUB4Yas3AafvzbTWcWO2/oXZfsNb7VJvvi.LxJJxZlXRnkZNGW';

export type VerifySuperAdminPasswordOptions = {
  /** Logged-in account id from admin JWT (preferred — matches legacy session check). */
  userId?: string | null;
  /** Username / email hint from client or JWT. */
  username?: string | null;
};

/** Build verify options from an admin Bearer token on the request. */
export function verifyOptionsFromRequest(
  request: NextRequest,
): VerifySuperAdminPasswordOptions {
  const token = getBearerToken(request);
  if (!token) return {};
  const decoded = verifyToken(token);
  if (!decoded?.userId) return {};
  return {
    userId: String(decoded.userId),
    username:
      decoded.username != null
        ? String(decoded.username)
        : decoded.email != null
          ? String(decoded.email)
          : null,
  };
}

/**
 * Accept passwords that unlock Super Admin actions (Version history, tools save, etc.).
 * Aligns with admin login: SuperAdmin, settings, fallback hash/env, and the current admin user.
 */
export async function verifySuperAdminPassword(
  password: string,
  options?: VerifySuperAdminPasswordOptions,
): Promise<boolean> {
  if (!password.trim()) return false;

  const userId = options?.userId?.trim() || null;
  const username = options?.username?.trim() || null;

  if (userId && (await matchesAccountPassword(userId, password))) {
    return true;
  }

  if (username) {
    const ident = username.toLowerCase();
    const byIdent = await prisma.superAdmin.findFirst({
      where: {
        isActive: true,
        OR: [{ username: ident }, { email: ident }],
      },
      select: { password: true },
    });
    if (byIdent && (await verifyPassword(password, byIdent.password))) {
      return true;
    }

    const staffByIdent = await prisma.staffAccount.findFirst({
      where: {
        OR: [{ username: ident }, { email: ident }],
      },
      select: { password: true, alternatePassword: true },
    });
    if (staffByIdent) {
      if (await verifyPassword(password, staffByIdent.password)) return true;
      if (
        staffByIdent.alternatePassword &&
        (await verifyPassword(password, staffByIdent.alternatePassword))
      ) {
        return true;
      }
    }

    const userByIdent = await prisma.user.findFirst({
      where: {
        OR: [
          { username: ident },
          { email: ident },
          { username },
          { email: username },
        ],
      },
      select: { password: true },
    });
    if (userByIdent?.password && (await verifyPassword(password, userByIdent.password))) {
      return true;
    }
  }

  const superAdmins = await prisma.superAdmin.findMany({
    where: { isActive: true },
    select: { password: true },
  });
  for (const sa of superAdmins) {
    if (await verifyPassword(password, sa.password)) return true;
  }

  const settings = await prisma.superAdminSettings.findFirst({
    select: { password: true },
  });
  if (settings?.password && (await verifyPassword(password, settings.password))) {
    return true;
  }

  if (await verifyPassword(password, FALLBACK_ADMIN_PASSWORD_HASH)) {
    return true;
  }

  const fallbackPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  if (password === fallbackPassword) return true;

  // Cover admins who logged in via users_new ADMIN but have no SuperAdmin row.
  const adminUsers = await prisma.user.findMany({
    where: { userType: 'ADMIN' },
    select: { password: true },
    take: 50,
  });
  for (const u of adminUsers) {
    if (u.password && (await verifyPassword(password, u.password))) return true;
  }

  return false;
}

async function matchesAccountPassword(userId: string, password: string): Promise<boolean> {
  const superAdmin = await prisma.superAdmin.findFirst({
    where: { id: userId, isActive: true },
    select: { password: true },
  });
  if (superAdmin && (await verifyPassword(password, superAdmin.password))) {
    return true;
  }

  const staff = await prisma.staffAccount.findUnique({
    where: { id: userId },
    select: { password: true, alternatePassword: true },
  });
  if (staff) {
    if (await verifyPassword(password, staff.password)) return true;
    if (
      staff.alternatePassword &&
      (await verifyPassword(password, staff.alternatePassword))
    ) {
      return true;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (user?.password && (await verifyPassword(password, user.password))) {
    return true;
  }

  return false;
}
