import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Find the existing Super Admin
    const superAdmin = await prisma.superAdmin.findFirst({
      where: { isActive: true },
      select: {
        username: true,
        email: true,
        name: true,
        isActive: true
      }
    });

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, error: 'Super Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...superAdmin
    });

  } catch (error) {
    console.error('Error fetching Super Admin profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

