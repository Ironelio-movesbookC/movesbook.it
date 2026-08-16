import { NextRequest, NextResponse } from 'next/server';
import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { sendIonosEmail } from '@/lib/ionosEmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function adminMessageHtml(subject: string, message: string): string {
  const body = escapeHtml(message)
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 12px;white-space:pre-wrap;">${block.replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #222;">
      <h2 style="margin: 0 0 12px;">${escapeHtml(subject)}</h2>
      ${body}
      <p style="margin-top: 24px; font-size: 12px; color: #888;">Sent from Movesbook Admin</p>
    </div>
  `;
}

/** POST — Send a message (email) to registered users via the same IONOS SMTP as promocode invites. */
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
  const htmlBody = adminMessageHtml(subject, message);
  const sent: string[] = [];
  const failed: { id: string; email: string; error: string }[] = [];

  for (const user of users) {
    const destination =
      toEmailOverride && users.length === 1 ? toEmailOverride : user.email?.trim() || '';
    if (!destination) {
      failed.push({ id: user.id, email: '', error: 'No email address' });
      continue;
    }
    try {
      await sendIonosEmail({
        to: destination,
        subject,
        html: htmlBody,
        text: message,
      });
      sent.push(user.id);
    } catch (e: unknown) {
      failed.push({
        id: user.id,
        email: destination,
        error: e instanceof Error ? e.message : 'Send failed',
      });
    }
  }

  if (sent.length === 0) {
    const firstError = failed[0]?.error || 'Failed to send email';
    return NextResponse.json(
      {
        sent: 0,
        failed,
        mailtoFallback: false,
        recipients: users.map((u) => ({ id: u.id, email: u.email, username: u.username })),
        error: firstError,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sent: sent.length,
    failed,
    mailtoFallback: false,
    recipients: users.map((u) => ({ id: u.id, email: u.email, username: u.username })),
  });
}

/** DELETE — Remove user accounts (subscription registrations) from Movesbook. */
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
  const userIds = parseUserIds(body);
  const resolved = await resolveSegmentUserIds(segment, userIds);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const result = await prisma.user.deleteMany({
    where: { id: { in: resolved.ids } },
  });

  return NextResponse.json({
    deleted: result.count,
    ids: resolved.ids,
  });
}
