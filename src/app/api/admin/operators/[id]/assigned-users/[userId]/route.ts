import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const PROFILE_KINDS = ['OPERATOR', 'CO_ADMIN'] as const;

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: staffAccountId, userId } = params;
  if (!staffAccountId || !userId) {
    return NextResponse.json({ error: 'Operator id and user id are required' }, { status: 400 });
  }

  const staff = await prisma.staffAccount.findFirst({
    where: { id: staffAccountId, kind: { in: [...PROFILE_KINDS] } },
    select: { id: true },
  });
  if (!staff) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const existing = await prisma.staffAssignedUser.findFirst({
    where: { id: userId, staffAccountId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });
  }

  await prisma.staffAssignedUser.delete({ where: { id: userId } });
  return NextResponse.json({ success: true });
}
