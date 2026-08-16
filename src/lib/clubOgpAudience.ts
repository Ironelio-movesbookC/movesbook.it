/** Club OGP News audience modes (News Setting radios). Shared client/server. */

export const CLUB_OGP_AUDIENCE_MODES = [
  'only-me',
  'me-and-club-members',
  'me-club-members-and-filters',
] as const;

export type ClubOgpAudienceMode = (typeof CLUB_OGP_AUDIENCE_MODES)[number];

export function isClubOgpAudienceMode(value: unknown): value is ClubOgpAudienceMode {
  return (
    typeof value === 'string' &&
    (CLUB_OGP_AUDIENCE_MODES as readonly string[]).includes(value)
  );
}

export function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Whether a viewer may see a club-shared OGP under its audience mode.
 * Club admin always sees. Members: mode-dependent. Filter mode uses OGP visibility fields.
 */
export function canViewerSeeClubSharedOgp(params: {
  audienceMode: string | null | undefined;
  isClubAdmin: boolean;
  isClubMember: boolean;
  viewer: {
    userType: string;
    country: string | null;
    languageCode: string;
    sports: string[];
  };
  visibility: {
    userTypes: string[];
    countries: string[];
    languages: string[];
    sports: string[];
    expiresAt: Date | string | null;
  };
}): boolean {
  if (params.isClubAdmin) return true;

  const mode = isClubOgpAudienceMode(params.audienceMode)
    ? params.audienceMode
    : 'me-and-club-members';

  if (mode === 'only-me') return false;
  if (!params.isClubMember) return false;
  if (mode === 'me-and-club-members') return true;

  // me-club-members-and-filters: member must also match visibility params (empty = open).
  const { visibility, viewer } = params;
  const now = new Date();
  const expiresAt =
    visibility.expiresAt == null
      ? null
      : visibility.expiresAt instanceof Date
        ? visibility.expiresAt
        : new Date(visibility.expiresAt);
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt < now) {
    return false;
  }

  const vUserTypes = visibility.userTypes ?? [];
  const vCountries = visibility.countries ?? [];
  const vLanguages = visibility.languages ?? [];
  const vSports = visibility.sports ?? [];
  const hasNoVisibilitySet =
    vUserTypes.length === 0 &&
    vCountries.length === 0 &&
    vLanguages.length === 0 &&
    vSports.length === 0;

  if (hasNoVisibilitySet) return true;
  if (vUserTypes.length > 0 && !vUserTypes.includes(viewer.userType)) return false;
  if (vCountries.length > 0 && !vCountries.includes(viewer.country ?? '')) return false;
  if (vLanguages.length > 0) {
    const lang = viewer.languageCode.slice(0, 2).toLowerCase();
    if (!vLanguages.some((l) => l.toLowerCase() === lang)) return false;
  }
  if (vSports.length > 0 && !vSports.some((s) => viewer.sports.includes(s))) return false;
  return true;
}
