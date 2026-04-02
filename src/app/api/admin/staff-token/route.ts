import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, generateToken, hashPassword } from '@/lib/auth';

/**
 * POST /api/admin/staff-token
 *
 * Called by the admin navbar "Dashboard" button.
 * Verifies the current admin session, then finds-or-creates a dedicated
 * "Movesbook Staff" User row so the admin can use the full user dashboard
 * (create workouts, periods, favourites, etc.) as a real user.
 *
 * Returns: { token, user } — same shape as the regular user login response.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminToken = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(adminToken);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
    }

    // The dedicated staff user account used for creating shared content
    const STAFF_EMAIL = 'staff@movesbook.internal';
    const STAFF_USERNAME = 'movesbook_staff';
    const STAFF_NAME = 'Movesbook Staff';

    // Find or create the staff user in the User table
    let staffUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: STAFF_EMAIL }, { username: STAFF_USERNAME }]
      },
      select: { id: true, name: true, username: true, email: true, userType: true }
    });

    if (!staffUser) {
      const passwordHash = await hashPassword('movesbook_staff_internal_' + Date.now());
      staffUser = await prisma.user.create({
        data: {
          email: STAFF_EMAIL,
          username: STAFF_USERNAME,
          name: STAFF_NAME,
          password: passwordHash,
          userType: 'ADMIN'
        },
        select: { id: true, name: true, username: true, email: true, userType: true }
      });
    }

    const token = generateToken(
      staffUser.id,
      staffUser.email,
      staffUser.username,
      staffUser.userType
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: staffUser.id,
        name: staffUser.name,
        username: staffUser.username,
        email: staffUser.email,
        userType: staffUser.userType
      }
    });
  } catch (error: any) {
    console.error('staff-token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
