import { NextRequest, NextResponse } from 'next/server';
import { listCompanies } from '@/lib/club/archives/clubArchiveService';
import { getClubAuthContext } from '@/lib/procedures';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const companies = await listCompanies(auth.ctx);
    return NextResponse.json({ companies });
  } catch (error) {
    console.error('GET companies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
