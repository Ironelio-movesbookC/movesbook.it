import { NextRequest, NextResponse } from 'next/server';
import { requireTableSuperAdmin, fetchGlobalNewsFeedItems } from '@/lib/globalNewsAuth';

export const dynamic = 'force-dynamic';

/** GET — merged News + OGP News marked for Global News, newest first. */
export async function GET(request: NextRequest) {
  const auth = await requireTableSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const items = await fetchGlobalNewsFeedItems();
    return NextResponse.json({ items });
  } catch (e) {
    console.error('GET /api/admin/global-news', e);
    return NextResponse.json({ error: 'Failed to load global news' }, { status: 500 });
  }
}
