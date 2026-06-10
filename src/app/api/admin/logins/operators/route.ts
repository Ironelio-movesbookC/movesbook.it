import { NextRequest, NextResponse } from 'next/server';
import { ensureLoginLogPrismaModels, getPrismaClient, prisma } from '@/lib/prisma';
import { requireAdminPanel } from '@/lib/panelAuth';
import { isEditorStaffRole, panelOperatorUserTypeLabel } from '@/lib/adminLoginLogLabels';
import {
  buildLoginAtDateFilter,
  resolveLoginLogDateRange,
  type LoginLogFilterType,
} from '@/lib/adminLoginLogQuery';

export const dynamic = 'force-dynamic';

const STAFF_KINDS = ['OPERATOR', 'CO_ADMIN'] as const;

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
  const staffLogs = await prisma.staffAccountLoginLog.findMany({
    where: {
      ...dateFilter,
      staffAccount: { kind: { in: [...STAFF_KINDS] } },
    },
    orderBy: { loginAt: 'desc' },
    select: {
      id: true,
      loginAt: true,
      logoutAt: true,
      staffAccount: {
        select: {
          id: true,
          kind: true,
          username: true,
          name: true,
          surname: true,
          country: true,
          operatorLanguage: true,
          imageUrl: true,
          roleLabel: true,
        },
      },
    },
  });

  const superAdminLogs = await db.superAdminLoginLog.findMany({
    where: dateFilter,
    orderBy: { loginAt: 'desc' },
    select: {
      id: true,
      loginAt: true,
      logoutAt: true,
      superAdmin: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
        },
      },
    },
  });

  type Row = {
    id: string;
    loginAt: string;
    logoutAt: string | null;
    userTypeLabel: string;
    profileHref: string | null;
    account: {
      id: string;
      username: string;
      name: string;
      country: string;
      language: string;
      imageUrl: string | null;
    };
    sortKey: number;
  };

  const staffRows: Row[] = staffLogs
    .filter((l) => !isEditorStaffRole(l.staffAccount.roleLabel))
    .map((l) => {
      const s = l.staffAccount;
      const fullName = `${s.name} ${s.surname}`.trim();
      const kind = s.kind === 'CO_ADMIN' ? 'CO_ADMIN' : 'OPERATOR';
      return {
        id: `staff-${l.id}`,
        loginAt: l.loginAt.toISOString(),
        logoutAt: l.logoutAt ? l.logoutAt.toISOString() : null,
        userTypeLabel: panelOperatorUserTypeLabel(kind),
        profileHref: `/operators/logins/${s.id}`,
        account: {
          id: s.id,
          username: s.username,
          name: fullName || s.username,
          country: s.country ?? '—',
          language: s.operatorLanguage ?? '—',
          imageUrl: s.imageUrl,
        },
        sortKey: l.loginAt.getTime(),
      };
    });

  const superRows: Row[] = superAdminLogs.map((l) => {
    const s = l.superAdmin;
    return {
      id: `super-${l.id}`,
      loginAt: l.loginAt.toISOString(),
      logoutAt: l.logoutAt ? l.logoutAt.toISOString() : null,
      userTypeLabel: panelOperatorUserTypeLabel('SUPER_ADMIN'),
      profileHref: null,
      account: {
        id: s.id,
        username: s.username,
        name: (s.name || s.username).trim(),
        country: '—',
        language: '—',
        imageUrl: null,
      },
      sortKey: l.loginAt.getTime(),
    };
  });

  const rows = [...staffRows, ...superRows]
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ sortKey: _sortKey, ...row }) => row);

  return NextResponse.json({ rows });
}
