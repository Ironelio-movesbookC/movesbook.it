import { NextRequest, NextResponse } from 'next/server';
import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';
import { parseClubSubscriptionEndDate } from '@/lib/admin/clubSubscriptionStatus';
import { clubSearchResultsPath } from '@/lib/searchresultsPaths';
import { getUserPersonalWebsiteHref } from '@/lib/userPersonalWebsite';
import {
  buildPcuPanel,
  inferProfileSegment,
  typeBadgeLabel,
} from '@/lib/admin/userPcuPanel';
import { readProfilePanelSettings } from '@/lib/admin/userProfilePanelSettings';
import { readPcuAccessSettings } from '@/lib/admin/userPcuAccessSettings';
import { readPcuSettings } from '@/lib/admin/userPcuSettings';

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
  let segment = url.searchParams.get('segment') || '';

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
      gender: true,
      birthdate: true,
      telegramAccount: true,
      image: true,
      createdAt: true,
      mainSports: { select: { sport: true }, orderBy: { order: 'asc' } },
      ownedClubs: {
        select: {
          id: true,
          name: true,
          location: true,
          description: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      ownedTeams: {
        select: {
          id: true,
          name: true,
          description: true,
          sport: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      ownedGroups: {
        select: {
          id: true,
          name: true,
          description: true,
          groupType: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      ownedCoachingGroups: {
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      clubMemberships: {
        select: { club: { select: { name: true, location: true } } },
        orderBy: { joinedAt: 'desc' },
        take: 1,
      },
      settings: { select: { adminSettings: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!segment || !SEGMENT_TYPES[segment]) {
    segment = inferProfileSegment(user.userType);
  }

  const types = SEGMENT_TYPES[segment];
  if (!types?.includes(user.userType)) {
    segment = inferProfileSegment(user.userType);
  }

  const fullName = [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name;
  const primaryOwned = user.ownedClubs[0];
  const primaryMember = user.clubMemberships[0]?.club;
  const clubMeta = parseClubDescriptionMeta(primaryOwned?.description);
  const officialClubName = primaryOwned?.name?.trim() || primaryMember?.name?.trim() || '';
  const location =
    primaryOwned?.location?.trim() || primaryMember?.location?.trim() || '';
  const sportLine =
    user.mainSports.length > 0
      ? user.mainSports.map((m) => sportLabel(m.sport)).join(', ')
      : clubMeta.category?.trim() || '';

  const [planCount, loginLogCount] = await Promise.all([
    prisma.workoutPlan.count({ where: { userId: user.id } }),
    prisma.userLoginLog.count({ where: { userId: user.id } }),
  ]);

  const clubCreatedAt = primaryOwned?.createdAt ?? user.createdAt;
  const dateStart = clubCreatedAt.toISOString().slice(0, 10);
  const subscriptionEndDate = primaryOwned
    ? parseClubSubscriptionEndDate(primaryOwned.description, primaryOwned.createdAt)
    : null;
  const dateEnd = subscriptionEndDate?.toISOString().slice(0, 10) ?? null;

  const panelCountry = clubMeta.country?.trim() || user.country?.trim() || '';
  const panelCity = location || clubMeta.region?.trim() || '';
  const panelUsername = clubMeta.username?.trim() || user.username;
  const panelSport = clubMeta.category?.trim() || sportLine;
  const panelVersion =
    clubMeta.category?.trim() && clubMeta.category !== 'Other'
      ? `Club ${clubMeta.category}`
      : versionLabel(user.userType);
  const memberPaidCount = primaryOwned?._count.members ?? 0;
  const clubAgeYears =
    (Date.now() - new Date(clubCreatedAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const panelModalTitle = clubAgeYears >= 2 ? 'online_old_Club' : 'online_new_Club';
  const personalWebsiteHref =
    segment === 'clubs' ? await getUserPersonalWebsiteHref(user.id) : null;

  const rows = [
    {
      id: `account-${user.id}`,
      dateStart,
      dateEnd,
      version: panelVersion,
      username: user.username,
      companyName: officialClubName,
      e: String(planCount),
      status: 'Active',
    },
  ];

  const pcuPanel = buildPcuPanel(user, segment, loginLogCount, planCount);
  const profilePanel = readProfilePanelSettings(user.settings?.adminSettings);
  const pcuAccess = readPcuAccessSettings(user.settings?.adminSettings, {
    accessStartIso: pcuPanel.startDateIso,
    accessEndIso: pcuPanel.endDateIso,
  });
  const pcuSettings = readPcuSettings(user.settings?.adminSettings);

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName,
    country: user.country?.trim() || '',
    location,
    officialClubName,
    sportLine,
    typeBadge: typeBadgeLabel(user.userType),
    userType: user.userType,
    imageUrl: user.image?.trim() || null,
    subscriptionRows: rows,
    segment,
    pcuPanel,
    profilePanel,
    pcuAccess,
    pcuSettings,
    ...(segment === 'clubs'
      ? {
          userPanel: {
            modalTitle: panelModalTitle,
            fullName,
            username: panelUsername,
            officialName: officialClubName,
            clubname: location || clubMeta.region?.trim() || '',
            country: panelCountry,
            city: location || clubMeta.region?.trim() || '',
            sport: panelSport,
            dateStart,
            dateEnd,
            version: panelVersion,
            paid: memberPaidCount > 0 ? memberPaidCount : planCount,
            adminImageUrl: user.image?.trim() || null,
            clubId: primaryOwned?.id ?? null,
            typeBadge: typeBadgeLabel(user.userType),
            visitPagePath: clubSearchResultsPath(officialClubName),
            websiteUrl: personalWebsiteHref,
          },
        }
      : {}),
  });
}
