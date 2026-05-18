import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { requireAdminPanel } from '@/lib/panelAuth';

export const dynamic = 'force-dynamic';

function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeUsername(value: unknown): string {
  return String(value ?? '').trim();
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPanel(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const coAdmins = await prisma.staffAccount.findMany({
    where: { kind: 'CO_ADMIN' },
    select: {
      id: true,
      username: true,
      name: true,
      surname: true,
      country: true,
      lastLogin: true,
      email: true,
      imageUrl: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    coAdmins: coAdmins.map((o) => ({
      id: o.id,
      username: o.username,
      name: `${o.name} ${o.surname}`.trim(),
      country: o.country ?? null,
      staffLinked: 'Co-Admin',
      lastLogin: o.lastLogin ? o.lastLogin.toISOString() : null,
      imageUrl: o.imageUrl,
      kind: 'CO_ADMIN' as const,
      email: o.email,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPanel(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = String(body.password ?? '');
  const name = String(body.name ?? '').trim();
  const surname = String(body.surname ?? '').trim();

  if (!username || !email || !password || !name || !surname) {
    return NextResponse.json(
      { error: 'username, email, password, name and surname are required' },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const existing = await prisma.staffAccount.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
  }

  const created = await prisma.staffAccount.create({
    data: {
      kind: 'CO_ADMIN',
      username,
      email,
      password: await hashPassword(password),
      name,
      surname,
      country: body.country ? String(body.country).trim() : null,
      alternateEmail: body.alternateEmail ? normalizeEmail(body.alternateEmail) : null,
      phonePrefix: body.phonePrefix ? String(body.phonePrefix).trim() : null,
      phoneNumber: body.phoneNumber ? String(body.phoneNumber).trim() : null,
      cellularPrefix: body.cellularPrefix ? String(body.cellularPrefix).trim() : null,
      cellularNumber: body.cellularNumber ? String(body.cellularNumber).trim() : null,
      facebook: body.facebook ? String(body.facebook).trim() : null,
      twitter: body.twitter ? String(body.twitter).trim() : null,
      website: body.website ? String(body.website).trim() : null,
      blogsite: body.blogsite ? String(body.blogsite).trim() : null,
      otherSite: body.otherSite ? String(body.otherSite).trim() : null,
      otherInfos: body.otherInfos ? String(body.otherInfos) : null,
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true, id: created.id }, { status: 201 });
}
