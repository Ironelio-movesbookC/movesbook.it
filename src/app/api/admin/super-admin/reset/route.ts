import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * POST - Reset Super Admin password to default
 * This is an emergency endpoint to reset the super admin password
 */
export async function POST(request: NextRequest) {
  try {
    // Default credentials
    const DEFAULT_USERNAME = 'superadmin';
    const DEFAULT_EMAIL = 'admin@movesbook.com';
    const DEFAULT_PASSWORD = 'admin123';

    // Hash the default password
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    console.log('🔄 Resetting Super Admin password to default...');

    // Check if SuperAdmin exists in new system
    const existingSuperAdmin = await prisma.superAdmin.findFirst({
      where: { 
        OR: [
          { username: DEFAULT_USERNAME },
          { email: DEFAULT_EMAIL }
        ]
      }
    });

    if (existingSuperAdmin) {
      // Update existing Super Admin
      await prisma.superAdmin.update({
        where: { id: existingSuperAdmin.id },
        data: {
          password: hashedPassword,
          email: DEFAULT_EMAIL,
          isActive: true,
          name: 'Super Administrator'
        }
      });
      console.log('✅ Super Admin password updated to default');
    } else {
      // Create new Super Admin if doesn't exist
      await prisma.superAdmin.create({
        data: {
          username: DEFAULT_USERNAME,
          email: DEFAULT_EMAIL,
          password: hashedPassword,
          name: 'Super Administrator',
          isActive: true
        }
      });
      console.log('✅ Super Admin created with default password');
    }

    // Also update/create in legacy SuperAdminSettings table for compatibility
    const existingSettings = await prisma.superAdminSettings.findFirst();

    if (existingSettings) {
      await prisma.superAdminSettings.update({
        where: { id: existingSettings.id },
        data: {
          password: hashedPassword,
          email: DEFAULT_EMAIL
        }
      });
      console.log('✅ Legacy SuperAdminSettings updated');
    } else {
      await prisma.superAdminSettings.create({
        data: {
          password: hashedPassword,
          email: DEFAULT_EMAIL
        }
      });
      console.log('✅ Legacy SuperAdminSettings created');
    }

    return NextResponse.json({
      success: true,
      message: 'Super Admin password reset to default successfully',
      credentials: {
        username: DEFAULT_USERNAME,
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD
      }
    });

  } catch (error) {
    console.error('❌ Error resetting Super Admin password:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset Super Admin password',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

