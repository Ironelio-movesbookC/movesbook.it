import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isStaffUserType } from '@/lib/panelAuth';

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

  if (isStaffUserType(decoded.userType)) {
    const staff = await prisma.staffAccount.findUnique({
      where: { id: decoded.userId },
      select: { id: true, kind: true },
    });
    if (!staff) {
      return { ok: false, status: 401, error: 'Staff session expired. Please login again.' };
    }
    return { ok: true, adminUserId: staff.id, isSuperAdmin: false };
  }

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

  if (decoded?.userType === 'ADMIN') {
    return { ok: false, status: 401, error: 'Session expired. Please login again.' };
  }

  return { ok: false, status: 403, error: 'Forbidden' };
}

/** Boolean helper for routes that only need pass/fail admin check. */
export async function requireAdminAuth(request: NextRequest): Promise<boolean> {
  const auth = await requireAdmin(request);
  return auth.ok;
}

export function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
