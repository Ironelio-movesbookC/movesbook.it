import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaffSelfOrAdminPanel } from '@/lib/panelAuth';
import { searchAssignableMovesbookUsers } from '@/lib/staffAssignedCustomers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const staffAccountId = params.id;
  const auth = await requireStaffSelfOrAdminPanel(request, staffAccountId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const staff = await prisma.staffAccount.findFirst({
    where: { id: staffAccountId, kind: { in: ['OPERATOR', 'CO_ADMIN'] } },
    select: { id: true },
  });
  if (!staff) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const candidates = await searchAssignableMovesbookUsers(staffAccountId, q, 80);

  return NextResponse.json({ candidates });
}
