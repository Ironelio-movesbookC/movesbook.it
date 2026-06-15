import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { resolveLegacyUserForPromocodeSession } from '@/lib/promocodes/legacyDb';

export type PromocodeSessionUser = {
  email: string;
  username: string;
  legacyUserId: number;
  roleId: number | null;
  isAdmin: boolean;
};

export function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/** Resolve logged-in user (JWT) to legacy users row used by promocode tables. */
export async function resolvePromocodeSessionUser(
  request: NextRequest
): Promise<{ ok: true; user: PromocodeSessionUser } | { ok: false; status: number; error: string }> {
  const token = getBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const decoded = verifyToken(token);
  if (!decoded?.email) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  const email = String(decoded.email).trim().toLowerCase();
  const modernUserId = decoded.userId != null ? String(decoded.userId) : undefined;
  const username = decoded.username != null ? String(decoded.username) : '';
  const userType = decoded.userType != null ? String(decoded.userType) : undefined;

  let name: string | undefined;
  if (modernUserId) {
    const modernUser = await prisma.user.findUnique({
      where: { id: modernUserId },
      select: { name: true, firstName: true, surname: true },
    }).catch(() => null);
    if (modernUser) {
      name = modernUser.name || [modernUser.firstName, modernUser.surname].filter(Boolean).join(' ').trim() || undefined;
    }
  }

  const resolved = await resolveLegacyUserForPromocodeSession({
    modernUserId,
    email,
    username,
    userType,
    name,
  });

  if (!resolved) {
    return { ok: false, status: 404, error: 'Legacy user profile not found for this account.' };
  }

  const adminAuth = await requireAdmin(request);
  const isAdmin = adminAuth.ok;

  return {
    ok: true,
    user: {
      email: resolved.email,
      username: resolved.username || username,
      legacyUserId: resolved.legacyUserId,
      roleId: resolved.roleId,
      isAdmin,
    },
  };
}
