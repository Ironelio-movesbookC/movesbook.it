import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  formatMyClubsSidebarLabel,
  isClubCreatedFromForm,
  parseClubDescriptionMeta,
} from '@/lib/club/clubSidebarLabel';

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

    // Get all clubs where user is admin
    const clubs = await prisma.club.findMany({
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
            member: {
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

    const mapped = clubs.map((club) => {
      const meta = parseClubDescriptionMeta(club.description);
      return {
        id: club.id,
        name: club.name,
        description: club.description,
        location: club.location,
        youtubeChannelUrl: club.youtubeChannelUrl,
        memberCount: club.members.length,
        createdAt: club.createdAt,
        clubUsername: meta.username ?? null,
        directAccess: meta.directAccess ?? null,
        sidebarLabel: formatMyClubsSidebarLabel(club),
        hasClubProfile: isClubCreatedFromForm(club),
        admin: club.admin
          ? {
              username: club.admin.username,
              name: club.admin.name,
            }
          : null,
      };
    });

    return NextResponse.json({
      clubs: mapped,
      hasClubProfile: mapped.some((c) => c.hasClubProfile),
      clubProfiles: mapped.filter((c) => c.hasClubProfile),
    });
  } catch (error: any) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

