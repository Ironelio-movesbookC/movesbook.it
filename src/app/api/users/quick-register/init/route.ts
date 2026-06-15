import { NextRequest, NextResponse } from 'next/server';
import { getQuickRegisterInit } from '@/lib/users/quickRegisterService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const init = await getQuickRegisterInit({
    userEmail: sp.get('user_email') ?? undefined,
    promocode: sp.get('promocode') ?? undefined,
    inviteBy: sp.get('invite_by') ?? undefined,
    inviter: sp.get('inviter') ?? undefined,
  });
  return NextResponse.json({ success: true, ...init });
}
