import { UserType } from '@prisma/client';
import {
  getClubMyPageDisplayName,
  parseClubDescriptionMeta,
} from '@/lib/club/clubSidebarLabel';
import { parseClubSubscriptionEndDate } from '@/lib/admin/clubSubscriptionStatus';
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
  clubname: string;
  country: string;
  city: string;
  sport: string;
  dateStart: string;
  dateEnd: string | null;
  version: string;
  paid: number;
  adminImageUrl: string | null;
  clubId: string | null;
  typeBadge: string;
  visitPagePath: string | null;
  websiteUrl: string | null;
};

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
  const officialName = getClubMyPageDisplayName(club);
  const clubUsername = meta.username?.trim() || user.username;
  const region = cleanLocationPart(meta.region);
  const address = cleanLocationPart(meta.address);
  const location = cleanLocationPart(club.location);
  /** Locality shown as “Clubname” (region / town, not the form label “location”). */
  const clubname = region || location || address || '';
  /** City line — prefer address, then region, then club location. */
  const city = address || region || location || '';
  const country = meta.country?.trim() || user.country?.trim() || '';
  const category = meta.category?.trim() ?? '';
  const sport = category && category !== 'Other' ? category : '';
  const clubCreatedAt = club.createdAt;
  const dateStart = clubCreatedAt.toISOString().slice(0, 10);
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
    clubname,
    country,
    city,
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
