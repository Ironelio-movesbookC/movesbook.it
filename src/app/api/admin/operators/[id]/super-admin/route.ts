import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const PROFILE_KINDS = ['OPERATOR', 'CO_ADMIN'] as const;

function getOperatorId(request: NextRequest): string {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const i = parts.indexOf('operators');
  return i >= 0 && parts[i + 1] ? parts[i + 1] : '';
}

function strOrNull(v: unknown): string | null {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const id = getOperatorId(request);
  if (!id) {
    return NextResponse.json({ error: 'Operator id is required' }, { status: 400 });
  }

  const existing = await prisma.staffAccount.findFirst({
    where: { id, kind: { in: [...PROFILE_KINDS] } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  const updated = await prisma.staffAccount.update({
    where: { id },
    data: {
      country: strOrNull(body.country),
      operatorLanguage: strOrNull(body.operatorLanguage),
      idCardCode: strOrNull(body.idCardCode),
      commissionPct: strOrNull(body.commissionPct),
      commissionAutoAssign: Boolean(body.commissionAutoAssign),
    },
    select: {
      id: true,
      country: true,
      operatorLanguage: true,
      idCardCode: true,
      commissionPct: true,
      commissionAutoAssign: true,
      otherInfos: true,
    },
  });

  return NextResponse.json({ success: true, operator: updated });
}
