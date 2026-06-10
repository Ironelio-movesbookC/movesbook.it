import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import {
  parseClubSubscriptionEndDate,
  parseClubSubscriptionStartDate,
} from '@/lib/admin/clubSubscriptionStatus';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';
import {
  appendArchivedPeriodIfChanged,
  shouldSyncPcuAccessOnRenewal,
  sliceYmd,
  validateSubscriptionDateRange,
} from '@/lib/admin/networkSubscriptionHistory';
import {
  findOwnedMembershipEntity,
  parseMembershipEntityKind,
  pickPrimaryMembershipEntityId,
  type MembershipEntityKind,
} from '@/lib/admin/membershipEntity';
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

function subscriptionWindowFromEntity(
  description: string | null,
  createdAt: Date,
): { dateStart: string; dateEnd: string } {
  const dateStart =
    parseClubSubscriptionStartDate(description, createdAt) ||
    createdAt.toISOString().slice(0, 10);
  const parsedEnd = parseClubSubscriptionEndDate(description, createdAt);
  const dateEnd = parsedEnd?.toISOString().slice(0, 10) ?? '';
  return { dateStart, dateEnd };
}

async function updateEntityDescription(
  kind: Exclude<MembershipEntityKind, 'account'>,
  entityId: string,
  description: string,
): Promise<void> {
  switch (kind) {
    case 'club':
      await prisma.club.update({ where: { id: entityId }, data: { description } });
      break;
    case 'team':
      await prisma.team.update({ where: { id: entityId }, data: { description } });
      break;
    case 'group':
      await prisma.group.update({ where: { id: entityId }, data: { description } });
      break;
    case 'coaching_group':
      await prisma.coachingGroup.update({ where: { id: entityId }, data: { description } });
      break;
    default:
      break;
  }
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
      username: true,
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
      ownedTeams: {
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
      ownedGroups: {
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
      ownedCoachingGroups: {
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
      settings: { select: { adminSettings: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | (Partial<PcuAccessSettings> & {
        clubId?: string;
        entityId?: string;
        entityKind?: string;
      })
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

  const entityIdParam = String(body.clubId ?? body.entityId ?? '').trim();
  const entityKindParam = parseMembershipEntityKind(body.entityKind);
  const targetEntity = entityIdParam
    ? findOwnedMembershipEntity(user, entityIdParam, entityKindParam)
    : null;

  const accountDefaultStart = user.createdAt.toISOString().slice(0, 10);
  const accountDefaultEnd = '';
  const entityWindow = targetEntity
    ? subscriptionWindowFromEntity(targetEntity.description, targetEntity.createdAt)
    : null;

  const defaultStart = entityWindow?.dateStart || accountDefaultStart;
  const defaultEnd = entityWindow?.dateEnd || accountDefaultEnd;

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

    if (targetEntity) {
      const entityMeta = parseClubDescriptionMeta(targetEntity.description);
      const entityStart = entityWindow!.dateStart;
      const entityEnd = entityWindow!.dateEnd;

      adminSettingsRaw = appendArchivedPeriodIfChanged(
        adminSettingsRaw,
        { accessStartIso: entityStart, accessEndIso: entityEnd },
        { accessStartIso: nextStart, accessEndIso: nextEnd },
        {
          entityId: targetEntity.id,
          companyName: targetEntity.name?.trim(),
          username: entityMeta.username?.trim() || user.username,
        },
      );

      await updateEntityDescription(
        targetEntity.kind,
        targetEntity.id,
        mergeClubSubscriptionDates(targetEntity.description, nextStart, nextEnd),
      );
      savedStart = nextStart;
      savedEnd = nextEnd;
    } else {
      adminSettingsRaw = appendArchivedPeriodIfChanged(
        adminSettingsRaw,
        {
          accessStartIso: previousAccess.accessStartIso,
          accessEndIso: previousAccess.accessEndIso,
        },
        { accessStartIso: nextStart, accessEndIso: nextEnd },
        {
          entityId: null,
          username: user.username,
        },
      );
      savedStart = nextStart;
      savedEnd = nextEnd;
    }

    const pcuDefaults = {
      accessStartIso: defaultStart,
      accessEndIso: defaultEnd,
    };
    const pcuAccess = readPcuAccessSettings(adminSettingsRaw, pcuDefaults);
    const primaryEntityId = pickPrimaryMembershipEntityId(user);
    const syncGlobalPcuAccess =
      !targetEntity ||
      shouldSyncPcuAccessOnRenewal(
        targetEntity.id,
        primaryEntityId,
        {
          dateStart: entityWindow?.dateStart || previousAccess.accessStartIso.slice(0, 10),
          dateEnd: entityWindow?.dateEnd || previousAccess.accessEndIso.slice(0, 10) || null,
        },
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
