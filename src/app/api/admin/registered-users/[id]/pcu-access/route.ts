import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { parseClubSubscriptionEndDate } from '@/lib/admin/clubSubscriptionStatus';
import { pickClubForAdminProfile } from '@/lib/admin/pickClubForAdminProfile';
import {
  appendArchivedPeriodIfChanged,
  computeRenewalStartDate,
  sliceYmd,
} from '@/lib/admin/networkSubscriptionHistory';
import {
  mergePcuAccessIntoAdminSettings,
  readPcuAccessSettings,
  type PcuAccessSettings,
} from '@/lib/admin/userPcuAccessSettings';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';

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

/** PATCH — Update PCU access dates and suspend flags for a user. */
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
      createdAt: true,
      ownedClubs: {
        select: {
          id: true,
          name: true,
          location: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      settings: { select: { adminSettings: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Partial<PcuAccessSettings> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const patch: Partial<PcuAccessSettings> = {};
  if ('accessStartIso' in body) patch.accessStartIso = String(body.accessStartIso ?? '');
  if ('accessEndIso' in body) patch.accessEndIso = String(body.accessEndIso ?? '');
  if ('suspendAccessControl' in body) patch.suspendAccessControl = Boolean(body.suspendAccessControl);
  if ('suspend' in body) patch.suspend = Boolean(body.suspend);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const primaryClub = pickClubForAdminProfile(user.ownedClubs);
  const defaultStart = (primaryClub?.createdAt ?? user.createdAt).toISOString().slice(0, 10);
  const subscriptionEndDate = primaryClub
    ? parseClubSubscriptionEndDate(primaryClub.description, primaryClub.createdAt)
    : null;
  const defaultEnd = subscriptionEndDate?.toISOString().slice(0, 10) ?? '';

  const previousAccess = readPcuAccessSettings(user.settings?.adminSettings, {
    accessStartIso: defaultStart,
    accessEndIso: defaultEnd,
  });

  let adminSettingsRaw = user.settings?.adminSettings ?? null;
  if ('accessStartIso' in patch || 'accessEndIso' in patch) {
    const nextAccess = {
      accessStartIso:
        patch.accessStartIso !== undefined ? patch.accessStartIso : previousAccess.accessStartIso,
      accessEndIso:
        patch.accessEndIso !== undefined ? patch.accessEndIso : previousAccess.accessEndIso,
    };
    const prevStart = sliceYmd(previousAccess.accessStartIso);
    const prevEnd = sliceYmd(previousAccess.accessEndIso);
    const nextStart = sliceYmd(nextAccess.accessStartIso);
    // New membership (start changed): enforce Movesbook renewal start rules.
    if (nextStart && nextStart !== prevStart) {
      nextAccess.accessStartIso = computeRenewalStartDate(prevEnd || null);
      patch.accessStartIso = nextAccess.accessStartIso;
    }
    const clubMeta = primaryClub ? parseClubDescriptionMeta(primaryClub.description) : {};
    adminSettingsRaw = appendArchivedPeriodIfChanged(
      adminSettingsRaw,
      {
        accessStartIso: previousAccess.accessStartIso,
        accessEndIso: previousAccess.accessEndIso,
      },
      nextAccess,
      {
        entityId: primaryClub?.id ?? null,
        companyName: primaryClub?.name?.trim(),
        username: clubMeta.username?.trim(),
      },
    );
  }

  const adminSettings = mergePcuAccessIntoAdminSettings(adminSettingsRaw, patch);
  await upsertAdminSettings(userId, adminSettings);

  const pcuAccess = readPcuAccessSettings(adminSettings, {
    accessStartIso: defaultStart,
    accessEndIso: defaultEnd,
  });
  return NextResponse.json({ ok: true, pcuAccess });
}
