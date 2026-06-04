import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';


// Verify Super Admin password (used by save routes)
export async function POST(request: NextRequest) {
  try {
    const { password, username } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // First, try to verify with SuperAdmin user (new system)
    if (username) {
      const superAdmin = await prisma.superAdmin.findFirst({
        where: {
          OR: [
            { username: username.toLowerCase() },
            { email: username.toLowerCase() }
          ]
        }
      });

      if (superAdmin && superAdmin.isActive) {
        const isValid = await verifyPassword(password, superAdmin.password);
        if (isValid) {
          return NextResponse.json({ success: true, valid: true });
        }
      }
    }

    const activeSuperAdmins = await prisma.superAdmin.findMany({
      where: { isActive: true },
      select: { password: true },
    });
    for (const sa of activeSuperAdmins) {
      if (await verifyPassword(password, sa.password)) {
        return NextResponse.json({ success: true, valid: true });
      }
    }

    const settings = await prisma.superAdminSettings.findFirst({
      select: { password: true },
    });

    if (settings?.password) {
      const isValid = await verifyPassword(password, settings.password);
      if (isValid) {
        return NextResponse.json({ success: true, valid: true });
      }
    }

    // Final fallback: Environment variable or default
    const fallbackPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
    if (password === fallbackPassword) {
      return NextResponse.json({ success: true, valid: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid password' },
      { status: 401 }
    );

  } catch (error) {
    console.error('Error verifying Super Admin password:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

