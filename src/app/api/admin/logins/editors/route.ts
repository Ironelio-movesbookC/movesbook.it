import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPanel } from '@/lib/panelAuth';
import { editorStaffRoleLabel, isEditorStaffRole } from '@/lib/adminLoginLogLabels';
import {
  buildLoginAtDateFilter,
  resolveLoginLogDateRange,
  type LoginLogFilterType,
} from '@/lib/adminLoginLogQuery';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

  const logs = await prisma.staffAccountLoginLog.findMany({
    where: {
      ...dateFilter,
      staffAccount: { kind: 'OPERATOR' },
    },
    orderBy: { loginAt: 'desc' },
    select: {
      id: true,
      loginAt: true,
      logoutAt: true,
      staffAccount: {
        select: {
          id: true,
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

  return NextResponse.json({
    rows: logs
      .filter((l) => isEditorStaffRole(l.staffAccount.roleLabel))
      .map((l) => {
        const s = l.staffAccount;
        const fullName = `${s.name} ${s.surname}`.trim();
        return {
          id: l.id,
          loginAt: l.loginAt.toISOString(),
          logoutAt: l.logoutAt ? l.logoutAt.toISOString() : null,
          userTypeLabel: editorStaffRoleLabel(s.roleLabel),
          profileHref: `/operators/logins/${s.id}`,
          account: {
            id: s.id,
            username: s.username,
            name: fullName || s.username,
            country: s.country ?? '—',
            language: s.operatorLanguage ?? '—',
            imageUrl: s.imageUrl,
          },
        };
      }),
  });
}
