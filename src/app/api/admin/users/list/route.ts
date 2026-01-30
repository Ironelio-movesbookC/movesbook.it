import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Check if admin
    const admin = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (admin?.userType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get filter from query params
    const userType = request.nextUrl.searchParams.get('userType');
    const search = request.nextUrl.searchParams.get('search');

    // Build where clause
    const where: any = {};
    
    if (userType && userType !== 'ALL') {
      where.userType = userType;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } }
      ];
    }

    // Get all users (MIGRATED DATA!)
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        userType: true,
        createdAt: true,
        _count: {
          select: {
            clubMemberships: true,
            workoutPlans: true,
            workoutTemplates: true,
            coaches: true,
            athletes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit to 100 users per request
    });

    // Get total count
    const totalCount = await prisma.user.count({ where });

    return NextResponse.json({
      users,
      total: totalCount
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

