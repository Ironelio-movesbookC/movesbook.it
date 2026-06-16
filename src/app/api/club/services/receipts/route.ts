import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext, fetchReceipts } from '@/lib/club/servicePurchasesDb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const receipts = await fetchReceipts(auth.ctx.club.id);
    return NextResponse.json({ receipts });
  } catch (error) {
    console.error('GET receipts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
