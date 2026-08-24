import { NextRequest, NextResponse } from 'next/server';
import { requirePromocodeAccess } from '@/lib/promocodes/promocodeAccess';
import { getStatistics } from '@/lib/promocodes/promocodeMonthlyStatsService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const yearRaw = Number(url.searchParams.get('year') ?? new Date().getFullYear());
  const year = Number.isFinite(yearRaw) ? yearRaw : new Date().getFullYear();

  try {
    const result = await getStatistics(year);
    return NextResponse.json(result);
  } catch (e) {
    console.error('promocodes statistics GET:', e);
    return NextResponse.json({ error: 'Failed to load statistics' }, { status: 500 });
  }
}
