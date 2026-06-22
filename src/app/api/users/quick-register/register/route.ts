import { NextRequest, NextResponse } from 'next/server';
import { quickRegisterUser, type QuickRegisterPayload } from '@/lib/users/quickRegisterService';
import { resolvePublicOrigin } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const payload: QuickRegisterPayload = {
      username: String(body.username ?? ''),
      email: String(body.email ?? ''),
      re_email: String(body.re_email ?? body.reEmail ?? ''),
      password: String(body.password ?? ''),
      confim_password: String(body.confim_password ?? body.confirmPassword ?? ''),
      country: String(body.country ?? ''),
      usertype: String(body.usertype ?? body.userType ?? ''),
      version_id: String(body.version_id ?? body.versionId ?? ''),
      gender: String(body.gender ?? ''),
      sport: String(body.sport ?? ''),
      promocode: String(body.promocode ?? ''),
      inviter_username: body.inviter_username != null ? String(body.inviter_username) : undefined,
      confirm_inviter_username:
        body.confirm_inviter_username != null ? String(body.confirm_inviter_username) : undefined,
      invite_by_movesbook: Boolean(body.invite_by_movesbook ?? body.inviteByMovesbook),
      origin_email: body.origin_email != null ? String(body.origin_email) : undefined,
      disccount_hidden: body.disccount_hidden != null ? String(body.disccount_hidden) : undefined,
      origin: resolvePublicOrigin(req),
    };

    const result = await quickRegisterUser(payload);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    console.error('quick-register/register POST:', err);
    const details = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json(
      { success: false, message: 'Registration failed. Please try again.', error: details },
      { status: 500 }
    );
  }
}
