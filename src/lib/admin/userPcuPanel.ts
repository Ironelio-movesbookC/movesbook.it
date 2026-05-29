import type { UserType } from '@prisma/client';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';
import { parseClubSubscriptionEndDate } from '@/lib/admin/clubSubscriptionStatus';
import { getDashboardPathForUserType } from '@/utils/dashboardRouting';
import { clubSearchResultsPath } from '@/lib/searchresultsPaths';

export type PcuPanelPayload = {
  userId: string;
  username: string;
  fullname: string;
  firstName: string;
  surname: string;
  email: string;
  country: string;
  cityClubTeam: string;
  city: string;
  zipCode: string;
  state: string;
  locality: string;
  sport: string;
  mapCoordinates: string | null;
  typeOfUser: string;
  userTypeRaw: string;
  version: string;
  startSubscription: string;
  endSubscription: string;
  startDateIso: string;
  endDateIso: string;
  logs: number;
  imageUrl: string | null;
  dashboardPath: string;
  adminSegmentPath: string;
  entityId: string | null;
  entityName: string;
  visitPagePath: string | null;
  segment: string;
  roleTitle: string;
  gender: string;
  birthDay: number | null;
  birthMonth: number | null;
  birthYear: number | null;
  ageDisplay: string;
  phoneCell: string;
  phoneCell2: string;
  geographical: string | null;
  referencesHtml: string;
  referencesLevel: string;
};

export function segmentRoleTitle(segment: string): string {
  switch (segment) {
    case 'teams':
      return 'Team';
    case 'groups':
      return 'Group';
    case 'clubs':
      return 'Club';
    case 'coaches':
      return 'Coach';
    default:
      return 'User';
  }
}

export function calcAgeDisplay(birthdate: Date | null | undefined, gender: string | null): string {
  if (!birthdate || Number.isNaN(birthdate.getTime())) return '—';
  const now = new Date();
  let age = now.getFullYear() - birthdate.getFullYear();
  const m = now.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthdate.getDate())) age -= 1;
  const g = (gender || '').trim().toUpperCase();
  const suffix = g === 'M' || g === 'MALE' ? 'M' : g === 'F' || g === 'FEMALE' ? 'F' : '';
  return suffix ? `${age}${suffix}` : String(age);
}

export function toIsoDate(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function inferProfileSegment(userType: UserType): string {
  switch (userType) {
    case 'ATHLETE':
      return 'single-user';
    case 'COACH':
      return 'coaches';
    case 'TEAM':
    case 'TEAM_MANAGER':
      return 'teams';
    case 'CLUB':
    case 'CLUB_TRAINER':
      return 'clubs';
    case 'GROUP':
    case 'GROUP_ADMIN':
      return 'groups';
    default:
      return 'single-user';
  }
}

export function navScopeToProfileSegment(scope: string): string {
  const s = (scope || '').trim().toLowerCase();
  if (s === 'athletes' || s === 'athlete') return 'single-user';
  if (s === 'coach' || s === 'coaches') return 'coaches';
  if (s === 'team' || s === 'teams') return 'teams';
  if (s === 'club' || s === 'clubs') return 'clubs';
  if (s === 'group' || s === 'groups') return 'groups';
  if (s === 'all') return '';
  if (['coaches', 'teams', 'clubs', 'groups', 'single-user'].includes(s)) return s;
  return '';
}

export function formatPcuDate(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function typeBadgeLabel(userType: UserType): string {
  switch (userType) {
    case 'ATHLETE':
      return 'Athlete';
    case 'COACH':
      return 'Coach';
    case 'TEAM':
      return 'Team';
    case 'TEAM_MANAGER':
      return 'Team manager';
    case 'CLUB':
      return 'Club';
    case 'CLUB_TRAINER':
      return 'Club trainer';
    case 'GROUP':
      return 'Group';
    case 'GROUP_ADMIN':
      return 'Group admin';
    case 'ADMIN':
      return 'Admin';
    default:
      return String(userType);
  }
}

function versionLabel(userType: UserType): string {
  switch (userType) {
    case 'ATHLETE':
      return 'User — base version';
    case 'COACH':
      return 'Coach — base';
    case 'TEAM':
    case 'TEAM_MANAGER':
      return 'Team account';
    case 'CLUB':
    case 'CLUB_TRAINER':
      return 'Club Premium';
    case 'GROUP':
    case 'GROUP_ADMIN':
      return 'Group account';
    default:
      return String(userType);
  }
}

function adminSegmentPath(segment: string): string {
  switch (segment) {
    case 'teams':
      return '/admin/teams';
    case 'groups':
      return '/admin/groups';
    case 'clubs':
      return '/admin/clubs';
    case 'coaches':
      return '/admin/coaches';
    default:
      return '/admin/single-user';
  }
}

type UserPcuSource = {
  id: string;
  username: string;
  email: string;
  name: string;
  firstName: string | null;
  surname: string | null;
  userType: UserType;
  country: string | null;
  gender: string | null;
  birthdate: Date | null;
  image: string | null;
  telegramAccount: string | null;
  createdAt: Date;
  mainSports: { sport: string }[];
  ownedClubs: {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
    createdAt: Date;
    _count: { members: number };
  }[];
  ownedTeams: {
    id: string;
    name: string;
    description: string | null;
    sport: string | null;
    createdAt: Date;
    _count: { members: number };
  }[];
  ownedGroups: {
    id: string;
    name: string;
    description: string | null;
    groupType: string | null;
    createdAt: Date;
    _count: { members: number };
  }[];
  ownedCoachingGroups: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    _count: { members: number };
  }[];
  clubMemberships: { club: { name: string; location: string | null } }[];
};

export function buildPcuPanel(
  user: UserPcuSource,
  segment: string,
  loginLogCount: number,
  planCount: number,
): PcuPanelPayload {
  const fullname =
    [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name || user.username;

  const primaryClub = user.ownedClubs[0];
  const primaryTeam = user.ownedTeams[0];
  const primaryGroup = user.ownedGroups[0];
  const primaryCoaching = user.ownedCoachingGroups[0];
  const memberClub = user.clubMemberships[0]?.club;
  const clubMeta = parseClubDescriptionMeta(primaryClub?.description);

  let entityName = '';
  let cityClubTeam = '';
  let mapCoordinates: string | null = clubMeta.geo?.trim() || null;
  let startDate = user.createdAt;
  let endDate: Date | null = null;
  let version = versionLabel(user.userType);
  let entityId: string | null = null;
  let visitPagePath: string | null = null;

  if (segment === 'clubs' && (primaryClub || memberClub)) {
    entityName = primaryClub?.name?.trim() || memberClub?.name?.trim() || '';
    cityClubTeam = primaryClub?.location?.trim() || memberClub?.location?.trim() || clubMeta.region?.trim() || '';
    startDate = primaryClub?.createdAt ?? user.createdAt;
    endDate = primaryClub
      ? parseClubSubscriptionEndDate(primaryClub.description, primaryClub.createdAt)
      : null;
    entityId = primaryClub?.id ?? null;
    if (clubMeta.category?.trim() && clubMeta.category !== 'Other') {
      version = `Club ${clubMeta.category}`;
    }
    if (entityName) visitPagePath = clubSearchResultsPath(entityName);
  } else if (segment === 'teams' && primaryTeam) {
    entityName = primaryTeam.name.trim();
    cityClubTeam = primaryTeam.sport?.trim() || entityName;
    startDate = primaryTeam.createdAt;
    entityId = primaryTeam.id;
  } else if (segment === 'groups' && primaryGroup) {
    entityName = primaryGroup.name.trim();
    cityClubTeam = primaryGroup.groupType?.trim() || entityName;
    startDate = primaryGroup.createdAt;
    entityId = primaryGroup.id;
  } else if (segment === 'coaches' && primaryCoaching) {
    entityName = primaryCoaching.name.trim();
    cityClubTeam = entityName;
    startDate = primaryCoaching.createdAt;
    entityId = primaryCoaching.id;
  } else {
    cityClubTeam = user.country?.trim() || '';
    if (memberClub) {
      entityName = memberClub.name?.trim() || '';
      cityClubTeam = memberClub.location?.trim() || cityClubTeam;
    }
  }

  const country =
    clubMeta.country?.trim() ||
    user.country?.trim() ||
    '';

  const sport =
    user.mainSports.length > 0
      ? user.mainSports.map((m) => m.sport.replace(/_/g, ' ')).join(', ')
      : segment === 'teams' && primaryTeam?.sport
        ? primaryTeam.sport.replace(/_/g, ' ')
        : clubMeta.category?.trim() || '';

  const locality =
    cityClubTeam ||
    clubMeta.region?.trim() ||
    primaryClub?.location?.trim() ||
    '';

  const state = clubMeta.region?.trim() || '';
  const city = clubMeta.address?.trim() || user.country?.trim() || locality;
  const zipCode = clubMeta.zipCode?.trim() || '';

  const firstName = user.firstName?.trim() || user.name?.split(' ')[0] || '';
  const surname = user.surname?.trim() || '';

  return {
    userId: user.id,
    username: clubMeta.username?.trim() || user.username,
    fullname,
    firstName,
    surname,
    email: clubMeta.mail?.trim() || user.email,
    country,
    cityClubTeam: cityClubTeam || entityName || '—',
    city,
    zipCode,
    state,
    locality,
    sport,
    mapCoordinates,
    typeOfUser: typeBadgeLabel(user.userType),
    userTypeRaw: user.userType,
    version,
    startSubscription: formatPcuDate(startDate),
    endSubscription: formatPcuDate(endDate),
    startDateIso: toIsoDate(startDate),
    endDateIso: toIsoDate(endDate),
    logs: loginLogCount,
    imageUrl: user.image?.trim() || null,
    dashboardPath: getDashboardPathForUserType(user.userType),
    adminSegmentPath: adminSegmentPath(segment),
    entityId,
    entityName,
    visitPagePath,
    segment,
    roleTitle: segmentRoleTitle(segment),
    gender: user.gender?.trim() || '',
    birthDay: user.birthdate ? user.birthdate.getDate() : null,
    birthMonth: user.birthdate ? user.birthdate.getMonth() + 1 : null,
    birthYear: user.birthdate ? user.birthdate.getFullYear() : null,
    ageDisplay: calcAgeDisplay(user.birthdate, user.gender),
    phoneCell: user.telegramAccount?.trim() || '',
    phoneCell2: '',
    geographical: mapCoordinates,
    referencesHtml: '',
    referencesLevel: '1',
  };
}
