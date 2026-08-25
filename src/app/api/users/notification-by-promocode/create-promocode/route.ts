import { NextRequest, NextResponse } from 'next/server';
import { createChildPromocodeForUser } from '@/lib/promocodes/childPromocode';
import { resolvePromocodeSessionUser } from '@/lib/promocodes/promocodeSessionAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await resolvePromocodeSessionUser(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const result = await createChildPromocodeForUser({
    legacyUserId: session.user.legacyUserId,
    email: session.user.email,
    username: session.user.username,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id, code: result.code });
}
