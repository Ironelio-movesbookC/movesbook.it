export type ClubDescriptionMeta = {
  createdViaForm?: boolean;
  /** ISO date (YYYY-MM-DD) — network subscription end for this club. */
  subscriptionEnd?: string;
  username?: string;
  directAccess?: string;
  category?: string;
  country?: string;
  region?: string;
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
  /** Public path under `/uploads/entity_logos/` (or absolute URL). */
  logoUrl?: string;
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
    { label: 'Category', value: meta.category?.trim() ?? '' },
    { label: 'Country', value: meta.country?.trim() ?? '' },
    { label: 'Region', value: meta.region?.trim() ?? '' },
    { label: 'Location', value: club.location?.trim() ?? '' },
    { label: 'Zip Code', value: meta.zipCode?.trim() ?? '' },
    { label: 'Address', value: meta.address?.trim() ?? '' },
    { label: 'Geographic coordinate', value: meta.geo?.trim() ?? '' },
    { label: 'Club mail', value: meta.mail?.trim() ?? '' },
    { label: 'Subscription end', value: meta.subscriptionEnd?.trim() ?? '' },
    { label: 'Direct registration code', value: meta.directRegistrationCode?.trim() ?? '' },
  ];
  return rows.filter((row) => row.value.length > 0);
}
