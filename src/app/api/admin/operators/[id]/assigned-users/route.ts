import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaffSelfOrAdminPanel } from '@/lib/panelAuth';
import {
  assignMovesbookUsersToStaff,
  getStaffAssignedCustomersPayload,
} from '@/lib/staffAssignedCustomers';

export const dynamic = 'force-dynamic';

const PROFILE_KINDS = ['OPERATOR', 'CO_ADMIN'] as const;

async function assertStaffExists(staffAccountId: string) {
  const row = await prisma.staffAccount.findFirst({
    where: { id: staffAccountId, kind: { in: [...PROFILE_KINDS] } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: staffAccountId } = params;
  const auth = await requireStaffSelfOrAdminPanel(_request, staffAccountId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!staffAccountId) {
    return NextResponse.json({ error: 'Staff id is required' }, { status: 400 });
  }

  const payload = await getStaffAssignedCustomersPayload(staffAccountId);
  if (!payload) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  return NextResponse.json({
    staffKind: payload.staffKind,
    staffName: payload.staffName,
    linkedCoAdmin: payload.linkedCoAdmin,
    users: payload.users,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: staffAccountId } = params;
  const auth = await requireStaffSelfOrAdminPanel(request, staffAccountId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!staffAccountId) {
    return NextResponse.json({ error: 'Staff id is required' }, { status: 400 });
  }

  if (!(await assertStaffExists(staffAccountId))) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const userIds = Array.isArray(body.userIds)
    ? body.userIds.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];

  if (userIds.length === 0) {
    return NextResponse.json({ error: 'userIds is required' }, { status: 400 });
  }

  const result = await assignMovesbookUsersToStaff(staffAccountId, userIds);
  const payload = await getStaffAssignedCustomersPayload(staffAccountId);

  return NextResponse.json({
    success: true,
    created: result.created,
    skipped: result.skipped,
    staffKind: payload?.staffKind,
    staffName: payload?.staffName,
    linkedCoAdmin: payload?.linkedCoAdmin ?? null,
    users: payload?.users ?? [],
  });
}
