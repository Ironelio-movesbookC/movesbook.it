import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAdminPanelForStaffLinks,
  requireStaffSelfOrAdminPanel,
} from '@/lib/panelAuth';
import {
  getOperatorById,
  mapStaffLinkAssignmentRow,
  mapStaffListRow,
  staffListSelect,
} from '@/lib/staffOperatorCoAdminLink';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const operatorId = params.id;
  const auth = await requireStaffSelfOrAdminPanel(_request, operatorId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const operator = await getOperatorById(operatorId);
  if (!operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  const link = await prisma.staffOperatorCoAdminLink.findUnique({
    where: { operatorId },
    select: {
      createdAt: true,
      coAdmin: { select: staffListSelect },
    },
  });

  const coAdmins = await prisma.staffAccount.findMany({
    where: { kind: 'CO_ADMIN' },
    select: staffListSelect,
    orderBy: { username: 'asc' },
  });

  return NextResponse.json({
    operator: mapStaffListRow(operator),
    assignedCoAdmin: link?.coAdmin
      ? mapStaffLinkAssignmentRow(link.coAdmin, link)
      : null,
    candidates: coAdmins.map(mapStaffListRow),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const operatorId = params.id;
  const auth = await requireAdminPanelForStaffLinks(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const operator = await getOperatorById(operatorId);
  if (!operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const coAdminId = String(body.coAdminId ?? '').trim();
  if (!coAdminId) {
    return NextResponse.json({ error: 'coAdminId is required' }, { status: 400 });
  }

  const coAdmin = await prisma.staffAccount.findFirst({
    where: { id: coAdminId, kind: 'CO_ADMIN' },
    select: { id: true },
  });
  if (!coAdmin) {
    return NextResponse.json({ error: 'Co-admin not found' }, { status: 404 });
  }

  const link = await prisma.staffOperatorCoAdminLink.upsert({
    where: { operatorId },
    create: { operatorId, coAdminId },
    update: { coAdminId },
    select: {
      createdAt: true,
      coAdmin: { select: staffListSelect },
    },
  });

  return NextResponse.json({
    success: true,
    assignedCoAdmin: mapStaffLinkAssignmentRow(link.coAdmin, link),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const operatorId = params.id;
  const auth = await requireAdminPanelForStaffLinks(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await prisma.staffOperatorCoAdminLink.deleteMany({ where: { operatorId } });
  return NextResponse.json({ success: true });
}
