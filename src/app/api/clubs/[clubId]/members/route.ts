import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string } }
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
    const clubId = params.clubId;

    // Verify user is admin of this club
    const club = await prisma.club.findFirst({
      where: {
        id: clubId,
        adminId: userId
      }
    });

    if (!club) {
      return NextResponse.json(
        { error: 'Club not found or access denied' },
        { status: 404 }
      );
    }

    // Get all members of this club
    const members = await prisma.clubMember.findMany({
      where: {
        clubId: clubId
      },
      include: {
        member: {
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
      club: {
        id: club.id,
        name: club.name,
        description: club.description,
        location: club.location
      },
      members: members.map(m => ({
        id: m.id,
        member: m.member,
        role: m.role,
        membershipType: m.membershipType,
        joinedAt: m.joinedAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching club members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

