import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const kindParam = (url.searchParams.get('kind') || '').toUpperCase();
  const kind = kindParam === 'OPERATOR' || kindParam === 'CO_ADMIN' ? (kindParam as 'OPERATOR' | 'CO_ADMIN') : null;

  const rows = await prisma.staffAccount.findMany({
    where: kind ? { kind } : undefined,
    select: {
      id: true,
      kind: true,
      username: true,
      name: true,
      surname: true,
      country: true,
      regions: true,
      lastLogin: true,
      imageUrl: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    staff: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      username: r.username,
      name: `${r.name} ${r.surname}`.trim(),
      country: r.country ?? null,
      staffLinked: r.kind === 'OPERATOR' ? 'Operator' : 'Co-Admin',
      regions: r.regions ?? null,
      lastLogin: r.lastLogin ? r.lastLogin.toISOString() : null,
      imageUrl: r.imageUrl,
    })),
  });
}

