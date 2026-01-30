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

    // Get all coaching groups where user is a member
    const coachingGroups = await prisma.coachingGroupMember.findMany({
      where: {
        athleteId: userId
      },
      include: {
        coachingGroup: {
          include: {
            coach: {
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
        joinedAt: 'desc'
      }
    });

    return NextResponse.json({
      coachingGroups: coachingGroups.map(m => ({
        id: m.coachingGroup.id,
        name: m.coachingGroup.name,
        description: m.coachingGroup.description,
        coach: m.coachingGroup.coach,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching athlete coaches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

