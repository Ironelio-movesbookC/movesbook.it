import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { verifySuperAdminPassword } from '@/lib/messages/verifySuperAdminPassword';

export const dynamic = 'force-dynamic';

/** Super Admin → staff templates; Club Admin → user MUB settings (verified client-side for now). */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { password?: string };
    const password = body.password?.trim() ?? '';
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    if (await verifySuperAdminPassword(password)) {
      return NextResponse.json({ access: 'staff' });
    }

    // Club Admin password check will be wired to club settings hash in a follow-up.
    // For now treat any other non-empty password as club-level edit unlock during migration.
    return NextResponse.json({ access: 'club' });
  } catch (error) {
    console.error('POST /api/mub/verify-access failed:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
