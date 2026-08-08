import { NextRequest, NextResponse } from 'next/server';
import { requirePromocodeAccess } from '@/lib/promocodes/promocodeAccess';
import { listPromocodeApplies } from '@/lib/promocodes/promocodeService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '25', 10);
  const search = url.searchParams.get('search') || undefined;
  const orderBy = url.searchParams.get('orderBy') || undefined;
  const registeredOnly = url.searchParams.get('registeredOnly') === '1';
  const promocodeIdRaw = url.searchParams.get('promocodeId');
  const promocodeId = promocodeIdRaw ? parseInt(promocodeIdRaw, 10) : undefined;

  try {
    const scopeToCurrentUser =
      !auth.access.isAdmin && Number.isFinite(promocodeId) && (promocodeId ?? 0) > 0;

    const result = await listPromocodeApplies({
      page,
      pageSize,
      search,
      orderBy,
      registeredOnly,
      promocodeId: Number.isFinite(promocodeId) ? promocodeId : undefined,
      senderScopeUserId: scopeToCurrentUser ? auth.access.legacyUserId : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('promocodes applies GET:', e);
    return NextResponse.json({ error: 'Failed to load promocode registrations' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter((id: number) => Number.isFinite(id)) : [];
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, message: 'No ids provided' }, { status: 400 });
    }

    const { softDeletePromocodeApplies } = await import('@/lib/promocodes/promocodeService');
    await softDeletePromocodeApplies(ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('promocodes applies DELETE:', e);
    return NextResponse.json({ error: 'Failed to delete records' }, { status: 500 });
  }
}
