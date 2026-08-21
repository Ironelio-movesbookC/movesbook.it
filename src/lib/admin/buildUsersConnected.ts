import { prisma } from '@/lib/prisma';
import { toMediaApiPath } from '@/lib/uploadMediaUrl';
import {
  ALL_STATS_USER_TYPES,
  STATS_KIND_LABELS,
  STATS_USER_KINDS,
  kindFromUserType,
  typeKindMatches,
  type StatsUserKind,
} from '@/lib/admin/statisticsKinds';

export type ConnectedPresence = 'online' | 'today';

export type ConnectedUserRow = {
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
  presence: ConnectedPresence;
  lastSeenAt: string | null;
};

export type UsersConnectedPayload = {
  users: ConnectedUserRow[];
  onlineCount: number;
  todayOfflineCount: number;
  countries: string[];
  filters: {
    userType: StatsUserKind | 'all';
    country: string | null;
  };
};

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

export function parseConnectedUserType(
  raw: string | null | undefined,
): StatsUserKind | 'all' {
  const v = (raw ?? '').trim();
  if (!v || v === 'all') return 'all';
  return STATS_USER_KINDS.includes(v as StatsUserKind) ? (v as StatsUserKind) : 'all';
}

/**
 * Connected users from login sessions (UserLoginLog):
 * - online  = open session (logoutAt null) + recent activity — clears immediately on logout
 * - today   = logged in/out today, but not currently online
 */
export async function buildUsersConnected(options?: {
  userType?: StatsUserKind | 'all';
  country?: string | null;
  limit?: number;
}): Promise<UsersConnectedPayload> {
  const userType = options?.userType ?? 'all';
  const countryFilter = options?.country?.trim() || null;
  const limit = options?.limit && options.limit > 0 ? options.limit : 0;
  const todayStart = startOfTodayLocal();
  const now = Date.now();
  const ONLINE_FRESH_MS = 15 * 60 * 1000;

  const [openSessions, todaySessions] = await Promise.all([
    prisma.userLoginLog.findMany({
      where: { logoutAt: null },
      orderBy: { loginAt: 'desc' },
      select: {
        userId: true,
        loginAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            country: true,
            gender: true,
            image: true,
            userType: true,
            lastSeenAt: true,
            superAdminId: true,
          },
        },
      },
    }),
    prisma.userLoginLog.findMany({
      where: {
        OR: [{ loginAt: { gte: todayStart } }, { logoutAt: { gte: todayStart } }],
      },
      orderBy: { loginAt: 'desc' },
      select: {
        userId: true,
        loginAt: true,
        logoutAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            country: true,
            gender: true,
            image: true,
            userType: true,
            lastSeenAt: true,
            superAdminId: true,
          },
        },
      },
    }),
  ]);

  const byUser = new Map<
    string,
    {
      presence: ConnectedPresence;
      sortAt: Date;
      user: (typeof openSessions)[number]['user'];
    }
  >();

  const matchesFilters = (u: (typeof openSessions)[number]['user']) => {
    if (!u || u.superAdminId) return false;
    if (!ALL_STATS_USER_TYPES.includes(u.userType)) return false;
    const kind = kindFromUserType(u.userType);
    if (!kind || !typeKindMatches(kind, userType)) return false;
    if (countryFilter && (u.country?.trim() || '') !== countryFilter) return false;
    return true;
  };

  for (const row of openSessions) {
    const u = row.user;
    if (!matchesFilters(u)) continue;
    const lastMs = u.lastSeenAt?.getTime() ?? row.loginAt.getTime();
    const fresh = now - lastMs <= ONLINE_FRESH_MS;
    byUser.set(u.id, {
      presence: fresh ? 'online' : 'today',
      sortAt: u.lastSeenAt ?? row.loginAt,
      user: u,
    });
  }

  for (const row of todaySessions) {
    const u = row.user;
    if (!matchesFilters(u)) continue;
    if (byUser.has(u.id)) continue;
    // Closed session today → orange (not online)
    if (row.logoutAt == null) continue;
    byUser.set(u.id, {
      presence: 'today',
      sortAt: row.logoutAt ?? row.loginAt,
      user: u,
    });
  }

  const rows: ConnectedUserRow[] = [];
  let onlineCount = 0;
  let todayOfflineCount = 0;

  for (const entry of byUser.values()) {
    const u = entry.user;
    const kind = kindFromUserType(u.userType);
    if (!kind) continue;
    if (entry.presence === 'online') onlineCount += 1;
    else todayOfflineCount += 1;

    const country = u.country?.trim() || null;
    rows.push({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      country,
      location: country || '',
      gender: normalizeGender(u.gender),
      imageUrl: resolveImageUrl(u.image),
      userType: u.userType,
      kind,
      kindLabel: STATS_KIND_LABELS[kind],
      presence: entry.presence,
      lastSeenAt: entry.sortAt.toISOString(),
    });
  }

  rows.sort((a, b) => {
    if (a.presence !== b.presence) return a.presence === 'online' ? -1 : 1;
    const am = a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
    const bm = b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
    return bm - am;
  });

  const countryRows = await prisma.userLoginLog.findMany({
    where: {
      OR: [
        { logoutAt: null },
        { loginAt: { gte: todayStart } },
        { logoutAt: { gte: todayStart } },
      ],
      user: {
        superAdminId: null,
        userType: { in: ALL_STATS_USER_TYPES },
        country: { not: null },
      },
    },
    select: { user: { select: { country: true } } },
  });
  const countries = [
    ...new Set(
      countryRows
        .map((r) => r.user.country?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const limited = limit > 0 ? rows.slice(0, limit) : rows;

  return {
    users: limited,
    onlineCount,
    todayOfflineCount,
    countries,
    filters: {
      userType,
      country: countryFilter,
    },
  };
}

/** Set of user IDs with an open login session (currently online). */
export async function loadOnlineUserIdSet(): Promise<Set<string>> {
  const open = await prisma.userLoginLog.findMany({
    where: { logoutAt: null },
    select: { userId: true },
  });
  return new Set(open.map((r) => r.userId));
}
