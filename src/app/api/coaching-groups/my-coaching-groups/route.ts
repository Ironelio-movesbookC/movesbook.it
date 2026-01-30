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

    // Get all coaching groups where user is coach
    const coachingGroups = await prisma.coachingGroup.findMany({
      where: {
        coachId: userId
      },
      include: {
        coach: {
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
      coachingGroups: coachingGroups.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        memberCount: group.members.length,
        createdAt: group.createdAt,
        admin: group.coach ? {
          username: group.coach.username,
          name: group.coach.name
        } : null
      }))
    });
  } catch (error: any) {
    console.error('Error fetching coaching groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

