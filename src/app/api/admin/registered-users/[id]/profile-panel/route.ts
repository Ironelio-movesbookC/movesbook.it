import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import {
  mergeProfilePanelIntoAdminSettings,
  normalizeFavouritePriority,
  readProfilePanelSettings,
  type ProfilePanelSettings,
} from '@/lib/admin/userProfilePanelSettings';

export const dynamic = 'force-dynamic';

async function upsertAdminSettings(userId: string, adminSettings: string) {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (existing) {
    await prisma.userSettings.update({
      where: { userId },
      data: { adminSettings },
    });
    return;
  }
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

/** PATCH — Update tag / favourite priority for the admin profile panel. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
    select: {
      id: true,
      settings: { select: { adminSettings: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Partial<ProfilePanelSettings> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const patch: Partial<ProfilePanelSettings> = {};
  if ('tagged' in body) patch.tagged = Boolean(body.tagged);
  if ('favouritePriority' in body) {
    patch.favouritePriority = normalizeFavouritePriority(body.favouritePriority);
  }

  if (!('tagged' in patch) && !('favouritePriority' in patch)) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const adminSettings = mergeProfilePanelIntoAdminSettings(
    user.settings?.adminSettings,
    patch,
  );
  await upsertAdminSettings(userId, adminSettings);

  const profilePanel = readProfilePanelSettings(adminSettings);
  return NextResponse.json({ ok: true, profilePanel });
}
