import { NextRequest, NextResponse } from 'next/server';
import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { parseClubDescriptionMeta, getClubMyPageDisplayName } from '@/lib/club/clubSidebarLabel';
import { parseClubSubscriptionEndDate } from '@/lib/admin/clubSubscriptionStatus';
import { getUserPersonalWebsiteHref } from '@/lib/userPersonalWebsite';
import {
  buildPcuPanel,
  inferProfileSegment,
  typeBadgeLabel,
} from '@/lib/admin/userPcuPanel';
import { readProfilePanelSettings } from '@/lib/admin/userProfilePanelSettings';
import { readPcuAccessSettings } from '@/lib/admin/userPcuAccessSettings';
import { pickClubForAdminProfile } from '@/lib/admin/pickClubForAdminProfile';
import { readPcuSettings } from '@/lib/admin/userPcuSettings';
import { loadClubAdminInfoForUser } from '@/lib/user/clubAdminInfoPersistence';
import { buildClubUserPanelFields } from '@/lib/admin/clubUserPanel';
import { buildProfileSubscriptionRows } from '@/lib/admin/buildProfileSubscriptionRows';

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
  const searchQuery = (url.searchParams.get('q') || '').trim();
  const clubIdParam = (url.searchParams.get('clubId') || '').trim();

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
        orderBy: { createdAt: 'desc' },
        take: 50,
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

  if (!segment || segment === 'all' || !SEGMENT_TYPES[segment]) {
    segment = inferProfileSegment(user.userType);
  }

  const types = SEGMENT_TYPES[segment];
  if (!types?.includes(user.userType)) {
    segment = inferProfileSegment(user.userType);
  }

  const fullName = [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name;
  const primaryOwned = pickClubForAdminProfile(user.ownedClubs, {
    clubId: clubIdParam || null,
    searchQuery: searchQuery || null,
  });
  const primaryMember = user.clubMemberships[0]?.club;
  const clubMeta = parseClubDescriptionMeta(primaryOwned?.description);
  const userForPcuPanel = {
    ...user,
    ownedClubs: primaryOwned ? [primaryOwned] : [],
  };
  const officialClubName = primaryOwned
    ? getClubMyPageDisplayName(primaryOwned)
    : primaryMember?.name?.trim() || '';
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
  const panelCity =
    clubMeta.address?.trim() ||
    clubMeta.region?.trim() ||
    location ||
    '';
  const panelUsername = clubMeta.username?.trim() || user.username;
  const panelSport = clubMeta.category?.trim() || sportLine;
  const panelVersion =
    clubMeta.category?.trim() && clubMeta.category !== 'Other'
      ? `Club ${clubMeta.category}`
      : versionLabel(user.userType);
  const memberPaidCount = primaryOwned?._count.members ?? 0;
  const personalWebsiteHref =
    segment === 'clubs' ? await getUserPersonalWebsiteHref(user.id) : null;

  const subscriptionRows = buildProfileSubscriptionRows(user.settings?.adminSettings, {
    id: `account-${user.id}`,
    dateStart,
    dateEnd,
    version: panelVersion,
    username: panelUsername,
    companyName: officialClubName,
    e: String(planCount),
    entityId: primaryOwned?.id ?? null,
  });

  const pcuPanel = buildPcuPanel(userForPcuPanel, segment, loginLogCount, planCount);

  if (segment === 'clubs' && pcuPanel.entityProfile) {
    const { clubAdminInfo } = await loadClubAdminInfoForUser(user.id);
    const phone = [clubAdminInfo.phonePrefix.trim(), clubAdminInfo.phoneNumber.trim()]
      .filter(Boolean)
      .join(' ');
    const telegram =
      clubAdminInfo.whatsapp.url.trim() ||
      clubMeta.directAccess?.trim() ||
      '';
    pcuPanel.entityProfile = {
      ...pcuPanel.entityProfile,
      phone,
      telegram,
    };
  }

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
    subscriptionRows,
    segment,
    pcuPanel,
    profilePanel,
    pcuAccess,
    pcuSettings,
    ...(segment === 'clubs' && primaryOwned
      ? {
          userPanel: buildClubUserPanelFields(user, primaryOwned, {
            planCount,
            websiteUrl: personalWebsiteHref,
          }),
        }
      : {}),
  });
}
