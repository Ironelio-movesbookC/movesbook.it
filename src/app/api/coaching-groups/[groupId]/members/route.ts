import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { getLogoUrlFromEntityDescription } from '@/lib/entity/entityLogo';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
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
    const groupId = params.groupId;

    // Verify user is coach of this coaching group
    const coachingGroup = await prisma.coachingGroup.findFirst({
      where: {
        id: groupId,
        coachId: userId
      }
    });

    if (!coachingGroup) {
      return NextResponse.json(
        { error: 'Coaching group not found or access denied' },
        { status: 404 }
      );
    }

    // Get all members of this coaching group
    const members = await prisma.coachingGroupMember.findMany({
      where: {
        coachingGroupId: groupId
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
      coachingGroup: {
        id: coachingGroup.id,
        name: coachingGroup.name,
        description: coachingGroup.description,
        imageUrl: getLogoUrlFromEntityDescription(coachingGroup.description),
      },
      members: members.map(m => ({
        id: m.id,
        athlete: m.athlete,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching coaching group members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

