import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext } from '@/lib/procedures';
import { fetchMemberServicesDiscount } from '@/lib/procedures/memberDiscount';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const memberId = request.nextUrl.searchParams.get('memberId')?.trim();
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const discount = await fetchMemberServicesDiscount(auth.ctx.userId, memberId);
    return NextResponse.json({ discount });
  } catch (error) {
    console.error('GET member-discount:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
