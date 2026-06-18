import { NextRequest, NextResponse } from 'next/server';
import { requirePromocodeAccess } from '@/lib/promocodes/promocodeAccess';
import { getPromocodeMeta } from '@/lib/promocodes/promocodeService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const meta = await getPromocodeMeta();
    return NextResponse.json(meta);
  } catch (e) {
    console.error('promocodes meta GET:', e);
    return NextResponse.json({ error: 'Failed to load metadata' }, { status: 500 });
  }
}
