import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext, procedureService } from '@/lib/procedures';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { type: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const result = await procedureService.listPayments(auth.ctx, params.type, {
      page: Number(request.nextUrl.searchParams.get('page') ?? 1),
      pageSize: Number(request.nextUrl.searchParams.get('pageSize') ?? 10),
      recordId: request.nextUrl.searchParams.get('recordId') ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET procedure payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
