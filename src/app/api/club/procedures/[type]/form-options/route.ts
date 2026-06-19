import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext } from '@/lib/procedures';
import { fetchServiceSaleFormOptions } from '@/lib/procedures/serviceSaleFormOptions';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { type: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    if (params.type !== PROCEDURE_TYPE_CODES.SERVICE_SALE) {
      return NextResponse.json({ error: 'Unsupported procedure type' }, { status: 400 });
    }

    const options = await fetchServiceSaleFormOptions(auth.ctx.club.id);
    return NextResponse.json(options);
  } catch (error) {
    console.error('GET procedure form-options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
