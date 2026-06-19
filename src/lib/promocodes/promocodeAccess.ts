import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { resolvePromocodeSessionUser } from '@/lib/promocodes/promocodeSessionAuth';

export type PromocodeAccess = {
  isAdmin: boolean;
  isStaff: boolean;
  legacyUserId: number;
  username: string | null;
  email: string | null;
};

export async function requirePromocodeAccess(
  request: NextRequest
): Promise<{ ok: true; access: PromocodeAccess } | { ok: false; status: number; error: string }> {
  const admin = await requireAdmin(request);
  if (admin.ok) {
    return {
      ok: true,
      access: {
        isAdmin: true,
        isStaff: true,
        legacyUserId: 1,
        username: null,
        email: null,
      },
    };
  }

  const session = await resolvePromocodeSessionUser(request);
  if (!session.ok) {
    return session;
  }

  return {
    ok: true,
    access: {
      isAdmin: false,
      isStaff: false,
      legacyUserId: session.user.legacyUserId,
      username: session.user.username,
      email: session.user.email,
    },
  };
}
