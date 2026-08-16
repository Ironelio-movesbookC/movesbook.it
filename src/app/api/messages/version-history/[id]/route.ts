import { NextRequest, NextResponse } from 'next/server';
import { deleteVersionHistoryArticle } from '@/lib/messages/versionHistory';
import {
  verifyOptionsFromRequest,
  verifySuperAdminPassword,
} from '@/lib/messages/verifySuperAdminPassword';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? '');
    if (!(await verifySuperAdminPassword(password, verifyOptionsFromRequest(request)))) {
      return NextResponse.json({ error: 'invalid_password' }, { status: 401 });
    }

    const ok = await deleteVersionHistoryArticle(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('version-history DELETE error:', error);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
