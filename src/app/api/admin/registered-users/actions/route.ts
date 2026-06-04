import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

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
