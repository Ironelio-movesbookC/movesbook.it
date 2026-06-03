/** Client-safe nav search scope helpers (no Prisma / Node imports). */

export const NAV_SEARCH_SCOPES = [
  'all',
  'athletes',
  'coaches',
  'teams',
  'clubs',
  'groups',
] as const;

export type NavSearchScope = (typeof NAV_SEARCH_SCOPES)[number];

export const NAV_SEARCH_SCOPE_LABELS: Record<NavSearchScope, string> = {
  all: 'All Users',
  athletes: 'Athletes',
  coaches: 'Coaches',
  teams: 'Teams',
  clubs: 'Clubs',
  groups: 'Groups',
};

export type NavUserSearchRow = {
  id: string;
  username: string;
  name: string;
  country: string;
  language: string;
  lastLogin: string;
  imageUrl: string | null;
  userType: string;
  /** When search matched a specific owned club, open PCU for that club. */
  matchedClubId?: string | null;
};

export function navSearchScopeFromLabel(label: string): NavSearchScope {
  const entry = Object.entries(NAV_SEARCH_SCOPE_LABELS).find(([, v]) => v === label);
  return (entry?.[0] as NavSearchScope) ?? 'all';
}

export function navSearchLabelFromScope(scope: string): string {
  if (isNavSearchScope(scope)) return NAV_SEARCH_SCOPE_LABELS[scope];
  return NAV_SEARCH_SCOPE_LABELS.all;
}

export function isNavSearchScope(s: string): s is NavSearchScope {
  return (NAV_SEARCH_SCOPES as readonly string[]).includes(s);
}
