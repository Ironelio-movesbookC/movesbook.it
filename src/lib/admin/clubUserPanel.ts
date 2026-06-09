import { UserType } from '@prisma/client';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';
import {
  parseClubSubscriptionEndDate,
  parseClubSubscriptionStartDate,
} from '@/lib/admin/clubSubscriptionStatus';
import type { ClubProfilePickSource } from '@/lib/admin/pickClubForAdminProfile';
import { clubSearchResultsPath } from '@/lib/searchresultsPaths';
import { typeBadgeLabel } from '@/lib/admin/userPcuPanel';

const PLACEHOLDER_LOCATIONS = new Set([
  'location',
  'loc',
  'city',
  '—',
  '-',
  'n/a',
  'na',
  'none',
]);

function cleanLocationPart(value: string | null | undefined): string {
  const v = value?.trim() ?? '';
  if (!v) return '';
  if (PLACEHOLDER_LOCATIONS.has(v.toLowerCase())) return '';
  return v;
}

function versionLabel(userType: UserType): string {
  switch (userType) {
    case UserType.CLUB:
    case UserType.CLUB_TRAINER:
      return 'Club account';
    default:
      return String(userType);
  }
}

export type ClubUserPanelPayload = {
  modalTitle: string;
  fullName: string;
  username: string;
  officialName: string;
  officialNameLabel: string;
  region: string;
  cityLocality: string;
  country: string;
  address: string;
  sport: string;
  dateStart: string;
  dateEnd: string | null;
  version: string;
  paid: number;
  adminImageUrl: string | null;
  /** Selected entity id (club, team, group, or coaching group). */
  clubId: string | null;
  typeBadge: string;
  visitPagePath: string | null;
  websiteUrl: string | null;
};

type AdminUserPanelEntity = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  sport?: string | null;
  groupType?: string | null;
  location?: string | null;
  _count?: { members: number };
};

function entityModalTitle(segment: string, createdAt: Date): string {
  const ageYears = (Date.now() - new Date(createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const age = ageYears >= 2 ? 'old' : 'new';
  switch (segment) {
    case 'teams':
      return `online_${age}_Team`;
    case 'groups':
      return `online_${age}_Group`;
    case 'coaches':
      return `online_${age}_Coach`;
    case 'clubs':
      return `online_${age}_Club`;
    default:
      return `online_${age}_User`;
  }
}

function officialNameLabelForSegment(segment: string): string {
  switch (segment) {
    case 'teams':
      return 'Official team name:';
    case 'groups':
      return 'Official group name:';
    case 'coaches':
      return 'Official coaching group name:';
    case 'clubs':
      return 'Official clubname:';
    default:
      return 'Official name:';
  }
}

/** Build online_new_Club / online_old_Club modal fields from the selected club profile. */
export function buildClubUserPanelFields(
  user: {
    firstName: string | null;
    surname: string | null;
    name: string;
    username: string;
    country: string | null;
    image: string | null;
    userType: UserType;
    createdAt: Date;
  },
  club: ClubProfilePickSource & { _count?: { members: number } },
  opts: { planCount: number; websiteUrl?: string | null },
): ClubUserPanelPayload {
  const meta = parseClubDescriptionMeta(club.description);
  const fullName = [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name;
  const officialName = club.name?.trim() || '';
  const clubUsername = meta.username?.trim() || user.username;
  const region = cleanLocationPart(meta.region);
  const address = cleanLocationPart(meta.address);
  const country = meta.country?.trim() || user.country?.trim() || '';
  const category = meta.category?.trim() ?? '';
  const sport = category && category !== 'Other' ? category : '';
  const clubCreatedAt = club.createdAt;
  const dateStart =
    parseClubSubscriptionStartDate(club.description, clubCreatedAt) ||
    clubCreatedAt.toISOString().slice(0, 10);
  const subscriptionEnd = parseClubSubscriptionEndDate(club.description, club.createdAt);
  const dateEnd = subscriptionEnd?.toISOString().slice(0, 10) ?? null;
  const panelVersion =
    category && category !== 'Other' ? `Club ${category}` : versionLabel(user.userType);
  const memberCount = club._count?.members ?? 0;
  const clubAgeYears =
    (Date.now() - new Date(clubCreatedAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  return {
    modalTitle: clubAgeYears >= 2 ? 'online_old_Club' : 'online_new_Club',
    fullName,
    username: clubUsername,
    officialName,
    officialNameLabel: 'Official clubname:',
    region,
    cityLocality: cleanLocationPart(club.location),
    country,
    address,
    sport,
    dateStart,
    dateEnd,
    version: panelVersion,
    paid: memberCount > 0 ? memberCount : opts.planCount,
    adminImageUrl: user.image?.trim() || null,
    clubId: club.id,
    typeBadge: typeBadgeLabel(user.userType),
    visitPagePath: officialName ? clubSearchResultsPath(officialName) : null,
    websiteUrl: opts.websiteUrl ?? null,
  };
}

/** Build online_new_* / online_old_* user panel fields for any registered-user segment. */
export function buildAdminUserPanelFields(
  user: {
    firstName: string | null;
    surname: string | null;
    name: string;
    username: string;
    country: string | null;
    image: string | null;
    userType: UserType;
    createdAt: Date;
  },
  segment: string,
  opts: {
    planCount: number;
    websiteUrl?: string | null;
    cityLocality?: string | null;
    club?: ClubProfilePickSource & { _count?: { members: number }; location?: string | null };
    team?: AdminUserPanelEntity;
    group?: AdminUserPanelEntity;
    coachingGroup?: AdminUserPanelEntity;
  },
): ClubUserPanelPayload {
  if (segment === 'clubs' && opts.club) {
    return buildClubUserPanelFields(user, opts.club, opts);
  }

  const entity = opts.team ?? opts.group ?? opts.coachingGroup ?? null;
  const meta = parseClubDescriptionMeta(entity?.description);
  const fullName = [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name;
  const officialName = entity?.name?.trim() || fullName;
  const entityUsername = meta.username?.trim() || user.username;
  const region = cleanLocationPart(meta.region);
  const address = cleanLocationPart(meta.address);
  const country = meta.country?.trim() || user.country?.trim() || '';
  const sport =
    opts.team?.sport?.trim() ||
    opts.group?.groupType?.trim() ||
    (meta.category?.trim() && meta.category !== 'Other' ? meta.category : '') ||
    '';
  const createdAt = entity?.createdAt ?? user.createdAt;
  const dateStart =
    (entity ? parseClubSubscriptionStartDate(entity.description, createdAt) : null) ||
    createdAt.toISOString().slice(0, 10);
  const subscriptionEnd = entity
    ? parseClubSubscriptionEndDate(entity.description, createdAt)
    : null;
  const dateEnd = subscriptionEnd?.toISOString().slice(0, 10) ?? null;
  const memberCount = entity?._count?.members ?? 0;
  const cityLocality =
    cleanLocationPart(opts.cityLocality) ||
    cleanLocationPart(entity?.location) ||
    cleanLocationPart(meta.region);

  let panelVersion = versionLabel(user.userType);
  if (segment === 'teams' && opts.team?.sport?.trim()) {
    panelVersion = `Team ${opts.team.sport.trim()}`;
  } else if (segment === 'groups' && opts.group?.groupType?.trim()) {
    panelVersion = `Group ${opts.group.groupType.trim()}`;
  } else if (segment === 'coaches') {
    panelVersion = 'Coach account';
  } else if (segment === 'single-user') {
    panelVersion = 'User — base version';
  }

  return {
    modalTitle: entityModalTitle(segment, createdAt),
    fullName,
    username: entityUsername,
    officialName,
    officialNameLabel: officialNameLabelForSegment(segment),
    region,
    cityLocality,
    country,
    address,
    sport,
    dateStart,
    dateEnd,
    version: panelVersion,
    paid: memberCount > 0 ? memberCount : opts.planCount,
    adminImageUrl: user.image?.trim() || null,
    clubId: entity?.id ?? opts.club?.id ?? null,
    typeBadge: typeBadgeLabel(user.userType),
    visitPagePath: segment === 'clubs' && officialName ? clubSearchResultsPath(officialName) : null,
    websiteUrl: opts.websiteUrl ?? null,
  };
}
