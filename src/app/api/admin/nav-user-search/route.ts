import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { searchMovesbookUsersForNav } from '@/lib/adminNavUserSearch';
import { isNavSearchScope } from '@/lib/adminNavUserSearchScope';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const scopeRaw = url.searchParams.get('scope') ?? 'all';
  const scope = isNavSearchScope(scopeRaw) ? scopeRaw : 'all';
  const q = (url.searchParams.get('q') ?? '').trim();
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50),
  );

  if (!q) {
    return NextResponse.json({ scope, query: q, total: 0, users: [] });
  }

  try {
    const { users, total } = await searchMovesbookUsersForNav(scope, q, limit);
    return NextResponse.json({ scope, query: q, total, users });
  } catch (error) {
    console.error('nav-user-search error:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
