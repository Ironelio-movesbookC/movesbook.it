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

    // Get all teams where user is a member
    const teams = await prisma.teamMember.findMany({
      where: {
        athleteId: userId
      },
      include: {
        team: {
          include: {
            admin: {
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
      teams: teams.map(m => ({
        id: m.team.id,
        name: m.team.name,
        description: m.team.description,
        sport: m.team.sport,
        admin: m.team.admin,
        role: m.role,
        jerseyNumber: m.jerseyNumber,
        joinedAt: m.joinedAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching athlete teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

