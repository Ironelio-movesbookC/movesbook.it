import { NextRequest, NextResponse } from 'next/server';
import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const SEGMENT_TYPES: Record<string, UserType[]> = {
  'single-user': [UserType.ATHLETE],
  coaches: [UserType.COACH],
  groups: [UserType.GROUP, UserType.GROUP_ADMIN],
  teams: [UserType.TEAM, UserType.TEAM_MANAGER],
  clubs: [UserType.CLUB, UserType.CLUB_TRAINER],
};

function versionLabel(userType: UserType): string {
  switch (userType) {
    case UserType.ATHLETE:
      return 'User — base version';
    case UserType.COACH:
      return 'Coach — base';
    case UserType.TEAM:
    case UserType.TEAM_MANAGER:
      return 'Team account';
    case UserType.CLUB:
    case UserType.CLUB_TRAINER:
      return 'Club account';
    case UserType.GROUP:
    case UserType.GROUP_ADMIN:
      return 'Group account';
    default:
      return String(userType);
  }
}

function typeBadge(userType: UserType): string {
  switch (userType) {
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
      return userType;
  }
}

function sportLabel(s: string): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = params?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const segment = url.searchParams.get('segment') || 'single-user';
  const types = SEGMENT_TYPES[segment];
  if (!types?.length) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      firstName: true,
      surname: true,
      userType: true,
      country: true,
      image: true,
      createdAt: true,
      mainSports: { select: { sport: true }, orderBy: { order: 'asc' } },
      ownedClubs: { select: { name: true, location: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      clubMemberships: {
        select: { club: { select: { name: true, location: true } } },
        orderBy: { joinedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!types.includes(user.userType)) {
    return NextResponse.json({ error: 'User is not in this category' }, { status: 404 });
  }

  const fullName = [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name;
  const primaryOwned = user.ownedClubs[0];
  const primaryMember = user.clubMemberships[0]?.club;
  const officialClubName = primaryOwned?.name?.trim() || primaryMember?.name?.trim() || '';
  const location =
    primaryOwned?.location?.trim() || primaryMember?.location?.trim() || '';
  const sportLine =
    user.mainSports.length > 0 ? user.mainSports.map((m) => sportLabel(m.sport)).join(', ') : '';

  const planCount = await prisma.workoutPlan.count({ where: { userId: user.id } });

  const dateStart = user.createdAt.toISOString().slice(0, 10);
  const rows = [
    {
      id: `account-${user.id}`,
      dateStart,
      dateEnd: null as string | null,
      version: versionLabel(user.userType),
      username: user.username,
      e: String(planCount),
      status: 'Active',
    },
  ];

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName,
    country: user.country?.trim() || '',
    location,
    officialClubName,
    sportLine,
    typeBadge: typeBadge(user.userType),
    userType: user.userType,
    imageUrl: user.image?.trim() || null,
    subscriptionRows: rows,
  });
}
