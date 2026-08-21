import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import {
  buildCurrentUsersByCountry,
  parseCurrentUsersTypeFilter,
} from '@/lib/admin/buildCurrentUsersByCountry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const userType = parseCurrentUsersTypeFilter(
      request.nextUrl.searchParams.get('userType'),
    );
    const payload = await buildCurrentUsersByCountry(userType);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('current-users-by-country failed', err);
    return NextResponse.json(
      { error: 'Failed to load current users by country' },
      { status: 500 },
    );
  }
}
