import { prisma } from '@/lib/prisma';
import { hasActiveLastSubscription } from '@/lib/admin/networkSubscriptionHistory';
import { loadOnlineUserIdSet } from '@/lib/admin/buildUsersConnected';
import {
  ALL_STATS_USER_TYPES,
  STATS_USER_KINDS,
  kindFromUserType,
  typeKindMatches,
  type StatsUserKind,
} from '@/lib/admin/statisticsKinds';

export type CurrentUsersCountryRow = {
  name: string;
  online: number;
  all: number;
};

export type CurrentUsersByCountryPayload = {
  countries: CurrentUsersCountryRow[];
  totalOnline: number;
  totalAll: number;
  userType: StatsUserKind | 'all';
};

export async function buildCurrentUsersByCountry(
  userType: StatsUserKind | 'all' = 'all',
): Promise<CurrentUsersByCountryPayload> {
  const [users, onlineIds] = await Promise.all([
    prisma.user.findMany({
      where: {
        userType: { in: ALL_STATS_USER_TYPES },
        superAdminId: null,
      },
      select: {
        id: true,
        country: true,
        userType: true,
        settings: { select: { adminSettings: true } },
      },
    }),
    loadOnlineUserIdSet(),
  ]);

  const byCountry = new Map<string, { online: number; all: number }>();
  let totalOnline = 0;
  let totalAll = 0;

  for (const u of users) {
    const kind = kindFromUserType(u.userType);
    if (!kind) continue;
    if (!typeKindMatches(kind, userType)) continue;
    if (!hasActiveLastSubscription(u.settings?.adminSettings ?? null)) continue;

    const country = u.country?.trim() || 'Unknown';
    const online = onlineIds.has(u.id);
    const row = byCountry.get(country) ?? { online: 0, all: 0 };
    row.all += 1;
    if (online) {
      row.online += 1;
      totalOnline += 1;
    }
    totalAll += 1;
    byCountry.set(country, row);
  }

  const countries = [...byCountry.entries()]
    .map(([name, counts]) => ({ name, online: counts.online, all: counts.all }))
    .sort((a, b) => b.all - a.all || a.name.localeCompare(b.name));

  return {
    countries,
    totalOnline,
    totalAll,
    userType: userType === 'all' ? 'all' : userType,
  };
}

export function parseCurrentUsersTypeFilter(
  raw: string | null | undefined,
): StatsUserKind | 'all' {
  const v = (raw ?? '').trim();
  if (!v || v === 'all') return 'all';
  return STATS_USER_KINDS.includes(v as StatsUserKind) ? (v as StatsUserKind) : 'all';
}
