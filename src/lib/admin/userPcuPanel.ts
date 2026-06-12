import type { UserType } from '@prisma/client';
import {
  formatMyClubsSidebarLabel,
  getClubMyPageDisplayName,
  isClubCreatedFromForm,
  parseClubDescriptionMeta,
} from '@/lib/club/clubSidebarLabel';
import { readAdminReferences } from '@/lib/admin/userProfilePanelSettings';
import { getLogoUrlFromEntityDescription } from '@/lib/entity/entityLogo';
import {
  parseClubSubscriptionEndDate,
  parseClubSubscriptionStartDate,
} from '@/lib/admin/clubSubscriptionStatus';
import type { MembershipEntityKind } from '@/lib/admin/membershipEntity';
import { resolveMembershipDatesForEntity } from '@/lib/admin/networkSubscriptionHistory';
import { readPcuAccessSettings } from '@/lib/admin/userPcuAccessSettings';
import { getDashboardPathForUserType } from '@/utils/dashboardRouting';
import { clubSearchResultsPath } from '@/lib/searchresultsPaths';

/** Club (or future entity) fields for the entity profile sub-tab — not the admin user account. */
/** One company row (club / team / group / trained group) owned by the admin — for PCU profile tabs. */
export type PcuOwnedEntity = {
  id: string;
  username: string;
  officialName: string;
  /** Sidebar-style label, e.g. "Titan (Titan Fitness Club)". */
  tabLabel: string;
};

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
  /** Club / entity logo for the entity profile sub-tab (not the admin account photo). */
  entityImageUrl: string | null;
  dashboardPath: string;
  adminSegmentPath: string;
  entityId: string | null;
  entityKind: MembershipEntityKind | null;
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
  /** Current company profile when a specific entity is selected in the URL. */
  entityProfile: PcuEntityProfile | null;
  /** All form-created companies for this admin (one tab each in Profile). */
  ownedEntities: PcuOwnedEntity[];
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
  settings?: { adminSettings?: string | null } | null;
};

type DescribedEntity = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
};

function sortEntitiesByCreatedAtAsc<T extends { createdAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

function toOwnedEntity(entity: { id: string; name: string; description?: string | null }): PcuOwnedEntity {
  const meta = parseClubDescriptionMeta(entity.description);
  const username = meta.username?.trim() || entity.name.trim();
  const officialName = getClubMyPageDisplayName(entity) || entity.name.trim();
  return {
    id: entity.id,
    username,
    officialName,
    tabLabel: formatMyClubsSidebarLabel(entity),
  };
}

function buildOwnedEntities(user: UserPcuSource, segment: string): PcuOwnedEntity[] {
  if (segment === 'clubs') {
    return sortEntitiesByCreatedAtAsc(user.ownedClubs.filter(isClubCreatedFromForm)).map(toOwnedEntity);
  }
  if (segment === 'teams') {
    return sortEntitiesByCreatedAtAsc(user.ownedTeams.filter(isClubCreatedFromForm)).map(toOwnedEntity);
  }
  if (segment === 'groups') {
    return sortEntitiesByCreatedAtAsc(user.ownedGroups.filter(isClubCreatedFromForm)).map(toOwnedEntity);
  }
  if (segment === 'coaches') {
    return sortEntitiesByCreatedAtAsc(user.ownedCoachingGroups.filter(isClubCreatedFromForm)).map(
      toOwnedEntity,
    );
  }
  return [];
}

function findSelectedEntity(
  user: UserPcuSource,
  segment: string,
  selectedEntityId: string | null,
): DescribedEntity | null {
  if (!selectedEntityId) return null;
  if (segment === 'clubs') {
    return user.ownedClubs.find((c) => c.id === selectedEntityId) ?? null;
  }
  if (segment === 'teams') {
    return user.ownedTeams.find((t) => t.id === selectedEntityId) ?? null;
  }
  if (segment === 'groups') {
    return user.ownedGroups.find((g) => g.id === selectedEntityId) ?? null;
  }
  if (segment === 'coaches') {
    return user.ownedCoachingGroups.find((g) => g.id === selectedEntityId) ?? null;
  }
  return null;
}

function subscriptionDatesFromEntity(
  description: string | null | undefined,
  createdAt: Date,
): { startDate: Date; endDate: Date | null } {
  const startYmd =
    parseClubSubscriptionStartDate(description, createdAt) ||
    createdAt.toISOString().slice(0, 10);
  const start = new Date(`${startYmd}T12:00:00.000Z`);
  return {
    startDate: Number.isNaN(start.getTime()) ? createdAt : start,
    endDate: parseClubSubscriptionEndDate(description, createdAt),
  };
}

function buildEntityProfileFromRecord(
  entity: DescribedEntity,
  locationFallback?: string | null,
): PcuEntityProfile {
  const meta = parseClubDescriptionMeta(entity.description);
  return {
    username: meta.username?.trim() || '',
    officialName: getClubMyPageDisplayName(entity) || entity.name.trim(),
    email: meta.mail?.trim() || '',
    country: meta.country?.trim() || '',
    location: locationFallback?.trim() || meta.region?.trim() || '',
    zipCode: meta.zipCode?.trim() || '',
    geo: meta.geo?.trim() || '',
    phone: '',
    telegram: '',
    referencesHtml: meta.referencesHtml?.trim() || '',
    referencesLevel: meta.referencesLevel?.trim() || '1',
  };
}

export function buildPcuPanel(
  user: UserPcuSource,
  segment: string,
  loginLogCount: number,
  planCount: number,
  opts?: { selectedEntityId?: string | null },
): PcuPanelPayload {
  const selectedEntityId = opts?.selectedEntityId?.trim() || null;
  const ownedEntities = buildOwnedEntities(user, segment);
  const selectedEntity = findSelectedEntity(user, segment, selectedEntityId);

  const fullname =
    [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name || user.username;

  const primaryClub = user.ownedClubs[0];
  const primaryTeam = user.ownedTeams[0];
  const primaryGroup = user.ownedGroups[0];
  const primaryCoaching = user.ownedCoachingGroups[0];
  const memberClub = user.clubMemberships[0]?.club;
  const clubForPanel =
    segment === 'clubs' ? selectedEntity ?? primaryClub : primaryClub;
  const teamForPanel =
    segment === 'teams' ? selectedEntity ?? primaryTeam : primaryTeam;
  const groupForPanel =
    segment === 'groups' ? selectedEntity ?? primaryGroup : primaryGroup;
  const coachingForPanel =
    segment === 'coaches' ? selectedEntity ?? primaryCoaching : primaryCoaching;
  const clubMeta = parseClubDescriptionMeta(clubForPanel?.description);

  let entityName = '';
  let cityClubTeam = '';
  let mapCoordinates: string | null = clubMeta.geo?.trim() || null;
  let startDate = user.createdAt;
  let endDate: Date | null = null;
  let version = versionLabel(user.userType);
  let entityId: string | null = null;
  let visitPagePath: string | null = null;

  if (segment === 'clubs' && (clubForPanel || memberClub)) {
    entityName = clubForPanel?.name?.trim() || memberClub?.name?.trim() || '';
    cityClubTeam =
      clubForPanel?.location?.trim() ||
      memberClub?.location?.trim() ||
      clubMeta.region?.trim() ||
      '';
    if (clubForPanel) {
      const window = subscriptionDatesFromEntity(clubForPanel.description, clubForPanel.createdAt);
      startDate = window.startDate;
      endDate = window.endDate;
    } else {
      startDate = user.createdAt;
    }
    entityId = clubForPanel?.id ?? null;
    if (clubMeta.category?.trim() && clubMeta.category !== 'Other') {
      version = `Club ${clubMeta.category}`;
    }
    if (entityName) visitPagePath = clubSearchResultsPath(entityName);
  } else if (segment === 'teams' && teamForPanel) {
    entityName = teamForPanel.name.trim();
    cityClubTeam = teamForPanel.sport?.trim() || entityName;
    const window = subscriptionDatesFromEntity(teamForPanel.description, teamForPanel.createdAt);
    startDate = window.startDate;
    endDate = window.endDate;
    entityId = teamForPanel.id;
  } else if (segment === 'groups' && groupForPanel) {
    entityName = groupForPanel.name.trim();
    cityClubTeam = groupForPanel.groupType?.trim() || entityName;
    const window = subscriptionDatesFromEntity(groupForPanel.description, groupForPanel.createdAt);
    startDate = window.startDate;
    endDate = window.endDate;
    entityId = groupForPanel.id;
  } else if (segment === 'coaches' && coachingForPanel) {
    entityName = coachingForPanel.name.trim();
    cityClubTeam = entityName;
    const window = subscriptionDatesFromEntity(
      coachingForPanel.description,
      coachingForPanel.createdAt,
    );
    startDate = window.startDate;
    endDate = window.endDate;
    entityId = coachingForPanel.id;
  } else {
    cityClubTeam = user.country?.trim() || '';
    if (memberClub) {
      entityName = memberClub.name?.trim() || '';
      cityClubTeam = memberClub.location?.trim() || cityClubTeam;
    }
  }

  if (!entityId && user.settings?.adminSettings) {
    const accountDefaults = {
      accessStartIso: toIsoDate(startDate),
      accessEndIso: endDate ? toIsoDate(endDate) : '',
    };
    const accountPcuAccess = readPcuAccessSettings(
      user.settings.adminSettings,
      accountDefaults,
    );
    const accountStartIso =
      accountPcuAccess.accessStartIso.trim() || accountDefaults.accessStartIso;
    const accountEndIso =
      accountPcuAccess.accessEndIso.trim() || accountDefaults.accessEndIso;
    if (accountPcuAccess.accessStartIso.trim() && accountPcuAccess.accessEndIso.trim()) {
      const accountStart = new Date(`${accountStartIso}T12:00:00.000Z`);
      startDate = Number.isNaN(accountStart.getTime()) ? user.createdAt : accountStart;
      endDate = accountEndIso ? new Date(`${accountEndIso}T12:00:00.000Z`) : null;
    } else {
      const accountDates = resolveMembershipDatesForEntity({
        userId: user.id,
        entityId: null,
        adminSettingsRaw: user.settings.adminSettings,
        entityDescription: null,
        entityCreatedAt: user.createdAt,
        companyName: entityName || user.username,
        username: user.username,
        version,
      });
      const accountStart = new Date(`${accountDates.dateStart}T12:00:00.000Z`);
      startDate = Number.isNaN(accountStart.getTime()) ? user.createdAt : accountStart;
      endDate = accountDates.dateEnd
        ? new Date(`${accountDates.dateEnd}T12:00:00.000Z`)
        : null;
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
  const adminReferences = readAdminReferences(user.settings?.adminSettings);

  const entityProfile: PcuEntityProfile | null = selectedEntity
    ? buildEntityProfileFromRecord(
        selectedEntity,
        segment === 'clubs'
          ? user.ownedClubs.find((c) => c.id === selectedEntity.id)?.location ??
              memberClub?.location
          : null,
      )
    : null;

  const profileEntityId = entityId;
  const profileEntityRecord =
    selectedEntity ??
    (segment === 'clubs'
      ? clubForPanel
      : segment === 'teams'
        ? teamForPanel
        : segment === 'groups'
          ? groupForPanel
          : segment === 'coaches'
            ? coachingForPanel
            : null);
  const profileEntityName = profileEntityRecord
    ? getClubMyPageDisplayName(profileEntityRecord) || profileEntityRecord.name.trim()
    : entityName;
  const profileEntityKind: MembershipEntityKind | null = profileEntityRecord
    ? segment === 'clubs'
      ? 'club'
      : segment === 'teams'
        ? 'team'
        : segment === 'groups'
          ? 'group'
          : segment === 'coaches'
            ? 'coaching_group'
            : null
    : 'account';

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
    entityImageUrl: selectedEntity
      ? getLogoUrlFromEntityDescription(selectedEntity.description)
      : null,
    dashboardPath: getDashboardPathForUserType(user.userType),
    adminSegmentPath: adminSegmentPath(segment),
    entityId: profileEntityId,
    entityKind: profileEntityKind,
    entityName: profileEntityName,
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
    referencesHtml: adminReferences.referencesHtml,
    referencesLevel: adminReferences.referencesLevel,
    adminCountry,
    adminCity: '',
    adminZipCode: '',
    adminPhoneCell,
    adminPhoneCell2: '',
    entityProfile,
    ownedEntities,
  };
}
