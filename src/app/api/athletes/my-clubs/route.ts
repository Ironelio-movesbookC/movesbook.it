import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

const clubAdminSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  telegramAccount: true,
  lastSeenAt: true,
} as const;

function mapClubAdmin(admin: {
  id: string;
  name: string;
  username: string;
  email: string;
  telegramAccount: string | null;
  lastSeenAt: Date | null;
} | null) {
  if (!admin) return null;
  const adminLastSeen = admin.lastSeenAt ?? null;
  return {
    id: admin.id,
    name: admin.name,
    username: admin.username,
    email: admin.email,
    telegramAccount: admin.telegramAccount,
    lastSeenAt: adminLastSeen?.toISOString() ?? null,
    isOnline:
      adminLastSeen != null &&
      Date.now() - adminLastSeen.getTime() < ONLINE_THRESHOLD_MS,
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;

    // Clubs where user is a member and/or club staff (staff are not ClubMembers)
    const [memberships, staffRoles] = await Promise.all([
      prisma.clubMember.findMany({
        where: { memberId: userId },
        include: {
          club: {
            include: {
              admin: { select: clubAdminSelect },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.clubStaff.findMany({
        where: { userId },
        include: {
          club: {
            include: {
              admin: { select: clubAdminSelect },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type ClubRow = {
      id: string;
      name: string;
      description: string | null;
      location: string | null;
      youtubeChannelUrl: string | null;
      admin: ReturnType<typeof mapClubAdmin>;
      adminId: string | null;
      role: string | null;
      membershipType: string | null;
      joinedAt: Date;
      viaStaff: boolean;
    };

    const byClubId = new Map<string, ClubRow>();

    for (const m of memberships) {
      const admin = m.club.admin;
      byClubId.set(m.club.id, {
        id: m.club.id,
        name: m.club.name,
        description: m.club.description,
        location: m.club.location,
        youtubeChannelUrl: m.club.youtubeChannelUrl,
        admin: mapClubAdmin(admin),
        adminId: m.club.adminId ?? admin?.id ?? null,
        role: m.role,
        membershipType: m.membershipType,
        joinedAt: m.joinedAt,
        viaStaff: false,
      });
    }

    for (const s of staffRoles) {
      const existing = byClubId.get(s.club.id);
      if (existing) {
        // Prefer member row; keep staff type visible via role when member role empty
        if (!existing.role) {
          existing.role = s.staffType;
        }
        continue;
      }
      const admin = s.club.admin;
      byClubId.set(s.club.id, {
        id: s.club.id,
        name: s.club.name,
        description: s.club.description,
        location: s.club.location,
        youtubeChannelUrl: s.club.youtubeChannelUrl,
        admin: mapClubAdmin(admin),
        adminId: s.club.adminId ?? admin?.id ?? null,
        role: s.staffType,
        membershipType: 'staff',
        joinedAt: s.createdAt,
        viaStaff: true,
      });
    }

    const clubs = Array.from(byClubId.values())
      .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
      .map(({ viaStaff: _viaStaff, ...club }) => club);

    return NextResponse.json({ clubs });
  } catch (error: unknown) {
    console.error('Error fetching athlete clubs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
