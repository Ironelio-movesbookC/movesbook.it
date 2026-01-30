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

    // Get all teams where user is admin
    const teams = await prisma.team.findMany({
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
            athlete: {
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
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        sport: team.sport,
        memberCount: team.members.length,
        createdAt: team.createdAt,
        admin: team.admin ? {
          username: team.admin.username,
          name: team.admin.name
        } : null
      }))
    });
  } catch (error: any) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

