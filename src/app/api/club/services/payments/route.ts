import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext, fetchPaymentDetails } from '@/lib/club/servicePurchasesDb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const spId = request.nextUrl.searchParams.get('spId') ?? undefined;
    const payments = await fetchPaymentDetails(auth.ctx.club.id, spId);

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('GET payments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
