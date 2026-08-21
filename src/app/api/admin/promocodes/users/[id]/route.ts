import { NextRequest, NextResponse } from 'next/server';
import { requirePromocodeAccess } from '@/lib/promocodes/promocodeAccess';
import {
  listConnectionChartForUser,
  listCreditsForUser,
  listInvitesAndRegistrationsForUser,
} from '@/lib/promocodes/promocodeUsersStatsService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const resolved = await Promise.resolve(context.params);
  const id = Number(resolved.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }

  try {
    const [invitesData, credits, connections] = await Promise.all([
      listInvitesAndRegistrationsForUser(id),
      listCreditsForUser(id),
      listConnectionChartForUser(id),
    ]);
    return NextResponse.json({
      userId: id,
      ...invitesData,
      credits,
      connections,
    });
  } catch (e) {
    console.error('promocodes users detail GET:', e);
    return NextResponse.json({ error: 'Failed to load user detail' }, { status: 500 });
  }
}
