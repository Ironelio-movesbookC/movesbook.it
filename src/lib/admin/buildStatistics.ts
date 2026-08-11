import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readNetworkSubscriptionHistory, isActiveMembershipPeriod } from '@/lib/admin/networkSubscriptionHistory';
import {
  ALL_STATS_USER_TYPES,
  STATS_KIND_LABELS,
  STATS_KIND_TYPES,
  STATS_USER_KINDS,
  STATS_VERSION_BUCKETS,
  classifyVersionBucket,
  defaultVersionForKind,
  kindFromUserType,
  type StatsUserKind,
  type StatsVersionBucket,
} from '@/lib/admin/statisticsKinds';

export type StatsSlice = { key: string; label: string; count: number; percent: number };

export type KindDistribution = {
  total: number;
  slices: StatsSlice[];
  byKind: Record<StatsUserKind, number>;
};

export type CountryKindRow = {
  country: string;
  total: number;
  byKind: Record<StatsUserKind, number>;
};

export type VersionBar = {
  version: StatsVersionBucket;
  count: number;
};

export type StatisticsPayload = {
  totalUsers: number;
  incomeEuro: number;
  countries: string[];
  worldDistribution: KindDistribution;
  topCountries: Array<{
    country: string;
    total: number;
    distribution: KindDistribution;
  }>;
  typeByCountry: {
    kind: StatsUserKind;
    label: string;
    total: number;
    countries: StatsSlice[];
  };
  allTypesByCountry: Array<{
    kind: StatsUserKind;
    label: string;
    total: number;
    countries: StatsSlice[];
  }>;
  countriesBars: CountryKindRow[];
  versions: VersionBar[];
  filters: {
    country: string | null;
    userType: StatsUserKind | 'all';
    topCountriesN: number;
    typeCountriesN: number;
  };
};

type RawUser = {
  id: string;
  email: string;
  userType: UserType;
  country: string | null;
  adminSettings: string | null;
  resolvedVersion: string | null;
};

function emptyByKind(): Record<StatsUserKind, number> {
  return { single: 0, coaches: 0, teams: 0, clubs: 0, groups: 0 };
}

function toSlices(byKind: Record<StatsUserKind, number>, total: number): StatsSlice[] {
  return STATS_USER_KINDS.map((kind) => {
    const count = byKind[kind] ?? 0;
    return {
      key: kind,
      label: STATS_KIND_LABELS[kind],
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    };
  }).filter((s) => s.count > 0 || total === 0);
}

function buildKindDistribution(byKind: Record<StatsUserKind, number>): KindDistribution {
  const total = STATS_USER_KINDS.reduce((sum, k) => sum + (byKind[k] ?? 0), 0);
  return { total, slices: toSlices(byKind, total), byKind };
}

function resolveCurrentVersion(
  adminSettings: string | null,
  kind: StatsUserKind,
  fallbackVersion?: string | null,
): string {
  const periods = readNetworkSubscriptionHistory(adminSettings);
  const active = periods.find((p) => isActiveMembershipPeriod(p.dateEnd, p.status));
  if (active?.version?.trim()) return active.version.trim();
  const latest = [...periods].sort((a, b) => b.dateStart.localeCompare(a.dateStart))[0];
  if (latest?.version?.trim()) return latest.version.trim();
  if (fallbackVersion?.trim()) return fallbackVersion.trim();
  return defaultVersionForKind(kind);
}

/** Resolve versions from promocode applies + legacy subscription_setting_id for older registrations. */
async function loadExternalVersionByEmail(): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  // Prefer current legacy subscription_setting_id (source of truth after quick register).
  try {
    const { getLegacyUsersTable, getSubscriptionSettingsTable } = await import(
      '@/lib/promocodes/legacyDb'
    );
    const usersTable = await getLegacyUsersTable();
    const subTable = await getSubscriptionSettingsTable();
    if (usersTable && subTable) {
      const rows = await prisma.$queryRawUnsafe<
        Array<{ email: string | null; id: number | bigint; subscription_name: string | null }>
      >(
        `SELECT LOWER(u.email) AS email, u.id, s.subscription_name
         FROM \`${usersTable}\` u
         INNER JOIN \`${subTable}\` s ON s.id = u.subscription_setting_id
         WHERE u.subscription_setting_id IS NOT NULL
           AND s.subscription_name IS NOT NULL
           AND s.subscription_name != ''`
      );
      for (const row of rows) {
        const version = String(row.subscription_name ?? '').trim();
        if (!version) continue;
        const email = String(row.email ?? '').trim().toLowerCase();
        if (email) map.set(email, version);
        map.set(`legacy_${Number(row.id)}`, version);
      }
    }
  } catch {
    /* legacy optional */
  }

  // Fill gaps from promocode apply receiver_version.
  try {
    const applies = await prisma.promocodeApply.findMany({
      where: {
        receiverVersion: { not: null },
      },
      select: { receiverEmail: true, receiverVersion: true, receiverId: true, id: true },
      orderBy: { id: 'desc' },
    });
    for (const row of applies) {
      const version = row.receiverVersion?.trim();
      if (!version) continue;
      const email = row.receiverEmail?.trim().toLowerCase();
      if (email && !map.has(email)) map.set(email, version);
      if (row.receiverId && row.receiverId > 0) {
        const legacyKey = `legacy_${row.receiverId}`;
        if (!map.has(legacyKey)) map.set(legacyKey, version);
      }
    }
  } catch {
    /* optional */
  }

  return map;
}

/** Map subscription_settings rows to rough € prices by version bucket + kind. */
async function loadPriceTable(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const rows = await prisma.subscriptionSetting.findMany({
      where: { OR: [{ deleteStatus: null }, { deleteStatus: { not: 1 } }] },
      select: { subscriptionName: true, shortName: true, price: true, roleId: true },
    });
    for (const row of rows) {
      const price = row.price != null ? Number(row.price) : 0;
      if (!Number.isFinite(price) || price <= 0) continue;
      const name = `${row.subscriptionName ?? ''} ${row.shortName ?? ''}`.toLowerCase();
      const bucket = classifyVersionBucket(name);
      let kindHint = '';
      if (name.includes('club') || row.roleId === 8) kindHint = 'clubs';
      else if (name.includes('coach')) kindHint = 'coaches';
      else if (name.includes('team')) kindHint = 'teams';
      else if (name.includes('group')) kindHint = 'groups';
      else if (name.includes('single') || name.includes('user') || row.roleId === 5) kindHint = 'single';
      if (kindHint) map.set(`${kindHint}:${bucket}`, price);
      map.set(`*:${bucket}`, map.get(`*:${bucket}`) ?? price);
    }
  } catch {
    // table may be empty / missing columns
  }

  // Fallback defaults (€) when settings missing
  const defaults: Array<[string, number]> = [
    ['single:Trial', 0],
    ['single:Base', 100],
    ['single:Premium', 123],
    ['single:Professional', 150],
    ['coaches:Trial', 0],
    ['coaches:Base', 120],
    ['coaches:Premium', 180],
    ['coaches:Professional', 220],
    ['teams:Trial', 0],
    ['teams:Base', 150],
    ['teams:Premium', 200],
    ['teams:Professional', 250],
    ['clubs:Trial', 0],
    ['clubs:Base', 10],
    ['clubs:Premium', 10],
    ['clubs:Professional', 20],
    ['groups:Trial', 0],
    ['groups:Base', 50],
    ['groups:Premium', 80],
    ['groups:Professional', 100],
  ];
  for (const [key, value] of defaults) {
    if (!map.has(key)) map.set(key, value);
  }
  return map;
}

function priceFor(map: Map<string, number>, kind: StatsUserKind, version: string): number {
  const bucket = classifyVersionBucket(version);
  return map.get(`${kind}:${bucket}`) ?? map.get(`*:${bucket}`) ?? 0;
}

async function loadRawUsers(): Promise<RawUser[]> {
  const [users, externalVersions] = await Promise.all([
    prisma.user.findMany({
      where: {
        userType: { in: ALL_STATS_USER_TYPES },
        superAdminId: null,
      },
      select: {
        id: true,
        email: true,
        userType: true,
        country: true,
        settings: { select: { adminSettings: true } },
      },
    }),
    loadExternalVersionByEmail(),
  ]);

  return users.map((u) => {
    const emailKey = u.email.trim().toLowerCase();
    const fallback =
      externalVersions.get(emailKey) ??
      externalVersions.get(u.id) ??
      null;
    return {
      id: u.id,
      email: u.email,
      userType: u.userType,
      country: u.country?.trim() || null,
      adminSettings: u.settings?.adminSettings ?? null,
      resolvedVersion: fallback,
    };
  });
}

export type BuildStatisticsOptions = {
  country?: string | null;
  userType?: StatsUserKind | 'all';
  topCountriesN?: number;
  typeCountriesN?: number;
  typeKind?: StatsUserKind;
};

export async function buildStatisticsPayload(
  options: BuildStatisticsOptions = {},
): Promise<StatisticsPayload> {
  const countryFilter = options.country?.trim() || null;
  const userTypeFilter = options.userType && options.userType !== 'all' ? options.userType : 'all';
  const topCountriesN = Math.min(Math.max(options.topCountriesN ?? 8, 1), 50);
  const typeCountriesN = Math.min(Math.max(options.typeCountriesN ?? 15, 1), 50);
  const typeKind = options.typeKind && STATS_USER_KINDS.includes(options.typeKind)
    ? options.typeKind
    : 'single';

  const [rawUsers, priceMap] = await Promise.all([loadRawUsers(), loadPriceTable()]);

  const countrySet = new Set<string>();
  for (const u of rawUsers) {
    if (u.country) countrySet.add(u.country);
  }
  const countries = [...countrySet].sort((a, b) => a.localeCompare(b));

  const matchesCountry = (u: RawUser) =>
    !countryFilter || (u.country ?? '').toLowerCase() === countryFilter.toLowerCase();

  const matchesKindFilter = (kind: StatsUserKind) =>
    userTypeFilter === 'all' || userTypeFilter === kind;

  // World / filtered distribution
  const worldByKind = emptyByKind();
  let incomeEuro = 0;

  const allKindsPerCountry = new Map<string, Record<StatsUserKind, number>>();
  const versionRecount: Record<StatsVersionBucket, number> = {
    Trial: 0,
    Base: 0,
    Premium: 0,
    Professional: 0,
    Other: 0,
  };

  for (const u of rawUsers) {
    const kind = kindFromUserType(u.userType);
    if (!kind) continue;

    const country = u.country || 'Unknown';
    // Always accumulate full country×kind matrix (for top-country pies)
    if (!countryFilter || (u.country ?? '').toLowerCase() === countryFilter.toLowerCase()) {
      const row = allKindsPerCountry.get(country) ?? emptyByKind();
      row[kind] += 1;
      allKindsPerCountry.set(country, row);
    }

    if (!matchesCountry(u)) continue;
    if (!matchesKindFilter(kind)) continue;

    worldByKind[kind] += 1;

    const version = resolveCurrentVersion(u.adminSettings, kind, u.resolvedVersion);
    incomeEuro += priceFor(priceMap, kind, version);
    versionRecount[classifyVersionBucket(version)] += 1;
  }

  const rankedCountries = [...allKindsPerCountry.entries()]
    .map(([country, byKind]) => {
      const total = STATS_USER_KINDS.reduce((s, k) => s + byKind[k], 0);
      return { country, byKind, total };
    })
    .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country));

  const topCountries = rankedCountries.slice(0, topCountriesN).map((row) => ({
    country: row.country,
    total: row.total,
    distribution: buildKindDistribution(row.byKind),
  }));

  // Type → top N countries (unfiltered by userType filter; uses typeKind)
  function typeCountrySlices(kind: StatsUserKind, n: number) {
    const counts = new Map<string, number>();
    let total = 0;
    for (const u of rawUsers) {
      const k = kindFromUserType(u.userType);
      if (k !== kind) continue;
      if (countryFilter && (u.country ?? '').toLowerCase() !== countryFilter.toLowerCase()) continue;
      const c = u.country || 'Unknown';
      counts.set(c, (counts.get(c) ?? 0) + 1);
      total += 1;
    }
    const ranked = [...counts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country))
      .slice(0, n);
    const shown = ranked.reduce((s, r) => s + r.count, 0);
    return {
      kind,
      label: STATS_KIND_LABELS[kind],
      total,
      countries: ranked.map((r) => ({
        key: r.country,
        label: r.country,
        count: r.count,
        percent: shown > 0 ? Math.round((r.count / shown) * 1000) / 10 : 0,
      })),
    };
  }

  const typeByCountry = typeCountrySlices(typeKind, typeCountriesN);
  const allTypesByCountry = STATS_USER_KINDS.map((k) => typeCountrySlices(k, typeCountriesN));

  // Vertical bars: countries with 5 kind bars
  let countriesBars: CountryKindRow[] = rankedCountries.map((row) => {
    const byKind = emptyByKind();
    for (const k of STATS_USER_KINDS) {
      byKind[k] = userTypeFilter === 'all' || userTypeFilter === k ? row.byKind[k] : 0;
    }
    const total = STATS_USER_KINDS.reduce((s, k) => s + byKind[k], 0);
    return { country: row.country, total, byKind };
  });
  if (userTypeFilter !== 'all') {
    countriesBars = countriesBars
      .filter((r) => r.byKind[userTypeFilter] > 0)
      .sort((a, b) => b.byKind[userTypeFilter] - a.byKind[userTypeFilter]);
  }
  if (countryFilter) {
    countriesBars = countriesBars.filter(
      (r) => r.country.toLowerCase() === countryFilter.toLowerCase(),
    );
  } else {
    countriesBars = countriesBars.slice(0, 40);
  }

  const worldDistribution = buildKindDistribution(worldByKind);

  return {
    totalUsers: worldDistribution.total,
    incomeEuro: Math.round(incomeEuro * 100) / 100,
    countries,
    worldDistribution,
    topCountries,
    typeByCountry,
    allTypesByCountry,
    countriesBars,
    versions: STATS_VERSION_BUCKETS.map((version) => ({
      version,
      count: versionRecount[version],
    })),
    filters: {
      country: countryFilter,
      userType: userTypeFilter,
      topCountriesN,
      typeCountriesN,
    },
  };
}

/** Helper for pages that need only types belonging to a kind filter. */
export function typesForKindFilter(userType: StatsUserKind | 'all'): UserType[] {
  if (userType === 'all') return ALL_STATS_USER_TYPES;
  return STATS_KIND_TYPES[userType];
}
