import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET — inspect Bearer token for Admin Management UI.
 * - tableSuperAdmin: JWT subject is super_admins.id (login via Admin Management form).
 * - isAdminUser: JWT subject is users_new with userType ADMIN (typical /api/auth/admin/login).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        tableSuperAdmin: false,
        isAdminUser: false,
      });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({
        tableSuperAdmin: false,
        isAdminUser: false,
      });
    }

    const superAdmin = await prisma.superAdmin.findFirst({
      where: { id: decoded.userId, isActive: true },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        lastLogin: true,
      },
    });

    if (superAdmin) {
      return NextResponse.json({
        tableSuperAdmin: true,
        isAdminUser: false,
        superAdmin: {
          id: superAdmin.id,
          username: superAdmin.username,
          email: superAdmin.email,
          name: superAdmin.name,
          lastLogin: superAdmin.lastLogin,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { userType: true },
    });

    const isAdminUser = user?.userType === 'ADMIN';

    return NextResponse.json({
      tableSuperAdmin: false,
      isAdminUser,
    });
  } catch (error) {
    console.error('super-admin/session:', error);
    return NextResponse.json(
      { tableSuperAdmin: false, isAdminUser: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
