import { NextRequest, NextResponse } from 'next/server';
import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

function formatUserTypeLabel(t: UserType): string {
  switch (t) {
    case UserType.ATHLETE:
      return 'Athlete';
    case UserType.COACH:
      return 'Coach';
    case UserType.TEAM:
      return 'Team';
    case UserType.TEAM_MANAGER:
      return 'Team manager';
    case UserType.CLUB:
      return 'Club';
    case UserType.CLUB_TRAINER:
      return 'Club trainer';
    case UserType.GROUP:
      return 'Group';
    case UserType.GROUP_ADMIN:
      return 'Group admin';
    case UserType.ADMIN:
      return 'Admin';
    default:
      return t;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [
    totalAthletes,
    totalCoaches,
    teamsAndGroups,
    recentSessions,
    totalUsers,
    recentRegistrations,
  ] = await Promise.all([
    prisma.user.count({ where: { userType: UserType.ATHLETE } }),
    prisma.user.count({ where: { userType: UserType.COACH } }),
    prisma.user.count({
      where: {
        userType: {
          in: [UserType.TEAM, UserType.TEAM_MANAGER, UserType.GROUP, UserType.GROUP_ADMIN],
        },
      },
    }),
    prisma.user.count({
      where: {
        lastSeenAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.user.count(),
    prisma.user.findMany({
      where: { userType: { not: UserType.ADMIN } },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        name: true,
        firstName: true,
        surname: true,
        username: true,
        userType: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalUsers,
      activeCoaches: totalCoaches,
      teamsAndGroups,
      activeSessions: recentSessions,
      athletes: totalAthletes,
    },
    recentRegistrations: recentRegistrations.map((u: (typeof recentRegistrations)[number]) => {
      const displayName = [u.firstName, u.surname].filter(Boolean).join(' ').trim() || u.name;
      return {
        id: u.id,
        title: 'New user registered',
        displayName,
        subtitle: `${displayName} joined as ${formatUserTypeLabel(u.userType)}`,
        createdAt: u.createdAt.toISOString(),
      };
    }),
  });
}
