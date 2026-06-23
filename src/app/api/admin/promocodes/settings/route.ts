import { NextRequest, NextResponse } from 'next/server';
import { requirePromocodeAccess } from '@/lib/promocodes/promocodeAccess';
import {
  createPromocodeSetting,
  getPromocodeSettingById,
  listPromocodeSettings,
  softDeletePromocodeSettings,
  updatePromocodeSetting,
} from '@/lib/promocodes/promocodeService';
import type { PromocodeSettingFormData } from '@/lib/promocodes/types';

export const dynamic = 'force-dynamic';

function parseForm(body: Record<string, unknown>): PromocodeSettingFormData {
  return {
    code: String(body.code ?? ''),
    enable: Boolean(body.enable),
    toDay: String(body.toDay ?? '01'),
    toMonth: String(body.toMonth ?? '01'),
    toYear: String(body.toYear ?? new Date().getFullYear()),
    versionIds: Array.isArray(body.versionIds)
      ? body.versionIds.map((v) => Number(v)).filter((v) => Number.isFinite(v))
      : [],
    discount: String(body.discount ?? ''),
    usableBy: String(body.usableBy ?? 'Once'),
    enableExtension: Boolean(body.enableExtension),
    subscriptionExtends: String(body.subscriptionExtends ?? ''),
    managementSection: String(body.managementSection ?? ''),
    socialOptions:
      Array.isArray(body.socialOptions)
        ? body.socialOptions.map(String)
        : body.socialOptions && typeof body.socialOptions === 'object'
          ? (body.socialOptions as Record<string, unknown>)
          : [],
    enableFreeAccounts: Boolean(body.enableFreeAccounts),
    basicVersion: String(body.basicVersion ?? ''),
    premiumVersion: String(body.premiumVersion ?? ''),
    professionalVersion: String(body.professionalVersion ?? ''),
    helpHtmlPagesId: body.helpHtmlPagesId != null ? Number(body.helpHtmlPagesId) : null,
    languageId: body.languageId != null ? Number(body.languageId) : null,
    email: String(body.email ?? ''),
    recipient: String(body.recipient ?? ''),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '5', 10);
  const search = url.searchParams.get('search') || undefined;
  const orderBy = url.searchParams.get('orderBy') || undefined;
  const usableBy = url.searchParams.get('usableBy') || undefined;
  const versionIdRaw = url.searchParams.get('versionId');
  const versionId = versionIdRaw ? parseInt(versionIdRaw, 10) : undefined;
  const available = url.searchParams.get('available') as 'current' | 'expired' | null;

  try {
    const result = await listPromocodeSettings({
      page,
      pageSize,
      search,
      orderBy,
      usableBy,
      versionId: Number.isFinite(versionId) ? versionId : undefined,
      available: available === 'current' || available === 'expired' ? available : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('promocodes settings GET:', e);
    return NextResponse.json({ error: 'Failed to load promocodes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const form = parseForm(body);
    if (!form.code.trim()) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    const creatorId = auth.access.isAdmin
      ? parseInt(String(body.creatorId ?? '1'), 10) || 1
      : auth.access.legacyUserId;
    const id = await createPromocodeSetting(form, creatorId);
    if (!id) {
      return NextResponse.json(
        { error: 'Failed to save promocode. Ensure promocode tables exist (run npm run db:push or db:ensure-promocode-meta).' },
        { status: 500 }
      );
    }
    let setting = null;
    try {
      setting = await getPromocodeSettingById(id);
    } catch (loadErr) {
      console.warn('promocodes settings POST: created but load failed:', loadErr);
    }
    return NextResponse.json({ ok: true, id, setting });
  } catch (e) {
    console.error('promocodes settings POST:', e);
    const message = e instanceof Error ? e.message : String(e);
    const exposeDetails =
      process.env.NODE_ENV !== 'production' || process.env.PROMOCODE_META_DEBUG === '1';
    return NextResponse.json(
      exposeDetails
        ? { error: 'Failed to create promocode', details: message }
        : { error: 'Failed to create promocode' },
      { status: 500 }
    );
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
    await softDeletePromocodeSettings(ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('promocodes settings DELETE:', e);
    return NextResponse.json({ error: 'Failed to delete promocodes' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const form = parseForm(body);
    const ok = await updatePromocodeSetting(id, form);
    if (!ok) {
      return NextResponse.json(
        { error: 'Failed to update promocode. Ensure promocode tables exist (run npm run db:push or db:ensure-promocode-meta).' },
        { status: 500 }
      );
    }
    let setting = null;
    try {
      setting = await getPromocodeSettingById(id);
    } catch (loadErr) {
      console.warn('promocodes settings PUT: updated but load failed:', loadErr);
    }
    return NextResponse.json({ ok: true, setting });
  } catch (e) {
    console.error('promocodes settings PUT:', e);
    const message = e instanceof Error ? e.message : String(e);
    const exposeDetails =
      process.env.NODE_ENV !== 'production' || process.env.PROMOCODE_META_DEBUG === '1';
    return NextResponse.json(
      exposeDetails
        ? { error: 'Failed to update promocode', details: message }
        : { error: 'Failed to update promocode' },
      { status: 500 }
    );
  }
}
