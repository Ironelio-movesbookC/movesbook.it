import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isAdminPanelRole,
  requireStaffSelfAdminOrLinkedCoAdminPanel,
} from '@/lib/panelAuth';

export const dynamic = 'force-dynamic';

const PROFILE_KINDS = ['OPERATOR', 'CO_ADMIN'] as const;

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } },
) {
  const { id: staffAccountId, userId } = params;
  const auth = await requireStaffSelfAdminOrLinkedCoAdminPanel(request, staffAccountId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!staffAccountId || !userId) {
    return NextResponse.json({ error: 'Operator id and user id are required' }, { status: 400 });
  }

  const staff = await prisma.staffAccount.findFirst({
    where: { id: staffAccountId, kind: { in: [...PROFILE_KINDS] } },
    select: { id: true, kind: true },
  });
  if (!staff) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const existing = await prisma.staffAssignedUser.findFirst({
    where: { id: userId },
    select: { id: true, staffAccountId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });
  }

  if (isAdminPanelRole(auth)) {
    await prisma.staffAssignedUser.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  }

  if (existing.staffAccountId === staffAccountId) {
    await prisma.staffAssignedUser.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  }

  if (
    isAdminPanelRole(auth) &&
    staff.kind === 'CO_ADMIN' &&
    existing.staffAccountId !== staffAccountId
  ) {
    const link = await prisma.staffOperatorCoAdminLink.findFirst({
      where: { coAdminId: staffAccountId, operatorId: existing.staffAccountId },
      select: { id: true },
    });
    if (!link) {
      return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });
    }
    await prisma.staffAssignedUser.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
