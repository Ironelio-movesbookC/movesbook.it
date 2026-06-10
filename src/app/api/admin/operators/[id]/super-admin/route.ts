import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPanel } from '@/lib/panelAuth';
import {
  buildOtherInfosWithSuperAdminSnapshot,
  type SuperAdminSnapshot,
} from '@/lib/staffSuperAdminSettings';

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

function parseBoolPairRecord(v: unknown): Record<string, { my: boolean; other: boolean }> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const out: Record<string, { my: boolean; other: boolean }> = {};
  for (const [key, val] of Object.entries(v as Record<string, unknown>)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const row = val as { my?: unknown; other?: unknown };
      if (typeof row.my === 'boolean' && typeof row.other === 'boolean') {
        out[key] = { my: row.my, other: row.other };
      }
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseBoolRecord(v: unknown): Record<string, boolean> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const out: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'boolean') out[key] = val;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminPanel(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const id = getOperatorId(request);
  if (!id) {
    return NextResponse.json({ error: 'Operator id is required' }, { status: 400 });
  }

  const existing = await prisma.staffAccount.findFirst({
    where: { id, kind: { in: [...PROFILE_KINDS] } },
    select: { id: true, otherInfos: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  const operatorLanguage = strOrNull(body.operatorLanguage);
  const snapshot: SuperAdminSnapshot = {
    language: operatorLanguage ?? undefined,
    idCardCode: strOrNull(body.idCardCode) ?? undefined,
    commissionPct: strOrNull(body.commissionPct) ?? undefined,
    autoAssignCommission:
      body.commissionAutoAssign !== undefined ? Boolean(body.commissionAutoAssign) : undefined,
    operatorPerms: parseBoolPairRecord(body.operatorPerms),
    otherSettings: parseBoolPairRecord(body.otherSettings),
    otherPerms: parseBoolRecord(body.otherPerms),
    postPerms: parseBoolRecord(body.postPerms),
  };

  const otherInfos = buildOtherInfosWithSuperAdminSnapshot(existing.otherInfos, snapshot);

  const updated = await prisma.staffAccount.update({
    where: { id },
    data: {
      country: strOrNull(body.country),
      operatorLanguage,
      idCardCode: strOrNull(body.idCardCode),
      commissionPct: strOrNull(body.commissionPct),
      commissionAutoAssign: Boolean(body.commissionAutoAssign),
      otherInfos,
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
