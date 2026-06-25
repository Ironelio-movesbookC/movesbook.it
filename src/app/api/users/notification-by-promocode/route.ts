import { NextRequest, NextResponse } from 'next/server';
import { getNotificationByPromocodeDashboard } from '@/lib/promocodes/notificationByPromocodeService';
import { resolvePromocodeSessionUser } from '@/lib/promocodes/promocodeSessionAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await resolvePromocodeSessionUser(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  try {
    const data = await getNotificationByPromocodeDashboard({
      legacyUserId: session.user.legacyUserId,
      email: session.user.email,
      roleId: session.user.roleId,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error('notification-by-promocode GET:', err);
    return NextResponse.json({ error: 'Failed to load promocode dashboard' }, { status: 500 });
  }
}
