import { NextRequest, NextResponse } from 'next/server';
import { getQuickRegisterSubscriptionData } from '@/lib/users/quickRegisterService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userType = typeof body.userType === 'string' ? body.userType : String(body.userType ?? '');
  const versionId =
    typeof body.version_id === 'string'
      ? body.version_id
      : body.version_id != null
        ? String(body.version_id)
        : '';
  const promocode = typeof body.promocode === 'string' ? body.promocode : '';
  const registrationType =
    body.registration_type === 'renewal' ? 'renewal' : ('first' as const);

  const data = await getQuickRegisterSubscriptionData({
    userType,
    versionId,
    promocode,
    registrationType,
  });
  return NextResponse.json(data);
}
