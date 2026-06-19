import { NextRequest, NextResponse } from 'next/server';
import { requirePromocodeAccess } from '@/lib/promocodes/promocodeAccess';
import { generatePromocode } from '@/lib/promocodes/promocodeService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return NextResponse.json({ code: generatePromocode() });
}
