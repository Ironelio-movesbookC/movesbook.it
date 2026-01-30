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

    // Get all clubs where user is a member
    const clubs = await prisma.clubMember.findMany({
      where: {
        memberId: userId
      },
      include: {
        club: {
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
      clubs: clubs.map(m => ({
        id: m.club.id,
        name: m.club.name,
        description: m.club.description,
        location: m.club.location,
        admin: m.club.admin,
        role: m.role,
        membershipType: m.membershipType,
        joinedAt: m.joinedAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching athlete clubs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

