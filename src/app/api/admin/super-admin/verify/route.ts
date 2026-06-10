import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';


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
        const isValid = await bcrypt.compare(password, superAdmin.password);
        if (isValid) {
          return NextResponse.json({ success: true, valid: true });
        }
      }
    }

    // Fall back to any active super admin (if no username provided)
    const anySuperAdmin = await prisma.superAdmin.findFirst({
      where: { isActive: true }
    });

    if (anySuperAdmin) {
      const isValid = await bcrypt.compare(password, anySuperAdmin.password);
      if (isValid) {
        return NextResponse.json({ success: true, valid: true });
      }
    }

    // Legacy fallback: Check SuperAdminSettings
    const settings = await prisma.superAdminSettings.findFirst();

    if (settings) {
      const isValid = await bcrypt.compare(password, settings.password);
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

