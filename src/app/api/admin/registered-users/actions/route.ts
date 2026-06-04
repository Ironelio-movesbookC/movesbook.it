import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import {
  applyMembershipRenewalToAdminSettings,
  applySubscriptionPeriodDeletions,
  computeRenewalEndDate,
  computeRenewalStartDate,
  shouldSyncPcuAccessOnRenewal,
  type MembershipRenewalInput,
  type SubscriptionPeriodDeletion,
} from '@/lib/admin/networkSubscriptionHistory';
import { mergeClubSubscriptionDates } from '@/lib/club/clubProfilePayload';
import { pickClubForAdminProfile } from '@/lib/admin/pickClubForAdminProfile';
import { parseClubSubscriptionEndDate, parseClubSubscriptionStartDate } from '@/lib/admin/clubSubscriptionStatus';
import {
  mergePcuAccessIntoAdminSettings,
  readPcuAccessSettings,
} from '@/lib/admin/userPcuAccessSettings';
import { verifyAdminActionPassword } from '@/lib/admin/verifyAdminActionPassword';

export const dynamic = 'force-dynamic';

const ALL_REGISTERED_TYPES: UserType[] = [
  UserType.ATHLETE,
  UserType.COACH,
  UserType.GROUP,
  UserType.GROUP_ADMIN,
  UserType.TEAM,
  UserType.TEAM_MANAGER,
  UserType.CLUB,
  UserType.CLUB_TRAINER,
];

const SEGMENT_TYPES: Record<string, UserType[]> = {
  all: ALL_REGISTERED_TYPES,
  'single-user': [UserType.ATHLETE],
  coaches: [UserType.COACH],
  groups: [UserType.GROUP, UserType.GROUP_ADMIN],
  teams: [UserType.TEAM, UserType.TEAM_MANAGER],
  clubs: [UserType.CLUB, UserType.CLUB_TRAINER],
};

function parseUserIds(body: unknown): string[] {
  if (!body || typeof body !== 'object') return [];
  const raw = (body as { userIds?: unknown }).userIds;
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.map((id) => String(id).trim()).filter(Boolean)));
}

function subscriptionRowToUserId(rowId: string): string {
  const prefix = 'account-';
  return rowId.startsWith(prefix) ? rowId.slice(prefix.length) : rowId;
}

type SubscriptionDeletionRequest = SubscriptionPeriodDeletion & { userId: string };

function parseSubscriptionDeletions(body: unknown): SubscriptionDeletionRequest[] {
  if (!body || typeof body !== 'object') return [];
  const raw = (body as { subscriptions?: unknown }).subscriptions;
  if (!Array.isArray(raw)) return [];
  const out: SubscriptionDeletionRequest[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const userId = String(rec.userId ?? '').trim();
    const periodId = String(rec.periodId ?? '').trim();
    if (!userId || !periodId) continue;
    out.push({
      userId,
      periodId,
      entityId:
        rec.entityId === null || rec.entityId === undefined
          ? undefined
          : String(rec.entityId).trim() || null,
      dateStart: typeof rec.dateStart === 'string' ? rec.dateStart.trim() : undefined,
      dateEnd:
        rec.dateEnd === null
          ? null
          : typeof rec.dateEnd === 'string'
            ? rec.dateEnd.trim() || null
            : undefined,
    });
  }
  return out;
}

type MembershipRenewalRequest = MembershipRenewalInput & {
  userId: string;
  entityId: string;
};

function parseMembershipRenewals(body: unknown): MembershipRenewalRequest[] {
  if (!body || typeof body !== 'object') return [];
  const raw = (body as { memberships?: unknown }).memberships;
  if (!Array.isArray(raw)) return [];
  const out: MembershipRenewalRequest[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const userId = String(rec.userId ?? '').trim();
    const entityId = String(rec.entityId ?? '').trim();
    const dateStart = String(rec.dateStart ?? '').trim().slice(0, 10);
    if (!userId || !entityId || !dateStart) continue;
    out.push({
      userId,
      entityId,
      dateStart,
      dateEnd:
        rec.dateEnd === null
          ? null
          : typeof rec.dateEnd === 'string'
            ? rec.dateEnd.trim().slice(0, 10) || null
            : null,
      version: typeof rec.version === 'string' ? rec.version.trim() : undefined,
      companyName: typeof rec.companyName === 'string' ? rec.companyName.trim() : undefined,
      username: typeof rec.username === 'string' ? rec.username.trim() : undefined,
    });
  }
  return out;
}

async function upsertUserAdminSettings(userId: string, adminSettings: string) {
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
      adminSettings,
      colorSettings: '{}',
      toolsSettings: '{}',
      favouritesSettings: '{}',
      myBestSettings: '{}',
      notificationSettings: '{}',
      socialSettings: '{}',
      workoutPreferences: '{}',
    },
  });
}

/** Turn Resend SDK/API errors into actionable admin messages. */
function formatResendSendError(message: string): string {
  if (message === 'Unable to fetch data. The request could not be resolved.') {
    return (
      'Could not reach the Resend email API. Check your internet connection and firewall/proxy, ' +
      'confirm RESEND_API_KEY in .env, then restart the dev server (npm run dev).'
    );
  }
  if (message.includes('verify a domain')) {
    return (
      `${message} Add RESEND_FROM_EMAIL in .env using an address on your verified Resend domain ` +
      '(see https://resend.com/domains).'
    );
  }
  if (message === 'API key is invalid') {
    return 'RESEND_API_KEY in .env is invalid. Create a new key at https://resend.com/api-keys and restart the dev server.';
  }
  return message;
}

type ResolvedUsers =
  | { ok: false; error: string; status: number }
  | {
      ok: true;
      ids: string[];
      users: { id: string; email: string; username: string; userType: UserType }[];
    };

async function resolveSegmentUserIds(segment: string, userIds: string[]): Promise<ResolvedUsers> {
  const types = SEGMENT_TYPES[segment];
  if (!types) {
    return { ok: false, error: 'Invalid segment', status: 400 };
  }
  if (userIds.length === 0) {
    return { ok: false, error: 'No users selected', status: 400 };
  }

  const normalizedIds = userIds.map(subscriptionRowToUserId);
  const users = await prisma.user.findMany({
    where: { id: { in: normalizedIds }, userType: { in: types } },
    select: { id: true, email: true, username: true, userType: true },
  });

  if (users.length === 0) {
    return { ok: false, error: 'No matching users found for this segment', status: 404 };
  }

  return { ok: true, ids: users.map((u) => u.id), users };
}

/** POST — Send a message (email) to registered users. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const segment = String((body as { segment?: string })?.segment || '').trim();
  const message = String((body as { message?: string })?.message || '').trim();
  const subject = String((body as { subject?: string })?.subject || 'Message from Movesbook Admin').trim();
  const toEmailOverride = String((body as { toEmail?: string })?.toEmail || '').trim();

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const userIds = parseUserIds(body);
  const resolved = await resolveSegmentUserIds(segment, userIds);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { users } = resolved;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const resend = apiKey ? new Resend(apiKey) : null;

  const sent: string[] = [];
  const failed: { id: string; email: string; error: string }[] = [];

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="margin: 0 0 12px;">${subject}</h2>
      <p style="white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      <p style="margin-top: 24px; font-size: 12px; color: #888;">Sent from Movesbook Admin</p>
    </div>
  `;

  if (!resend) {
    return NextResponse.json({
      sent: 0,
      failed: [],
      mailtoFallback: true,
      emailNotConfigured: true,
      recipients: users.map((u) => ({ id: u.id, email: u.email, username: u.username })),
      message:
        'RESEND_API_KEY is missing or empty in .env. Add your key from https://resend.com/api-keys, set RESEND_FROM_EMAIL to a verified sender, then restart the dev server.',
    });
  }

  for (const user of users) {
    const destination =
      toEmailOverride && users.length === 1 ? toEmailOverride : user.email?.trim() || '';
    if (!destination) {
      failed.push({ id: user.id, email: '', error: 'No email address' });
      continue;
    }
    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev',
        to: destination,
        subject,
        html: htmlBody,
      });
      if (result.error) {
        failed.push({
          id: user.id,
          email: destination,
          error: formatResendSendError(result.error.message),
        });
      } else {
        sent.push(user.id);
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'Send failed';
      failed.push({
        id: user.id,
        email: destination,
        error: formatResendSendError(raw),
      });
    }
  }

  return NextResponse.json({
    sent: sent.length,
    failed,
    mailtoFallback: false,
    recipients: users.map((u) => ({ id: u.id, email: u.email, username: u.username })),
  });
}

/** DELETE — Remove checked subscription periods (requires super admin password). */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const segment = String((body as { segment?: string })?.segment || '').trim();
  if (!SEGMENT_TYPES[segment]) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
  }

  const superAdminPassword = String(
    (body as { superAdminPassword?: string })?.superAdminPassword || '',
  ).trim();
  if (!superAdminPassword) {
    return NextResponse.json({ error: 'Super admin password is required' }, { status: 400 });
  }

  const adminUsername = String((body as { adminUsername?: string })?.adminUsername || '').trim();
  const passwordOk = await verifyAdminActionPassword(
    superAdminPassword,
    auth,
    adminUsername || undefined,
  );
  if (!passwordOk) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const subscriptions = parseSubscriptionDeletions(body);
  if (subscriptions.length === 0) {
    return NextResponse.json({ error: 'No subscriptions selected' }, { status: 400 });
  }

  const userIds = Array.from(new Set(subscriptions.map((s) => s.userId)));
  const types = SEGMENT_TYPES[segment]!;
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, userType: { in: types } },
    select: { id: true, settings: { select: { adminSettings: true } } },
  });

  if (users.length === 0) {
    return NextResponse.json({ error: 'No matching users found for this segment' }, { status: 404 });
  }

  const byUser = new Map<string, SubscriptionPeriodDeletion[]>();
  for (const sub of subscriptions) {
    if (!users.some((u) => u.id === sub.userId)) continue;
    const list = byUser.get(sub.userId) ?? [];
    list.push({
      periodId: sub.periodId,
      entityId: sub.entityId,
      dateStart: sub.dateStart,
      dateEnd: sub.dateEnd,
    });
    byUser.set(sub.userId, list);
  }

  let deleted = 0;
  for (const [userId, dels] of Array.from(byUser.entries())) {
    const user = users.find((u) => u.id === userId);
    if (!user || dels.length === 0) continue;

    const adminSettings = applySubscriptionPeriodDeletions(
      user.settings?.adminSettings,
      dels,
    );

    if (user.settings) {
      await prisma.userSettings.update({
        where: { userId },
        data: { adminSettings },
      });
    } else {
      await prisma.userSettings.create({
        data: {
          userId,
          widgetArrangement: '{}',
          adminSettings,
          colorSettings: '{}',
          toolsSettings: '{}',
          favouritesSettings: '{}',
          myBestSettings: '{}',
          notificationSettings: '{}',
          socialSettings: '{}',
          workoutPreferences: '{}',
        },
      });
    }
    deleted += dels.length;
  }

  return NextResponse.json({
    deleted,
    userIds: Array.from(byUser.keys()),
  });
}

/** PUT — Renew selected club memberships (requires super admin password). */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const segment = String((body as { segment?: string })?.segment || '').trim();
  if (!SEGMENT_TYPES[segment]) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
  }

  const superAdminPassword = String(
    (body as { superAdminPassword?: string })?.superAdminPassword || '',
  ).trim();
  if (!superAdminPassword) {
    return NextResponse.json({ error: 'Super admin password is required' }, { status: 400 });
  }

  const adminUsername = String((body as { adminUsername?: string })?.adminUsername || '').trim();
  const passwordOk = await verifyAdminActionPassword(
    superAdminPassword,
    auth,
    adminUsername || undefined,
  );
  if (!passwordOk) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const memberships = parseMembershipRenewals(body);
  if (memberships.length === 0) {
    return NextResponse.json({ error: 'No memberships selected' }, { status: 400 });
  }

  const userIds = Array.from(new Set(memberships.map((m) => m.userId)));
  const types = SEGMENT_TYPES[segment]!;
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, userType: { in: types } },
    select: {
      id: true,
      settings: { select: { adminSettings: true } },
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
    },
  });

  if (users.length === 0) {
    return NextResponse.json({ error: 'No matching users found for this segment' }, { status: 404 });
  }

  const renewed: { userId: string; entityId: string; dateStart: string; dateEnd: string }[] = [];
  const errors: string[] = [];
  const adminSettingsByUser = new Map<string, string>();
  for (const user of users) {
    adminSettingsByUser.set(user.id, user.settings?.adminSettings?.trim() || '{}');
  }

  for (const target of memberships) {
    const user = users.find((u) => u.id === target.userId);
    if (!user) {
      errors.push(`User not found: ${target.userId}`);
      continue;
    }

    const club = user.ownedClubs.find((c) => c.id === target.entityId);
    if (!club) {
      errors.push(`Club ${target.entityId} not owned by user ${target.userId}`);
      continue;
    }

    const previousStart =
      target.dateStart ||
      parseClubSubscriptionStartDate(club.description, club.createdAt) ||
      club.createdAt.toISOString().slice(0, 10);
    const previousEnd =
      target.dateEnd ??
      parseClubSubscriptionEndDate(club.description, club.createdAt)?.toISOString().slice(0, 10) ??
      null;

    const previous: MembershipRenewalInput = {
      dateStart: previousStart,
      dateEnd: previousEnd,
      version: target.version,
      entityId: target.entityId,
      companyName: target.companyName ?? club.name?.trim(),
      username: target.username,
    };

    const nextStart = computeRenewalStartDate(previousEnd);
    const nextEnd = computeRenewalEndDate(nextStart);
    const primaryClub = pickClubForAdminProfile(user.ownedClubs);

    let adminSettingsRaw = adminSettingsByUser.get(user.id) ?? '{}';
    adminSettingsRaw = applyMembershipRenewalToAdminSettings(
      adminSettingsRaw,
      previous,
      nextStart,
      nextEnd,
    );

    const pcuDefaults = {
      accessStartIso: previousStart,
      accessEndIso: previousEnd ?? '',
    };
    const pcuAccess = readPcuAccessSettings(adminSettingsRaw, pcuDefaults);
    if (
      shouldSyncPcuAccessOnRenewal(
        target.entityId,
        primaryClub?.id ?? null,
        previous,
        pcuAccess,
      )
    ) {
      adminSettingsRaw = mergePcuAccessIntoAdminSettings(adminSettingsRaw, {
        accessStartIso: nextStart,
        accessEndIso: nextEnd,
      });
    }

    adminSettingsByUser.set(user.id, adminSettingsRaw);

    const nextDescription = mergeClubSubscriptionDates(
      club.description,
      nextStart,
      nextEnd,
    );

    await prisma.club.update({
      where: { id: club.id },
      data: { description: nextDescription },
    });

    club.description = nextDescription;

    renewed.push({
      userId: user.id,
      entityId: club.id,
      dateStart: nextStart,
      dateEnd: nextEnd,
    });
  }

  for (const [userId, adminSettings] of Array.from(adminSettingsByUser.entries())) {
    if (!renewed.some((r) => r.userId === userId)) continue;
    await upsertUserAdminSettings(userId, adminSettings);
  }

  if (renewed.length === 0) {
    return NextResponse.json(
      { error: errors[0] || 'Could not renew any memberships', errors },
      { status: 400 },
    );
  }

  return NextResponse.json({
    renewed: renewed.length,
    memberships: renewed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
