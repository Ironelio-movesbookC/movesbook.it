import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext } from '@/lib/procedures';
import { fetchServiceSaleFormOptions } from '@/lib/procedures/serviceSaleFormOptions';
import { isKnownProcedureType } from '@/lib/procedures/validators';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { type: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    if (!isKnownProcedureType(params.type)) {
      return NextResponse.json({ error: `Unknown procedure type: ${params.type}` }, { status: 400 });
    }

    if (params.type !== PROCEDURE_TYPE_CODES.SERVICE_SALE) {
      return NextResponse.json({ error: 'Form options not implemented for this procedure type' }, { status: 501 });
    }

    const options = await fetchServiceSaleFormOptions(auth.ctx.club.id);
    return NextResponse.json(options);
  } catch (error) {
    console.error('GET procedure form-options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
