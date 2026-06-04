import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { verifyAdminActionPassword } from '@/lib/admin/verifyAdminActionPassword';

export const dynamic = 'force-dynamic';

/** Verify super admin / logged-in admin password before sensitive actions. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ valid: false, error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const password = String((body as { password?: string })?.password ?? '').trim();
  if (!password) {
    return NextResponse.json({ valid: false, error: 'Password is required' }, { status: 400 });
  }

  const username = String((body as { username?: string })?.username ?? '').trim() || undefined;
  const valid = await verifyAdminActionPassword(password, auth, username);

  if (!valid) {
    return NextResponse.json(
      { valid: false, success: false, error: 'Invalid password' },
      { status: 401 },
    );
  }

  return NextResponse.json({ valid: true, success: true });
}
