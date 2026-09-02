import { NextRequest, NextResponse } from 'next/server';
import { requirePromocodeAccess } from '@/lib/promocodes/promocodeAccess';
import { listUsersOfPromocodes } from '@/lib/promocodes/promocodeUsersStatsService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const search = url.searchParams.get('search') ?? '';
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '10');

  try {
    const result = await listUsersOfPromocodes({ search, page, pageSize });
    return NextResponse.json(result);
  } catch (e) {
    console.error('promocodes users GET:', e);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
