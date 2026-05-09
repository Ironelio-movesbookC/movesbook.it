import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type AdminAuthContext =
  | { ok: true; adminUserId: string; isSuperAdmin: boolean }
  | { ok: false; status: number; error: string };

export async function requireAdmin(request: NextRequest): Promise<AdminAuthContext> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  // Accept either a valid super admin session token, or a User with userType ADMIN.
  const superAdmin = await prisma.superAdmin.findFirst({
    where: { id: decoded.userId, isActive: true },
    select: { id: true },
  });
  if (superAdmin) {
    return { ok: true, adminUserId: decoded.userId, isSuperAdmin: true };
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, userType: true },
  });
  if (user?.userType === 'ADMIN') {
    return { ok: true, adminUserId: user.id, isSuperAdmin: false };
  }

  // If the token claims ADMIN but we can't confirm it against the DB (reset/seed, deleted user,
  // or userType changed), treat it as an expired session so the UI can prompt re-login.
  if (decoded?.userType === 'ADMIN') {
    return { ok: false, status: 401, error: 'Session expired. Please login again.' };
  }

  return { ok: false, status: 403, error: 'Forbidden' };
}

