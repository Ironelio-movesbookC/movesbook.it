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

    // Get all clubs where user is admin
    const clubs = await prisma.club.findMany({
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
            member: {
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
      clubs: clubs.map(club => ({
        id: club.id,
        name: club.name,
        description: club.description,
        location: club.location,
        memberCount: club.members.length,
        createdAt: club.createdAt,
        admin: club.admin ? {
          username: club.admin.username,
          name: club.admin.name
        } : null
      }))
    });
  } catch (error: any) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

