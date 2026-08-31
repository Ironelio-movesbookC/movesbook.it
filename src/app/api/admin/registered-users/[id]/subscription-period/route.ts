import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import {
  MEMBERSHIP_STATUS_NOT_YET_ACTIVE,
} from '@/lib/admin/clubSubscriptionStatus';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';
import {
  isNotYetActiveMembershipPeriod,
  periodStatusFromDates,
  periodsForRow,
  readDeletedSubscriptionPeriods,
  readNetworkSubscriptionHistory,
  sliceYmd,
  updateMembershipPeriodInHistory,
  validateMembershipPeriodNoOverlap,
  validateSubscriptionDateRange,
} from '@/lib/admin/networkSubscriptionHistory';
import type { RegisteredUserListRow } from '@/lib/admin/expandRegisteredUserListRows';
import {
  findOwnedMembershipEntity,
  parseMembershipEntityKind,
  type MembershipEntityKind,
} from '@/lib/admin/membershipEntity';
import {
  mergePcuAccessIntoAdminSettings,
  readPcuAccessSettings,
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

function buildMembershipRow(
  userId: string,
  entityId: string | null,
  current: { dateStart: string; dateEnd: string | null; version: string; username: string; companyName: string },
): RegisteredUserListRow {
  const entityPart = entityId?.trim() || 'account';
  return {
    rowKey: `${userId}-${entityPart}`,
    id: userId,
    username: current.username,
    email: '',
    displayName: '',
    userType: '',
    country: null,
    location: null,
    dateStart: current.dateStart,
    dateEnd: current.dateEnd,
    version: current.version,
    amount: '—',
    status: 'Active',
    entityId,
    primaryClubId: entityId,
    companyName: current.companyName,
  };
}

/** PATCH — Edit dates of a not-yet-active membership period (grid "Edit date" only). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = params?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        periodId?: string;
        dateStart?: string;
        dateEnd?: string;
        clubId?: string;
        entityId?: string;
        entityKind?: string;
      }
    | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const periodId = String(body.periodId ?? '').trim();
  const nextStart = sliceYmd(body.dateStart);
  const nextEnd = sliceYmd(body.dateEnd);
  if (!periodId || !nextStart || !nextEnd) {
    return NextResponse.json({ error: 'periodId, dateStart, and dateEnd are required' }, { status: 400 });
  }

  const rangeError = validateSubscriptionDateRange(nextStart, nextEnd);
  if (rangeError) {
    return NextResponse.json({ error: rangeError }, { status: 400 });
  }

  if (periodStatusFromDates({ dateStart: nextStart, dateEnd: nextEnd }) !== MEMBERSHIP_STATUS_NOT_YET_ACTIVE) {
    return NextResponse.json(
      { error: 'Only not-yet-active membership dates can be edited from the grid' },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      createdAt: true,
      ownedClubs: {
        select: { id: true, name: true, description: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      ownedTeams: {
        select: { id: true, name: true, description: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
      ownedGroups: {
        select: { id: true, name: true, description: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
      ownedCoachingGroups: {
        select: { id: true, name: true, description: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
      settings: { select: { adminSettings: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const entityIdParam = String(body.clubId ?? body.entityId ?? '').trim();
  const entityKindParam = parseMembershipEntityKind(body.entityKind);
  const targetEntity = entityIdParam
    ? findOwnedMembershipEntity(user, entityIdParam, entityKindParam)
    : null;

  let adminSettingsRaw = user.settings?.adminSettings ?? null;
  const pcuDefaults = {
    accessStartIso: user.createdAt.toISOString().slice(0, 10),
    accessEndIso: '',
  };
  const pcuAccess = readPcuAccessSettings(adminSettingsRaw, pcuDefaults);
  const pcuWindow =
    pcuAccess.accessStartIso.trim() && pcuAccess.accessEndIso.trim()
      ? { accessStartIso: pcuAccess.accessStartIso, accessEndIso: pcuAccess.accessEndIso }
      : undefined;

  const entityMeta = targetEntity ? parseClubDescriptionMeta(targetEntity.description) : null;
  const row = buildMembershipRow(userId, targetEntity?.id ?? null, {
    dateStart: pcuWindow?.accessStartIso.slice(0, 10) || user.createdAt.toISOString().slice(0, 10),
    dateEnd: pcuWindow?.accessEndIso.slice(0, 10) || null,
    version: '—',
    username: entityMeta?.username?.trim() || user.username,
    companyName: targetEntity?.name?.trim() || user.username,
  });

  const periods = periodsForRow(
    row,
    readNetworkSubscriptionHistory(adminSettingsRaw),
    readDeletedSubscriptionPeriods(adminSettingsRaw),
    pcuWindow,
  );

  const targetPeriod = periods.find((p) => p.id === periodId);
  if (!targetPeriod) {
    return NextResponse.json({ error: 'Membership period not found' }, { status: 404 });
  }
  if (!isNotYetActiveMembershipPeriod(targetPeriod)) {
    return NextResponse.json(
      { error: 'Only not-yet-active membership dates can be edited from the grid' },
      { status: 400 },
    );
  }

  const overlapError = validateMembershipPeriodNoOverlap(
    { id: periodId, dateStart: nextStart, dateEnd: nextEnd },
    periods,
  );
  if (overlapError) {
    return NextResponse.json({ error: overlapError }, { status: 400 });
  }

  if (periodId.startsWith('current-')) {
    if (targetEntity) {
      await updateEntityDescription(
        targetEntity.kind,
        targetEntity.id,
        mergeClubSubscriptionDates(targetEntity.description, nextStart, nextEnd),
      );
    } else {
      adminSettingsRaw = mergePcuAccessIntoAdminSettings(adminSettingsRaw, {
        accessStartIso: nextStart,
        accessEndIso: nextEnd,
      });
      await upsertAdminSettings(userId, adminSettingsRaw);
    }
  } else {
    const { adminSettings } = updateMembershipPeriodInHistory(adminSettingsRaw, periodId, {
      dateStart: nextStart,
      dateEnd: nextEnd,
    });
    adminSettingsRaw = adminSettings;
    await upsertAdminSettings(userId, adminSettingsRaw);
  }

  return NextResponse.json({
    ok: true,
    period: {
      id: periodId,
      dateStart: nextStart,
      dateEnd: nextEnd,
    },
  });
}
