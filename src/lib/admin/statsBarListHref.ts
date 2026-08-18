import type { StatsTypeKindFilter, StatsUserKind, StatsVersionBucket } from '@/lib/admin/statisticsKinds';
import { STATS_USER_KINDS, STATS_VERSION_BUCKETS } from '@/lib/admin/statisticsKinds';

/** Map stats kind → `/admin/all` userTypeCategory filter value. */
export const STATS_KIND_TO_USER_TYPE_CATEGORY: Record<StatsUserKind, string> = {
  single: 'single-user',
  coaches: 'coaches',
  teams: 'teams',
  clubs: 'clubs',
  groups: 'groups',
};

export function parseStatsKindParam(
  raw: string | null | undefined,
): StatsUserKind | 'all' | 'except_groups' | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  if (v === 'all' || v === 'except_groups') return v;
  return STATS_USER_KINDS.includes(v as StatsUserKind) ? (v as StatsUserKind) : null;
}

export function parseStatsVersionParam(
  raw: string | null | undefined,
): StatsVersionBucket | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  return (STATS_VERSION_BUCKETS as readonly string[]).includes(v)
    ? (v as StatsVersionBucket)
    : null;
}

export type StatsBarListParams = {
  country?: string | null;
  kind?: StatsTypeKindFilter | null;
  version?: StatsVersionBucket | null;
};

/** Build `/admin/all` URL that loads the same users counted in a statistics bar. */
export function statsBarListHref(params: StatsBarListParams): string {
  const qs = new URLSearchParams();
  qs.set('statsBar', '1');
  qs.set('membership', 'all');
  if (params.country?.trim()) qs.set('country', params.country.trim());
  if (params.kind && params.kind !== 'all') qs.set('statsKind', params.kind);
  if (params.version) qs.set('subscriptionVersion', params.version);
  return `/admin/all?${qs.toString()}`;
}
