import { prisma } from '@/lib/prisma';
import { toMediaApiPath } from '@/lib/uploadMediaUrl';
import {
  pickLatestSubscriptionByExpiry,
  readNetworkSubscriptionHistory,
} from '@/lib/admin/networkSubscriptionHistory';
import { loadOnlineUserIdSet } from '@/lib/admin/buildUsersConnected';
import type { ConnectedPresence } from '@/lib/admin/buildUsersConnected';
import {
  ALL_STATS_USER_TYPES,
  STATS_KIND_LABELS,
  STATS_USER_KINDS,
  kindFromUserType,
  typeKindMatches,
  type StatsUserKind,
} from '@/lib/admin/statisticsKinds';
import { parseConnectedUserType } from '@/lib/admin/buildUsersConnected';

export type NewestUserRow = {
  id: string;
  username: string;
  name: string;
  email: string;
  country: string | null;
  location: string;
  gender: string | null;
  imageUrl: string | null;
  userType: string;
  kind: StatsUserKind | null;
  kindLabel: string;
  /** Sport or type label shown under the name */
  roleLabel: string;
  presence: ConnectedPresence | null;
  subscriptionStart: string;
  createdAt: string;
};

export type NewestUsersPayload = {
  users: NewestUserRow[];
  total: number;
  countries: string[];
  filters: {
    userType: StatsUserKind | 'all';
    country: string | null;
  };
};

const NEWEST_DAYS = 60;

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeGender(raw: string | null | undefined): 'male' | 'female' | null {
  const g = (raw || '').trim().toLowerCase();
  if (!g) return null;
  if (g === 'm' || g === 'male' || g === 'man' || g.startsWith('male')) return 'male';
  if (g === 'f' || g === 'female' || g === 'woman' || g.startsWith('female')) return 'female';
  return null;
}

function resolveImageUrl(image: string | null | undefined): string | null {
  const raw = image?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  return toMediaApiPath(raw) || raw;
}

function formatSport(sport: string | null | undefined): string {
  if (!sport?.trim()) return '';
  return sport
    .trim()
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseYmdMs(value: string | null | undefined): number {
  if (!value?.trim()) return 0;
  const t = new Date(value.trim()).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Newest users = accounts created in the last 60 days.
 * Sorted by subscription start date (most recent first).
 * Presence: green online / orange today (same as USERS CONNECTED).
 */
export async function buildNewestUsers(options?: {
  userType?: StatsUserKind | 'all';
  country?: string | null;
  limit?: number;
}): Promise<NewestUsersPayload> {
  const userType = options?.userType ?? 'all';
  const countryFilter = options?.country?.trim() || null;
  const limit = options?.limit && options.limit > 0 ? options.limit : 0;
  const since = new Date(Date.now() - NEWEST_DAYS * 24 * 60 * 60 * 1000);
  const todayStart = startOfTodayLocal();

  const [users, onlineIds, todayOfflineLogs] = await Promise.all([
    prisma.user.findMany({
      where: {
        userType: { in: ALL_STATS_USER_TYPES },
        superAdminId: null,
        createdAt: { gte: since },
        ...(countryFilter ? { country: { equals: countryFilter } } : {}),
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        country: true,
        gender: true,
        image: true,
        userType: true,
        createdAt: true,
        settings: { select: { adminSettings: true } },
        mainSports: { select: { sport: true }, take: 1 },
      },
    }),
    loadOnlineUserIdSet(),
    prisma.userLoginLog.findMany({
      where: {
        logoutAt: { not: null, gte: todayStart },
      },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ]);

  const todayOfflineIds = new Set(todayOfflineLogs.map((r) => r.userId));

  const rows: NewestUserRow[] = [];
  const countrySet = new Set<string>();

  for (const u of users) {
    const kind = kindFromUserType(u.userType);
    if (!kind) continue;
    if (!typeKindMatches(kind, userType)) continue;

    if (u.country?.trim()) countrySet.add(u.country.trim());

    const periods = readNetworkSubscriptionHistory(u.settings?.adminSettings ?? null);
    const last = pickLatestSubscriptionByExpiry(periods);
    const subscriptionStart =
      last?.dateStart?.trim() || u.createdAt.toISOString().slice(0, 10);

    let presence: ConnectedPresence | null = null;
    if (onlineIds.has(u.id)) presence = 'online';
    else if (todayOfflineIds.has(u.id)) presence = 'today';

    const sportLabel = formatSport(u.mainSports[0]?.sport ?? null);
    const kindLabel = STATS_KIND_LABELS[kind];

    rows.push({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      country: u.country?.trim() || null,
      location: u.country?.trim() || '',
      gender: normalizeGender(u.gender),
      imageUrl: resolveImageUrl(u.image),
      userType: u.userType,
      kind,
      kindLabel,
      roleLabel: sportLabel || kindLabel,
      presence,
      subscriptionStart,
      createdAt: u.createdAt.toISOString(),
    });
  }

  rows.sort((a, b) => {
    const diff = parseYmdMs(b.subscriptionStart) - parseYmdMs(a.subscriptionStart);
    if (diff !== 0) return diff;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  // Countries for filter (all newest in window, not limited by current type/country)
  const allCountries = await prisma.user.findMany({
    where: {
      userType: { in: ALL_STATS_USER_TYPES },
      superAdminId: null,
      createdAt: { gte: since },
      country: { not: null },
    },
    select: { country: true },
    distinct: ['country'],
  });
  const countries = allCountries
    .map((r) => r.country?.trim())
    .filter((c): c is string => Boolean(c))
    .sort((a, b) => a.localeCompare(b));

  const limited = limit > 0 ? rows.slice(0, limit) : rows;

  return {
    users: limited,
    total: rows.length,
    countries: countries.length ? countries : [...countrySet].sort((a, b) => a.localeCompare(b)),
    filters: {
      userType,
      country: countryFilter,
    },
  };
}

export { parseConnectedUserType as parseNewestUserType, STATS_USER_KINDS };
