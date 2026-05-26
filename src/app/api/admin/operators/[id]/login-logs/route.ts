import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireStaffSelfAdminOrLinkedCoAdminPanel,
  requireStaffSelfOrAdminPanel,
} from '@/lib/panelAuth';

export const dynamic = 'force-dynamic';

const PROFILE_KINDS = ['OPERATOR', 'CO_ADMIN'] as const;

function parseDateParam(v: string | null, endOfDay = false): Date | null {
  if (!v || !String(v).trim()) return null;
  const d = new Date(String(v).trim());
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const staffAccountId = params.id;
  const auth = await requireStaffSelfAdminOrLinkedCoAdminPanel(request, staffAccountId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!staffAccountId) {
    return NextResponse.json({ error: 'Operator id is required' }, { status: 400 });
  }

  const staff = await prisma.staffAccount.findFirst({
    where: { id: staffAccountId, kind: { in: [...PROFILE_KINDS] } },
    select: {
      id: true,
      kind: true,
      username: true,
      name: true,
      surname: true,
      country: true,
      operatorLanguage: true,
      imageUrl: true,
    },
  });
  if (!staff) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const type = (url.searchParams.get('type') || 'both').toLowerCase();
  const logType = type === 'in' || type === 'out' ? type : 'both';

  let from = parseDateParam(url.searchParams.get('from'), false);
  let to = parseDateParam(url.searchParams.get('to'), true);
  if (!from || !to) {
    to = new Date();
    to.setHours(23, 59, 59, 999);
    from = new Date(to);
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  }

  let where: Prisma.StaffAccountLoginLogWhereInput = { staffAccountId };

  if (logType === 'in') {
    where = {
      ...where,
      loginAt: { gte: from, lte: to },
    };
  } else if (logType === 'out') {
    where = {
      ...where,
      logoutAt: { gte: from, lte: to },
    };
  } else {
    where = {
      ...where,
      OR: [
        { loginAt: { gte: from, lte: to } },
        { logoutAt: { gte: from, lte: to } },
      ],
    };
  }

  const logs = await prisma.staffAccountLoginLog.findMany({
    where,
    orderBy: { loginAt: 'desc' },
    select: {
      id: true,
      loginAt: true,
      logoutAt: true,
    },
  });

  const fullName = `${staff.name} ${staff.surname}`.trim();
  const staffPayload = {
    id: staff.id,
    kind: staff.kind,
    username: staff.username,
    name: fullName || staff.username,
    country: staff.country ?? '—',
    language: staff.operatorLanguage ?? '—',
    imageUrl: staff.imageUrl,
  };

  return NextResponse.json({
    staff: staffPayload,
    logs: logs.map((l) => ({
      id: l.id,
      loginAt: l.loginAt.toISOString(),
      logoutAt: l.logoutAt ? l.logoutAt.toISOString() : null,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const staffAccountId = params.id;
  const auth = await requireStaffSelfOrAdminPanel(request, staffAccountId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!staffAccountId) {
    return NextResponse.json({ error: 'Operator id is required' }, { status: 400 });
  }

  const exists = await prisma.staffAccount.findFirst({
    where: { id: staffAccountId, kind: { in: [...PROFILE_KINDS] } },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? '').toLowerCase();
  const now = new Date();

  if (action === 'login') {
    const open = await prisma.staffAccountLoginLog.findFirst({
      where: { staffAccountId, logoutAt: null },
      orderBy: { loginAt: 'desc' },
      select: { id: true },
    });
    if (open) {
      await prisma.staffAccountLoginLog.update({
        where: { id: open.id },
        data: { logoutAt: now },
      });
    }
    const created = await prisma.staffAccountLoginLog.create({
      data: {
        staffAccountId,
        loginAt: now,
        logoutAt: null,
      },
      select: { id: true, loginAt: true, logoutAt: true },
    });
    return NextResponse.json({
      success: true,
      log: {
        id: created.id,
        loginAt: created.loginAt.toISOString(),
        logoutAt: created.logoutAt ? created.logoutAt.toISOString() : null,
      },
    });
  }

  if (action === 'logout') {
    const open = await prisma.staffAccountLoginLog.findFirst({
      where: { staffAccountId, logoutAt: null },
      orderBy: { loginAt: 'desc' },
      select: { id: true },
    });
    if (!open) {
      return NextResponse.json({ error: 'No open login session to close' }, { status: 400 });
    }
    const updated = await prisma.staffAccountLoginLog.update({
      where: { id: open.id },
      data: { logoutAt: now },
      select: { id: true, loginAt: true, logoutAt: true },
    });
    return NextResponse.json({
      success: true,
      log: {
        id: updated.id,
        loginAt: updated.loginAt.toISOString(),
        logoutAt: updated.logoutAt ? updated.logoutAt.toISOString() : null,
      },
    });
  }

  return NextResponse.json({ error: 'action must be "login" or "logout"' }, { status: 400 });
}
