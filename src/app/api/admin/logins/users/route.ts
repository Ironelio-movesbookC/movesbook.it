import { NextRequest, NextResponse } from 'next/server';
import { ensureLoginLogPrismaModels, getPrismaClient } from '@/lib/prisma';
import { requireAdminPanel } from '@/lib/panelAuth';
import { MOVESBOOK_LOGIN_USER_TYPES, movesbookUserTypeLabel } from '@/lib/adminLoginLogLabels';
import {
  buildLoginAtDateFilter,
  resolveLoginLogDateRange,
  type LoginLogFilterType,
} from '@/lib/adminLoginLogQuery';
import {
  parseLastLoggedDatePreset,
  resolveLastLoggedDateRange,
} from '@/lib/admin/lastLoggedShared';
import {
  ALL_STATS_USER_TYPES,
  STATS_KIND_TYPES,
  kindFromUserType,
  typeKindMatches,
} from '@/lib/admin/statisticsKinds';
import { parseConnectedUserType } from '@/lib/admin/buildUsersConnected';
import { toMediaApiPath } from '@/lib/uploadMediaUrl';

export const dynamic = 'force-dynamic';

function resolveImageUrl(image: string | null | undefined): string | null {
  const raw = image?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  return toMediaApiPath(raw) || raw;
}

export async function GET(request: NextRequest) {
  try {
    await ensureLoginLogPrismaModels();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Prisma client not ready';
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const auth = await requireAdminPanel(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const type = (url.searchParams.get('type') || 'both').toLowerCase();
  const logType: LoginLogFilterType = type === 'in' || type === 'out' ? type : 'both';

  const datePresetRaw = url.searchParams.get('date');
  let from: Date;
  let to: Date;
  if (datePresetRaw) {
    const range = resolveLastLoggedDateRange(parseLastLoggedDatePreset(datePresetRaw));
    from = range.from;
    to = range.to;
  } else {
    const resolved = resolveLoginLogDateRange(
      url.searchParams.get('from'),
      url.searchParams.get('to'),
    );
    from = resolved.from;
    to = resolved.to;
  }

  const dateFilter = buildLoginAtDateFilter(logType, from, to);
  const userType = parseConnectedUserType(url.searchParams.get('userType'));
  const country = url.searchParams.get('country')?.trim() || null;
  const allowedTypes =
    userType === 'all' ? ALL_STATS_USER_TYPES : STATS_KIND_TYPES[userType];

  const db = getPrismaClient();
  const logs = await db.userLoginLog.findMany({
    where: {
      ...dateFilter,
      user: {
        userType: {
          in: allowedTypes.filter((t) => MOVESBOOK_LOGIN_USER_TYPES.includes(t)),
        },
        superAdminId: null,
        ...(country ? { country: { equals: country } } : {}),
      },
    },
    orderBy: { loginAt: 'desc' },
    select: {
      id: true,
      loginAt: true,
      logoutAt: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          firstName: true,
          surname: true,
          country: true,
          userType: true,
          image: true,
          settings: { select: { language: true } },
        },
      },
    },
  });

  return NextResponse.json({
    rows: logs
      .filter((l) => {
        const kind = kindFromUserType(l.user.userType);
        return kind ? typeKindMatches(kind, userType) : false;
      })
      .map((l) => {
        const u = l.user;
        const fullName =
          [u.firstName, u.surname].filter(Boolean).join(' ').trim() || u.name || u.username;
        return {
          id: l.id,
          loginAt: l.loginAt.toISOString(),
          logoutAt: l.logoutAt ? l.logoutAt.toISOString() : null,
          userTypeLabel: movesbookUserTypeLabel(u.userType),
          profileHref: `/admin/all?openUser=${encodeURIComponent(u.id)}`,
          account: {
            id: u.id,
            username: u.username,
            name: fullName,
            country: u.country ?? '—',
            language: u.settings?.language ?? '—',
            imageUrl: resolveImageUrl(u.image),
          },
        };
      }),
    filters: {
      from: from.toISOString(),
      to: to.toISOString(),
      type: logType,
      userType,
      country,
      date: datePresetRaw ? parseLastLoggedDatePreset(datePresetRaw) : null,
    },
  });
}
