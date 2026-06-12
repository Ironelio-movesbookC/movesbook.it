import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { normalizePcuAlertDateToInput } from '@/lib/admin/userPcuAlertMsg';
import {
  mergePcuSettingsForScope,
  readPcuSettingsForScope,
  resolvePcuEntityId,
  type PcuSettings,
} from '@/lib/admin/userPcuSettings';

export const dynamic = 'force-dynamic';

type PcuSettingsPayload = PcuSettings & {
  entityId?: string;
  clubId?: string;
};

/** GET — Load saved PCU admin settings for a user (optionally scoped to one entity). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = params?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  const entityId = resolvePcuEntityId(
    request.nextUrl.searchParams.get('entityId'),
    request.nextUrl.searchParams.get('clubId'),
  );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, settings: { select: { adminSettings: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const pcuSettings = readPcuSettingsForScope(user.settings?.adminSettings, entityId);
  return NextResponse.json({ ok: true, pcuSettings, entityId });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = params?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as PcuSettingsPayload | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const entityId = resolvePcuEntityId(
    body.entityId,
    body.clubId,
    request.nextUrl.searchParams.get('entityId'),
    request.nextUrl.searchParams.get('clubId'),
  );

  const { entityId: _e, clubId: _c, ...patch } = body;

  if (patch.alertMsg && typeof patch.alertMsg === 'object') {
    const alertMsg = patch.alertMsg as {
      enableFrom?: string;
      enableTo?: string;
    };
    if (alertMsg.enableFrom !== undefined) {
      alertMsg.enableFrom = normalizePcuAlertDateToInput(alertMsg.enableFrom);
    }
    if (alertMsg.enableTo !== undefined) {
      alertMsg.enableTo = normalizePcuAlertDateToInput(alertMsg.enableTo);
    }
  }

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const adminSettings = mergePcuSettingsForScope(
    settings?.adminSettings,
    entityId,
    patch as Record<string, unknown>,
  );

  if (settings) {
    await prisma.userSettings.update({
      where: { userId },
      data: { adminSettings },
    });
  } else {
    await prisma.userSettings.create({
      data: {
        userId,
        widgetArrangement: '{}',
        colorSettings: '{}',
        adminSettings,
        favouritesSettings: '{}',
        myBestSettings: '{}',
        notificationSettings: '{}',
        socialSettings: '{}',
        toolsSettings: '{}',
        workoutPreferences: '{}',
      },
    });
  }

  const pcuSettings = readPcuSettingsForScope(adminSettings, entityId);
  return NextResponse.json({ ok: true, pcuSettings, entityId });
}
