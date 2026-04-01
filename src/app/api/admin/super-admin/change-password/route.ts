import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * POST - Change Super Admin password
 */
export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();

    console.log('📝 Change password request received');

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find active super admin
    const superAdmin = await prisma.superAdmin.findFirst({
      where: { isActive: true }
    });

    console.log('🔍 Super Admin found:', superAdmin ? 'Yes' : 'No');

    if (!superAdmin) {
      // Try to find any super admin
      const anySuperAdmin = await prisma.superAdmin.findFirst();
      
      if (!anySuperAdmin) {
        return NextResponse.json(
          { success: false, error: 'No Super Admin account exists. Please create one first.' },
          { status: 404 }
        );
      }

      // If found but not active, try with that one
      console.log('⚠️ Found inactive Super Admin, using it');
      const isValidPassword = await bcrypt.compare(currentPassword, anySuperAdmin.password);

      if (!isValidPassword) {
        console.log('❌ Current password is incorrect');
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      // Hash new password and update inactive admin
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      await prisma.superAdmin.update({
        where: { id: anySuperAdmin.id },
        data: { 
          password: hashedNewPassword,
          isActive: true
        }
      });

      // Also update legacy SuperAdminSettings if exists
      const settings = await prisma.superAdminSettings.findFirst();
      if (settings) {
        await prisma.superAdminSettings.update({
          where: { id: settings.id },
          data: { password: hashedNewPassword }
        });
      }

      console.log('✅ Inactive Super Admin password changed and activated');

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, superAdmin.password);

    console.log('🔐 Password verification:', isValidPassword ? 'Valid' : 'Invalid');

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { password: hashedNewPassword }
    });

    // Also update legacy SuperAdminSettings if exists
    const settings = await prisma.superAdminSettings.findFirst();
    if (settings) {
      await prisma.superAdminSettings.update({
        where: { id: settings.id },
        data: { password: hashedNewPassword }
      });
    }

    console.log('✅ Super Admin password changed successfully');

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Error changing Super Admin password:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to change password',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

