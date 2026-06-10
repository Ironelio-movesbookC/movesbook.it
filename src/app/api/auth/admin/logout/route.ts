import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isStaffUserType } from '@/lib/panelAuth';
import { prisma } from '@/lib/prisma';
import {
  clearStaffAlternatePassword,
  closeOpenStaffLoginLog,
} from '@/lib/staffAlternatePassword';
import { closeOpenSuperAdminLoginLog } from '@/lib/loginLogSession';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (isStaffUserType(decoded.userType)) {
    try {
      await closeOpenStaffLoginLog(decoded.userId);
    } catch {
      /* login log optional */
    }

    if (decoded.loginViaAlternatePassword === true) {
      try {
        await clearStaffAlternatePassword(decoded.userId);
      } catch {
        /* best effort */
      }
    }
  } else {
    try {
      const superAdmin = await prisma.superAdmin.findFirst({
        where: { id: decoded.userId, isActive: true },
        select: { id: true },
      });
      if (superAdmin) {
        await closeOpenSuperAdminLoginLog(decoded.userId);
      }
    } catch {
      /* login log optional */
    }
  }

  return NextResponse.json({ success: true });
}
