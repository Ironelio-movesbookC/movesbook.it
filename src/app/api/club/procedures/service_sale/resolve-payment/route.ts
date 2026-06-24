import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext } from '@/lib/procedures';
import { resolveDeadlinePaymentRecordId } from '@/lib/procedures/resolveDeadlinePaymentRoute';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const segmentsParam = request.nextUrl.searchParams.get('segments');
    const recordIdParam = request.nextUrl.searchParams.get('recordId');

    if (recordIdParam) {
      return NextResponse.json({ recordId: recordIdParam });
    }

    const segments = segmentsParam
      ? segmentsParam.split('/').map((s) => decodeURIComponent(s)).filter(Boolean)
      : [];

    const recordId = await resolveDeadlinePaymentRecordId(auth.ctx.club.id, segments);
    if (!recordId) {
      return NextResponse.json({ error: 'Deadline record not found' }, { status: 404 });
    }

    return NextResponse.json({ recordId });
  } catch (error) {
    console.error('GET resolve-payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
