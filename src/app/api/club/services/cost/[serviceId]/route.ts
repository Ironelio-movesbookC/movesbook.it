import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext, getServiceCost } from '@/lib/club/servicePurchasesDb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { serviceId: string } }
) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const cost = await getServiceCost(params.serviceId);
    if (cost == null) {
      return NextResponse.json({ success: false, message: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, club_currency_cost: cost });
  } catch (error) {
    console.error('GET service cost error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
