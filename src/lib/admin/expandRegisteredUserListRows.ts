import { UserType } from '@prisma/client';
import {
  getClubMyPageDisplayName,
  parseClubDescriptionMeta,
  sortClubsByCreatedAtAsc,
} from '@/lib/club/clubSidebarLabel';
import {
  classifyClubSubscriptionEnd,
  parseClubSubscriptionEndDate,
  type ClubSubscriptionStatusTone,
} from '@/lib/admin/clubSubscriptionStatus';

export type RegisteredUserListRow = {
  rowKey: string;
  id: string;
  username: string;
  email: string;
  displayName: string;
  userType: string;
  country: string | null;
  location: string | null;
  dateStart: string;
  dateEnd: string | null;
  version: string;
  amount: string;
  status: string;
  clubsOwnedCount?: number;
  companyName?: string;
  statusTone?: ClubSubscriptionStatusTone;
  primaryClubId?: string | null;
  entityId?: string | null;
  entityKind?: 'club' | 'team' | 'group' | 'coaching_group';
  /** Login username (unchanged when `username` is a club/entity handle). */
  accountUsername?: string;
  imageUrl?: string | null;
};

type ClubEntity = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  location: string | null;
};

type TeamEntity = {
  id: string;
  name: string;
  sport: string | null;
  createdAt: Date;
};

type GroupEntity = {
  id: string;
  name: string;
  groupType: string | null;
  createdAt: Date;
};

type CoachingGroupEntity = {
  id: string;
  name: string;
  createdAt: Date;
};

const PLACEHOLDER_LOCATIONS = new Set(['location', 'loc', 'city', '—', '-', 'n/a', 'na']);

function cleanLocationPart(value: string | null | undefined): string {
  const v = value?.trim() ?? '';
  if (!v) return '';
  if (PLACEHOLDER_LOCATIONS.has(v.toLowerCase())) return '';
  return v;
}

function clubDisplayLocation(club: ClubEntity): string {
  const meta = parseClubDescriptionMeta(club.description);
  const region = cleanLocationPart(meta.region);
  const address = cleanLocationPart(meta.address);
  const location = cleanLocationPart(club.location);
  return location || region || address || '';
}

function clubVersionFromDescription(description: string | null): string {
  const meta = parseClubDescriptionMeta(description);
  const cat = meta.category?.trim();
  if (cat && cat !== 'Other') return `Club ${cat}`;
  return 'Club account';
}

function clubCountry(club: ClubEntity, userCountry: string | null): string | null {
  const meta = parseClubDescriptionMeta(club.description);
  return meta.country?.trim() || userCountry;
}

function clubStatusForOne(endDate: Date | null): {
  status: string;
  statusTone: ClubSubscriptionStatusTone;
} {
  const tone = classifyClubSubscriptionEnd(endDate);
  const label =
    tone === 'expired' ? 'Expired' : tone === 'expiring' ? 'Expiring' : 'Active';
  const statusTone: ClubSubscriptionStatusTone =
    tone === 'expired' ? 'all-expired' : tone === 'expiring' ? 'expiring' : 'active';
  return { status: label, statusTone };
}

export function isClubUserType(userType: string): boolean {
  return userType === UserType.CLUB || userType === UserType.CLUB_TRAINER;
}

function isTeamUserType(userType: string): boolean {
  return userType === UserType.TEAM || userType === UserType.TEAM_MANAGER;
}

function isGroupUserType(userType: string): boolean {
  return userType === UserType.GROUP || userType === UserType.GROUP_ADMIN;
}

function expandClubRows(
  base: RegisteredUserListRow,
  clubs: ClubEntity[],
): RegisteredUserListRow[] {
  const sorted = sortClubsByCreatedAtAsc(clubs);
  if (sorted.length === 0) return [base];

  const accountUsername = base.accountUsername ?? base.username;

  return sorted.map((club) => {
    const endDate = parseClubSubscriptionEndDate(club.description, club.createdAt);
    const { status, statusTone } = clubStatusForOne(endDate);
    const meta = parseClubDescriptionMeta(club.description);
    const clubUsername = meta.username?.trim();

    return {
      ...base,
      accountUsername,
      rowKey: `${base.id}-club-${club.id}`,
      primaryClubId: club.id,
      entityId: club.id,
      entityKind: 'club',
      companyName: getClubMyPageDisplayName(club),
      location: clubDisplayLocation(club),
      country: clubCountry(club, base.country),
      dateStart: club.createdAt.toISOString().slice(0, 10),
      dateEnd: endDate?.toISOString().slice(0, 10) ?? null,
      version: clubVersionFromDescription(club.description),
      status,
      statusTone,
      clubsOwnedCount: sorted.length,
      username: clubUsername || base.username,
    };
  });
}

function expandTeamRows(
  base: RegisteredUserListRow,
  teams: TeamEntity[],
): RegisteredUserListRow[] {
  const sorted = [...teams].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (sorted.length === 0) return [base];

  const accountUsername = base.accountUsername ?? base.username;

  return sorted.map((team) => ({
    ...base,
    accountUsername,
    rowKey: `${base.id}-team-${team.id}`,
    entityId: team.id,
    entityKind: 'team',
    companyName: team.name.trim(),
    location: team.sport?.trim() || '',
    dateStart: team.createdAt.toISOString().slice(0, 10),
    version: team.sport?.trim() ? `Team ${team.sport.trim()}` : 'Team account',
    status: 'Active',
    statusTone: 'active',
  }));
}

function expandGroupRows(
  base: RegisteredUserListRow,
  groups: GroupEntity[],
): RegisteredUserListRow[] {
  const sorted = [...groups].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (sorted.length === 0) return [base];

  const accountUsername = base.accountUsername ?? base.username;

  return sorted.map((group) => ({
    ...base,
    accountUsername,
    rowKey: `${base.id}-group-${group.id}`,
    entityId: group.id,
    entityKind: 'group',
    companyName: group.name.trim(),
    location: group.groupType?.trim() || '',
    dateStart: group.createdAt.toISOString().slice(0, 10),
    version: group.groupType?.trim()
      ? `Group ${group.groupType.trim()}`
      : 'Group account',
    status: 'Active',
    statusTone: 'active',
  }));
}

function expandCoachingGroupRows(
  base: RegisteredUserListRow,
  groups: CoachingGroupEntity[],
): RegisteredUserListRow[] {
  const sorted = [...groups].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (sorted.length === 0) return [base];

  const accountUsername = base.accountUsername ?? base.username;

  return sorted.map((group) => ({
    ...base,
    accountUsername,
    rowKey: `${base.id}-coach-group-${group.id}`,
    entityId: group.id,
    entityKind: 'coaching_group',
    companyName: group.name.trim(),
    dateStart: group.createdAt.toISOString().slice(0, 10),
    version: 'Coach account',
    status: 'Active',
    statusTone: 'active',
  }));
}

/** One list row per owned club / team / group (admin “all” and clubs pages). */
export function expandRegisteredUserListRows(
  baseRows: RegisteredUserListRow[],
  maps: {
    clubsByAdmin: Map<string, ClubEntity[]>;
    teamsByAdmin: Map<string, TeamEntity[]>;
    groupsByAdmin: Map<string, GroupEntity[]>;
    coachingGroupsByCoach: Map<string, CoachingGroupEntity[]>;
  },
  opts: { expandEntities: boolean },
): RegisteredUserListRow[] {
  if (!opts.expandEntities) return baseRows;

  const out: RegisteredUserListRow[] = [];
  for (const row of baseRows) {
    if (isClubUserType(row.userType)) {
      out.push(...expandClubRows(row, maps.clubsByAdmin.get(row.id) ?? []));
    } else if (isTeamUserType(row.userType)) {
      out.push(...expandTeamRows(row, maps.teamsByAdmin.get(row.id) ?? []));
    } else if (isGroupUserType(row.userType)) {
      out.push(...expandGroupRows(row, maps.groupsByAdmin.get(row.id) ?? []));
    } else if (row.userType === UserType.COACH) {
      out.push(...expandCoachingGroupRows(row, maps.coachingGroupsByCoach.get(row.id) ?? []));
    } else {
      out.push(row);
    }
  }
  return out;
}
