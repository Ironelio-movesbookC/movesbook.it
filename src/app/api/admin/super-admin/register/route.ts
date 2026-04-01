import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';


export async function POST(request: NextRequest) {
  try {
    const { username, email, password, name } = await request.json();

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if any super admin already exists
    const existingCount = await prisma.superAdmin.count();
    if (existingCount > 0) {
      return NextResponse.json(
        { success: false, error: 'A Super Admin already exists. Only one Super Admin account is allowed.' },
        { status: 403 }
      );
    }

    // Check if username or email already exists
    const existingUser = await prisma.superAdmin.findFirst({
      where: {
        OR: [
          { username: username.toLowerCase() },
          { email: email.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Username or email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Super Admin
    const superAdmin = await prisma.superAdmin.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null
      }
    });

    console.log(`✅ Super Admin created: ${superAdmin.username}`);

    return NextResponse.json({
      success: true,
      message: 'Super Admin registered successfully',
      superAdmin: {
        id: superAdmin.id,
        username: superAdmin.username,
        email: superAdmin.email,
        name: superAdmin.name
      }
    });

  } catch (error) {
    console.error('Error registering Super Admin:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

