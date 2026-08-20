import { NextRequest, NextResponse } from 'next/server';
import { SportType, UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { readProfilePanelSettings } from '@/lib/admin/userProfilePanelSettings';
import { ALL_COUNTRIES } from '@/constants/countries.constants';
import { getClubMemberUserIds } from '@/lib/chat/clubChannelAuth';
import {
  listClubMemberFavouriteIdsForClub,
  listClubMemberGroupMemberIds,
} from '@/lib/club/memberLists';
import { resolveMessageDatabaseUserId } from '@/lib/messages/resolveMessageUserId';

export const dynamic = 'force-dynamic';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

const ALL_SPORT_VALUES = Object.keys(SportType) as SportType[];
const ALL_USER_TYPE_VALUES = (Object.keys(UserType) as UserType[]).filter((t) => t !== 'ADMIN');

type StatsFilters = {
  sports: SportType[];
  userTypes: UserType[];
  countries: string[];
  subscriberIds: string[];
  adminIds: string[];
  candidates: boolean;
  candidateMode: string;
  candidateSearch: string;
  clubId: string | null;
  memberGroupId: string | null;
};

function parseCsvParam(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(',').map((v) => v.trim()).filter(Boolean))];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v ?? '').trim()).filter(Boolean))];
}

function parseClubId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

function isFullSelection(selected: string[], universe: string[]): boolean {
  if (selected.length === 0 || universe.length === 0) return false;
  if (selected.length < universe.length) return false;
  const set = new Set(selected);
  return universe.every((v) => set.has(v));
}

/** Same “Name” value as Archive — Members (firstName, with fallbacks). */
function formatMemberDisplayName(user: {
  firstName: string | null;
  surname: string | null;
  name: string;
  username: string;
}): string {
  const first =
    (user.firstName || '').trim() ||
    (user.name || '').trim().split(/\s+/).filter(Boolean)[0] ||
    (user.username || '').trim();
  return first || 'User';
}

async function authorize(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
  }
  const decoded = verifyToken(authHeader.replace('Bearer ', ''));
  if (!decoded?.userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const userId = await resolveMessageDatabaseUserId(decoded.userId, decoded.userType);
  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }
  return { userId };
}

function filtersFromSearchParams(request: NextRequest): StatsFilters {
  return {
    sports: parseCsvParam(request.nextUrl.searchParams.get('sports')) as SportType[],
    userTypes: parseCsvParam(request.nextUrl.searchParams.get('userTypes')) as UserType[],
    countries: parseCsvParam(request.nextUrl.searchParams.get('countries')),
    subscriberIds: parseCsvParam(request.nextUrl.searchParams.get('subscriberIds')),
    adminIds: parseCsvParam(request.nextUrl.searchParams.get('adminIds')),
    candidates: request.nextUrl.searchParams.get('candidates') === '1',
    candidateMode: request.nextUrl.searchParams.get('candidateMode')?.trim() || 'subscribers',
    candidateSearch: (request.nextUrl.searchParams.get('candidateSearch')?.trim() ?? '')
      .replace(/^@+/, '')
      .toLowerCase(),
    clubId: parseClubId(request.nextUrl.searchParams.get('clubId')),
    memberGroupId: request.nextUrl.searchParams.get('memberGroupId')?.trim() || null,
  };
}

async function buildStatsResponse(filters: StatsFilters) {
  const memberIds = filters.clubId ? await getClubMemberUserIds(filters.clubId) : null;

  const users =
    memberIds && memberIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: filters.clubId
            ? { id: { in: memberIds! } }
            : { superAdminId: null },
          select: {
            id: true,
            name: true,
            firstName: true,
            surname: true,
            username: true,
            country: true,
            userType: true,
            lastSeenAt: true,
            image: true,
            telegramAccount: true,
            createdAt: true,
            mainSports: { select: { sport: true } },
            settings: { select: { adminSettings: true } },
          },
          orderBy: { lastSeenAt: 'desc' },
        });

  const now = Date.now();
  const byCountry = new Map<string, { online: number; all: number }>();

  for (const u of users) {
    const country = (u.country || 'Unknown').trim() || 'Unknown';
    const entry = byCountry.get(country) ?? { online: 0, all: 0 };
    entry.all += 1;
    if (u.lastSeenAt != null && now - u.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS) {
      entry.online += 1;
    }
    byCountry.set(country, entry);
  }

  const countries = [...byCountry.entries()]
    .map(([name, counts]) => ({ name, online: counts.online, all: counts.all }))
    .sort((a, b) => b.all - a.all || a.name.localeCompare(b.name));

  const totalOnline = countries.reduce((sum, c) => sum + c.online, 0);
  const totalAll = users.length;

  const connectedUsers = users
    .filter((u) => u.lastSeenAt != null && now - u.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS)
    .slice(0, 30)
    .map((u) => ({
      id: u.id,
      name: u.name || u.username,
      location: u.country || '',
      role: u.userType,
      avatar:
        u.image ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.username)}`,
    }));

  const subscriberIdSet = new Set(filters.subscriberIds);
  const adminIdSet = new Set(filters.adminIds);

  // Club channel / Archive — Members style: always expose firstName+surname
  // (same as member archive). Club admins manage subscribers and must see names.
  const toSubscriber = (u: (typeof users)[number]) => ({
    id: u.id,
    name: formatMemberDisplayName(u).trim() || 'User',
    telegramAccount: u.telegramAccount?.trim() || null,
    image: u.image || null,
    isOnline: u.lastSeenAt != null && now - u.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS,
    lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  });

  const subscribers =
    subscriberIdSet.size === 0
      ? []
      : users.filter((u) => subscriberIdSet.has(u.id)).map(toSubscriber);

  const admins =
    adminIdSet.size === 0 ? [] : users.filter((u) => adminIdSet.has(u.id)).map(toSubscriber);

  const candidates = filters.candidates
    ? users
        .filter((u) => {
          const tg = u.telegramAccount?.trim();
          if (!tg) return false;
          if (filters.candidateMode === 'admins') return !adminIdSet.has(u.id);
          return !subscriberIdSet.has(u.id);
        })
        .filter((u) => {
          if (!filters.candidateSearch) return true;
          const tg = (u.telegramAccount || '').toLowerCase().replace(/^@+/, '');
          const fullName = formatMemberDisplayName(u).toLowerCase();
          const firstName = (u.firstName || '').toLowerCase();
          const surname = (u.surname || '').toLowerCase();
          const name = (u.name || '').toLowerCase();
          const username = (u.username || '').toLowerCase();
          return (
            tg.includes(filters.candidateSearch) ||
            fullName.includes(filters.candidateSearch) ||
            firstName.includes(filters.candidateSearch) ||
            surname.includes(filters.candidateSearch) ||
            name.includes(filters.candidateSearch) ||
            username.includes(filters.candidateSearch)
          );
        })
        .slice(0, 80)
        .map(toSubscriber)
    : undefined;

  const telegramUsers = users.filter((u) => Boolean(u.telegramAccount?.trim()));

  const hasGroupFiltersConfigured =
    filters.sports.length > 0 || filters.userTypes.length > 0 || filters.countries.length > 0;

  const effectiveSports = isFullSelection(filters.sports, ALL_SPORT_VALUES) ? [] : filters.sports;
  const effectiveUserTypes = isFullSelection(filters.userTypes, ALL_USER_TYPE_VALUES)
    ? []
    : filters.userTypes;
  const effectiveCountries = isFullSelection(filters.countries, ALL_COUNTRIES)
    ? []
    : filters.countries;

  let groupUsersCount = 0;
  if (filters.clubId) {
    if (filters.memberGroupId) {
      const memberIds = await listClubMemberGroupMemberIds(filters.clubId, filters.memberGroupId);
      const set = new Set(memberIds);
      groupUsersCount = telegramUsers.filter((u) => set.has(u.id)).length;
    }
  } else {
    groupUsersCount = !hasGroupFiltersConfigured
      ? 0
      : telegramUsers.filter((u) => {
          if (effectiveUserTypes.length > 0 && !effectiveUserTypes.includes(u.userType)) return false;
          if (effectiveCountries.length > 0) {
            const country = (u.country || '').trim();
            if (!country || !effectiveCountries.includes(country)) return false;
          }
          if (effectiveSports.length > 0) {
            const sports = u.mainSports.map((s) => s.sport);
            if (!effectiveSports.some((s) => sports.includes(s))) return false;
          }
          return true;
        }).length;
  }

  let favouritesCount = 0;
  if (filters.clubId) {
    const favouriteIds = await listClubMemberFavouriteIdsForClub(filters.clubId);
    const set = new Set(favouriteIds);
    favouritesCount = telegramUsers.filter((u) => set.has(u.id)).length;
  } else {
    favouritesCount = telegramUsers.filter((u) => {
      const panel = readProfilePanelSettings(u.settings?.adminSettings);
      return panel.favouritePriority !== 'not_selected';
    }).length;
  }

  return {
    chatUsersCount: totalAll,
    totalOnline,
    totalAll,
    countries,
    connectedUsers,
    subscribers,
    subscriberCount: subscribers.length,
    admins,
    adminCount: admins.length,
    modeCounts: {
      all: telegramUsers.length,
      group: groupUsersCount,
      subscribers: subscribers.length,
      favourites: favouritesCount,
    },
    ...(candidates ? { candidates } : {}),
  };
}

/** GET - lightweight loads (e.g. add-subscriber candidates). Prefer POST when group filters are large. */
export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (auth instanceof NextResponse) return auth;

    const data = await buildStatsResponse(filtersFromSearchParams(request));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Chat admin-stats GET:', error);
    return NextResponse.json({ error: 'Failed to load chat stats' }, { status: 500 });
  }
}

/** POST - primary stats load; group filters go in the body to avoid oversized query strings. */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (auth instanceof NextResponse) return auth;

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const data = await buildStatsResponse({
      sports: asStringArray(body.sports) as SportType[],
      userTypes: asStringArray(body.userTypes) as UserType[],
      countries: asStringArray(body.countries),
      subscriberIds: asStringArray(body.subscriberIds),
      adminIds: asStringArray(body.adminIds),
      candidates: body.candidates === true || body.candidates === '1',
      candidateMode:
        typeof body.candidateMode === 'string'
          ? body.candidateMode.trim() || 'subscribers'
          : 'subscribers',
      candidateSearch:
        typeof body.candidateSearch === 'string'
          ? body.candidateSearch.trim().replace(/^@+/, '').toLowerCase()
          : '',
      clubId:
        parseClubId(body.clubId) ??
        parseClubId(request.nextUrl.searchParams.get('clubId')),
      memberGroupId:
        typeof body.memberGroupId === 'string'
          ? body.memberGroupId.trim() || null
          : request.nextUrl.searchParams.get('memberGroupId')?.trim() || null,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Chat admin-stats POST:', error);
    return NextResponse.json({ error: 'Failed to load chat stats' }, { status: 500 });
  }
}
