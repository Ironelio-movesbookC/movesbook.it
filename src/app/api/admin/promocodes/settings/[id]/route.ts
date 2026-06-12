import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getPromocodeSettingById, parseSocialOptions } from '@/lib/promocodes/promocodeService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idRaw } = await params;
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const setting = await getPromocodeSettingById(id);
    if (!setting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      setting: {
        ...setting,
        socialOptionsParsed: parseSocialOptions(setting.socialOptions),
      },
    });
  } catch (e) {
    console.error('promocodes settings/[id] GET:', e);
    return NextResponse.json({ error: 'Failed to load promocode' }, { status: 500 });
  }
}
