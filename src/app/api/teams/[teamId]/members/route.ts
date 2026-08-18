import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { getLogoUrlFromEntityDescription } from '@/lib/entity/entityLogo';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
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
    const teamId = params.teamId;

    // Verify user is admin of this team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        adminId: userId
      }
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found or access denied' },
        { status: 404 }
      );
    }

    // Get all members of this team
    const members = await prisma.teamMember.findMany({
      where: {
        teamId: teamId
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            userType: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        sport: team.sport,
        imageUrl: getLogoUrlFromEntityDescription(team.description),
      },
      members: members.map(m => ({
        id: m.id,
        athlete: m.athlete,
        role: m.role,
        jerseyNumber: m.jerseyNumber,
        joinedAt: m.joinedAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

