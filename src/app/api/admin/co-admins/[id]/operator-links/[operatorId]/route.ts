import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPanelForStaffLinks } from '@/lib/panelAuth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; operatorId: string } },
) {
  const { id: coAdminId, operatorId } = params;
  const auth = await requireAdminPanelForStaffLinks(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await prisma.staffOperatorCoAdminLink.deleteMany({
    where: { coAdminId, operatorId },
  });

  return NextResponse.json({ success: true });
}
