import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { buildStatisticsPayload } from '@/lib/admin/buildStatistics';
import { STATS_USER_KINDS, type StatsUserKind } from '@/lib/admin/statisticsKinds';

export const dynamic = 'force-dynamic';

function parseKind(raw: string | null): StatsUserKind | 'all' {
  if (!raw || raw === 'all') return 'all';
  return STATS_USER_KINDS.includes(raw as StatsUserKind) ? (raw as StatsUserKind) : 'all';
}

function parseTypeKind(raw: string | null): StatsUserKind {
  if (raw && STATS_USER_KINDS.includes(raw as StatsUserKind)) return raw as StatsUserKind;
  return 'single';
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = request.nextUrl;
  const country = url.searchParams.get('country');
  const userType = parseKind(url.searchParams.get('userType'));
  const typeKind = parseTypeKind(url.searchParams.get('typeKind'));
  const topCountriesN = Number(url.searchParams.get('topCountriesN') || '8');
  const typeCountriesN = Number(url.searchParams.get('typeCountriesN') || '15');

  try {
    const payload = await buildStatisticsPayload({
      country,
      userType,
      typeKind,
      topCountriesN: Number.isFinite(topCountriesN) ? topCountriesN : 8,
      typeCountriesN: Number.isFinite(typeCountriesN) ? typeCountriesN : 15,
    });
    return NextResponse.json(payload);
  } catch (err) {
    console.error('admin statistics failed', err);
    return NextResponse.json({ error: 'Failed to load statistics' }, { status: 500 });
  }
}
