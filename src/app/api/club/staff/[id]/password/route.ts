import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext } from '@/lib/procedures';
import { changeClubStaffPassword } from '@/lib/club/clubStaffService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const result = await changeClubStaffPassword(auth.ctx, params.id, {
      oldPassword: String(body.oldPassword ?? ''),
      newPassword: String(body.newPassword ?? ''),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update password';
    const status =
      message.includes('required') ||
      message.includes('Password') ||
      message.includes('incorrect') ||
      message.includes('not found')
        ? message.includes('not found')
          ? 404
          : 400
        : 500;
    if (status === 500) console.error('POST /api/club/staff/[id]/password:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
