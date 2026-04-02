import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find super admin by username or email
    const superAdmin = await prisma.superAdmin.findFirst({
      where: {
        OR: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() }
        ]
      }
    });

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!superAdmin.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, superAdmin.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { lastLogin: new Date() }
    });

    console.log(`✅ Super Admin logged in: ${superAdmin.username}`);

    // Generate JWT so admin panel and news API can authenticate (same as /api/auth/admin/login)
    const token = generateToken(
      superAdmin.id,
      superAdmin.email ?? '',
      superAdmin.username,
      'ADMIN'
    );

    const user = {
      id: superAdmin.id,
      name: superAdmin.name ?? superAdmin.username,
      username: superAdmin.username,
      email: superAdmin.email ?? '',
      userType: 'ADMIN' as const,
    };

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user,
      superAdmin: {
        id: superAdmin.id,
        username: superAdmin.username,
        email: superAdmin.email,
        name: superAdmin.name,
        lastLogin: new Date()
      }
    });

  } catch (error) {
    console.error('Error logging in Super Admin:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

