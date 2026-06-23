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
    const message = e instanceof Error ? e.message : String(e);
    const exposeDetails =
      process.env.NODE_ENV !== 'production' || process.env.PROMOCODE_META_DEBUG === '1';
    return NextResponse.json(
      exposeDetails ? { error: 'Failed to load metadata', details: message } : { error: 'Failed to load metadata' },
      { status: 500 }
    );
  }
}
