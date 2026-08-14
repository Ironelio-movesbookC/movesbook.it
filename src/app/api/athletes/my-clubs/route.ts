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
                email: true,
                telegramAccount: true,
                lastSeenAt: true,
              }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

    return NextResponse.json({
      clubs: clubs.map(m => {
        const admin = m.club.admin;
        const adminLastSeen = admin?.lastSeenAt ?? null;
        return {
          id: m.club.id,
          name: m.club.name,
          description: m.club.description,
          location: m.club.location,
          youtubeChannelUrl: m.club.youtubeChannelUrl,
          admin: admin
            ? {
                id: admin.id,
                name: admin.name,
                username: admin.username,
                email: admin.email,
                telegramAccount: admin.telegramAccount,
                lastSeenAt: adminLastSeen?.toISOString() ?? null,
                isOnline:
                  adminLastSeen != null &&
                  Date.now() - adminLastSeen.getTime() < ONLINE_THRESHOLD_MS,
              }
            : null,
          adminId: m.club.adminId ?? admin?.id ?? null,
          role: m.role,
          membershipType: m.membershipType,
          joinedAt: m.joinedAt,
        };
      })
    });
  } catch (error: any) {
    console.error('Error fetching athlete clubs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

