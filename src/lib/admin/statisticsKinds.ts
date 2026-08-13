import { UserType } from '@prisma/client';

/** Statistics user kinds shown in Super Admin charts. */
export type StatsUserKind = 'single' | 'coaches' | 'teams' | 'clubs' | 'groups';

export const STATS_USER_KINDS: StatsUserKind[] = [
  'single',
  'coaches',
  'teams',
  'clubs',
  'groups',
];

export const STATS_KIND_LABELS: Record<StatsUserKind, string> = {
  single: 'Single users',
  coaches: 'Coaches',
  teams: 'Teams',
  clubs: 'Clubs',
  groups: 'Groups',
};

export const STATS_KIND_TYPES: Record<StatsUserKind, UserType[]> = {
  single: [UserType.ATHLETE],
  coaches: [UserType.COACH],
  teams: [UserType.TEAM, UserType.TEAM_MANAGER],
  clubs: [UserType.CLUB, UserType.CLUB_TRAINER],
  groups: [UserType.GROUP, UserType.GROUP_ADMIN],
};

export const STATS_KIND_COLORS: Record<StatsUserKind, string> = {
  single: '#058592',
  coaches: '#941751',
  teams: '#ff8d00',
  clubs: '#2f6b3a',
  groups: '#4a5d8c',
};

export const ALL_STATS_USER_TYPES: UserType[] = STATS_USER_KINDS.flatMap(
  (k) => STATS_KIND_TYPES[k],
);

export function kindFromUserType(userType: UserType | string): StatsUserKind | null {
  for (const kind of STATS_USER_KINDS) {
    if ((STATS_KIND_TYPES[kind] as string[]).includes(userType)) return kind;
  }
  return null;
}

export function defaultVersionForKind(kind: StatsUserKind): string {
  switch (kind) {
    case 'single':
      return 'User — base version';
    case 'coaches':
      return 'Coach — base';
    case 'teams':
      return 'Team account';
    case 'clubs':
      return 'Club Base';
    case 'groups':
      return 'Group Standard Version';
  }
}

/** Canonical version buckets for the versions bar chart. */
export const STATS_VERSION_BUCKETS = [
  'Trial',
  'Base',
  'Premium',
  'Professional',
  'Other',
] as const;

export type StatsVersionBucket = (typeof STATS_VERSION_BUCKETS)[number];

export function classifyVersionBucket(version: string | null | undefined): StatsVersionBucket {
  const v = (version ?? '').toLowerCase().trim();
  if (!v) return 'Base';
  if (v.includes('trial')) return 'Trial';
  // Check Professional before Premium/Base (names often contain multiple keywords).
  if (
    v.includes('professional') ||
    /(^|[^a-z])pro([^a-z]|$)/.test(v) ||
    v.endsWith(' pro')
  ) {
    return 'Professional';
  }
  if (v.includes('premium')) return 'Premium';
  if (v.includes('base') || v.includes('standard') || v.includes('account')) return 'Base';
  return 'Other';
}

export const STATS_VERSION_COLORS: Record<StatsVersionBucket, string> = {
  Trial: '#8a8a8a',
  Base: '#058592',
  Premium: '#ff8d00',
  Professional: '#941751',
  Other: '#4a5d8c',
};
