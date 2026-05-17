import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const STAFF_USER_TYPES = ['STAFF_OPERATOR', 'STAFF_CO_ADMIN'] as const;
export type StaffUserType = (typeof STAFF_USER_TYPES)[number];

export type PanelAuthContext =
  | { ok: true; role: 'super_admin'; actorId: string }
  | { ok: true; role: 'admin_user'; actorId: string }
  | { ok: true; role: 'staff'; actorId: string; staffKind: 'OPERATOR' | 'CO_ADMIN' }
  | { ok: false; status: number; error: string };

export function isStaffUserType(userType: unknown): userType is StaffUserType {
  return typeof userType === 'string' && (STAFF_USER_TYPES as readonly string[]).includes(userType);
}

/** Resolve bearer token to super admin, legacy admin user, or staff account. */
export async function resolvePanelAuth(request: NextRequest): Promise<PanelAuthContext> {
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
    const expectedKind = decoded.userType === 'STAFF_CO_ADMIN' ? 'CO_ADMIN' : 'OPERATOR';
    if (staff.kind !== expectedKind) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }
    return { ok: true, role: 'staff', actorId: staff.id, staffKind: staff.kind };
  }

  const superAdmin = await prisma.superAdmin.findFirst({
    where: { id: decoded.userId, isActive: true },
    select: { id: true },
  });
  if (superAdmin) {
    return { ok: true, role: 'super_admin', actorId: superAdmin.id };
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, userType: true },
  });
  if (user?.userType === 'ADMIN') {
    return { ok: true, role: 'admin_user', actorId: user.id };
  }

  return { ok: false, status: 403, error: 'Forbidden' };
}

/** Super Admin or legacy Admin user — not staff. */
export async function requireAdminPanel(request: NextRequest): Promise<PanelAuthContext> {
  const auth = await resolvePanelAuth(request);
  if (!auth.ok) return auth;
  if (auth.role === 'staff') {
    return { ok: false, status: 403, error: 'Admin access required' };
  }
  return auth;
}

/** Super Admin table only — not staff, not legacy ADMIN users. */
export async function requireSuperAdminPanel(request: NextRequest): Promise<PanelAuthContext> {
  const auth = await resolvePanelAuth(request);
  if (!auth.ok) return auth;
  if (auth.role !== 'super_admin') {
    return { ok: false, status: 403, error: 'Super Admin access required' };
  }
  return auth;
}

/** Staff may only access their own staff account id; admins may access any. */
export async function requireStaffSelfOrAdminPanel(
  request: NextRequest,
  targetStaffAccountId: string,
): Promise<PanelAuthContext> {
  const auth = await resolvePanelAuth(request);
  if (!auth.ok) return auth;
  if (auth.role === 'staff' && auth.actorId !== targetStaffAccountId) {
    return { ok: false, status: 403, error: 'You can only access your own account' };
  }
  return auth;
}

export function isAdminPanelRole(auth: PanelAuthContext & { ok: true }): boolean {
  return auth.role === 'super_admin' || auth.role === 'admin_user';
}
