import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaffSelfOrAdminPanel } from '@/lib/panelAuth';
import {
  getCoAdminById,
  mapStaffListRow,
  staffListSelect,
} from '@/lib/staffOperatorCoAdminLink';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const coAdminId = params.id;
  const auth = await requireStaffSelfOrAdminPanel(_request, coAdminId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const coAdmin = await getCoAdminById(coAdminId);
  if (!coAdmin) {
    return NextResponse.json({ error: 'Co-admin not found' }, { status: 404 });
  }

  const links = await prisma.staffOperatorCoAdminLink.findMany({
    where: { coAdminId },
    include: { operator: { select: staffListSelect } },
    orderBy: { createdAt: 'desc' },
  });

  const assignedOperatorIds = links.map((l) => l.operatorId);

  const operators = await prisma.staffAccount.findMany({
    where: { kind: 'OPERATOR' },
    select: staffListSelect,
    orderBy: { username: 'asc' },
  });

  const candidates = operators.filter((o) => !assignedOperatorIds.includes(o.id));

  return NextResponse.json({
    coAdmin: mapStaffListRow(coAdmin),
    assignedOperators: links.map((l) => mapStaffListRow(l.operator)),
    candidates: candidates.map(mapStaffListRow),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const coAdminId = params.id;
  const auth = await requireStaffSelfOrAdminPanel(request, coAdminId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const coAdmin = await getCoAdminById(coAdminId);
  if (!coAdmin) {
    return NextResponse.json({ error: 'Co-admin not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const operatorIds = Array.isArray(body.operatorIds)
    ? body.operatorIds.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];

  if (operatorIds.length === 0) {
    return NextResponse.json({ error: 'operatorIds is required' }, { status: 400 });
  }

  const validOperators = await prisma.staffAccount.findMany({
    where: { id: { in: operatorIds }, kind: 'OPERATOR' },
    select: { id: true },
  });
  const validIds = new Set(validOperators.map((o) => o.id));

  for (const operatorId of operatorIds) {
    if (!validIds.has(operatorId)) continue;
    await prisma.staffOperatorCoAdminLink.upsert({
      where: { operatorId },
      create: { operatorId, coAdminId },
      update: { coAdminId },
    });
  }

  const links = await prisma.staffOperatorCoAdminLink.findMany({
    where: { coAdminId },
    include: { operator: { select: staffListSelect } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    assignedOperators: links.map((l) => mapStaffListRow(l.operator)),
  });
}
