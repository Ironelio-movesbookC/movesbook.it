import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { mergePcuSettingsPatch } from '@/lib/admin/userPcuFunctionsSettings';
import { readPcuSettings, type PcuSettings } from '@/lib/admin/userPcuSettings';

export const dynamic = 'force-dynamic';

type PcuSettingsPayload = PcuSettings;

/** GET — Load saved PCU admin settings for a user. */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = params?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, settings: { select: { adminSettings: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const pcuSettings = readPcuSettings(user.settings?.adminSettings);
  return NextResponse.json({ ok: true, pcuSettings });
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

  const settings = await prisma.userSettings.findUnique({ where: { userId } });

  const prev = (() => {
    if (!settings?.adminSettings) return {};
    try {
      return JSON.parse(settings.adminSettings);
    } catch {
      return {};
    }
  })();

  const prevPcu =
    prev?.pcu && typeof prev.pcu === 'object' ? (prev.pcu as Record<string, unknown>) : {};
  const mergedPcu = mergePcuSettingsPatch(prevPcu, body as Record<string, unknown>);

  const next = {
    ...prev,
    pcu: {
      ...mergedPcu,
      updatedAt: new Date().toISOString(),
    },
  };

  if (settings) {
    await prisma.userSettings.update({
      where: { userId },
      data: { adminSettings: JSON.stringify(next) },
    });
  } else {
    await prisma.userSettings.create({
      data: {
        userId,
        widgetArrangement: '{}',
        colorSettings: '{}',
        adminSettings: JSON.stringify(next),
        favouritesSettings: '{}',
        myBestSettings: '{}',
        notificationSettings: '{}',
        socialSettings: '{}',
        toolsSettings: '{}',
        workoutPreferences: '{}',
      },
    });
  }

  const pcuSettings = readPcuSettings(JSON.stringify(next));
  return NextResponse.json({ ok: true, pcuSettings });
}

