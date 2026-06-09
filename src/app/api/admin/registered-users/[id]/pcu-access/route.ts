import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import {
  parseClubSubscriptionEndDate,
  parseClubSubscriptionStartDate,
} from '@/lib/admin/clubSubscriptionStatus';
import { pickClubForAdminProfile } from '@/lib/admin/pickClubForAdminProfile';
import {
  shouldSyncPcuAccessOnRenewal,
  sliceYmd,
  validateSubscriptionDateRange,
} from '@/lib/admin/networkSubscriptionHistory';
import {
  mergePcuAccessIntoAdminSettings,
  readPcuAccessSettings,
  type PcuAccessSettings,
} from '@/lib/admin/userPcuAccessSettings';
import { mergeClubSubscriptionDates } from '@/lib/club/clubProfilePayload';

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

  const body = (await request.json().catch(() => null)) as
    | (Partial<PcuAccessSettings> & { clubId?: string; entityId?: string })
    | null;
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

  const clubIdParam = String(body.clubId ?? body.entityId ?? '').trim();
  const primaryClub = pickClubForAdminProfile(user.ownedClubs);
  const targetClub =
    (clubIdParam ? user.ownedClubs.find((c) => c.id === clubIdParam) : null) ?? primaryClub;

  const clubStart = targetClub
    ? parseClubSubscriptionStartDate(targetClub.description, targetClub.createdAt) ||
      targetClub.createdAt.toISOString().slice(0, 10)
    : user.createdAt.toISOString().slice(0, 10);
  const clubEndDate = targetClub
    ? parseClubSubscriptionEndDate(targetClub.description, targetClub.createdAt)
    : null;
  const clubEnd = clubEndDate?.toISOString().slice(0, 10) ?? '';

  const defaultStart = clubStart;
  const defaultEnd = clubEnd;

  const previousAccess = readPcuAccessSettings(user.settings?.adminSettings, {
    accessStartIso: defaultStart,
    accessEndIso: defaultEnd,
  });

  let adminSettingsRaw = user.settings?.adminSettings ?? null;
  let savedStart = defaultStart;
  let savedEnd = defaultEnd;
  if ('accessStartIso' in patch || 'accessEndIso' in patch) {
    const nextAccess = {
      accessStartIso:
        patch.accessStartIso !== undefined ? patch.accessStartIso : previousAccess.accessStartIso,
      accessEndIso:
        patch.accessEndIso !== undefined ? patch.accessEndIso : previousAccess.accessEndIso,
    };

    const nextStart = sliceYmd(nextAccess.accessStartIso);
    const nextEnd = sliceYmd(nextAccess.accessEndIso);
    const rangeError = validateSubscriptionDateRange(nextStart, nextEnd);
    if (rangeError) {
      return NextResponse.json({ error: rangeError }, { status: 400 });
    }

    if (targetClub) {
      await prisma.club.update({
        where: { id: targetClub.id },
        data: {
          description: mergeClubSubscriptionDates(
            targetClub.description,
            nextStart,
            nextEnd,
          ),
        },
      });
      savedStart = nextStart;
      savedEnd = nextEnd;
    }

    const pcuDefaults = {
      accessStartIso: clubStart,
      accessEndIso: clubEnd,
    };
    const pcuAccess = readPcuAccessSettings(adminSettingsRaw, pcuDefaults);
    const syncGlobalPcuAccess =
      targetClub &&
      shouldSyncPcuAccessOnRenewal(
        targetClub.id,
        primaryClub?.id ?? null,
        { dateStart: clubStart, dateEnd: clubEnd || null },
        pcuAccess,
      );
    if (!syncGlobalPcuAccess) {
      delete patch.accessStartIso;
      delete patch.accessEndIso;
    }
  }

  const adminSettings = mergePcuAccessIntoAdminSettings(adminSettingsRaw, patch);
  await upsertAdminSettings(userId, adminSettings);

  const pcuAccess = readPcuAccessSettings(adminSettings, {
    accessStartIso: savedStart,
    accessEndIso: savedEnd,
  });
  pcuAccess.accessStartIso = savedStart;
  pcuAccess.accessEndIso = savedEnd;
  return NextResponse.json({ ok: true, pcuAccess });
}
