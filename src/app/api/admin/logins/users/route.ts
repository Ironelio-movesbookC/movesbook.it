import { NextRequest, NextResponse } from 'next/server';
import { ensureLoginLogPrismaModels, getPrismaClient } from '@/lib/prisma';
import { requireAdminPanel } from '@/lib/panelAuth';
import { MOVESBOOK_LOGIN_USER_TYPES, movesbookUserTypeLabel } from '@/lib/adminLoginLogLabels';
import {
  buildLoginAtDateFilter,
  resolveLoginLogDateRange,
  type LoginLogFilterType,
} from '@/lib/adminLoginLogQuery';

export const dynamic = 'force-dynamic';

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
  const { from, to } = resolveLoginLogDateRange(
    url.searchParams.get('from'),
    url.searchParams.get('to'),
  );
  const dateFilter = buildLoginAtDateFilter(logType, from, to);

  const db = getPrismaClient();
  const logs = await db.userLoginLog.findMany({
    where: {
      ...dateFilter,
      user: { userType: { in: MOVESBOOK_LOGIN_USER_TYPES } },
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
    rows: logs.map((l) => {
      const u = l.user;
      const fullName =
        [u.firstName, u.surname].filter(Boolean).join(' ').trim() || u.name || u.username;
      return {
        id: l.id,
        loginAt: l.loginAt.toISOString(),
        logoutAt: l.logoutAt ? l.logoutAt.toISOString() : null,
        userTypeLabel: movesbookUserTypeLabel(u.userType),
        profileHref: null,
        account: {
          id: u.id,
          username: u.username,
          name: fullName,
          country: u.country ?? '—',
          language: u.settings?.language ?? '—',
          imageUrl: u.image,
        },
      };
    }),
  });
}
