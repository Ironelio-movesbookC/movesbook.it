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

    // Verify user is admin of this group
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        adminId: userId
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or access denied' },
        { status: 404 }
      );
    }

    // Get all members of this group
    const members = await prisma.groupMember.findMany({
      where: {
        groupId: groupId
      },
      include: {
        user: {
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
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        groupType: group.groupType,
        imageUrl: getLogoUrlFromEntityDescription(group.description),
      },
      members: members.map(m => ({
        id: m.id,
        user: m.user,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

