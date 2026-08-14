import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import {
  buildUsersConnected,
  parseConnectedUserType,
} from '@/lib/admin/buildUsersConnected';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = request.nextUrl;
    const userType = parseConnectedUserType(url.searchParams.get('userType'));
    const country = url.searchParams.get('country');
    const limitRaw = Number(url.searchParams.get('limit') || '0');
    const payload = await buildUsersConnected({
      userType,
      country,
      limit: Number.isFinite(limitRaw) ? limitRaw : 0,
    });
    return NextResponse.json(payload);
  } catch (err) {
    console.error('users-connected failed', err);
    return NextResponse.json(
      { error: 'Failed to load connected users' },
      { status: 500 },
    );
  }
}
