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

/** Label shown under My clubs → Create a club (username + direct access). */
export function formatMyClubsSidebarLabel(club: {
  name: string;
  description?: string | null;
}): string {
  const meta = parseClubDescriptionMeta(club.description);
  const username = meta.username?.trim() ?? '';
  const directAccess = meta.directAccess?.trim() ?? '';

  if (username && directAccess) return `${username} (${directAccess})`;
  if (username) return username;
  if (directAccess) return directAccess;
  return club.name?.trim() || 'Club';
}
