import { prisma } from '@/lib/prisma';
import { toMediaApiPath } from '@/lib/uploadMediaUrl';
import { MOVESBOOK_LOGIN_USER_TYPES } from '@/lib/adminLoginLogLabels';
import {
  ALL_STATS_USER_TYPES,
  STATS_KIND_LABELS,
  STATS_KIND_TYPES,
  kindFromUserType,
  typeKindMatches,
  type StatsUserKind,
} from '@/lib/admin/statisticsKinds';
import {
  resolveLastLoggedDateRange,
  type LastLoggedDatePreset,
  type LastLoggedPayload,
  type LastLoggedUserRow,
} from '@/lib/admin/lastLoggedShared';

export type {
  LastLoggedDatePreset,
  LastLoggedPayload,
  LastLoggedUserRow,
} from '@/lib/admin/lastLoggedShared';
export {
  LAST_LOGGED_DATE_OPTIONS,
  parseLastLoggedDatePreset,
  parseLastLoggedUserType,
  resolveLastLoggedDateRange,
} from '@/lib/admin/lastLoggedShared';

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

/**
 * Users who logged in during the selected date range (from UserLoginLog.loginAt).
 * One row per user, sorted by most recent login.
 */
export async function buildLastLogged(options?: {
  date?: LastLoggedDatePreset;
  userType?: StatsUserKind | 'all';
  country?: string | null;
  limit?: number;
}): Promise<LastLoggedPayload> {
  const date = options?.date ?? 'today';
  const userType = options?.userType ?? 'all';
  const countryFilter = options?.country?.trim() || null;
  const limit = options?.limit && options.limit > 0 ? options.limit : 0;
  const { from, to } = resolveLastLoggedDateRange(date);

  const allowedTypes =
    userType === 'all' ? ALL_STATS_USER_TYPES : STATS_KIND_TYPES[userType];

  const logs = await prisma.userLoginLog.findMany({
    where: {
      loginAt: { gte: from, lte: to },
      user: {
        userType: { in: allowedTypes.filter((t) => MOVESBOOK_LOGIN_USER_TYPES.includes(t)) },
        superAdminId: null,
        ...(countryFilter ? { country: { equals: countryFilter } } : {}),
      },
    },
    orderBy: { loginAt: 'desc' },
    select: {
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
          mainSports: { select: { sport: true }, take: 1 },
        },
      },
    },
  });

  const seen = new Set<string>();
  const rows: LastLoggedUserRow[] = [];

  for (const log of logs) {
    const u = log.user;
    if (!u || seen.has(u.id)) continue;
    const kind = kindFromUserType(u.userType);
    if (!kind) continue;
    if (!typeKindMatches(kind, userType)) continue;
    seen.add(u.id);

    const sportLabel = formatSport(u.mainSports[0]?.sport ?? null);
    const kindLabel = STATS_KIND_LABELS[kind];
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
      kindLabel,
      roleLabel: sportLabel || kindLabel,
      lastLoginAt: log.loginAt.toISOString(),
    });
  }

  const countryRows = await prisma.user.findMany({
    where: {
      userType: { in: MOVESBOOK_LOGIN_USER_TYPES },
      superAdminId: null,
      country: { not: null },
      loginLogs: { some: { loginAt: { gte: from, lte: to } } },
    },
    select: { country: true },
    distinct: ['country'],
  });
  const countries = countryRows
    .map((r) => r.country?.trim())
    .filter((c): c is string => Boolean(c))
    .sort((a, b) => a.localeCompare(b));

  const limited = limit > 0 ? rows.slice(0, limit) : rows;

  return {
    users: limited,
    total: rows.length,
    countries,
    filters: {
      date,
      from: from.toISOString(),
      to: to.toISOString(),
      userType,
      country: countryFilter,
    },
  };
}
