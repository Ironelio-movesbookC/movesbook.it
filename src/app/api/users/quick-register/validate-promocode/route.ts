import { NextRequest, NextResponse } from 'next/server';
import { validateQuickRegisterPromocode } from '@/lib/users/quickRegisterService';

export const dynamic = 'force-dynamic';

async function parseParams(req: NextRequest) {
  if (req.method === 'GET') {
    const sp = req.nextUrl.searchParams;
    return {
      promocode: sp.get('promocode') ?? '',
      inviteEmail: sp.get('invite_email') ?? undefined,
      inviterUsername: sp.get('inviter_username') ?? undefined,
    };
  }
  const body = await req.json().catch(() => ({}));
  return {
    promocode: typeof body.promocode === 'string' ? body.promocode : '',
    inviteEmail: typeof body.invite_email === 'string' ? body.invite_email : undefined,
    inviterUsername:
      typeof body.inviter_username === 'string' ? body.inviter_username : undefined,
  };
}

export async function GET(req: NextRequest) {
  const params = await parseParams(req);
  const result = await validateQuickRegisterPromocode(params);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const params = await parseParams(req);
  const result = await validateQuickRegisterPromocode(params);
  return NextResponse.json(result);
}
