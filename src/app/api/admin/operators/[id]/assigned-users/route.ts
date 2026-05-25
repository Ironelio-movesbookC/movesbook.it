import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  canAssignMovesbookUsersToStaffAccount,
  requireStaffSelfAdminOrLinkedCoAdminPanel,
} from '@/lib/panelAuth';
import {
  assignMovesbookUsersToStaff,
  getStaffAssignedCustomersPayload,
} from '@/lib/staffAssignedCustomers';
import { getOperatorIdsLinkedToCoAdmin } from '@/lib/staffCoAdminLinks';

export const dynamic = 'force-dynamic';

const PROFILE_KINDS = ['OPERATOR', 'CO_ADMIN'] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: staffAccountId } = params;
  const auth = await requireStaffSelfAdminOrLinkedCoAdminPanel(_request, staffAccountId);
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

  const canAssignUsers = await canAssignMovesbookUsersToStaffAccount(
    auth,
    staffAccountId,
    payload.staffKind,
  );

  const linkedOperatorIds =
    auth.role === 'staff' && auth.staffKind === 'CO_ADMIN'
      ? await getOperatorIdsLinkedToCoAdmin(auth.actorId)
      : [];

  return NextResponse.json({
    staffKind: payload.staffKind,
    staffName: payload.staffName,
    linkedCoAdmin: payload.linkedCoAdmin,
    users: payload.users,
    canAssignUsers,
    linkedOperatorIds,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: staffAccountId } = params;
  const auth = await requireStaffSelfAdminOrLinkedCoAdminPanel(request, staffAccountId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!staffAccountId) {
    return NextResponse.json({ error: 'Staff id is required' }, { status: 400 });
  }

  const staff = await prisma.staffAccount.findFirst({
    where: { id: staffAccountId, kind: { in: [...PROFILE_KINDS] } },
    select: { id: true, kind: true },
  });
  if (!staff) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const targetKind = staff.kind === 'CO_ADMIN' ? 'CO_ADMIN' : 'OPERATOR';
  if (!(await canAssignMovesbookUsersToStaffAccount(auth, staffAccountId, targetKind))) {
    return NextResponse.json(
      { error: 'You do not have permission to assign users to this account' },
      { status: 403 },
    );
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

  const canAssignUsers = payload
    ? await canAssignMovesbookUsersToStaffAccount(auth, staffAccountId, payload.staffKind)
    : false;

  return NextResponse.json({
    success: true,
    created: result.created,
    skipped: result.skipped,
    staffKind: payload?.staffKind,
    staffName: payload?.staffName,
    linkedCoAdmin: payload?.linkedCoAdmin ?? null,
    users: payload?.users ?? [],
    canAssignUsers,
  });
}
