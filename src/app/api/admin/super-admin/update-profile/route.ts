import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, email, name, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Find the existing Super Admin
    const superAdmin = await prisma.superAdmin.findFirst({
      where: { isActive: true }
    });

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, error: 'Super Admin not found' },
        { status: 404 }
      );
    }

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Check if username or email already exists (for other users)
    const existingByUsername = await prisma.superAdmin.findFirst({
      where: {
        username,
        id: { not: superAdmin.id }
      }
    });

    if (existingByUsername) {
      return NextResponse.json(
        { success: false, error: 'Username already taken' },
        { status: 400 }
      );
    }

    const existingByEmail = await prisma.superAdmin.findFirst({
      where: {
        email,
        id: { not: superAdmin.id }
      }
    });

    if (existingByEmail) {
      return NextResponse.json(
        { success: false, error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Update the profile
    const updated = await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: {
        username,
        email,
        name: name || null
      },
      select: {
        username: true,
        email: true,
        name: true
      }
    });

    // Also update SuperAdminSettings if it exists
    const settings = await prisma.superAdminSettings.findFirst();
    if (settings) {
      await prisma.superAdminSettings.update({
        where: { id: settings.id },
        data: { email }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updated
    });

  } catch (error) {
    console.error('Error updating Super Admin profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

