import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { fetchGlobalNewsFeedItems } from '@/lib/globalNewsAuth';

export const dynamic = 'force-dynamic';

/**
 * GET — Movesbook Global News feed (same items superadmin curates).
 * Available to any logged-in Movesbook user (e.g. Club → Movesbook News).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await fetchGlobalNewsFeedItems();
    return NextResponse.json({ items });
  } catch (e) {
    console.error('GET /api/news/global', e);
    return NextResponse.json({ error: 'Failed to load Movesbook News' }, { status: 500 });
  }
}
