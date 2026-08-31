import type { TeamProfileSections } from '@/lib/team/teamProfileTypes';

export type ClubDescriptionMeta = {
  createdViaForm?: boolean;
  /** ISO date (YYYY-MM-DD) — current network subscription start for this club. */
  subscriptionStart?: string;
  /** ISO date (YYYY-MM-DD) — network subscription end for this club. */
  subscriptionEnd?: string;
  /** Cumulative member slots purchased before the current subscription allowance. */
  membersPurchasedBase?: number;
  /** Number of subscription renewals applied (0 = first subscription period). */
  subscriptionRenewalCount?: number;
  username?: string;
  directAccess?: string;
  category?: string;
  country?: string;
  region?: string;
  location?: string;
  zipCode?: string;
  address?: string;
  geo?: string;
  mail?: string;
  directRegistrationCode?: string;
  /** Bcrypt hash — company login password for direct MY CLUB access. */
  clubPasswordHash?: string;
  /** Rich-text references for the club (not the club admin user). */
  referencesHtml?: string;
  referencesLevel?: string;
  /** Club Rules / Privacy policy HTML (Documents Editor). */
  legalDocuments?: {
    rulesHtml?: string;
    privacyPolicyHtml?: string;
  };
  /** Up to 5 payment method ids shown by default on payment forms. */
  defaultPaymentMethods?: string[];
  /** Public path under `/uploads/entity_logos/` (or data URL / absolute URL). */
  logoUrl?: string;
  /** Phone for club/team account. */
  phone?: string;
  /** Province for club account (team uses legalSite.province). */
  province?: string;
  /** Website for club account (team uses contacts.website). */
  website?: string;
  /** Sports multicheck (primary also mirrored to category). */
  sports?: string[];
  /** Customized profile questions for members of this club. */
  customQuestions?: Array<{
    id: string;
    question: string;
    answerType: 'free' | 'checkbox' | 'yes_no' | 'list';
    visibleInRegistration: boolean;
    mandatory: boolean;
    listOptions: string;
  }>;
  /** Extended team profile tabs (federal, admin sport, etc.). */
  teamProfile?: TeamProfileSections;
};

export function parseClubDescriptionMeta(
  description: string | null | undefined
): ClubDescriptionMeta {
  if (!description?.trim()) return {};
  try {
    const parsed = JSON.parse(description) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as ClubDescriptionMeta;
  } catch {
    return {};
  }
}

/** True when the club was created through the create-club form (has saved metadata). */
export function isClubCreatedFromForm(club: {
  description?: string | null;
}): boolean {
  const meta = parseClubDescriptionMeta(club.description);
  if (meta.createdViaForm === true) return true;
  return Boolean(meta.username?.trim() || meta.directAccess?.trim());
}

export function getFormCreatedClubs<T extends { description?: string | null }>(
  clubs: T[]
): T[] {
  return clubs.filter(isClubCreatedFromForm);
}

/** Oldest club first — new clubs appear below earlier ones in My clubs. */
export function sortClubsByCreatedAtAsc<
  T extends { createdAt?: string | Date | null },
>(clubs: T[]): T[] {
  return [...clubs].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
}

export function getFormCreatedClubsSortedByCreatedAt<
  T extends { description?: string | null; createdAt?: string | Date | null },
>(clubs: T[]): T[] {
  return sortClubsByCreatedAtAsc(getFormCreatedClubs(clubs));
}

/** Registered club admin who completed the create-club profile form. */
export function userHasClubProfile(
  clubs: { description?: string | null }[]
): boolean {
  return getFormCreatedClubs(clubs).length > 0;
}

/** Display name on My Page banner / headers (official name, then sidebar label). */
export function getClubMyPageDisplayName(club: {
  name: string;
  description?: string | null;
}): string {
  const official = club.name?.trim();
  if (official) return official;
  return formatMyClubsSidebarLabel(club);
}

/** Label shown under My clubs → Create a club (username + official club name). */
export function formatMyClubsSidebarLabel(club: {
  name: string;
  description?: string | null;
}): string {
  const meta = parseClubDescriptionMeta(club.description);
  const username = meta.username?.trim() ?? '';
  const officialName = club.name?.trim() ?? '';

  if (username && officialName) return `${username} (${officialName})`;
  if (username) return username;
  if (officialName) return officialName;
  return 'Club';
}

export type ClubProfileDisplayRow = { label: string; value: string };

/** Human-readable profile rows for club / coach / team / group entity sidebars. */
export function getClubProfileDisplayRows(club: {
  name: string;
  description?: string | null;
  location?: string | null;
}): ClubProfileDisplayRow[] {
  const meta = parseClubDescriptionMeta(club.description);
  const rows: ClubProfileDisplayRow[] = [
    { label: 'Official name', value: getClubMyPageDisplayName(club) },
    { label: 'Club username', value: meta.username?.trim() ?? '' },
    { label: 'Direct access', value: meta.directAccess?.trim() ?? '' },
    {
      label: 'Sports',
      value:
        Array.isArray(meta.sports) && meta.sports.length
          ? meta.sports.join(', ')
          : meta.category?.trim() ?? '',
    },
    { label: 'Country', value: meta.country?.trim() ?? '' },
    { label: 'Region', value: meta.region?.trim() ?? '' },
    { label: 'Province', value: meta.province?.trim() ?? '' },
    { label: 'Location', value: club.location?.trim() ?? '' },
    { label: 'ZIP', value: meta.zipCode?.trim() ?? '' },
    { label: 'Address', value: meta.address?.trim() ?? '' },
    { label: 'Geographic coordinate', value: meta.geo?.trim() ?? '' },
    { label: 'Mail', value: meta.mail?.trim() ?? '' },
    { label: 'Phone', value: meta.phone?.trim() ?? '' },
    { label: 'Website', value: meta.website?.trim() ?? '' },
    { label: 'Subscription end', value: meta.subscriptionEnd?.trim() ?? '' },
    { label: 'Direct registration code', value: meta.directRegistrationCode?.trim() ?? '' },
  ];
  return rows.filter((row) => row.value.length > 0);
}
