import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';


export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword, email } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if settings already exist
    const existing = await prisma.superAdminSettings.findFirst();

    // If password exists, verify current password
    if (existing) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required' },
          { status: 400 }
        );
      }

      const isValid = await bcrypt.compare(currentPassword, existing.password);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      // Update existing password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.superAdminSettings.update({
        where: { id: existing.id },
        data: {
          password: hashedPassword,
          email: email || existing.email
        }
      });

      console.log('✅ Super Admin password updated');
    } else {
      // Create new password (first time setup)
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.superAdminSettings.create({
        data: {
          password: hashedPassword,
          email: email || null
        }
      });

      console.log('✅ Super Admin password created');
    }

    return NextResponse.json({
      success: true,
      message: 'Super Admin credentials updated successfully'
    });

  } catch (error) {
    console.error('Error updating Super Admin credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

