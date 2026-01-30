import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // Get all groups where user is admin
    const groups = await prisma.group.findMany({
      where: {
        adminId: userId
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      groups: groups.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        groupType: group.groupType,
        memberCount: group.members.length,
        createdAt: group.createdAt,
        admin: group.admin ? {
          username: group.admin.username,
          name: group.admin.name
        } : null
      }))
    });
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

