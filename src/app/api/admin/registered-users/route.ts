import { NextRequest, NextResponse } from 'next/server';
import { Prisma, SportType, UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import {
  aggregateClubAdminSubscriptionStatus,
  parseClubSubscriptionEndDate,
  type ClubSubscriptionStatusTone,
} from '@/lib/admin/clubSubscriptionStatus';
import { sortClubsByCreatedAtAsc } from '@/lib/club/clubSidebarLabel';
import {
  expandRegisteredUserListRows,
  isClubUserType,
  type RegisteredUserListRow,
} from '@/lib/admin/expandRegisteredUserListRows';
import {
  buildMembershipListRows,
  getDefaultMembershipSortOrder,
  parseMembershipViewMode,
  readNetworkSubscriptionHistory,
  type NetworkSubscriptionPeriod,
} from '@/lib/admin/networkSubscriptionHistory';
import {
  buildMovesbookUserTextSearchOr,
  segmentShouldMatchOwnedClubs,
} from '@/lib/admin/movesbookUserTextSearch';

export const dynamic = 'force-dynamic';

const ALL_REGISTERED_TYPES: UserType[] = [
  UserType.ATHLETE,
  UserType.COACH,
  UserType.GROUP,
  UserType.GROUP_ADMIN,
  UserType.TEAM,
  UserType.TEAM_MANAGER,
  UserType.CLUB,
  UserType.CLUB_TRAINER,
];

const SEGMENT_TYPES: Record<string, UserType[]> = {
  all: ALL_REGISTERED_TYPES,
  'single-user': [UserType.ATHLETE],
  coaches: [UserType.COACH],
  groups: [UserType.GROUP, UserType.GROUP_ADMIN],
  teams: [UserType.TEAM, UserType.TEAM_MANAGER],
  clubs: [UserType.CLUB, UserType.CLUB_TRAINER],
};

const USER_TYPE_CATEGORY_TYPES: Record<string, UserType[]> = {
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
      return userType;
  }
}

function parseOrder(
  raw: string | null,
): Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[] {
  switch (raw) {
    case 'username':
      return { username: 'asc' };
    case 'fullname':
      return [{ surname: 'asc' }, { firstName: 'asc' }, { name: 'asc' }];
    case 'date':
      return { createdAt: 'desc' };
    case 'date_end':
      return { updatedAt: 'desc' };
    default:
      return { createdAt: 'desc' };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const segment = url.searchParams.get('segment') || 'single-user';
  const types = SEGMENT_TYPES[segment];
  if (!types) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
  }

  const search = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10) || 25));
  const orderParam = url.searchParams.get('order') || '';
  const country = (url.searchParams.get('country') || '').trim();
  const sportRaw = (url.searchParams.get('sport') || '').trim();
  const version = (url.searchParams.get('version') || '').trim();
  const login = (url.searchParams.get('login') || 'all').trim();
  const subDay = (url.searchParams.get('subDay') || '').trim();
  const subMonth = (url.searchParams.get('subMonth') || '').trim();
  const subYear = (url.searchParams.get('subYear') || '').trim();
  const createdFrom = (url.searchParams.get('createdFrom') || '').trim();
  const createdTo = (url.searchParams.get('createdTo') || '').trim();
  const userTypeCategory = (url.searchParams.get('userTypeCategory') || '').trim();
  const membershipMode = parseMembershipViewMode(url.searchParams.get('membership'));
  const membershipSort =
    (url.searchParams.get('order') || '').trim() ||
    getDefaultMembershipSortOrder(membershipMode);

  let finalTypes = types;
  if (userTypeCategory && USER_TYPE_CATEGORY_TYPES[userTypeCategory]) {
    finalTypes = types.filter((t) => USER_TYPE_CATEGORY_TYPES[userTypeCategory].includes(t));
  }
  if (version) {
    finalTypes = finalTypes.filter((t) => versionLabel(t) === version);
  }
  if (finalTypes.length === 0) {
    return NextResponse.json({
      total: 0,
      page,
      pageSize,
      users: [],
    });
  }

  const andClauses: Prisma.UserWhereInput[] = [{ userType: { in: finalTypes } }];

  if (search) {
    andClauses.push(
      buildMovesbookUserTextSearchOr(search, {
        matchOwnedClubs: segmentShouldMatchOwnedClubs(segment),
      }),
    );
  }

  if (country) {
    andClauses.push({ country });
  }

  if (sportRaw && Object.values(SportType).includes(sportRaw as SportType)) {
    andClauses.push({
      mainSports: { some: { sport: sportRaw as SportType } },
    });
  }

  if (login === 'never') {
    andClauses.push({ lastSeenAt: null });
  } else if (login === 'active7') {
    andClauses.push({
      lastSeenAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
  } else if (login === 'active24h') {
    andClauses.push({
      lastSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
  }

  const d = parseInt(subDay, 10);
  const m = parseInt(subMonth, 10);
  const y = parseInt(subYear, 10);
  if (!Number.isNaN(d) && !Number.isNaN(m) && !Number.isNaN(y) && m >= 1 && m <= 12) {
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + 1);
    if (!Number.isNaN(start.getTime())) {
      andClauses.push({ createdAt: { gte: start, lt: end } });
    }
  }

  if (createdFrom) {
    const from = new Date(createdFrom);
    if (!Number.isNaN(from.getTime())) {
      andClauses.push({ createdAt: { gte: from } });
    }
  }
  if (createdTo) {
    const to = new Date(createdTo);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      andClauses.push({ createdAt: { lte: to } });
    }
  }

  const where: Prisma.UserWhereInput = { AND: andClauses };
  const orderBy = parseOrder(orderParam);

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        firstName: true,
        surname: true,
        userType: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const isClubsSegment = segment === 'clubs';
  const isAllSegment = segment === 'all';
  const userIds = rows.map((u) => u.id);

  const clubsByAdmin = new Map<
    string,
    { id: string; name: string; description: string | null; createdAt: Date; location: string | null }[]
  >();
  const clubUserIds = isAllSegment
    ? rows.filter((u) => isClubUserType(u.userType)).map((u) => u.id)
    : userIds;
  if ((isClubsSegment || isAllSegment) && clubUserIds.length > 0) {
    const ownedClubs = await prisma.club.findMany({
      where: { adminId: { in: clubUserIds } },
      select: { adminId: true, id: true, name: true, description: true, createdAt: true, location: true },
    });
    for (const club of ownedClubs) {
      const list = clubsByAdmin.get(club.adminId) ?? [];
      list.push({
        id: club.id,
        name: club.name,
        description: club.description,
        createdAt: club.createdAt,
        location: club.location,
      });
      clubsByAdmin.set(club.adminId, list);
    }
  }

  const locationByUserId = new Map<string, string>();
  const nonClubLocationIds = isAllSegment
    ? rows.filter((u) => !isClubUserType(u.userType)).map((u) => u.id)
    : isClubsSegment
      ? []
      : userIds;
  if (nonClubLocationIds.length > 0) {
    const memberships = await prisma.clubMember.findMany({
      where: { memberId: { in: nonClubLocationIds } },
      select: {
        memberId: true,
        club: { select: { location: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
    for (const m of memberships) {
      const loc = m.club.location?.trim();
      if (loc && !locationByUserId.has(m.memberId)) {
        locationByUserId.set(m.memberId, loc);
      }
    }
  }

  const teamsByAdmin = new Map<
    string,
    { id: string; name: string; sport: string | null; createdAt: Date }[]
  >();
  const groupsByAdmin = new Map<
    string,
    { id: string; name: string; groupType: string | null; createdAt: Date }[]
  >();
  const coachingGroupsByCoach = new Map<
    string,
    { id: string; name: string; createdAt: Date }[]
  >();

  if (isAllSegment && userIds.length > 0) {
    const teamAdminIds = rows
      .filter((u) => u.userType === UserType.TEAM || u.userType === UserType.TEAM_MANAGER)
      .map((u) => u.id);
    const groupAdminIds = rows
      .filter((u) => u.userType === UserType.GROUP || u.userType === UserType.GROUP_ADMIN)
      .map((u) => u.id);
    const coachIds = rows.filter((u) => u.userType === UserType.COACH).map((u) => u.id);

    const [ownedTeams, ownedGroups, ownedCoaching] = await Promise.all([
      teamAdminIds.length > 0
        ? prisma.team.findMany({
            where: { adminId: { in: teamAdminIds } },
            select: { adminId: true, id: true, name: true, sport: true, createdAt: true },
          })
        : [],
      groupAdminIds.length > 0
        ? prisma.group.findMany({
            where: { adminId: { in: groupAdminIds } },
            select: { adminId: true, id: true, name: true, groupType: true, createdAt: true },
          })
        : [],
      coachIds.length > 0
        ? prisma.coachingGroup.findMany({
            where: { coachId: { in: coachIds } },
            select: { coachId: true, id: true, name: true, createdAt: true },
          })
        : [],
    ]);

    for (const team of ownedTeams) {
      const list = teamsByAdmin.get(team.adminId) ?? [];
      list.push({
        id: team.id,
        name: team.name,
        sport: team.sport,
        createdAt: team.createdAt,
      });
      teamsByAdmin.set(team.adminId, list);
    }
    for (const group of ownedGroups) {
      const list = groupsByAdmin.get(group.adminId) ?? [];
      list.push({
        id: group.id,
        name: group.name,
        groupType: group.groupType,
        createdAt: group.createdAt,
      });
      groupsByAdmin.set(group.adminId, list);
    }
    for (const cg of ownedCoaching) {
      const list = coachingGroupsByCoach.get(cg.coachId) ?? [];
      list.push({ id: cg.id, name: cg.name, createdAt: cg.createdAt });
      coachingGroupsByCoach.set(cg.coachId, list);
    }
  }

  const baseRows: RegisteredUserListRow[] = rows.map((u: (typeof rows)[number]) => {
    const displayName = [u.firstName, u.surname].filter(Boolean).join(' ').trim() || u.name;

    let clubsOwnedCount: number | undefined;
    let companyName: string | undefined;
    let status = 'Active';
    let statusTone: ClubSubscriptionStatusTone | undefined;

    let location = '';
    let primaryClubId: string | null = null;
    const userIsClubAdmin = isClubUserType(u.userType);
    if (isClubsSegment || (isAllSegment && userIsClubAdmin)) {
      const adminClubs = clubsByAdmin.get(u.id) ?? [];
      clubsOwnedCount = adminClubs.length;
      if (adminClubs.length > 0) {
        const first = sortClubsByCreatedAtAsc(adminClubs)[0]!;
        primaryClubId = first.id;
        companyName = first.name?.trim() || '';
        location = first.location?.trim() || '';
      }
      const endDates = adminClubs.map((c) =>
        parseClubSubscriptionEndDate(c.description, c.createdAt),
      );
      const aggregated = aggregateClubAdminSubscriptionStatus(endDates);
      status = aggregated.label;
      statusTone = aggregated.tone;
    } else {
      location = locationByUserId.get(u.id) ?? '';
      if (isAllSegment && u.userType === UserType.ATHLETE) {
        companyName = '';
      }
    }

    return {
      rowKey: u.id,
      id: u.id,
      username: u.username,
      accountUsername: u.username,
      email: u.email,
      displayName,
      userType: u.userType,
      country: u.country,
      location,
      dateStart: u.createdAt.toISOString().slice(0, 10),
      dateEnd: null as string | null,
      version: versionLabel(u.userType),
      amount: '—',
      status,
      ...(isClubsSegment || isAllSegment
        ? {
            clubsOwnedCount,
            companyName,
            statusTone,
            primaryClubId: isClubsSegment || userIsClubAdmin ? primaryClubId : null,
          }
        : {}),
    };
  });

  const entityMaps = {
    clubsByAdmin,
    teamsByAdmin,
    groupsByAdmin,
    coachingGroupsByCoach,
  };

  const historyByUserId = new Map<string, NetworkSubscriptionPeriod[]>();
  if (userIds.length > 0) {
    const settingsRows = await prisma.userSettings.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, adminSettings: true },
    });
    for (const s of settingsRows) {
      historyByUserId.set(s.userId, readNetworkSubscriptionHistory(s.adminSettings));
    }
  }

  const expandEntities =
    (isClubsSegment || isAllSegment) && membershipMode !== 'lastPerUser';

  let users: RegisteredUserListRow[];
  if (membershipMode === 'lastPerUser') {
    const allEntities = expandRegisteredUserListRows(baseRows, entityMaps, {
      expandEntities: isClubsSegment || isAllSegment,
    });
    users = buildMembershipListRows(
      allEntities,
      historyByUserId,
      'lastPerUser',
      membershipSort,
    );
  } else {
    const entityExpanded = expandRegisteredUserListRows(baseRows, entityMaps, {
      expandEntities,
    });
    users = buildMembershipListRows(
      entityExpanded,
      historyByUserId,
      membershipMode,
      membershipSort,
    );
  }

  return NextResponse.json({
    total,
    page,
    pageSize,
    users,
    membership: membershipMode,
    membershipSort,
    expandedRowCount: users.length,
  });
}
