import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/** Super Admin JWT only (super_admins row). */
export async function requireSuperAdminAccess(
  request: NextRequest
): Promise<
  { ok: true; superAdminId: string } | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
  }

  const superAdmin = await prisma.superAdmin.findFirst({
    where: { id: decoded.userId, isActive: true },
    select: { id: true },
  });
  if (!superAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, superAdminId: superAdmin.id };
}

/** Super Admin (table) or User with userType ADMIN — sport machine companies CRUD. */
export async function requireSportMachineCompaniesAccess(
  request: NextRequest
): Promise<
  | { ok: true; kind: 'super_admin' | 'admin_user'; id: string }
  | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
  }

  const superAdmin = await prisma.superAdmin.findFirst({
    where: { id: decoded.userId, isActive: true },
    select: { id: true },
  });
  if (superAdmin) {
    return { ok: true, kind: 'super_admin', id: superAdmin.id };
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, userType: true },
  });
  if (user?.userType === 'ADMIN') {
    return { ok: true, kind: 'admin_user', id: user.id };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    ),
  };
}
