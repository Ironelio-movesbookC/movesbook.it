import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { listCreditsEarnedUsers } from '@/lib/promocodes/creditsEarnedService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const searchUsername = request.nextUrl.searchParams.get('search_username')?.trim() ?? '';

  try {
    const rows = await listCreditsEarnedUsers(searchUsername);
    return NextResponse.json({ rows, searchUsername });
  } catch (err) {
    console.error('promocodes credits-earned GET:', err);
    return NextResponse.json({ error: 'Failed to load credits earned report' }, { status: 500 });
  }
}
