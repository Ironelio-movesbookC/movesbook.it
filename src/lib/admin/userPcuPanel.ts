import type { UserType } from '@prisma/client';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';
import { parseClubSubscriptionEndDate } from '@/lib/admin/clubSubscriptionStatus';
import { getDashboardPathForUserType } from '@/utils/dashboardRouting';
import { clubSearchResultsPath } from '@/lib/searchresultsPaths';

/** Club (or future entity) fields for the entity profile sub-tab — not the admin user account. */
export type PcuEntityProfile = {
  username: string;
  officialName: string;
  email: string;
  country: string;
  location: string;
  zipCode: string;
  /** Geographic / MAP coordinates from the club profile form. */
  geo: string;
  phone: string;
  telegram: string;
  referencesHtml: string;
  referencesLevel: string;
};

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
  /** Admin account location/contact (User Profile tab). */
  adminCountry: string;
  adminCity: string;
  adminZipCode: string;
  adminPhoneCell: string;
  adminPhoneCell2: string;
  /** Current club profile (Club_profile tab) when segment is clubs. */
  entityProfile: PcuEntityProfile | null;
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

/** Segments accepted by `/api/admin/registered-users/actions`. */
export const REGISTERED_USER_ACTION_SEGMENTS = [
  'all',
  'single-user',
  'coaches',
  'groups',
  'teams',
  'clubs',
] as const;

export type RegisteredUserActionSegment = (typeof REGISTERED_USER_ACTION_SEGMENTS)[number];

export function isRegisteredUserActionSegment(value: string): value is RegisteredUserActionSegment {
  return (REGISTERED_USER_ACTION_SEGMENTS as readonly string[]).includes(value);
}

/** Prefer a valid segment from admin navigation; never pass search tokens like `new`. */
export function resolveRegisteredUserActionSegment(
  preferred?: string | null,
  fallback?: string | null,
): RegisteredUserActionSegment {
  for (const candidate of [preferred, fallback, 'single-user']) {
    const s = (candidate ?? '').trim();
    if (isRegisteredUserActionSegment(s)) return s;
  }
  return 'single-user';
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

  const adminCountry = user.country?.trim() || '';
  const adminPhoneCell = user.telegramAccount?.trim() || '';

  const entityProfile: PcuEntityProfile | null =
    segment === 'clubs' && (primaryClub || memberClub)
      ? {
          username: clubMeta.username?.trim() || '',
          officialName: entityName,
          email: clubMeta.mail?.trim() || '',
          country: clubMeta.country?.trim() || '',
          location:
            primaryClub?.location?.trim() ||
            memberClub?.location?.trim() ||
            clubMeta.region?.trim() ||
            '',
          zipCode: clubMeta.zipCode?.trim() || '',
          geo: clubMeta.geo?.trim() || '',
          phone: '',
          telegram: '',
          referencesHtml: clubMeta.referencesHtml?.trim() || '',
          referencesLevel: clubMeta.referencesLevel?.trim() || '1',
        }
      : null;

  return {
    userId: user.id,
    username: user.username,
    fullname,
    firstName,
    surname,
    email: user.email,
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
    phoneCell: adminPhoneCell,
    phoneCell2: '',
    geographical: segment === 'clubs' ? null : mapCoordinates,
    referencesHtml: '',
    referencesLevel: '1',
    adminCountry,
    adminCity: '',
    adminZipCode: '',
    adminPhoneCell,
    adminPhoneCell2: '',
    entityProfile,
  };
}
